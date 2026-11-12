/* Append-only disk-backed JSONL segments. No network, rotation, TTL or cloud actions. */
(() => {
  "use strict";
  const DB = "redown-capless-archive-v1";
  const req = (r) =>
    new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  const digest = async (text) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
      ),
      (v) => v.toString(16).padStart(2, "0"),
    ).join("");
  const uidForGap = (v) =>
    typeof v === "string" && /^[a-f0-9-]{36}$/i.test(v) ? v : null;
  const uuid = (v) => typeof v === "string" && /^[a-f0-9-]{36}$/i.test(v);
  const provider = (v) =>
    ["google", "dropbox", "onedrive", "cloudflare"].includes(v) ? v : "unknown";
  function sourceSite(value) {
    try {
      const host = new URL(value).hostname.toLowerCase();
      return /^(?:www\.|images\.|lens\.)?google\.[a-z.]+$/.test(host) &&
        /^\/(?:search|imgres|url|webhp|$)/.test(new URL(value).pathname)
        ? "google-search"
        : /(^|\.)bing\.com$/.test(host)
          ? "bing"
          : /(^|\.)yahoo\.[a-z.]+$/.test(host)
            ? "yahoo"
            : /(^|\.)yandex\.[a-z.]+$/.test(host)
              ? "yandex"
              : "other";
    } catch {
      return "unattributed";
    }
  }
  function create({
    database = globalThis.indexedDB,
    locks = globalThis.navigator?.locks,
    now = () => Date.now(),
    fault = () => {},
  } = {}) {
    let connection, key;
    let metrics = { maxBatch: 0, lastWriteMs: null, lastLockWaitMs: null };
    async function open() {
      if (connection) return connection;
      if (!database || !locks?.request)
        throw Error("ARCHIVE_BACKEND_UNAVAILABLE");
      connection = new Promise((resolve, reject) => {
        const r = database.open(DB, 1);
        r.onupgradeneeded = () => {
          for (const [name, path] of [
            ["metadata", "id"],
            ["segments", "start"],
            ["pending", "id"],
            ["eventIds", "id"],
            ["attempts", "id"],
            ["gaps", "id"],
          ])
            r.result.createObjectStore(name, { keyPath: path });
        };
        r.onsuccess = () => {
          const db = r.result;
          db.onversionchange = () => {
            db.close();
            connection = null;
          };
          db.onclose = () => {
            connection = null;
          };
          resolve(db);
        };
        r.onerror = () => reject(r.error);
        r.onblocked = () => reject(Error("ARCHIVE_OPEN_BLOCKED"));
      }).catch((e) => {
        connection = null;
        throw e;
      });
      return connection;
    }
    async function transaction(names, mode, fn) {
      const db = await open();
      return new Promise((resolve, reject) => {
        let tx;
        try {
          tx = db.transaction(names, mode, { durability: "strict" });
        } catch (error) {
          if (
            error?.name !== "TypeError" &&
            error?.name !== "NotSupportedError"
          )
            return reject(error);
          tx = db.transaction(names, mode);
        }
        let value;
        const done = Promise.resolve().then(() =>
          fn(Object.fromEntries(names.map((n) => [n, tx.objectStore(n)])), tx),
        );
        done.then(
          (v) => (value = v),
          (e) => {
            try {
              tx.abort();
            } catch {}
            reject(e);
          },
        );
        tx.oncomplete = () => resolve(value);
        tx.onabort = tx.onerror = () =>
          reject(tx.error || Error("ARCHIVE_TRANSACTION_ABORTED"));
      });
    }
    const getState = () =>
      transaction(["metadata"], "readonly", (s) =>
        req(s.metadata.get("state")),
      );
    async function ensure(expectedId) {
      const state = await getState();
      if (state) {
        if (expectedId && state.archiveId !== expectedId)
          throw Error("ARCHIVE_ID_CHANGED");
        return state;
      }
      if (expectedId) throw Error("ARCHIVE_MISSING_DO_NOT_RESET");
      return transaction(["metadata"], "readwrite", async (s) => {
        const current = await req(s.metadata.get("state"));
        if (current) return current;
        const fresh = {
          id: "state",
          schemaVersion: 1,
          archiveId: crypto.randomUUID(),
          producer: {
            build:
              globalThis.RedownFlightRecorderAPI?.BUILD?.fingerprint ||
              "unavailable",
            baseCommit:
              globalThis.RedownFlightRecorderAPI?.BUILD?.baseline ||
              "unavailable",
            extensionVersion:
              globalThis.chrome?.runtime?.getManifest?.().version ||
              "unavailable",
            installedCommit: "not-observable",
          },
          startedAt: new Date(now()).toISOString(),
          nextSequence: 1,
          lastSequence: 0,
          records: 0,
          bytes: 0,
          segments: 0,
          lastDigest: "0".repeat(64),
          rawRecords: 0,
          privacyKey: Array.from(
            crypto.getRandomValues(new Uint8Array(32)),
            (v) => v.toString(16).padStart(2, "0"),
          ).join(""),
        };
        s.metadata.add(fresh);
        return fresh;
      });
    }
    async function identify(value, state) {
      if (typeof value !== "string") return null;
      key ||= crypto.subtle.importKey(
        "raw",
        Uint8Array.from(state.privacyKey.match(/../g), (v) => parseInt(v, 16)),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      return Array.from(
        new Uint8Array(
          await crypto.subtle.sign(
            "HMAC",
            await key,
            new TextEncoder().encode(value),
          ),
        ),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
    }
    async function project(input, state, raw) {
      const d = input.data || {},
        src = d.source || {},
        dest = d.destination || {},
        site = sourceSite(d.pageUrl || src.pageUrl),
        p = provider(d.provider || d.providerKind);
      const evidence = {
        provider: p,
        sourceSite: site,
        nativeClickObserved:
          input.kind === "click" || d.stage === "CLICK_RECEIVED",
        sourceId: await identify(
          d.sourceUrl || src.sourceUrl || src.url,
          state,
        ),
        accountRef: await identify(dest.accountId || d.accountId, state),
      };
      const safe =
        globalThis.RedownSaveEvidence?.sanitize({
          code:
            d.code ||
            d.reason ||
            (d.error
              ? globalThis.RedownSaveEvidence?.classify(d.error)
              : undefined),
          phase: d.phase,
          role: d.role,
          category: d.category,
          method: d.method,
          httpStatus: d.httpStatus,
          storageArea: d.storageArea,
          storageOperation: d.storageOperation,
        }) || {};
      for (const k of [
        "bytes",
        "size",
        "offset",
        "sent",
        "total",
        "durationMs",
        "budgetMs",
        "elapsedMs",
        "monotonicMs",
        "usedJSHeapSize",
        "totalJSHeapSize",
        "jsHeapSizeLimit",
        "eventLoopDelayMs",
      ])
        if (Number.isFinite(d[k])) safe[k] = d[k];
      for (const k of [
        "verified",
        "ok",
        "newVerified",
        "duplicate",
        "redirected",
      ])
        if (typeof d[k] === "boolean") safe[k] = d[k];
      for (const [field, values] of Object.entries({
        stage: [
          "CLICK_RECEIVED",
          "ROUTE_RESOLVED",
          "AUTH_CHECKED",
          "ADMITTED",
          "SOURCE_REQUEST",
          "PROVIDER_WRITE",
          "REMOTE_VERIFY",
          "HISTORY_COMMIT",
          "COUNTER_COMMIT",
          "TERMINAL",
        ],
        outcome: [
          "COMPLETED",
          "FAILED",
          "BLOCKED",
          "UNCERTAIN",
          "CANCELLED",
          "INTERRUPTED",
        ],
        status: [
          "queued",
          "active",
          "completed",
          "failed",
          "blocked",
          "uncertain",
          "interrupted",
          "cancelled",
          "accepted",
          "rejected",
          "unknown",
          "timed-out",
          "late-accepted",
          "late-rejected",
          "started",
        ],
        component: [
          "source",
          "provider",
          "runtime",
          "permissions",
          "unattributed",
          "worker",
          "core",
          "entry",
          "toolbar",
          "shelf",
          "menu",
          "page",
          "storage",
          "popup",
          "context-menu",
        ],
      }))
        if (values.includes(d[field])) safe[field] = d[field];
      if (input.collector === "startup") {
        Object.assign(safe, globalThis.RedownStartupCrashTrace?.clean(d) || {});
        delete safe.id;
        delete safe.at;
      }
      if (input.kind === "verified-receipt")
        safe.proofValidated = d.proofValidated === true;
      return {
        schemaVersion: 1,
        buildFingerprint:
          globalThis.RedownFlightRecorderAPI?.BUILD?.fingerprint ||
          "unavailable",
        id: uuid(input.id) ? input.id : crypto.randomUUID(),
        at: Number.isFinite(Date.parse(input.at))
          ? new Date(input.at).toISOString()
          : new Date(now()).toISOString(),
        epoch: uuid(input.epoch) ? input.epoch : null,
        attemptId: uuid(input.attemptId) ? input.attemptId : null,
        collector: ["startup", "save", "flight"].includes(input.collector)
          ? input.collector
          : "flight",
        kind: [
          "click",
          "stage",
          "observation",
          "error",
          "http",
          "route",
          "provider-checkpoint",
          "receipt",
          "accounting",
          "restart",
          "reconcile",
          "verified-receipt",
          "incident",
          "gap",
          "lifecycle",
        ].includes(input.kind)
          ? input.kind
          : "observation",
        privacy: raw && input.collector === "save" ? "RAW" : "SECURE",
        evidence,
        data:
          raw && input.collector === "save"
            ? {
                ...globalThis.RedownForensicDiagnostics.evidence(d),
                ...(input.kind === "verified-receipt"
                  ? { proofValidated: d.proofValidated === true }
                  : {}),
              }
            : safe,
      };
    }
    async function updateAttempt(store, event) {
      if (!event.attemptId) return;
      const prior = (await req(store.get(event.attemptId))) || {
        id: event.attemptId,
        firstAt: event.at,
        lastAt: event.at,
        nativeClickObserved: false,
        provider: "unknown",
        sourceSite: "unattributed",
        verified: false,
        outcome: "unknown",
      };
      const e = event.evidence,
        d = event.data;
      prior.lastAt = event.at;
      prior.nativeClickObserved ||= e.nativeClickObserved;
      if (e.provider !== "unknown") prior.provider = e.provider;
      if (e.sourceSite !== "unattributed") prior.sourceSite = e.sourceSite;
      if (e.sourceId) prior.sourceId = e.sourceId;
      if (e.accountRef) prior.accountRef = e.accountRef;
      if (event.kind === "verified-receipt" && d.proofValidated === true)
        prior.verified = true;
      if (
        event.kind === "accounting" &&
        (d.newVerified === true || d.duplicate === true)
      )
        prior.verified = true;
      if (d.stage === "TERMINAL") prior.outcome = d.outcome || "unknown";
      store.put(prior);
    }
    async function finalize(lease) {
      if ((await digest(lease.jsonl)) !== lease.digest)
        throw Error("PENDING_CHECKSUM_MISMATCH");
      const events = lease.jsonl
        .trimEnd()
        .split("\n")
        .map((v) => JSON.parse(v));
      if (
        events.length !== lease.count ||
        events[0]?.sequence !== lease.start ||
        events.at(-1)?.sequence !== lease.end
      )
        throw Error("PENDING_SEQUENCE_MISMATCH");
      return transaction(
        ["metadata", "pending", "segments", "eventIds", "attempts"],
        "readwrite",
        async (s, tx) => {
          const existing = await req(s.segments.get(lease.start));
          if (existing) {
            if (existing.digest !== lease.digest)
              throw Error("IMMUTABLE_SEGMENT_CONFLICT");
            s.pending.delete(lease.id);
            return;
          }
          const state = await req(s.metadata.get("state"));
          if (
            state.lastSequence + 1 !== lease.start ||
            state.lastDigest !== lease.previousDigest
          )
            throw Error("ARCHIVE_SEQUENCE_GAP");
          fault("beforeCommit", tx, lease);
          s.segments.add(lease);
          for (const event of events) {
            s.eventIds.add({ id: event.id, sequence: event.sequence });
            await updateAttempt(s.attempts, event);
          }
          s.metadata.put({
            ...state,
            lastSequence: lease.end,
            lastDigest: lease.digest,
            records: state.records + lease.count,
            bytes: state.bytes + lease.bytes,
            segments: state.segments + 1,
            rawRecords:
              state.rawRecords +
              events.filter((e) => e.privacy === "RAW").length,
          });
          s.pending.delete(lease.id);
        },
      );
    }
    async function firstPending() {
      return transaction(
        ["pending"],
        "readonly",
        (s) =>
          new Promise((resolve, reject) => {
            const r = s.pending.openCursor();
            r.onsuccess = () => resolve(r.result?.value || null);
            r.onerror = () => reject(r.error);
          }),
      );
    }
    async function recoverUnlocked() {
      let lease;
      while ((lease = await firstPending())) await finalize(lease);
    }
    async function recover(expectedId) {
      return locks.request("redown-capless-writer-v1", async () => {
        await ensure(expectedId);
        await recoverUnlocked();
        return stats();
      });
    }
    async function append(inputs, { raw = false, expectedId } = {}) {
      if (!inputs.length) return stats();
      if (inputs.length > 128) throw Error("BATCH_MEMORY_BOUND");
      const queued = performance.now();
      return locks.request("redown-capless-writer-v1", async () => {
        metrics.lastLockWaitMs = performance.now() - queued;
        const started = performance.now();
        let state = await ensure(expectedId);
        await recoverUnlocked();
        state = await getState();
        const fresh = await transaction(["eventIds"], "readonly", async (s) => {
          const seen = new Set(),
            result = [];
          for (const input of inputs) {
            if (seen.has(input.id) || (await req(s.eventIds.get(input.id))))
              continue;
            seen.add(input.id);
            result.push(input);
          }
          return result;
        });
        if (!fresh.length) return stats();
        const events = await Promise.all(
          fresh.map((v) => project(v, state, raw)),
        );
        events.forEach((e, i) => (e.sequence = state.nextSequence + i));
        const jsonl = events.map((e) => JSON.stringify(e) + "\n").join(""),
          lease = {
            id: crypto.randomUUID(),
            schemaVersion: 1,
            start: events[0].sequence,
            end: events.at(-1).sequence,
            count: events.length,
            firstAt: events[0].at,
            lastAt: events.at(-1).at,
            jsonl,
            digest: await digest(jsonl),
            previousDigest: state.lastDigest,
            bytes: new TextEncoder().encode(jsonl).length,
          };
        await transaction(["metadata", "pending"], "readwrite", async (s) => {
          const latest = await req(s.metadata.get("state"));
          if (latest.nextSequence !== state.nextSequence)
            throw Error("SEQUENCE_LEASE_CONFLICT");
          s.pending.add(lease);
          s.metadata.put({ ...latest, nextSequence: lease.end + 1 });
        });
        try {
          fault("afterReserve", null, lease);
          await finalize(lease);
        } catch (error) {
          error.pendingRange = {
            start: lease.start,
            end: lease.end,
            id: lease.id,
          };
          throw error;
        }
        metrics.maxBatch = Math.max(metrics.maxBatch, events.length);
        metrics.lastWriteMs = performance.now() - started;
        return stats();
      });
    }
    async function stats() {
      const state = await getState();
      if (!state) throw Error("ARCHIVE_NOT_INITIALIZED");
      const pending = await transaction(["pending"], "readonly", (s) =>
        req(s.pending.count()),
      );
      const { privacyKey, ...safe } = state;
      return {
        ...safe,
        pendingSegments: pending,
        metrics: { ...metrics },
        backend: "IndexedDB (Chrome profile; browser-managed quota)",
        retention: "append-only; no application TTL/rotation",
        durability: "IndexedDB strict when supported; no OS fsync guarantee",
      };
    }
    async function page(
      after = 0,
      limit = 8,
      boundary = Number.MAX_SAFE_INTEGER,
    ) {
      return transaction(
        ["segments"],
        "readonly",
        (s) =>
          new Promise((resolve, reject) => {
            const result = [],
              r = s.segments.openCursor(IDBKeyRange.lowerBound(after, true));
            r.onsuccess = () => {
              const cursor = r.result;
              if (
                !cursor ||
                result.length >= Math.min(8, limit) ||
                cursor.value.start > boundary
              )
                return resolve(result);
              result.push(cursor.value);
              cursor.continue();
            };
            r.onerror = () => reject(r.error);
          }),
      );
    }
    async function verify() {
      let after = 0,
        previous = "0".repeat(64),
        next = 1,
        count = 0,
        segments = 0;
      while (true) {
        const rows = await page(after);
        if (!rows.length) break;
        for (const row of rows) {
          if (
            row.start !== next ||
            row.previousDigest !== previous ||
            (await digest(row.jsonl)) !== row.digest
          )
            throw Error("ARCHIVE_INTEGRITY_FAILED");
          next = row.end + 1;
          previous = row.digest;
          count += row.count;
          segments++;
          after = row.start;
        }
      }
      const state = await stats();
      return {
        state: state.pendingSegments ? "incomplete" : "verified",
        records: count,
        segments,
        lastSequence: next - 1,
        manifestMatches:
          count === state.records && previous === state.lastDigest,
        pendingSegments: state.pendingSegments,
      };
    }
    async function gap(input) {
      return transaction(["gaps"], "readwrite", (s) => {
        const safe = {
          id: input.id || crypto.randomUUID(),
          at: new Date(now()).toISOString(),
          reason: [
            "memory-buffer-full",
            "event-over-memory-budget",
            "write-failed",
            "permission-denied",
            "logging-disabled-with-pending",
          ].includes(input.reason)
            ? input.reason
            : "write-failed",
          count: Number.isSafeInteger(input.count) ? input.count : 0,
          firstId: uuid(input.firstId) ? input.firstId : null,
          lastId: uuid(input.lastId) ? input.lastId : null,
          classification:
            input.unconfirmed === true ? "unconfirmed" : "lost-before-write",
          sequenceRange:
            Number.isSafeInteger(input.sequenceRange?.start) &&
            Number.isSafeInteger(input.sequenceRange?.end)
              ? {
                  start: input.sequenceRange.start,
                  end: input.sequenceRange.end,
                  id: uidForGap(input.sequenceRange.id),
                }
              : "not-assigned; event identities retained as gap endpoints",
        };
        s.gaps.add(safe);
      });
    }
    async function pendingPage(after = "", limit = 8) {
      return transaction(
        ["pending"],
        "readonly",
        (s) =>
          new Promise((resolve, reject) => {
            const out = [],
              r = s.pending.openCursor(
                after ? IDBKeyRange.lowerBound(after, true) : null,
              );
            r.onsuccess = () => {
              const c = r.result;
              if (!c || out.length >= limit) return resolve(out);
              out.push(c.value);
              c.continue();
            };
            r.onerror = () => reject(r.error);
          }),
      );
    }
    async function gapPage(after = "", limit = 128) {
      return transaction(
        ["gaps"],
        "readonly",
        (s) =>
          new Promise((resolve, reject) => {
            const out = [],
              r = s.gaps.openCursor(
                after ? IDBKeyRange.lowerBound(after, true) : null,
              );
            r.onsuccess = () => {
              const c = r.result;
              if (!c || out.length >= limit) return resolve(out);
              out.push(c.value);
              c.continue();
            };
            r.onerror = () => reject(r.error);
          }),
      );
    }
    async function gaps() {
      return transaction(["gaps"], "readonly", async (s) => ({
        count: await req(s.gaps.count()),
      }));
    }
    async function attempts(filters = {}) {
      const counts = {
        observedNativeAttempts: 0,
        partialAttempts: 0,
        verified: 0,
        failed: 0,
        unknown: 0,
      };
      await transaction(
        ["attempts"],
        "readonly",
        (s) =>
          new Promise((resolve, reject) => {
            const r = s.attempts.openCursor();
            r.onsuccess = () => {
              const c = r.result;
              if (!c) return resolve();
              const a = c.value;
              if (
                (!filters.site || a.sourceSite === filters.site) &&
                (!filters.provider || a.provider === filters.provider) &&
                (!filters.accountRef || a.accountRef === filters.accountRef) &&
                (!filters.from || a.firstAt >= filters.from) &&
                (!filters.to || a.firstAt <= filters.to)
              ) {
                if (!a.nativeClickObserved) counts.partialAttempts++;
                else {
                  counts.observedNativeAttempts++;
                  if (a.verified) counts.verified++;
                  else if (["FAILED", "BLOCKED"].includes(a.outcome))
                    counts.failed++;
                  else counts.unknown++;
                }
              }
              c.continue();
            };
            r.onerror = () => reject(r.error);
          }),
      );
      return {
        counts,
        filters,
        coverage: {
          ...(await gaps()),
          pendingSegments: (await stats()).pendingSegments,
          scope:
            "Only observed unique attempt IDs; source is hosting website, provider is cloud target; not a lifetime success rate",
          priorPrunedHistory: "not reconstructable",
        },
        rates: null,
      };
    }
    async function exportPart({
      after = 0,
      boundary,
      gapAfter = "",
      gapsDone = false,
      pendingAfter = "",
      pendingDone = false,
      snapshot,
    } = {}) {
      const state = await stats(),
        anchor = snapshot || {
          archiveId: state.archiveId,
          lastSequence: state.lastSequence,
          records: state.records,
          segments: state.segments,
          lastDigest: state.lastDigest,
          pendingSegments: state.pendingSegments,
          at: new Date(now()).toISOString(),
        },
        end = boundary ?? anchor.lastSequence,
        rows = await page(after, 8, end),
        files = {};
      const verifiedRows = [];
      for (const row of rows) {
        verifiedRows.push({
          ...row,
          checksumMatches: (await digest(row.jsonl)) === row.digest,
        });
        files["segments/" + row.start + "-" + row.end + ".jsonl"] = row.jsonl;
      }
      const gapRows = gapsDone ? [] : await gapPage(gapAfter),
        nextGapAfter = gapRows.at(-1)?.id || gapAfter,
        moreGaps = !gapsDone && (await gapPage(nextGapAfter, 1)).length > 0;
      if (gapRows.length)
        files["gaps.jsonl"] = gapRows
          .map((g) => JSON.stringify(g) + "\n")
          .join("");
      const pendingRows = pendingDone ? [] : await pendingPage(pendingAfter),
        pendingChecks = [];
      for (const row of pendingRows) {
        files["pending/" + row.start + "-" + row.end + ".jsonl"] = row.jsonl;
        const { jsonl, ...header } = row;
        pendingChecks.push({
          ...header,
          checksumMatches: (await digest(row.jsonl)) === row.digest,
          status: "unconfirmed journal; not a closed segment",
        });
      }
      const nextPendingAfter = pendingRows.at(-1)?.id || pendingAfter,
        morePending =
          !pendingDone && (await pendingPage(nextPendingAfter, 1)).length > 0;
      const nextAfter = rows.at(-1)?.start ?? after,
        moreSegments = (await page(nextAfter, 1, end)).length > 0,
        more = moreSegments || moreGaps || morePending;
      files["manifest.json"] = JSON.stringify(
        {
          schemaVersion: 1,
          archiveId: state.archiveId,
          snapshot: anchor,
          partAfter: after,
          nextAfter,
          more,
          generatedOnly: true,
          delivery:
            "Retain and verify every part; generated is not proof of disk download",
          currentState: state,
          segments: verifiedRows.map(({ jsonl, ...row }) => row),
          pendingJournal: pendingChecks,
          gaps: { exported: gapRows.length, more: moreGaps },
          unconfirmedPendingSegments: state.pendingSegments,
          privacyWarning:
            "Complete archive can contain user-approved private RAW records; review before sharing",
        },
        null,
        2,
      );
      return {
        files,
        nextAfter,
        boundary: end,
        more,
        nextGapAfter,
        gapsDone: !moreGaps,
        nextPendingAfter,
        pendingDone: !morePending,
        snapshot: anchor,
      };
    }
    return {
      ensure,
      append,
      recover,
      stats,
      page,
      verify,
      gap,
      gaps,
      attempts,
      exportPart,
      metrics,
    };
  }
  globalThis.RedownCaplessArchive = { create, DB, digest, sourceSite };
})();

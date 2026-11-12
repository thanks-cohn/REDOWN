/* Minimal always-on breadcrumbs + consent-gated append-only archive. No provider actions. */
(() => {
  "use strict";
  const CONSENT = "redownCaplessConsentV1",
    CACHE = "redownCaplessStatusV1",
    PREFIX = "redownFlightEpochV1:",
    INCIDENT_DB = "redown-flight-incidents-v1";
  const BUILD = {
    fingerprint: "cc717e24810c660371e210c59e56d6e36137c7c9f7563166d69f6533ecd4baa6",
    tag: "p0-flight-capless-2026-11-12-v1",
    baseline: "f074d164b880610f2bb1e7a5023d812fe7ee8feb",
    installedCommit: "not-observable",
  };
  const valid = (c) =>
    c?.version === 1 &&
    c.enabled === true &&
    c.confirmed === true &&
    Number.isFinite(Date.parse(c.confirmedAt)) &&
    typeof c.archiveId === "string";
  const uid = (v) => typeof v === "string" && /^[a-f0-9-]{36}$/i.test(v);
  const reason = (e) =>
    e?.name === "SecurityError" || e?.name === "NotAllowedError"
      ? "permission-denied"
      : "write-failed";
  const errorNames = new Set([
    "Error",
    "TypeError",
    "SyntaxError",
    "AbortError",
    "QuotaExceededError",
    "SecurityError",
    "NotAllowedError",
    "InvalidStateError",
    "UnknownError",
  ]);
  const instant = (v) =>
    Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
  const number = (v) => (Number.isFinite(v) && v >= 0 ? v : null);
  const step = (v) =>
    v
      ? {
          code: [
            "RECOVERED_UNKNOWN",
            "INCIDENT_PERSISTENCE_FAILED",
            "PAGE_SAMPLED",
            "PAGE_OPEN",
            "SAVE_PROGRESS",
          ].includes(v.code)
            ? v.code
            : globalThis.RedownStartupCrashTrace?.clean({ code: v.code })
                .code || "UNKNOWN",
          at: instant(v.at),
          sequence: number(v.sequence),
          attemptId: uid(v.attemptId) ? v.attemptId : null,
        }
      : null;
  const safeHealth = (v) => ({
    ...Object.fromEntries(
      [
        "backlog",
        "maxBacklog",
        "maxBufferedBytes",
        "writeFailures",
        "dropped",
        "unconfirmed",
      ].map((k) => [k, number(v?.[k]) || 0]),
    ),
    ...Object.fromEntries(
      ["incomplete", "stalled", "incidentFailure"].map((k) => [
        k,
        v?.[k] === true,
      ]),
    ),
    lastError: errorNames.has(v?.lastError) ? v.lastError : null,
    lastErrorCode: [
      "ARCHIVE_BACKEND_UNAVAILABLE",
      "ARCHIVE_OPEN_BLOCKED",
      "ARCHIVE_ID_CHANGED",
      "ARCHIVE_MISSING_DO_NOT_RESET",
      "PENDING_CHECKSUM_MISMATCH",
      "ARCHIVE_SEQUENCE_GAP",
      "ARCHIVE_TRANSACTION_ABORTED",
      "IMMUTABLE_SEGMENT_CONFLICT",
      "ARCHIVE_OPERATION_FAILED",
    ].includes(v?.lastErrorCode)
      ? v.lastErrorCode
      : null,
  });
  const safeStats = (v) =>
    v
      ? {
          schemaVersion: 1,
          archiveId: uid(v.archiveId) ? v.archiveId : null,
          ...Object.fromEntries(
            [
              "lastSequence",
              "nextSequence",
              "records",
              "bytes",
              "segments",
              "rawRecords",
              "pendingSegments",
            ].map((k) => [k, number(v[k])]),
          ),
          backend: "IndexedDB (Chrome profile; browser quota applies)",
          metrics: {
            lastWriteMs: number(v.metrics?.lastWriteMs),
            lastLockWaitMs: number(v.metrics?.lastLockWaitMs),
            maxBatch: number(v.metrics?.maxBatch),
          },
        }
      : null;
  function create({
    chrome = globalThis.chrome,
    database = globalThis.indexedDB,
    locks = globalThis.navigator?.locks,
    context = "worker",
    now = () => Date.now(),
    archiveFactory = () =>
      RedownCaplessArchive.create({ database, locks, now }),
  } = {}) {
    const epoch = crypto.randomUUID(),
      headKey = PREFIX + epoch;
    let consent = null,
      loaded = false,
      archive = null,
      queue = [],
      queueBytes = 0,
      writing = false,
      lane = Promise.resolve(),
      enabled = false,
      health = {
        backlog: 0,
        maxBacklog: 0,
        maxBufferedBytes: 0,
        writeFailures: 0,
        dropped: 0,
        unconfirmed: 0,
        incomplete: false,
        lastError: null,
      },
      cached = null,
      lastCache = 0,
      sequence = 0,
      headWriting = false,
      headDirty = false,
      headTimer = null,
      lastConfirmed = 0,
      lastSaveCheckpoint = 0,
      incidentConnection,
      lastPinAt = -Infinity;
    const recent = [];
    let head = {
      schemaVersion: 1,
      epoch,
      context,
      build: BUILD,
      version: chrome?.runtime?.getManifest?.().version || "unknown",
      extensionId: /^[a-p]{32}$/.test(chrome?.runtime?.id || "")
        ? chrome.runtime.id
        : "unavailable",
      browser:
        (globalThis.navigator?.userAgent || "").match(
          /(?:Chrome|Chromium)\/[\d.]+/,
        )?.[0] || "unavailable",
      os: /Windows/i.test(globalThis.navigator?.userAgent || "")
        ? "Windows"
        : /Linux/i.test(globalThis.navigator?.userAgent || "")
          ? "Linux"
          : /Mac/i.test(globalThis.navigator?.userAgent || "")
            ? "macOS"
            : "unavailable",
      startedAt: new Date(now()).toISOString(),
      lastKnownGood: null,
      lastStarted: null,
      lastPersisted: null,
      firstRecovered: null,
      performance: "unavailable",
    };
    const notify = () => {
      try {
        globalThis.dispatchEvent?.(new Event("redown-flight-status"));
      } catch {}
    };
    const ready = Promise.resolve()
      .then(() => chrome.storage.local.get([CONSENT, CACHE]))
      .then(async (s) => {
        consent = s[CONSENT] || null;
        cached = s[CACHE] || null;
        enabled = valid(consent);
        loaded = true;
        if (enabled) {
          try {
            archive = archiveFactory();
            await archive.ensure(consent.archiveId);
            await archive.recover(consent.archiveId);
            schedule();
          } catch (e) {
            stall(e);
          }
        } else {
          queue = [];
          queueBytes = 0;
        }
        notify();
      })
      .catch((e) => {
        loaded = true;
        enabled = false;
        stall(e);
      });
    function sample() {
      const m = globalThis.performance?.memory;
      return m && Number.isFinite(m.usedJSHeapSize)
        ? {
            usedJSHeapSize: m.usedJSHeapSize,
            totalJSHeapSize: m.totalJSHeapSize,
            jsHeapSizeLimit: m.jsHeapSizeLimit,
          }
        : "unavailable";
    }
    async function writeHead() {
      if (headWriting || !headDirty) return;
      headWriting = true;
      headDirty = false;
      const payload = {
        ...head,
        sequence,
        observedAt: new Date(now()).toISOString(),
        health: { ...health },
        lastConfirmedSequence: lastConfirmed,
      };
      let timer = setTimeout(() => {
        health.unconfirmed++;
        health.incomplete = true;
        notify();
      }, 1000);
      try {
        await chrome.storage.local.set({ [headKey]: payload });
        lastConfirmed = payload.sequence;
        head.lastPersisted = {
          sequence: lastConfirmed,
          at: new Date(now()).toISOString(),
        };
      } catch (e) {
        health.writeFailures++;
        health.incomplete = true;
        health.lastError = errorNames.has(e?.name) ? e.name : "Error";
        console.warn("REDOWN flight breadcrumb incomplete.");
      } finally {
        clearTimeout(timer);
        headWriting = false;
        if (headDirty)
          headTimer = setTimeout(() => {
            headTimer = null;
            void writeHead();
          }, 250);
        notify();
      }
    }
    function checkpoint(code, event = {}) {
      const at = new Date(now()).toISOString();
      sequence++;
      headDirty = true;
      head.lastStarted = {
        code,
        at,
        attemptId: uid(event.attemptId) ? event.attemptId : null,
      };
      if (
        ["CORE_IMPORT_READY", "SHELF_READY", "SHELF_ACKNOWLEDGED"].includes(
          code,
        )
      )
        head.lastKnownGood = { ...head.lastStarted };
      if (code === "CORE_IMPORT_READY") head.performance = sample();
      if (!headWriting && !headTimer) void writeHead();
    }
    async function cleanupHeads() {
      // Once per activation, retain only our small new keys; never export other local values.
      try {
        const all = await chrome.storage.local.get(null),
          keys = Object.keys(all)
            .filter((k) => k.startsWith(PREFIX))
            .sort(
              (a, b) =>
                (Date.parse(all[b]?.startedAt) || 0) -
                (Date.parse(all[a]?.startedAt) || 0),
            );
        const previous = keys
          .filter((k) => k !== headKey)
          .map((k) => all[k])
          .find((v) => v?.context === "worker");
        if (previous && !head.firstRecovered) {
          head.firstRecovered = {
            at: new Date(now()).toISOString(),
            previousEpoch: uid(previous.epoch) ? previous.epoch : null,
            reason: "previous epoch stopped; reason unknown",
          };
          checkpoint("RECOVERED_UNKNOWN");
          void pin(
            {
              code: "PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN",
              at: new Date(now()).toISOString(),
              component: "worker",
              status: "unknown",
            },
            previous,
          );
        }
        if (keys.length > 16) await chrome.storage.local.remove(keys.slice(16));
      } catch {
        health.incomplete = true;
      }
    }
    function stall(e) {
      health.writeFailures++;
      health.incomplete = true;
      health.lastError = errorNames.has(e?.name) ? e.name : "Error";
      health.lastErrorCode = [
        "ARCHIVE_BACKEND_UNAVAILABLE",
        "ARCHIVE_OPEN_BLOCKED",
        "ARCHIVE_ID_CHANGED",
        "ARCHIVE_MISSING_DO_NOT_RESET",
        "PENDING_CHECKSUM_MISMATCH",
        "ARCHIVE_SEQUENCE_GAP",
        "ARCHIVE_TRANSACTION_ABORTED",
        "IMMUTABLE_SEGMENT_CONFLICT",
      ].includes(e?.message)
        ? e.message
        : "ARCHIVE_OPERATION_FAILED";
      health.stalled = true;
      notify();
    }
    function cache(force = false) {
      if (!force && now() - lastCache < 1000) return;
      lastCache = now();
      try {
        void chrome.storage.local
          .set({
            [CACHE]: {
              ...cached,
              health: { ...health },
              cachedAt: new Date(now()).toISOString(),
            },
          })
          .catch(() => {});
      } catch {}
      notify();
    }
    function accept(input) {
      if (loaded && !enabled) return false;
      const event = {
        id: input.id || crypto.randomUUID(),
        at: input.at || new Date(now()).toISOString(),
        epoch: input.epoch || epoch,
        ...input,
      };
      let bytes;
      try {
        bytes = new TextEncoder().encode(JSON.stringify(event)).length;
      } catch {
        bytes = Infinity;
      }
      if (
        queue.length >= 256 ||
        queueBytes + bytes > 1024 * 1024 ||
        bytes > 256 * 1024
      ) {
        health.dropped++;
        health.incomplete = true;
        health.firstLostId ||= event.id;
        health.lastLostId = event.id;
        cache();
        if (loaded && enabled) schedule();
        return false;
      }
      queue.push({
        event,
        bytes,
        raw: loaded && enabled && consent?.raw === true,
      });
      queueBytes += bytes;
      health.backlog = queue.length;
      health.maxBacklog = Math.max(health.maxBacklog, queue.length);
      health.maxBufferedBytes = Math.max(health.maxBufferedBytes, queueBytes);
      if (loaded) schedule();
      return true;
    }
    async function persistLoss() {
      if (health.dropped > (health.reportedDropped || 0)) {
        const through = health.dropped;
        await archive.gap({
          reason: "memory-buffer-full",
          count: through - (health.reportedDropped || 0),
          firstId: health.firstLostId,
          lastId: health.lastLostId,
        });
        health.reportedDropped = through;
      }
    }
    function schedule() {
      if (writing || !enabled || !loaded || health.stalled) return;
      writing = true;
      lane = lane
        .catch(() => {})
        .then(async () => {
          try {
            archive ||= archiveFactory();
            while (queue.length) {
              const batch = [];
              let batchBytes = 0;
              while (
                queue.length &&
                batch.length < 128 &&
                (batch.length === 0 ||
                  (batch[0].raw === queue[0].raw &&
                    batchBytes + queue[0].bytes <= 64 * 1024))
              ) {
                const item = queue.shift();
                batch.push(item);
                batchBytes += item.bytes;
              }
              queueBytes -= batch.reduce((n, v) => n + v.bytes, 0);
              health.backlog = queue.length;
              try {
                cached = await archive.append(
                  batch.map((v) => v.event),
                  { raw: batch[0].raw === true, expectedId: consent.archiveId },
                );
                await persistLoss();
                cache();
              } catch (e) {
                health.unconfirmed += batch.length;
                stall(e);
                try {
                  await archive.gap({
                    reason: reason(e),
                    count: batch.length,
                    unconfirmed: true,
                    sequenceRange: e?.pendingRange,
                    firstId: batch[0]?.event.id,
                    lastId: batch.at(-1)?.event.id,
                  });
                } catch {}
                break;
              }
            }
            if (!health.stalled) await persistLoss();
          } catch (e) {
            stall(e);
          } finally {
            writing = false;
            cache(true);
          }
        });
    }
    async function incidentsDB() {
      if (!database) throw Error("INCIDENT_STORAGE_UNAVAILABLE");
      if (!incidentConnection)
        incidentConnection = new Promise((resolve, reject) => {
          const r = database.open(INCIDENT_DB, 1);
          r.onupgradeneeded = () =>
            r.result.createObjectStore("incidents", { keyPath: "id" });
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
          r.onblocked = () => reject(Error("INCIDENT_STORAGE_BLOCKED"));
        }).catch((e) => {
          incidentConnection = null;
          throw e;
        });
      return incidentConnection;
    }
    async function pin(event, previous = null) {
      if (now() - lastPinAt < 1000) return;
      lastPinAt = now();
      const envelope = {
        schemaVersion: 1,
        id: event.id || crypto.randomUUID(),
        at: new Date(now()).toISOString(),
        epoch,
        build: BUILD,
        lastKnownGood: head.lastKnownGood,
        lastStarted: head.lastStarted,
        lastPersisted: head.lastPersisted,
        firstRecovered: head.firstRecovered,
        lastSave: head.lastSave || null,
        trigger: globalThis.RedownStartupCrashTrace?.clean(event) || {
          code: "UNKNOWN",
        },
        before: recent.slice(-16),
        health: { ...health },
        recoveredCheckpoint: previous
          ? {
              epoch: uid(previous.epoch) ? previous.epoch : null,
              lastKnownGood: step(previous.lastKnownGood),
              lastStarted: step(previous.lastStarted),
              lastPersisted: step(previous.lastPersisted),
            }
          : null,
        reason:
          "Observed fault/unknown epoch ending; normal idle can look the same; not proof of browser crash",
      };
      accept({ collector: "flight", kind: "incident", data: envelope });
      try {
        const db = await incidentsDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction("incidents", "readwrite"),
            s = tx.objectStore("incidents"),
            count = s.count();
          count.onsuccess = () => {
            if (count.result >= 16) {
              tx.abort();
              return;
            }
            s.add(envelope);
          };
          tx.oncomplete = resolve;
          tx.onabort = tx.onerror = () =>
            reject(Error("PINNED_INCIDENTS_FULL_OR_UNAVAILABLE"));
        });
      } catch {
        health.incidentFailure = true;
        health.incomplete = true;
        checkpoint("INCIDENT_PERSISTENCE_FAILED");
        console.warn(
          "REDOWN pinned incident capture incomplete; inspect recorder status.",
        );
        notify();
      }
    }
    function startup(event) {
      const safe = globalThis.RedownStartupCrashTrace?.clean(event) || null;
      if (!safe) return;
      recent.push(safe);
      if (recent.length > 32) recent.shift();
      accept({
        id: safe.id || crypto.randomUUID(),
        at: safe.at,
        epoch: safe.workerEpoch || epoch,
        attemptId: safe.attemptId,
        collector: "startup",
        kind: "lifecycle",
        data: safe,
      });
      if (
        [
          "WORKER_EVALUATION",
          "CORE_IMPORT_BEGIN",
          "CORE_IMPORT_READY",
          "CORE_IMPORT_FAILED",
          "WORKER_ERROR",
          "UNHANDLED_REJECTION",
          "SHELF_REQUEST",
          "SHELF_READY",
          "SHELF_READINESS_UNKNOWN",
          "WORKER_UPDATE",
        ].includes(safe.code)
      )
        checkpoint(safe.code, safe);
      if (
        [
          "CORE_IMPORT_FAILED",
          "WORKER_ERROR",
          "UNHANDLED_REJECTION",
          "SHELF_READINESS_UNKNOWN",
          "SHELF_OPEN_REJECTED",
        ].includes(safe.code)
      )
        void pin(safe);
    }
    function save(event) {
      const d = event.data || {};
      if (uid(event.attemptId)) {
        const same = head.lastSave?.attemptId === event.attemptId;
        head.lastSave = {
          ...(same ? head.lastSave : {}),
          attemptId: event.attemptId,
          at: new Date(event.at).toISOString(),
          provider: ["google", "dropbox", "onedrive", "cloudflare"].includes(
            d.provider || d.providerKind,
          )
            ? d.provider || d.providerKind
            : same
              ? head.lastSave.provider
              : "unknown",
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
          ].includes(d.stage)
            ? d.stage
            : same
              ? head.lastSave.stage
              : "unknown",
          outcome: [
            "COMPLETED",
            "FAILED",
            "BLOCKED",
            "UNCERTAIN",
            "INTERRUPTED",
            "CANCELLED",
          ].includes(d.outcome)
            ? d.outcome
            : same
              ? head.lastSave.outcome
              : "unknown",
        };
        if (now() - lastSaveCheckpoint >= 1000) {
          lastSaveCheckpoint = now();
          checkpoint("SAVE_PROGRESS", { attemptId: event.attemptId });
        }
      }
      accept({
        id: event.id || crypto.randomUUID(),
        at: new Date(event.at).toISOString(),
        epoch: event.workerEpoch || epoch,
        attemptId: event.attemptId,
        collector: "save",
        kind: event.kind,
        data: event.data,
      });
    }
    function proof(attemptId, entry, validated) {
      if (uid(attemptId)) {
        head.lastSave = {
          ...(head.lastSave?.attemptId === attemptId ? head.lastSave : {}),
          attemptId,
          provider: ["google", "dropbox", "onedrive", "cloudflare"].includes(
            entry.providerKind,
          )
            ? entry.providerKind
            : "unknown",
          at: new Date(now()).toISOString(),
          proofValidated: validated === true,
          jobId: uid(entry.transferId) ? entry.transferId : null,
        };
      }
      accept({
        attemptId,
        collector: "save",
        kind: "verified-receipt",
        data: {
          providerKind: entry.providerKind,
          destination: { accountId: entry.destination?.accountId },
          proofValidated: validated === true,
          status: entry.status,
        },
      });
    }
    async function setConsent(on, { confirmed = false, raw = false } = {}) {
      await ready;
      if (on && !confirmed) throw Error("EXPLICIT_CONFIRMATION_REQUIRED");
      let next, candidate;
      if (on) {
        candidate = archive || archiveFactory();
        let state;
        try {
          state = await candidate.ensure(consent?.archiveId);
          await candidate.recover(state.archiveId);
        } catch (e) {
          stall(e);
          throw e;
        }
        next = {
          version: 1,
          enabled: true,
          confirmed: true,
          confirmedAt: new Date(now()).toISOString(),
          raw: raw === true,
          archiveId: state.archiveId,
        };
      } else {
        enabled = false;
        next = { ...(consent || { version: 1 }), enabled: false };
      }
      try {
        await chrome.storage.local.set({ [CONSENT]: next });
      } catch (e) {
        enabled = false;
        stall(e);
        throw e;
      }
      consent = next;
      enabled = valid(next);
      if (on) {
        archive = candidate;
        health.stalled = false;
        schedule();
      }
      notify();
      return status();
    }
    chrome?.storage?.onChanged?.addListener((changes, area) => {
      if (area === "local" && changes[CACHE]) {
        cached = changes[CACHE].newValue;
        notify();
      }
      if (area === "local" && changes[CONSENT]) {
        consent = changes[CONSENT].newValue;
        enabled = valid(consent);
        if (enabled && !health.stalled) schedule();
        notify();
      }
    });
    async function listIncidents() {
      try {
        const db = await incidentsDB();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction("incidents", "readonly"),
            r = tx.objectStore("incidents").getAll();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
      } catch {
        return { state: "unavailable", captureIncomplete: true };
      }
    }
    async function deleteIncidents(confirmed) {
      if (!confirmed) throw Error("CONFIRM_DELETION_REQUIRED");
      const db = await incidentsDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("incidents", "readwrite");
        tx.objectStore("incidents").clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    async function snapshot() {
      let heads = [];
      try {
        const all = await chrome.storage.local.get(null);
        heads = Object.keys(all)
          .filter((k) => k.startsWith(PREFIX))
          .map((k) => all[k])
          .filter((h) => uid(h?.epoch))
          .map((h) => ({
            schemaVersion: 1,
            epoch: h.epoch,
            context: ["worker", "page"].includes(h.context)
              ? h.context
              : "unknown",
            build: {
              fingerprint: /^[a-f0-9]{64}$/.test(h.build?.fingerprint)
                ? h.build.fingerprint
                : "unavailable",
              baseline: /^[a-f0-9]{40}$/.test(h.build?.baseline)
                ? h.build.baseline
                : "unavailable",
              installedCommit: "not-observable",
            },
            version: /^\d+(?:\.\d+){0,3}$/.test(h.version)
              ? h.version
              : "unknown",
            lastSave: h.lastSave
              ? {
                  attemptId: uid(h.lastSave.attemptId)
                    ? h.lastSave.attemptId
                    : null,
                  at: instant(h.lastSave.at),
                  provider: [
                    "google",
                    "dropbox",
                    "onedrive",
                    "cloudflare",
                  ].includes(h.lastSave.provider)
                    ? h.lastSave.provider
                    : "unknown",
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
                  ].includes(h.lastSave.stage)
                    ? h.lastSave.stage
                    : "unknown",
                  outcome: [
                    "COMPLETED",
                    "FAILED",
                    "BLOCKED",
                    "UNCERTAIN",
                    "INTERRUPTED",
                    "CANCELLED",
                  ].includes(h.lastSave.outcome)
                    ? h.lastSave.outcome
                    : "unknown",
                  proofValidated: h.lastSave.proofValidated === true,
                  jobId: uid(h.lastSave.jobId) ? h.lastSave.jobId : null,
                }
              : null,
            lastKnownGood: step(h.lastKnownGood),
            lastStarted: step(h.lastStarted),
            lastPersisted: step(h.lastPersisted),
            firstRecovered: h.firstRecovered
              ? {
                  at: instant(h.firstRecovered.at),
                  previousEpoch: uid(h.firstRecovered.previousEpoch)
                    ? h.firstRecovered.previousEpoch
                    : null,
                  reason: "previous epoch stopped; reason unknown",
                }
              : null,
            sequence: number(h.sequence),
            observedAt: instant(h.observedAt),
            performance:
              typeof h.performance === "object"
                ? Object.fromEntries(
                    [
                      "usedJSHeapSize",
                      "totalJSHeapSize",
                      "jsHeapSizeLimit",
                      "eventLoopDelayMs",
                    ].map((k) => [k, number(h.performance?.[k])]),
                  )
                : "unavailable",
            health: safeHealth(h.health),
          }));
      } catch {
        health.incomplete = true;
      }
      return {
        schemaVersion: 1,
        scope:
          "Privacy-safe flight checkpoints and pinned incidents; UNKNOWN stops are not crashes",
        heads,
        incidents: await listIncidents(),
        status: await status(),
      };
    }
    async function status() {
      await ready;
      return {
        requestedOn: valid(consent),
        on: enabled,
        raw: consent?.raw === true,
        backend:
          "IndexedDB in Chrome extension profile (browser-managed quota; no arbitrary Windows folder)",
        archive: safeStats(cached),
        health: safeHealth({
          ...health,
          backlog: Math.max(health.backlog || 0, cached?.health?.backlog || 0),
          writeFailures: Math.max(
            health.writeFailures || 0,
            cached?.health?.writeFailures || 0,
          ),
          dropped: Math.max(health.dropped || 0, cached?.health?.dropped || 0),
          incomplete: health.incomplete || cached?.health?.incomplete,
          stalled: health.stalled || cached?.health?.stalled,
          lastError: health.lastError || cached?.health?.lastError,
          lastErrorCode: health.lastErrorCode || cached?.health?.lastErrorCode,
        }),
        lastConfirmedCoreSequence: lastConfirmed,
        core: { epoch, headKey },
        captureIncomplete:
          health.incomplete || cached?.health?.incomplete === true,
        cachedAt: instant(cached?.cachedAt),
        backlogScope:
          "Largest reported collector backlog, not proof of all contexts",
        location: "Chrome profile; exact OS path not exposed",
        limits:
          "Capless persisted segments have no app retention/TTL; memory queue 256 events / 1 MiB",
        encryption:
          "Default capless records are SECURE. Optional RAW is plaintext in the local browser profile; not independently encrypted.",
      };
    }
    async function reader() {
      await ready;
      const a = archive || archiveFactory();
      if (consent?.archiveId) await a.ensure(consent.archiveId);
      return a;
    }
    function install() {
      if (context === "worker") {
        checkpoint("WORKER_EVALUATION");
        void ready.then(() => cleanupHeads());
      } else {
        checkpoint("PAGE_OPEN");
        const sampledAt = globalThis.performance?.now?.();
        setTimeout(() => {
          const heap = sample();
          head.performance = {
            ...(typeof heap === "object" ? heap : { heap: "unavailable" }),
            eventLoopDelayMs: Number.isFinite(sampledAt)
              ? Math.max(0, performance.now() - sampledAt)
              : "unavailable",
          };
          checkpoint("PAGE_SAMPLED");
        }, 0);
      }
      return api;
    }
    const api = {
      startup,
      save,
      proof,
      checkpoint,
      setConsent,
      status,
      snapshot,
      listIncidents,
      deleteIncidents,
      reader,
      ready,
      async flush() {
        await ready;
        await lane;
      },
      health,
      install,
    };
    return api;
  }
  function install(context) {
    if (globalThis.RedownFlightRecorder) return globalThis.RedownFlightRecorder;
    const r = create({ context });
    globalThis.RedownFlightRecorder = r;
    return r.install();
  }
  globalThis.RedownFlightRecorderAPI = {
    create,
    install,
    CONSENT,
    CACHE,
    BUILD,
  };
})();

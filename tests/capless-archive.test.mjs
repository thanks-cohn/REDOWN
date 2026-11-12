import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
const tick = () => new Promise((r) => setImmediate(r));
function mutex() {
  const lanes = new Map();
  return {
    request(name, fn) {
      const p = (lanes.get(name) || Promise.resolve()).catch(() => {}).then(fn);
      lanes.set(name, p);
      return p;
    },
  };
}
function fixture({
  database = new IDBFactory(),
  local = {},
  fault = () => {},
  chromeFailure = false,
} = {}) {
  const listeners = [];
  let opens = 0;
  const open = database?.open?.bind(database);
  if (open)
    database.open = (...args) => {
      opens++;
      return open(...args);
    };
  const chrome = {
    runtime: { getManifest: () => ({ version: "0.5.27" }), id: "a".repeat(32) },
    storage: {
      onChanged: { addListener: (fn) => listeners.push(fn) },
      local: {
        get: async (keys) => {
          if (chromeFailure) throw new DOMException("PRIVATE", "SecurityError");
          return keys === null
            ? structuredClone(local)
            : Object.fromEntries(
                (Array.isArray(keys) ? keys : [keys]).map((k) => [
                  k,
                  structuredClone(local[k]),
                ]),
              );
        },
        set: async (patch) => {
          if (chromeFailure) throw new DOMException("PRIVATE", "SecurityError");
          Object.assign(local, structuredClone(patch));
          for (const fn of listeners)
            fn(
              Object.fromEntries(
                Object.entries(patch).map(([k, v]) => [k, { newValue: v }]),
              ),
              "local",
            );
        },
        remove: async (keys) => {
          for (const key of Array.isArray(keys) ? keys : [keys])
            delete local[key];
        },
      },
    },
  };
  const locks = mutex(),
    c = vm.createContext({
      crypto: webcrypto,
      indexedDB: database,
      IDBKeyRange,
      TextEncoder,
      TextDecoder,
      Uint8Array,
      URL,
      performance,
      structuredClone,
      setTimeout,
      clearTimeout,
      console: { warn() {} },
      chrome,
      navigator: { locks, userAgent: "Chrome/156.0.0.0 Windows" },
      Event,
    });
  for (const file of [
    "startup-crash-trace.js",
    "save-evidence.js",
    "forensic-diagnostics.js",
    "capless-archive.js",
    "flight-recorder.js",
  ])
    vm.runInContext(
      process.env.REDOWN_FOLLOWUP_BASELINE && file === "flight-recorder.js"
        ? execFileSync(
            "git",
            ["show", "f9f6d0d:extension/flight-recorder.js"],
            { encoding: "utf8" },
          )
        : readFileSync("extension/" + file, "utf8"),
      c,
    );
  const make = () => c.RedownCaplessArchive.create({ database, locks, fault });
  const archive = make();
  const flight = c.RedownFlightRecorderAPI.create({
    chrome,
    database,
    locks,
    context: "worker",
    archiveFactory: make,
  });
  return {
    c,
    chrome,
    local,
    database,
    archive,
    flight,
    locks,
    get opens() {
      return opens;
    },
  };
}
const event = (extra = {}) => ({
  id: webcrypto.randomUUID(),
  attemptId: webcrypto.randomUUID(),
  at: new Date().toISOString(),
  epoch: webcrypto.randomUUID(),
  collector: "save",
  kind: "click",
  data: {
    provider: "google",
    pageUrl: "https://www.google.com/search?q=PRIVATE",
    sourceUrl: "https://cdn.invalid/PRIVATE?sig=PRIVATE",
    ...extra,
  },
  ...extra,
});
test("OFF defaults never open the heavy archive, Debug does not opt in, confirmation is required", async () => {
  const f = fixture({ local: { debugModeEnabled: true } });
  await f.flight.ready;
  for (let i = 0; i < 100; i++)
    f.flight.save({
      id: webcrypto.randomUUID(),
      attemptId: webcrypto.randomUUID(),
      at: Date.now(),
      data: { sourceUrl: "PRIVATE" },
      kind: "click",
    });
  await f.flight.flush();
  assert.equal(f.opens, 0);
  assert.equal((await f.flight.status()).on, false);
  await assert.rejects(f.flight.setConsent(true), /CONFIRMATION/);
  assert.equal(f.opens, 0);
});
test("confirmed ON writes append-only history; OFF/re-enable preserve IDs and require fresh confirmation", async () => {
  const f = fixture();
  await f.flight.setConsent(true, { confirmed: true });
  const id = f.local.redownCaplessConsentV1.archiveId;
  const e = event();
  f.flight.save({
    id: e.id,
    attemptId: e.attemptId,
    at: Date.now(),
    kind: e.kind,
    data: e.data,
  });
  await f.flight.flush();
  const before = await (await f.flight.reader()).stats();
  assert.equal(before.records, 1);
  await f.flight.setConsent(false);
  f.flight.save({
    id: webcrypto.randomUUID(),
    attemptId: e.attemptId,
    at: Date.now(),
    kind: "stage",
    data: { stage: "TERMINAL" },
  });
  await f.flight.flush();
  assert.equal((await (await f.flight.reader()).stats()).records, 1);
  await assert.rejects(f.flight.setConsent(true), /CONFIRMATION/);
  await f.flight.setConsent(true, { confirmed: true });
  assert.equal(f.local.redownCaplessConsentV1.archiveId, id);
  assert.equal((await (await f.flight.reader()).stats()).records, 1);
});
test("SECURE archive has keyed source/account correlations, optional RAW keeps exact data and never credentials", async () => {
  const f = fixture();
  const a = event({
    destination: { accountId: "PRIVATE_ACCOUNT" },
    error: { message: "PRIVATE_ERROR", stack: "PRIVATE_STACK" },
    headers: { authorization: "NEVER_TOKEN" },
  });
  await f.archive.ensure();
  await f.archive.append([a]);
  const rows = await f.archive.page();
  assert.doesNotMatch(rows[0].jsonl, /PRIVATE|NEVER_TOKEN/);
  const secure = JSON.parse(rows[0].jsonl);
  assert.equal(secure.evidence.sourceSite, "google-search");
  assert.match(secure.evidence.accountRef, /^[a-f0-9]{64}$/);
  const raw = event({
    data: {
      sourceUrl: "https://private.invalid/a?sig=RAW_SIGNED",
      pageUrl: "https://site.invalid/RAW_PAGE",
      token: "NEVER_TOKEN",
      error: new Error("RAW_ERROR"),
    },
  });
  await f.archive.append([raw], { raw: true });
  const text = (await f.archive.page()).at(-1).jsonl;
  assert.ok(text.includes("RAW_SIGNED"));
  assert.ok(text.includes("RAW_ERROR"));
  assert.doesNotMatch(text, /NEVER_TOKEN/);
});
test("reserved but interrupted writes recover once with immutable segments and no duplicate event IDs", async () => {
  let fail = true;
  const f = fixture({
    fault: (stage) => {
      if (stage === "afterReserve" && fail) {
        fail = false;
        throw Error("injected kill after reserve");
      }
    },
  });
  const a = event();
  await f.archive.ensure();
  await assert.rejects(f.archive.append([a]));
  let s = await f.archive.stats();
  assert.equal(s.records, 0);
  assert.equal(s.pendingSegments, 1);
  const partial = await f.archive.exportPart();
  assert.ok(Object.keys(partial.files).some((k) => k.startsWith("pending/")));
  assert.equal(
    JSON.parse(partial.files["manifest.json"]).pendingJournal[0].status,
    "unconfirmed journal; not a closed segment",
  );
  await f.archive.recover(s.archiveId);
  await f.archive.append([a]);
  s = await f.archive.stats();
  assert.equal(s.records, 1);
  assert.equal(s.pendingSegments, 0);
  const first = (await f.archive.page())[0];
  await f.archive.append([event()]);
  assert.equal((await f.archive.page())[0].digest, first.digest);
  assert.equal((await f.archive.verify()).manifestMatches, true);
});
test("aborted finalize preserves the pending journal and previously committed segments", async () => {
  let fail = false;
  const f = fixture({
    fault: (stage, tx) => {
      if (stage === "beforeCommit" && fail) {
        fail = false;
        tx.abort();
      }
    },
  });
  await f.archive.ensure();
  await f.archive.append([event()]);
  const first = (await f.archive.page())[0];
  fail = true;
  await assert.rejects(f.archive.append([event()]));
  assert.equal((await f.archive.stats()).records, 1);
  await f.archive.recover();
  assert.equal((await f.archive.stats()).records, 2);
  assert.equal((await f.archive.page())[0].digest, first.digest);
});
test("checksum corruption blocks recovery; no silent repair, overwrite or deletion", async () => {
  let fail = true;
  const f = fixture({
    fault: (stage) => {
      if (stage === "afterReserve" && fail) {
        fail = false;
        throw Error("kill");
      }
    },
  });
  await f.archive.ensure();
  await assert.rejects(f.archive.append([event()]));
  const db = await new Promise((r, j) => {
    const q = f.database.open("redown-capless-archive-v1");
    q.onsuccess = () => r(q.result);
    q.onerror = () => j(q.error);
  });
  await new Promise((resolve) => {
    const tx = db.transaction("pending", "readwrite"),
      s = tx.objectStore("pending"),
      r = s.openCursor();
    r.onsuccess = () => {
      const c = r.result;
      c.update({ ...c.value, jsonl: '{"PRIVATE":"corrupted"}\n' });
    };
    tx.oncomplete = resolve;
  });
  await assert.rejects(f.archive.recover(), /CHECKSUM/);
  assert.equal((await f.archive.stats()).pendingSegments, 1);
  assert.equal((await f.archive.stats()).records, 0);
  db.close();
});
test("site/provider/account/date statistics use verified proof and unique attempts, not stage success or four writes per file", async () => {
  const f = fixture();
  await f.archive.ensure();
  const id = webcrypto.randomUUID(),
    a = event({ attemptId: id });
  await f.archive.append([
    a,
    {
      ...event(),
      attemptId: id,
      kind: "stage",
      data: { stage: "TERMINAL", outcome: "COMPLETED" },
    },
  ]);
  let q = await f.archive.attempts({
    site: "google-search",
    provider: "google",
  });
  assert.equal(q.counts.observedNativeAttempts, 1);
  assert.equal(q.counts.verified, 0);
  assert.equal(q.counts.unknown, 1);
  await f.archive.append([
    {
      ...event(),
      attemptId: id,
      kind: "verified-receipt",
      data: {
        providerKind: "google",
        proofValidated: true,
        destination: { accountId: "PRIVATE_ACCOUNT" },
      },
    },
  ]);
  q = await f.archive.attempts();
  assert.equal(q.counts.verified, 1);
  assert.equal(q.rates, null);
  assert.equal(
    f.c.RedownCaplessArchive.sourceSite("https://drive.google.com/file/a"),
    "other",
  );
});
test("bounded multipart export covers the whole committed snapshot with segment hashes and gap endpoints", async () => {
  const f = fixture();
  await f.archive.ensure();
  for (let i = 0; i < 11; i++) await f.archive.append([event()]);
  await f.archive.gap({
    reason: "memory-buffer-full",
    count: 2,
    firstId: webcrypto.randomUUID(),
    lastId: webcrypto.randomUUID(),
  });
  let cursor = null,
    total = 0,
    parts = 0;
  do {
    const p = await f.archive.exportPart(cursor || {});
    for (const [name, text] of Object.entries(p.files))
      if (name.startsWith("segments/"))
        total += text.trimEnd().split("\n").length;
    const manifest = JSON.parse(p.files["manifest.json"]);
    assert.ok(manifest.segments.every((s) => /^[a-f0-9]{64}$/.test(s.digest)));
    parts++;
    cursor = p.more
      ? {
          after: p.nextAfter,
          boundary: p.boundary,
          gapAfter: p.nextGapAfter,
          gapsDone: p.gapsDone,
          snapshot: p.snapshot,
        }
      : null;
  } while (cursor);
  assert.equal(total, 11);
  assert.equal(parts, 2);
});
test("permission/quota failures remain explicit and bounded, preserving earlier data", async () => {
  const f = fixture({ database: null });
  await assert.rejects(
    f.flight.setConsent(true, { confirmed: true }),
    /UNAVAILABLE/,
  );
  const s = await f.flight.status();
  assert.equal(s.on, false);
  assert.equal(s.captureIncomplete, true);
  assert.equal(f.local.redownCaplessConsentV1, undefined);
  const good = fixture();
  await good.flight.setConsent(true, { confirmed: true });
  for (let i = 0; i < 400; i++)
    good.flight.save({
      id: webcrypto.randomUUID(),
      attemptId: webcrypto.randomUUID(),
      kind: "click",
      at: Date.now(),
      data: { sourceUrl: "x".repeat(300 * 1024) },
    });
  await good.flight.flush();
  const h = await good.flight.status();
  assert.equal(h.captureIncomplete, true);
  assert.ok(h.health.dropped > 0);
  assert.ok((await (await good.flight.reader()).gaps()).count > 0);
  assert.ok(h.health.maxBufferedBytes <= 1024 * 1024);
});
test("privacy choice is captured at admission; changing RAW cannot retroactively expose queued SECURE events", async () => {
  const f = fixture();
  await f.flight.setConsent(true, { confirmed: true });
  f.flight.save({
    id: webcrypto.randomUUID(),
    attemptId: webcrypto.randomUUID(),
    kind: "click",
    at: Date.now(),
    data: { sourceUrl: "https://private.invalid/PRIVATE_BEFORE" },
  });
  await f.flight.setConsent(true, { confirmed: true, raw: true });
  await f.flight.flush();
  const text = (await (await f.flight.reader()).page())
    .map((s) => s.jsonl)
    .join("");
  assert.doesNotMatch(text, /PRIVATE_BEFORE/);
});
test("confirmed enabled choice recovers a reserved journal after a new worker epoch", async () => {
  let kill = false;
  const f = fixture({
    fault: (stage) => {
      if (kill && stage === "afterReserve") {
        kill = false;
        throw Error("simulated termination");
      }
    },
  });
  await f.flight.setConsent(true, { confirmed: true });
  kill = true;
  f.flight.save({
    id: webcrypto.randomUUID(),
    at: Date.now(),
    kind: "click",
    data: {},
  });
  await f.flight.flush();
  assert.equal((await f.flight.status()).captureIncomplete, true);
  assert.equal((await f.archive.stats()).pendingSegments, 1);
  const restarted = f.c.RedownFlightRecorderAPI.create({
    chrome: f.chrome,
    database: f.database,
    locks: f.locks,
  });
  await restarted.ready;
  const s = await (await restarted.reader()).stats();
  assert.equal(s.records, 1);
  assert.equal(s.pendingSegments, 0);
  assert.equal((await restarted.status()).on, true);
});
test("archive identity mismatch or missing storage blocks capture without resetting existing consent or history", async () => {
  const f = fixture();
  await f.flight.setConsent(true, { confirmed: true });
  const id = f.local.redownCaplessConsentV1.archiveId;
  await assert.rejects(f.archive.ensure(webcrypto.randomUUID()), /ID_CHANGED/);
  const missing = f.c.RedownCaplessArchive.create({
    database: new IDBFactory(),
    locks: f.locks,
  });
  await assert.rejects(missing.ensure(id), /MISSING_DO_NOT_RESET/);
  assert.equal((await f.archive.stats()).archiveId, id);
  assert.equal(f.local.redownCaplessConsentV1.archiveId, id);
});
test("permission loss after earlier commits stalls only logging and preserves prior segments", async () => {
  let deny = false;
  const f = fixture({
    fault: (stage) => {
      if (deny && stage === "beforeCommit")
        throw new DOMException("PRIVATE", "NotAllowedError");
    },
  });
  await f.flight.setConsent(true, { confirmed: true });
  f.flight.save({
    id: webcrypto.randomUUID(),
    at: Date.now(),
    kind: "click",
    data: {},
  });
  await f.flight.flush();
  const prior = (await f.archive.page())[0];
  deny = true;
  f.flight.save({
    id: webcrypto.randomUUID(),
    at: Date.now(),
    kind: "click",
    data: {},
  });
  await f.flight.flush();
  const status = await f.flight.status();
  assert.equal(status.health.stalled, true);
  assert.equal(status.captureIncomplete, true);
  assert.equal((await f.archive.page())[0].digest, prior.digest);
  assert.equal((await f.archive.stats()).records, 1);
  assert.equal((await f.archive.gaps()).count, 1);
});
test("old records have no TTL and a failed consent write cannot enable recording", async () => {
  const f = fixture();
  await f.archive.ensure();
  await f.archive.append([event({ at: "2001-01-01T00:00:00.000Z" })]);
  assert.equal(
    JSON.parse((await f.archive.page())[0].jsonl).at,
    "2001-01-01T00:00:00.000Z",
  );
  const failed = fixture({ chromeFailure: true });
  await assert.rejects(failed.flight.setConsent(true, { confirmed: true }));
  assert.equal((await failed.flight.status()).on, false);
});
test("pre-import checkpoint persists without the core; pinned fault envelopes require explicit deletion", async () => {
  const f = fixture();
  f.flight.install();
  await tick();
  await tick();
  assert.ok(
    Object.keys(f.local).some((k) => k.startsWith("redownFlightEpochV1:")),
  );
  f.flight.startup({
    code: "CORE_IMPORT_FAILED",
    component: "core",
    status: "rejected",
    errorName: "SyntaxError",
    at: new Date().toISOString(),
  });
  let pins = [];
  for (let i = 0; i < 30; i++) {
    await tick();
    pins = await f.flight.listIncidents();
    if (pins.length) break;
  }
  assert.equal(pins.length, 1);
  assert.equal(pins[0].trigger.code, "CORE_IMPORT_FAILED");
  assert.doesNotMatch(JSON.stringify(pins), /PRIVATE/);
  await assert.rejects(f.flight.deleteIncidents(false), /CONFIRM/);
  assert.equal((await f.flight.listIncidents()).length, 1);
  await f.flight.deleteIncidents(true);
  assert.equal((await f.flight.listIncidents()).length, 0);
});

test("bounded fast index never caps durable incident history or falsely stalls the archive", async () => {
  const f = fixture();
  let clock = Date.now();
  const flight = f.c.RedownFlightRecorderAPI.create({
    chrome: f.chrome,
    database: f.database,
    locks: f.locks,
    now: () => clock,
  });
  await flight.ready;
  let oldest;
  for (let n = 0; n < 17; n++) {
    clock += 1001;
    flight.startup({
      code: "CORE_IMPORT_FAILED",
      component: "core",
      status: "rejected",
      at: new Date(clock).toISOString(),
    });
    for (let k = 0; k < 6; k++) await tick();
    const rows = await flight.listIncidents();
    if (n === 0) oldest = rows[0].id;
  }
  const rows = await flight.listIncidents();
  assert.equal(rows.length, 16);
  assert.ok((await flight.incidentPage()).rows.some((r) => r.id === oldest));
  assert.equal((await flight.incidentStats()).durableIncidents, 17);
  assert.equal((await flight.status()).captureIncomplete, false);
});

test("legacy 16/16 pinned evidence migrates without deletion; a real new fault persists while archive stays healthy", async () => {
  const f = fixture();
  await f.flight.setConsent(true, { confirmed: true });
  const ids = Array.from({ length: 16 }, () => webcrypto.randomUUID());
  await new Promise((resolve, reject) => {
    const r = f.database.open("redown-flight-incidents-v1", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("incidents", { keyPath: "id" });
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result,
        tx = db.transaction("incidents", "readwrite");
      for (const id of ids)
        tx.objectStore("incidents").add({
          schemaVersion: 1,
          id,
          at: "2026-11-12T10:00:00.000Z",
          trigger: { code: "PREVIOUS_EPOCH_STOPPED_REASON_UNKNOWN" },
          before: [],
        });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
  f.flight.startup({
    code: "CORE_IMPORT_FAILED",
    component: "core",
    status: "rejected",
    at: new Date().toISOString(),
  });
  for (let i = 0; i < 20; i++) await tick();
  await f.flight.flush();
  const status = await f.flight.status();
  assert.equal(status.health.incidentFailure, false);
  assert.equal(status.health.stalled, false);
  assert.equal(status.captureIncomplete, false);
  const meta = await f.flight.incidentStats();
  assert.equal(meta.legacyPinned, 16);
  assert.equal(meta.durableIncidents, 17);
  assert.equal(meta.fastIndex, 16);
  assert.ok(
    (await f.flight.incidentPage()).rows.filter((r) => ids.includes(r.id))
      .length === 16,
  );
  assert.equal(
    (await (await f.flight.reader()).verify()).manifestMatches,
    true,
  );
  await f.flight.deleteIncidents(true);
  assert.equal((await f.flight.incidentStats()).durableIncidents, 17);
  assert.equal((await f.flight.incidentStats()).legacyPinned, 16);
});
test("routine worker epochs never produce pinned faults; historical incomplete is distinct from an active archive stall", async () => {
  const f = fixture({
    local: {
      redownCaplessStatusV1: {
        health: { incomplete: true, incidentFailure: true, stalled: false },
      },
    },
  });
  await f.flight.ready;
  for (let i = 0; i < 20; i++) {
    const r = f.c.RedownFlightRecorderAPI.create({
      chrome: f.chrome,
      database: f.database,
      locks: f.locks,
    });
    await r.ready;
    r.install();
    for (let n = 0; n < 4; n++) await tick();
  }
  assert.equal((await f.flight.incidentStats()).durableIncidents, 0);
  const status = await f.flight.status();
  assert.equal(status.archiveStalled, false);
  assert.equal(status.historicCaptureIncomplete, true);
  assert.ok(status.signals.includes("HISTORIC_CAPTURE_INCOMPLETE"));
});
test("incident history pages remain complete beyond fast-index capacity, including explicit fast-index clear", async () => {
  const f = fixture();
  let clock = Date.now();
  const r = f.c.RedownFlightRecorderAPI.create({
    chrome: f.chrome,
    database: f.database,
    locks: f.locks,
    now: () => clock,
  });
  await r.ready;
  for (let n = 0; n < 70; n++) {
    clock += 1001;
    r.startup({
      code: "WORKER_ERROR",
      component: "worker",
      status: "rejected",
      at: new Date(clock).toISOString(),
    });
    for (let k = 0; k < 4; k++) await tick();
  }
  let after = 0,
    boundary,
    count = 0;
  do {
    const p = await r.incidentPage(after, boundary);
    boundary = p.boundary;
    count += p.rows.length;
    after = p.nextAfter;
    if (!p.more) break;
  } while (true);
  assert.equal(count, 70);
  assert.equal((await r.listIncidents()).length, 16);
  await r.deleteIncidents(true);
  assert.equal((await r.incidentStats()).durableIncidents, 70);
});

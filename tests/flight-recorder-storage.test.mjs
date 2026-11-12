import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { webcrypto } from "node:crypto";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function fixture() {
  const local = {},
    writes = [],
    warnings = [];
  let release;
  const storage = {
    get: async (k) => ({ [k]: structuredClone(local[k]) }),
    set: (patch) => {
      writes.push(structuredClone(patch));
      if (writes.length === 1)
        return new Promise(
          (r) =>
            (release = () => {
              Object.assign(local, structuredClone(patch));
              r();
            }),
        );
      Object.assign(local, structuredClone(patch));
      return Promise.resolve();
    },
  };
  const c = vm.createContext({
    crypto: webcrypto,
    performance,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 1000 ? 10 : ms),
    clearTimeout,
    console: { warn: (...v) => warnings.push(v) },
  });
  const source = process.env.REDOWN_FLIGHT_BASELINE
    ? execFileSync(
        "git",
        ["show", "dc1a4e1:extension/startup-crash-trace.js"],
        { encoding: "utf8" },
      )
    : readFileSync("extension/startup-crash-trace.js", "utf8");
  vm.runInContext(source, c);
  const trace = c.RedownStartupCrashTrace.create({
    chrome: {
      storage: { local: storage },
      runtime: { getManifest: () => ({ version: "0.5.27" }) },
    },
    locks: { request: async (_n, fn) => fn() },
    coalesceMs: 0,
  });
  return { trace, writes, local, warnings, release: () => release() };
}
test("a slow diagnostic write keeps serialization ownership until actual settlement, never overwriting later events", async () => {
  const f = fixture();
  f.trace.record({
    code: "CORE_IMPORT_BEGIN",
    component: "core",
    stage: "import",
    status: "started",
  });
  await pause(20);
  f.trace.record({
    code: "CORE_IMPORT_READY",
    component: "core",
    stage: "import",
    status: "accepted",
  });
  await pause(20);
  try {
    assert.equal(
      f.writes.length,
      1,
      "Deadline must not release serialization while Chrome set is unresolved",
    );
  } finally {
    f.release();
  }
  await f.trace.flush();
  await pause(5);
  const s = await f.trace.snapshot();
  assert.ok(s.events.some((e) => e.code === "CORE_IMPORT_BEGIN"));
  assert.ok(s.events.some((e) => e.code === "CORE_IMPORT_READY"));
  assert.ok(
    !s.events.some((e) => e.code === "TRACE_STORAGE_FAILED"),
    "A slow successful write must not recursively log a storage failure",
  );
});
test("unchanged forensic health does not generate one chrome.storage.local write per recorded event", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  let healthWrites = 0;
  const local = {};
  const c = vm.createContext({
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
    structuredClone,
    setTimeout,
    clearTimeout,
    console: { warn() {} },
  });
  const source = process.env.REDOWN_FLIGHT_BASELINE
    ? execFileSync(
        "git",
        ["show", "dc1a4e1:extension/forensic-diagnostics.js"],
        { encoding: "utf8" },
      )
    : readFileSync("extension/forensic-diagnostics.js", "utf8");
  vm.runInContext(source, c);
  const store = c.RedownForensicDiagnostics.create({
    database: new IDBFactory(),
    healthStorage: {
      get: async (k) => ({ [k]: local[k] }),
      set: async (patch) => {
        healthWrites++;
        Object.assign(local, patch);
      },
    },
  });
  for (let i = 0; i < 100; i++) {
    store.record(webcrypto.randomUUID(), "stage", { stage: "ADMITTED" });
    await store.flush();
    await pause(0);
  }
  assert.ok(
    healthWrites <= 2,
    "Repeated healthy status should be coalesced/deduplicated, saw " +
      healthWrites,
  );
  assert.equal((await store.snapshot()).records.length, 100);
});
test("entry journal also keeps a timed-out set serialized until it truly settles", async () => {
  const path = "extension/entry-bootstrap.js",
    source = process.env.REDOWN_FLIGHT_BASELINE
      ? execFileSync("git", ["show", "dc1a4e1:" + path], { encoding: "utf8" })
      : readFileSync(path, "utf8");
  const local = { entryPointEvidence: [] },
    writes = [];
  let release;
  const c = vm.createContext({
    crypto: webcrypto,
    performance,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 1000 ? 10 : ms),
    clearTimeout,
    console: { warn() {} },
    chrome: {
      runtime: { getManifest: () => ({ version: "0.5.27" }) },
      storage: {
        local: {
          get: async (keys) =>
            Object.fromEntries(keys.map((k) => [k, structuredClone(local[k])])),
          set: (patch) => {
            writes.push(patch);
            if (writes.length === 1)
              return new Promise(
                (r) =>
                  (release = () => {
                    Object.assign(local, patch);
                    r();
                  }),
              );
            Object.assign(local, patch);
            return Promise.resolve();
          },
        },
      },
    },
  });
  vm.runInContext(
    source.slice(
      source.indexOf("let entryEvidenceQueue"),
      source.indexOf("// One authority:"),
    ),
    c,
  );
  vm.runInContext(
    source.slice(
      source.indexOf("function boundedEntry("),
      source.indexOf("async function verifyShelf("),
    ),
    c,
  );
  c.entryEvidence("toolbar", "open", "shelf", "SHELF_READY", false);
  await pause(20);
  c.entryEvidence("toolbar", "open", "shelf", "SHELF_READINESS_UNKNOWN", false);
  await pause(20);
  try {
    assert.equal(writes.length, 1);
  } finally {
    release();
  }
  await vm.runInContext("entryEvidenceQueue", c);
  assert.equal(local.entryPointEvidence.length, 2);
});

test('five-second late Chrome API acceptance remains diagnostic evidence, never another listener or automatic reload',async()=>{
 const {worker}=await import('./helpers/background-worker.mjs');const h=worker(undefined,{backgroundSource:readFileSync('extension/service-worker.js','utf8')});await h.ready();
 const late=()=>new Promise(resolve=>setTimeout(resolve,5150));
 const one=h.context.boundedEntry(late(),1000,'sidePanel.setPanelBehavior'),two=h.context.boundedEntry(late(),1000,'storage.local.get');await Promise.all([assert.rejects(one),assert.rejects(two)]);await new Promise(resolve=>setTimeout(resolve,4250));await h.context.RedownStartupTrace.flush();const trace=await h.context.RedownStartupTrace.snapshot();
 for(const api of ['sidePanel.setPanelBehavior','storage.local.get']){assert.ok(trace.events.some(e=>e.api===api&&e.code==='API_TIMED_OUT'));assert.ok(trace.events.some(e=>e.api===api&&e.code==='API_LATE_ACCEPTED'&&e.durationMs>=5000));}
 assert.equal(h.chrome.action.onClicked.listeners.length,1);assert.equal(h.chrome.contextMenus.onClicked.listeners.length,1);
});

test('privacy-safe startup frames retain new recorder module locations but reject arbitrary source names',()=>{
 const c=vm.createContext({});vm.runInContext(readFileSync('extension/startup-crash-trace.js','utf8'),c);const event=c.RedownStartupCrashTrace.clean({code:'WORKER_ERROR',sourceFrames:[{file:'flight-recorder.js',line:526,column:8},{file:'PRIVATE_FILENAME.js',line:1,column:1}]});assert.equal(event.sourceFrames.length,1);assert.equal(event.sourceFrames[0].file,'flight-recorder.js');assert.doesNotMatch(JSON.stringify(event),/PRIVATE/);
});

/* Large local fixture only; fake IndexedDB is RAM-backed, not a Chrome memory claim. */
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
const path = process.argv[2] || "work/p0-capless/stress.json";
mkdirSync("work/p0-capless", { recursive: true });
const c = vm.createContext({
  crypto: webcrypto,
  TextEncoder,
  Uint8Array,
  URL,
  performance,
  IDBKeyRange,
  setTimeout,
  clearTimeout,
  console,
});
for (const file of [
  "save-evidence.js",
  "forensic-diagnostics.js",
  "capless-archive.js",
])
  vm.runInContext(readFileSync("extension/" + file, "utf8"), c);
const locks = { request: async (_name, fn) => fn() },
  database = new IDBFactory(),
  archive = c.RedownCaplessArchive.create({ database, locks });
await archive.ensure();
const epoch = webcrypto.randomUUID(),
  started = performance.now(),
  checkpoints = [];
let beforeDigest;
for (let at = 0; at < 100000; ) {
  const batch = Array.from({ length: Math.min(128, 100000 - at) }, (_, i) => ({
    id: webcrypto.randomUUID(),
    epoch,
    collector: "flight",
    kind: "observation",
    at: new Date(1794490000000 + at + i).toISOString(),
    data: { phase: "source", bytes: at + i },
  }));
  await archive.append(batch);
  at += batch.length;
  if (!beforeDigest) beforeDigest = (await archive.page())[0].digest;
  if ((at >= 50000 && !checkpoints.length) || at === 100000) {
    global.gc?.();
    const stats = await archive.stats(),
      integrity = await archive.verify();
    checkpoints.push({
      atEvents: at,
      stats,
      integrity,
      oldestDigestPreserved: (await archive.page())[0].digest === beforeDigest,
      nodeHeapBytes: process.memoryUsage().heapUsed,
    });
  }
}
assert.ok(
  checkpoints.every(
    (c) =>
      c.stats.records === c.atEvents &&
      c.integrity.manifestMatches &&
      c.oldestDigestPreserved,
  ),
);
const result = {
  scope:
    "100000 synthetic metadata events through production append-only archive; fake IndexedDB stores corpus in Node RAM",
  elapsedMs: performance.now() - started,
  checkpoints,
  maxBatch: archive.metrics.maxBatch,
  limits: { inMemoryProducerBatch: 128, noAppHistoryRetentionCap: true },
  limitations: [
    "Node heap includes the entire fake database; this is not stable physical Chrome heap or process-crash acceptance.",
    "Real Chrome memory/GPU behavior and installed extension acceptance must be measured separately.",
  ],
};
writeFileSync(path, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    events: 100000,
    elapsedMs: result.elapsedMs,
    verified: checkpoints.every(
      (c) => c.integrity.manifestMatches && c.oldestDigestPreserved,
    ),
    maxBatch: result.maxBatch,
  }),
);

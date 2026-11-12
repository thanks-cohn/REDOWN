import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { IDBKeyRange } from "fake-indexeddb";
import { worker } from "./helpers/background-worker.mjs";
test("950 sequential native saves preserve one exact verified receipt and counter per fixture object with CAPLESS enabled", async () => {
  const h = worker(undefined, {
    backgroundSource: readFileSync("extension/service-worker.js", "utf8"),
  });
  h.context.IDBKeyRange = IDBKeyRange;
  h.local.cloudflareAuth = {
    accessToken: "synthetic-only",
    sessionId: "session",
    expiresAt: Date.now() + 3600000,
  };
  await h.ready();
  await h.context.RedownFlightRecorder.setConsent(true, { confirmed: true });
  h.context.launchSaveDroplet = () => {};
  h.context.notify = async () => {};
  const objects = new Map();
  let writes = 0,
    heads = 0,
    unexpected = 0,
    healthWrites = 0;
  h.context.fetch = async () => {
    unexpected++;
    throw Error("Unexpected network");
  };
  const set = h.chrome.storage.local.set.bind(h.chrome.storage.local);
  h.chrome.storage.local.set = async (patch) => {
    if (patch.redownForensicHealthV1) healthWrites++;
    return set(patch);
  };
  h.context.ingestCloudflareAtPrefix = async (p, url, prefix, name, r) => {
    writes++;
    h.context.redownSaveAttempts.stage(r.attemptId, "AUTH_CHECKED");
    h.context.redownSaveAttempts.stage(r.attemptId, "ADMITTED");
    h.context.redownSaveAttempts.stage(r.attemptId, "SOURCE_REQUEST");
    h.context.redownSaveAttempts.stage(r.attemptId, "PROVIDER_WRITE");
    const key = prefix + "/fixture-" + writes + ".png";
    objects.set(key, {
      key,
      size: 3,
      etag: "fixture-" + writes,
      customMetadata: { sourceUrl: url },
    });
    r.destination = { accountId: p.accountId, bucketName: p.bucketName, key };
    r.bytes = 3;
    return "R2: fixture";
  };
  h.context.callBucketWorker = async (_p, r) => {
    heads++;
    return { object: objects.get(r.key) };
  };
  const sites = [
    "https://www.google.com/search?q=fixture",
    "https://www.bing.com/images/search?q=fixture",
    "https://images.search.yahoo.com/search/images?p=fixture",
    "https://yandex.com/images/search?text=fixture",
  ];
  const started = performance.now();
  for (let i = 1; i <= 950; i++) {
    await h.chrome.contextMenus.onClicked.listeners[0](
      {
        menuItemId: "v3:one",
        srcUrl: "https://source.invalid/fixture-" + i + ".png",
        pageUrl: sites[i % 4],
      },
      {},
    );
    if (i % 10 === 0) {
      await h.context.redownForensicLedger.flush();
      await h.context.RedownFlightRecorder.flush();
    }
  }
  await h.context.RedownFlightRecorder.flush();
  const archive = await h.context.RedownFlightRecorder.reader(),
    stats = await archive.stats(),
    integrity = await archive.verify(),
    attempts = await archive.attempts(),
    status = await h.context.RedownFlightRecorder.status();
  assert.equal(writes, 950);
  assert.equal(heads, 950);
  assert.equal(unexpected, 0);
  assert.equal(h.local.transferCounter.total, "950");
  assert.equal(h.local.providerSaveReceipts.totals.cloudflare, "950");
  assert.equal(new Set(h.local.providerSaveReceipts.ids).size, 950);
  assert.equal(attempts.counts.observedNativeAttempts, 950);
  assert.equal(attempts.counts.verified, 950);
  assert.equal(status.health.dropped, 0);
  assert.equal(integrity.manifestMatches, true);
  assert.equal(h.chrome.action.onClicked.listeners.length, 1);
  assert.ok(healthWrites < 10);
  mkdirSync("work/p0-capless", { recursive: true });
  writeFileSync(
    "work/p0-capless/native-950.json",
    JSON.stringify(
      {
        scope:
          "Production native listener/provider-independent verifier and in-memory disposable R2 fixture; NOT real provider or installed Chrome",
        saves: 950,
        writes,
        independentFixtureHeads: heads,
        unexpectedNetworkCalls: unexpected,
        elapsedMs: performance.now() - started,
        forensicHealthWrites: healthWrites,
        archive: stats,
        integrity,
        attempts,
        status,
      },
      null,
      2,
    ) + "\n",
  );
});

test('a throwing optional flight observer cannot block existing History or forensic persistence',async()=>{
 const h=worker();await h.ready();h.context.RedownFlightRecorder={proof(){throw Error('synthetic observer failure');},save(){throw Error('synthetic observer failure');}};
 const attemptId=h.context.crypto.randomUUID();await h.context.recordTransfer({attemptId,providerKind:'cloudflare',ok:false,status:'failed',error:'synthetic transfer failure'});await h.context.redownForensicLedger.flush();assert.ok(h.local.transferHistory.some(row=>row.attemptId===attemptId));const snapshot=await h.context.redownForensicLedger.snapshot();assert.ok(snapshot.records.some(row=>row.attemptId===attemptId));
});

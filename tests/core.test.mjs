import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { unzipSync, strFromU8 } from "fflate";
import { openStore, DEFAULTS } from "../extension/lib/store.js";
import { createCoordinator } from "../extension/lib/coordinator.js";
import { createApi, CONTRACTS } from "../extension/lib/api.js";
import { safeUrl } from "../extension/lib/common.js";
import { acquireSource, sanitizeFilename } from "../extension/lib/source.js";
import { exportDiagnostics } from "../extension/lib/zip.js";
import {
  MENU_ITEMS,
  installMenus,
  clickedInput,
} from "../extension/background.js";
const fresh = () => openStore(indexedDB, crypto.randomUUID());
const input = {
  provider: "google",
  sourceUrl: "https://example.test/photo.png",
  hostUrl: "https://example.test/page",
};
const acquired = {
  bytes: new Uint8Array([1, 2, 3]),
  filename: "photo.png",
  mime: "image/png",
};
const auth = {
  status: async () => ({ ready: true }),
  token: async () => "secret-token",
};
function coordinator(store, overrides = {}) {
  return createCoordinator({
    store,
    auth,
    acquire: async () => acquired,
    adapters: {
      google: {
        upload: async () => ({
          id: "cloud-id",
          provider: "google",
          name: "photo.png",
          size: 3,
          confirmed: true,
        }),
      },
    },
    ...overrides,
  });
}
test("exactly three flat menus, update before create, exact dispatch preserves both URLs", async () => {
  assert.deepEqual(
    MENU_ITEMS.map((x) => x.title),
    ["Save to Google Drive", "Save to Dropbox", "Save to OneDrive"],
  );
  assert.ok(MENU_ITEMS.every((x) => !x.parentId));
  const created = [];
  await installMenus({
    contextMenus: {
      update: async () => {
        throw Error("missing");
      },
      create: (x, callback) => {
        created.push(x);
        callback();
      },
    },
  });
  assert.equal(created.length, 3);
  assert.deepEqual(
    clickedInput(
      {
        menuItemId: "save:dropbox",
        srcUrl: "https://a/img",
        pageUrl: "https://a/page",
      },
      { url: "https://a/tab" },
    ),
    {
      provider: "dropbox",
      sourceUrl: "https://a/img",
      hostUrl: "https://a/page",
    },
  );
  assert.equal(clickedInput({ menuItemId: "other" }, {}), null);
});
test("real source bytes and filename, MIME, unknown length bounded strategy", async () => {
  const source = await acquireSource(
    { sourceUrl: "https://example.test/x" },
    {
      fetch: async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition":
              "attachment; filename*=UTF-8''hello%20world.png",
          },
        }),
    },
  );
  assert.deepEqual(source.bytes, new Uint8Array([1, 2, 3]));
  assert.equal(source.filename, "hello world.png");
  assert.equal(source.preview, "data:image/png;base64,AQID");
  assert.equal(sanitizeFilename("CON.pdf"), "_CON.pdf");
  assert.equal(sanitizeFilename("../a#%.png"), "_a__.png");
  assert.equal(sanitizeFilename("a".repeat(200) + ".jpg").length, 150);
});
for (const [label, response, code] of [
  [
    "HTML MIME",
    () =>
      new Response("<html>login", { headers: { "content-type": "text/html" } }),
    "SOURCE_HTML_REJECTED",
  ],
  [
    "masquerading HTML",
    () =>
      new Response("<!doctype html>login", {
        headers: { "content-type": "image/png" },
      }),
    "SOURCE_HTML_REJECTED",
  ],
  [
    "partial",
    () =>
      new Response("abc", {
        status: 206,
        headers: {
          "content-range": "bytes 100-102/500",
          "content-length": "3",
        },
      }),
    "SOURCE_PARTIAL_REJECTED",
  ],
  ["empty", () => new Response(""), "SOURCE_EMPTY"],
  [
    "HTTP denied",
    () => new Response("no", { status: 403 }),
    "SOURCE_HTTP_ERROR",
  ],
  [
    "oversize header",
    () => new Response("x", { headers: { "content-length": "999999999" } }),
    "SOURCE_TOO_LARGE",
  ],
  [
    "unknown-size oversize stream",
    () => new Response("abcd"),
    "SOURCE_TOO_LARGE",
  ],
  [
    "length mismatch",
    () => new Response("abc", { headers: { "content-length": "4" } }),
    "SOURCE_LENGTH_MISMATCH",
  ],
])
  test(`source rejects ${label}`, async () => {
    await assert.rejects(
      acquireSource(input, {
        fetch: async () => response(),
        maxBytes:
          label === "unknown-size oversize stream" ? 3 : 32 * 1024 * 1024,
      }),
      { code },
    );
  });
test("safe local URLs remove credential queries, fragments, credentials and dangerous schemes", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(
    safeUrl("https://user:pass@host/a?token=secret#access"),
    "https://host/[private-link]",
  );
  assert.equal(safeUrl("https://host/a?x=2#private"), "https://host/a?x=2");
});
test("confirmed save durable history, exactly-once concurrent and later callback/replay, URLs never adapter inputs", async () => {
  const store = await fresh();
  let uploads = 0;
  const c = coordinator(store, {
    adapters: {
      google: {
        upload: async (payload) => {
          uploads++;
          assert.equal(payload.sourceUrl, undefined);
          assert.equal(payload.hostUrl, undefined);
          return {
            id: "obj",
            name: payload.filename,
            provider: "google",
            size: 3,
            confirmed: true,
          };
        },
      },
    },
  });
  const request = { ...input, requestId: "test-operation-0001" };
  const results = await Promise.all([
    c.start(request),
    c.start(request),
    c.start(request),
  ]);
  assert.ok(results.every((a) => a.state === "SAVED"));
  assert.equal(uploads, 1);
  assert.deepEqual(await store.counter(), { count: 1 });
  await c.start(request);
  assert.equal(uploads, 1);
  await store.historyDelete(request.requestId);
  assert.deepEqual(await store.counter(), { count: 1 });
  await assert.rejects(c.start(request), { code: "ALREADY_COMPLETED" });
  store.close();
});
test("provider-verified rename is a confirmed distinct new save", async () => {
  const store = await fresh();
  const c = coordinator(store, {
    adapters: {
      google: {
        upload: async () => ({
          id: crypto.randomUUID(),
          provider: "google",
          name: "photo (1).png",
          requestedName: "photo.png",
          size: 3,
          confirmed: true,
        }),
      },
    },
  });
  const a = await c.start(input);
  assert.equal(a.state, "SAVED");
  assert.equal(a.filename, "photo (1).png");
  await c.start(input);
  assert.equal((await store.counter()).count, 2);
  store.close();
});
test("readiness false creates failure and meaningful History; never source or upload", async () => {
  const store = await fresh();
  const c = coordinator(store, {
    auth: {
      status: async () => ({
        ready: false,
        reason: "AUTH_SCOPE_REQUIRED",
        nextAction: "Reconnect/Approve.",
      }),
    },
    acquire: async () => assert.fail("must not fetch"),
  });
  const a = await c.start(input);
  assert.equal(a.state, "FAILED");
  assert.equal(a.code, "AUTH_SCOPE_REQUIRED");
  assert.equal((await store.counter()).count, 0);
  assert.equal((await store.historyList()).total, 1);
  store.close();
});
for (const receipt of [
  null,
  { id: "x", provider: "google", name: "photo.png", size: 3, confirmed: false },
  { id: "x", provider: "google", name: "other.png", size: 3, confirmed: true },
  { id: "x", provider: "google", name: "photo.png", size: 1, confirmed: true },
])
  test("missing or mismatched provider proof remains uncertain, never count", async () => {
    const store = await fresh();
    const c = coordinator(store, {
      adapters: { google: { upload: async () => receipt } },
    });
    const a = await c.start(input);
    assert.equal(a.state, "UNCERTAIN");
    assert.equal((await store.counter()).count, 0);
    store.close();
  });
test("ambiguous final network failure uncertain; definitive rejection failed; no retry", async () => {
  const store = await fresh();
  let n = 0;
  for (const definitive of [false, true]) {
    const c = coordinator(store, {
      adapters: {
        google: {
          upload: async () => {
            n++;
            throw Object.assign(Error("safe"), {
              code: "PROVIDER_HTTP",
              definitive,
            });
          },
        },
      },
    });
    assert.equal(
      (await c.start(input)).state,
      definitive ? "FAILED" : "UNCERTAIN",
    );
  }
  assert.equal(n, 2);
  assert.equal((await store.counter()).count, 0);
  store.close();
});
test("worker restart conservatively marks active operations uncertain, never resumes or counts; clears only terminal history", async () => {
  const store = await fresh();
  await store.begin({
    id: "interrupted",
    provider: "google",
    state: "UPLOADING",
    createdAt: new Date().toISOString(),
  });
  assert.equal((await store.historyClear()).deleted, 0);
  assert.deepEqual(await store.recover(), { interrupted: 1 });
  assert.equal((await store.getAttempt("interrupted")).state, "UNCERTAIN");
  assert.equal((await store.counter()).count, 0);
  assert.equal((await store.historyClear()).deleted, 1);
  store.close();
});
test("terminal atomic finalization enforces proof and immutable state", async () => {
  const store = await fresh();
  await store.begin({
    id: "atomic",
    state: "UPLOADING",
    provider: "google",
    createdAt: "2026-01-01",
  });
  await assert.rejects(store.finish("atomic", { state: "SAVED" }), {
    code: "CONFIRMATION_REQUIRED",
  });
  assert.equal((await store.counter()).count, 0);
  await store.finish("atomic", {
    state: "SAVED",
    objectId: "obj",
    confirmed: true,
  });
  await store.finish("atomic", { state: "FAILED" });
  assert.equal((await store.getAttempt("atomic")).state, "SAVED");
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("History indexed bounded pagination at thousands, delete independence, strict input", async () => {
  const store = await fresh();
  for (let i = 0; i < 2100; i++)
    await store.begin({
      id: "item" + String(i).padStart(4, "0"),
      state: "FAILED",
      createdAt: new Date(1700000000000 + i).toISOString(),
    });
  const p = await store.historyList({ page: 2 });
  assert.equal(p.items.length, 40);
  assert.equal(p.total, 2100);
  assert.equal(p.items[0].id, "item2059");
  await store.updateSettings({ pageSize: 10 });
  assert.equal((await store.historyList()).items.length, 10);
  await assert.rejects(store.historyList({ page: 0 }), {
    code: "INVALID_PAGE",
  });
  store.close();
});
test("diagnostics default ON, 4000 EVENT cap, arbitrary cap, unlimited, OFF core independence, retention pruning", async () => {
  const store = await fresh();
  assert.deepEqual(await store.settings(), DEFAULTS);
  for (let i = 0; i < 4003; i++)
    await store.event({ stage: "TEST", timestamp: new Date().toISOString() });
  assert.equal((await store.diagnosticsList()).total, 4000);
  await store.updateSettings({ diagnosticsCap: 7 });
  assert.equal((await store.diagnosticsList()).total, 7);
  await store.updateSettings({ diagnosticsCap: null });
  for (let i = 0; i < 13; i++) await store.event({ stage: "TEST" });
  assert.equal((await store.diagnosticsList()).total, 20);
  for (const v of [0, -1, 1.5, "2", Infinity, NaN])
    await assert.rejects(store.updateSettings({ diagnosticsCap: v }), {
      code: "INVALID_SETTINGS",
    });
  await store.updateSettings({ diagnosticsEnabled: false });
  const a = await coordinator(store).start(input);
  assert.equal(a.state, "SAVED");
  assert.equal((await store.diagnosticsList()).total, 20);
  assert.equal((await store.counter()).count, 1);
  await store.updateSettings({ diagnosticsEnabled: true });
  await store.event({ stage: "REENABLED" });
  assert.equal((await store.diagnosticsList()).total, 21);
  store.close();
});
test("ZIP valid local archive, retained events including URLs/speed, exports while OFF, honest size limit", async () => {
  const store = await fresh();
  await coordinator(store, {
    now: (() => {
      let t = 0;
      return () => (t += 100);
    })(),
  }).start(input);
  await store.updateSettings({ diagnosticsEnabled: false });
  const { bytes, summary } = await exportDiagnostics(store);
  const files = unzipSync(bytes);
  assert.deepEqual(Object.keys(files), [
    "events.jsonl",
    "summary.json",
    "README.txt",
  ]);
  assert.equal(summary.count, 6);
  assert.equal(summary.collectionEnabled, false);
  const events = strFromU8(files["events.jsonl"])
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(events.at(-1).speedBps, 30);
  assert.equal(events.at(-1).hostUrl, input.hostUrl);
  assert.ok(!strFromU8(files["events.jsonl"]).includes("secret-token"));
  await assert.rejects(exportDiagnostics(store, { maxBytes: 10 }), {
    code: "EXPORT_TOO_LARGE",
  });
  assert.equal((await store.historyList()).total, 1);
  await store.diagnosticsClear();
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("API guards exact caller, version, validated known inputs; GO TO never authorizes each provider", async () => {
  const store = await fresh();
  const urls = [];
  let authCalls = 0;
  const chrome = {
    runtime: { id: "basic", getURL: (p) => "chrome-extension://basic/" + p },
    tabs: { create: async (x) => urls.push(x.url) },
  };
  const api = createApi({
    store,
    auth: {
      status: async () => {
        authCalls++;
        return { connected: false, ready: false };
      },
    },
    coordinator: coordinator(store),
    chrome,
  });
  const sender = { id: "basic", url: chrome.runtime.getURL("shelf.html") };
  for (const invalid of [
    { id: "other", url: sender.url },
    { id: "basic", url: "https://evil.test" },
    { id: "basic", url: sender.url + "#hash" },
  ])
    assert.equal(
      (await api.message({ api: 1, op: "counter.get" }, invalid)).error.code,
      "CALLER_DENIED",
    );
  assert.equal(
    (await api.message({ api: 2, op: "counter.get" }, sender)).error.code,
    "API_VERSION_UNSUPPORTED",
  );
  for (const op of ["toString", "__proto__", "constructor"])
    await assert.rejects(api.invoke(op), { code: "UNKNOWN_OPERATION" });
  await assert.rejects(api.invoke("diagnostics.getForAttempt", { id: "" }), {
    code: "INVALID_INPUT",
  });
  await assert.rejects(api.invoke("counter.get", { extra: true }), {
    code: "INVALID_INPUT",
  });
  await assert.rejects(
    api.invoke("saves.start", { provider: "evil", sourceUrl: "x" }),
    { code: "INVALID_INPUT" },
  );
  for (const provider of ["google", "dropbox", "onedrive"]) {
    await api.invoke("providers.goTo", { provider });
    assert.equal(
      (await api.invoke("providers.getStatus", { provider })).ready,
      false,
    );
  }
  assert.equal(urls.length, 3);
  assert.equal(authCalls, 3);
  assert.equal(
    Object.keys((await api.invoke("api.describe")).operations).length,
    Object.keys(CONTRACTS).length,
  );
  store.close();
});
test("quota failure atomically rolls back both saved History and counter; optional logging quota does not break core", async () => {
  const store = await fresh();
  await store.begin({
    id: "quota-test",
    state: "UPLOADING",
    provider: "google",
    createdAt: "2026-01-01",
  });
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.name === "meta" && key === "count")
      throw new DOMException("quota", "QuotaExceededError");
    return original.call(this, value, key);
  };
  try {
    await assert.rejects(
      store.finish("quota-test", {
        state: "SAVED",
        confirmed: true,
        objectId: "obj",
      }),
      { name: "QuotaExceededError" },
    );
  } finally {
    IDBObjectStore.prototype.put = original;
  }
  assert.equal((await store.getAttempt("quota-test")).state, "UPLOADING");
  assert.equal((await store.counter()).count, 0);
  const c = coordinator({
    ...store,
    event: async () => {
      throw new DOMException("quota", "QuotaExceededError");
    },
  });
  assert.equal((await c.start(input)).state, "SAVED");
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("documented API operation names and describe stay in parity", async () => {
  const { readFile } = await import("node:fs/promises");
  const docs = await readFile(
    new URL("../docs/API.md", import.meta.url),
    "utf8",
  );
  for (const op of Object.keys(CONTRACTS))
    assert.ok(docs.includes(op), `docs missing ${op}`);
});
test("request ID cannot be reused with changed provider/source during execution or after completion", async () => {
  const store = await fresh();
  const c = coordinator(store);
  const request = { ...input, requestId: "immutable-request-123" };
  const pending = c.start(request);
  assert.throws(
    () => c.start({ ...request, sourceUrl: "https://example.test/other" }),
    { code: "IDEMPOTENCY_CONFLICT" },
  );
  await pending;
  await assert.rejects(c.start({ ...request, provider: "dropbox" }), {
    code: "IDEMPOTENCY_CONFLICT",
  });
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("diagnostic storage failures surface warning while core save succeeds", async () => {
  const store = await fresh();
  let notified;
  const c = coordinator(
    {
      ...store,
      event: async () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    },
    {
      notify: (a) => {
        notified = a;
      },
    },
  );
  const a = await c.start(input);
  assert.equal(a.state, "SAVED");
  assert.equal(a.diagnosticsWarning, "DIAGNOSTICS_STORAGE_UNAVAILABLE");
  assert.equal(notified.diagnosticsWarning, a.diagnosticsWarning);
  assert.equal(
    (await store.getAttempt(a.id)).diagnosticsWarning,
    a.diagnosticsWarning,
  );
  store.close();
});
for(const encoding of ['utf16le','utf16be'])test(`source rejects disguised HTML in ${encoding}`,async()=>{
 const text='<html><body>login</body></html>',buffer=new Uint8Array(2+text.length*2),le=encoding==='utf16le';buffer.set(le?[255,254]:[254,255]);for(let i=0;i<text.length;i++)buffer[2+i*2+(le?0:1)]=text.charCodeAt(i);
 await assert.rejects(acquireSource(input,{fetch:async()=>new Response(buffer,{headers:{'content-type':'application/octet-stream'}})}),{code:'SOURCE_HTML_REJECTED'});
});
test('browser AbortError numeric code maps to actionable source timeout',async()=>{
 await assert.rejects(acquireSource(input,{timeoutMs:1,fetch:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))}),{code:'SOURCE_TIMEOUT'});
});

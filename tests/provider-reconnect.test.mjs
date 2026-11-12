import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";
const BASE = "f9f6d0d50fa7a9b75e7c48dd9a37d58812d879cf";
const source = (file) =>
  process.env.REDOWN_FOLLOWUP_BASELINE &&
  [
    "onedrive-auth.js",
    "google-drive-stream.js",
    "google-drive-provider.js",
  ].includes(file)
    ? execFileSync("git", ["show", BASE + ":extension/" + file], {
        encoding: "utf8",
      })
    : readFileSync("extension/" + file, "utf8");
const tick = () => new Promise((r) => setImmediate(r));
const ID = "mkadkgpekmkknfbniacdlmgikihjjepf";
function authFixture() {
  let clock = 1700000000000,
    mode = "ok",
    tokens = 0,
    gets = 0,
    dialogs = 0;
  const local = {
      "onedrive:auth": {
        accountId: "person",
        driveId: "drive",
        rootId: "root",
        connectionId: "original",
        refreshToken: "synthetic-refresh",
        rootReady: true,
        driveType: "personal",
      },
      "onedrive:state": {
        phase: "connected",
        accountId: "person",
        driveId: "drive",
        rootId: "root",
        connectionId: "original",
        rootReady: true,
      },
    },
    session = {};
  const storage = (data) => ({
    get: async (k) => ({ [k]: structuredClone(data[k]) }),
    set: async (patch) => Object.assign(data, structuredClone(patch)),
    setAccessLevel: async () => {},
    remove: async (keys) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
    },
  });
  const chrome = {
    runtime: { id: ID },
    permissions: { contains: async () => true },
    storage: { local: storage(local), session: storage(session) },
    identity: {
      getRedirectURL: () => `https://${ID}.chromiumapp.org/onedrive`,
      launchWebAuthFlow: async ({ url }) => {
        dialogs++;
        return (
          `https://${ID}.chromiumapp.org/onedrive?code=synthetic&state=` +
          new URL(url).searchParams.get("state")
        );
      },
    },
  };
  const fetch = async (url, opts) => {
    if (url.endsWith("/token")) {
      tokens++;
      return new Response(
        JSON.stringify(
          mode === "invalid"
            ? { error: "invalid_grant" }
            : {
                access_token: "synthetic-access",
                refresh_token: "synthetic-refresh-new",
                expires_in: 3600,
                scope: "Files.ReadWrite User.Read offline_access",
              },
        ),
        { status: mode === "invalid" ? 400 : 200 },
      );
    }
    assert.ok(!opts.method || opts.method === "GET");
    gets++;
    if (mode === "network") throw TypeError("synthetic network");
    if (mode === "503") return new Response("{}", { status: 503 });
    return new Response(
      JSON.stringify(
        url.includes("root?")
          ? { id: "root", folder: {} }
          : url.includes("/drive?")
            ? { id: "drive", driveType: "personal" }
            : { id: mode === "changed" ? "different" : "person" },
      ),
    );
  };
  const c = vm.createContext({
    chrome,
    crypto: webcrypto,
    fetch,
    URL,
    URLSearchParams,
    TextEncoder,
    AbortSignal,
    btoa,
    console,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(source("onedrive-auth.js"), c);
  const auth = c.RedownOneDriveAuth.create({
    chrome,
    fetch,
    crypto: webcrypto,
    now: () => clock,
  });
  return {
    auth,
    local,
    chrome,
    set mode(v) {
      mode = v;
    },
    advance: (n) => (clock += n),
    get tokens() {
      return tokens;
    },
    get gets() {
      return gets;
    },
    get dialogs() {
      return dialogs;
    },
  };
}
test("Graph 503 preserves credentials and identity, separates unavailable from revoked, and backs off before recovery", async () => {
  const f = authFixture(),
    prior = structuredClone(f.local["onedrive:auth"]);
  f.mode = "503";
  await assert.rejects(
    f.auth.ready(null, true),
    (e) => e.code === "ONEDRIVE_GRAPH_503",
  );
  assert.equal(f.local["onedrive:state"].phase, "unavailable");
  assert.deepEqual(f.local["onedrive:auth"], prior);
  const requests = f.gets + f.tokens;
  await assert.rejects(f.auth.ready(null, true));
  assert.equal(f.gets + f.tokens, requests);
  assert.equal(f.dialogs, 0);
  f.advance(31000);
  f.mode = "ok";
  const r = await f.auth.ready(null, true);
  assert.equal(r.connectionId, "original");
  assert.equal(r.rootId, "root");
  assert.equal(f.local["onedrive:state"].phase, "connected");
});
test("invalid grant is an explicit reauthorization state while token/identity and uncertain jobs remain untouched", async () => {
  const f = authFixture(),
    prior = structuredClone(f.local["onedrive:auth"]);
  f.mode = "invalid";
  await assert.rejects(
    f.auth.ready(),
    (e) => e.code === "ONEDRIVE_INVALID_GRANT",
  );
  assert.equal(f.local["onedrive:state"].oauthGrantState, "required");
  assert.deepEqual(f.local["onedrive:auth"], prior);
  assert.equal(f.dialogs, 0);
});
test("transient verification of a cached session does not discard it or launch OAuth; account changes fail closed", async () => {
  const f = authFixture();
  await f.auth.ready();
  f.advance(6000);
  f.mode = "network";
  await assert.rejects(
    f.auth.ready(null, true),
    (e) => e.code === "ONEDRIVE_NETWORK",
  );
  const tokens = f.tokens;
  f.advance(31000);
  f.mode = "ok";
  await f.auth.ready(null, true);
  assert.equal(f.tokens, tokens);
  f.advance(6000);
  f.mode = "changed";
  await assert.rejects(
    f.auth.ready(null, true),
    (e) => e.code === "ONEDRIVE_ACCOUNT_CHANGED",
  );
  assert.equal(f.local["onedrive:auth"].accountId, "person");
});
test("Google revoked grant becomes a specific blocked authorization result and preserves known navigation/account", async () => {
  const local = {
    googleDriveState: {
      phase: "connected",
      accountId: "original",
      destination: "root",
    },
  };
  const chrome = {
    runtime: {
      id: ID,
      getManifest: () => ({
        oauth2: {
          client_id: "123-test.apps.googleusercontent.com",
          scopes: ["https://www.googleapis.com/auth/drive.file"],
        },
      }),
    },
    storage: {
      local: {
        get: async (k) => ({ [k]: structuredClone(local[k]) }),
        set: async (p) => Object.assign(local, structuredClone(p)),
      },
    },
    identity: {
      getAuthToken: async () => {
        throw Error("OAuth2 not granted or revoked.");
      },
    },
  };
  const c = vm.createContext({
    chrome,
    URL,
    AbortSignal,
    TextEncoder,
    crypto: webcrypto,
  });
  vm.runInContext(source("google-drive-stream.js"), c);
  const api = c.RedownGoogleDriveStream.create({ chrome });
  await assert.rejects(
    api.connect(true),
    (e) => e.code === "GOOGLE_AUTH_REQUIRED" && e.status === "blocked",
  );
  assert.equal(local.googleDriveState.accountId, "original");
  assert.equal(local.googleDriveState.accountKnown, true);
});
function uiFixture(known = true) {
  const local = {
    googleDriveState: {
      phase: known ? "connected" : "disconnected",
      ...(known ? { accountId: "google-known" } : {}),
    },
    googleDriveTransfer: known
      ? { status: "uncertain", error: "OAuth2 not granted or revoked." }
      : {},
    "onedrive:state": {
      phase: known ? "unavailable" : "disconnected",
      ...(known ? { accountId: "ms-known", code: "ONEDRIVE_GRAPH_503" } : {}),
    },
    "dropbox:state": {
      phase: known ? "connected" : "disconnected",
      ...(known ? { accountId: "dropbox-known", rootReady: true } : {}),
    },
  };
  const dom = new JSDOM(readFileSync("extension/shelf.html", "utf8"), {
      runScripts: "outside-only",
    }),
    w = dom.window,
    calls = [],
    tabs = [];
  let reject = false;
  w.chrome = {
    runtime: {
      sendMessage: async (m) => {
        calls.push(m.type);
        return reject
          ? {
              ok: false,
              code: "ONEDRIVE_GRAPH_503",
              error: "Microsoft temporarily unavailable",
            }
          : { ok: true };
      },
    },
    tabs: { create: async (p) => tabs.push(p) },
    storage: {
      local: {
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [
              k,
              structuredClone(local[k]),
            ]),
          ),
      },
      onChanged: { addListener() {} },
    },
  };
  for (const file of [
    "provider-connection.js",
    "provider-reconnect.js",
    "shelf-google-drive.js",
    "shelf-dropbox.js",
    "shelf-onedrive.js",
  ])
    w.eval(source(file));
  return {
    w,
    dom,
    calls,
    tabs,
    set reject(v) {
      reject = v;
    },
  };
}
test("known accounts retain independent GO TO and named reconnect target during revoked/503/stale states; providers are isolated", async () => {
  const f = uiFixture();
  await tick();
  const d = f.w.document;
  for (const [p, id] of [
    ["google", "shelf-google-drive"],
    ["dropbox", "shelf-dropbox"],
    ["onedrive", "shelf-onedrive"],
  ]) {
    assert.equal(
      d.getElementById("shelf-" + p + "-label").textContent,
      "GO TO",
    );
    assert.equal(d.getElementById("shelf-" + p + "-reconnect").disabled, false);
    d.getElementById(id).click();
  }
  await tick();
  assert.equal(f.tabs.length, 3);
  assert.equal(f.calls.filter((c) => /Open|Connect/.test(c)).length, 0);
  assert.match(
    d.getElementById("shelf-google-authorization").textContent,
    /Reconnect required/,
  );
  f.reject = true;
  d.getElementById("shelf-onedrive-reconnect").click();
  await tick();
  assert.equal(f.calls.filter((c) => c === "onedriveConnect").length, 1);
  assert.equal(
    f.calls.filter((c) => c === "googleDriveOpen" || c === "dropboxConnect")
      .length,
    0,
  );
  assert.match(
    d.getElementById("shelf-onedrive-authorization").textContent,
    /ONEDRIVE_GRAPH_503/,
  );
  assert.equal(d.getElementById("shelf-onedrive-label").textContent, "GO TO");
  assert.equal(
    d.getElementById("shelf-onedrive-reconnect").hasAttribute("aria-busy"),
    false,
  );
  f.dom.window.close();
});
test("never-connected providers show LOGIN and Options/Popup offer exact trusted recovery commands", async () => {
  const f = uiFixture(false);
  await tick();
  for (const p of ["google", "dropbox", "onedrive"])
    assert.equal(
      f.w.document.getElementById("shelf-" + p + "-label").textContent,
      "LOGIN",
    );
  f.dom.window.close();
  for (const page of ["options.html", "popup.html"]) {
    const dom = new JSDOM(source(page));
    assert.equal(
      dom.window.document.querySelectorAll("[data-provider-reconnect]").length,
      3,
    );
    for (const b of dom.window.document.querySelectorAll(
      "[data-provider-reconnect]",
    )) {
      assert.equal(b.type, "button");
      assert.ok(
        dom.window.document.getElementById(b.getAttribute("aria-describedby")),
      );
    }
    dom.window.close();
  }
});
test("explicit reauthorization preserves the same OneDrive connection ID; a different account cannot replace pending-job identity", async () => {
  const f = authFixture();
  await f.auth.connect();
  assert.equal(f.local["onedrive:auth"].connectionId, "original");
  const prior = structuredClone(f.local["onedrive:auth"]);
  f.mode = "changed";
  await assert.rejects(
    f.auth.connect(),
    (e) => e.code === "ONEDRIVE_ACCOUNT_CHANGED",
  );
  assert.deepEqual(f.local["onedrive:auth"], prior);
});
test("Google recovery accepts exact Options/Popup senders, preserves two exhausted uncertain jobs, and never uploads them", async () => {
  const jobs = [1, 2].map((n) => ({
      id: "old-" + n,
      accountId: "original",
      status: "uncertain",
      phase: "source",
      attempts: 3,
      reported: true,
    })),
    local = {
      googleDriveJobs: structuredClone(jobs),
      googleDriveState: { phase: "connected", accountId: "original" },
    };
  let connects = 0,
    uploads = 0,
    checks = 0;
  const chrome = {
    runtime: { id: "test", getURL: (p) => "chrome-extension://test/" + p },
    storage: {
      local: {
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [
              k,
              structuredClone(local[k]),
            ]),
          ),
        set: async (p) => Object.assign(local, structuredClone(p)),
      },
    },
    alarms: { clear: async () => {} },
  };
  const c = vm.createContext({
    chrome,
    crypto: webcrypto,
    setTimeout,
    clearTimeout,
    console,
  });
  vm.runInContext(source("provider-connection.js"), c);
  vm.runInContext(source("google-drive-provider.js"), c);
  const p = c.RedownGoogleDriveProvider.create({
    chrome,
    api: {
      connect: async (interactive) => {
        assert.equal(interactive, true);
        connects++;
        return "original";
      },
      check: async () => {
        checks++;
      },
      upload: async () => uploads++,
    },
  });
  assert.equal(
    (
      await p.message(
        { type: "googleDriveOpen" },
        { id: "test", url: "https://untrusted.invalid/" },
      )
    ).ok,
    false,
  );
  assert.equal(connects, 0);
  for (const page of ["options.html", "popup.html"])
    assert.equal(
      (
        await p.message(
          { type: "googleDriveOpen" },
          { id: "test", url: chrome.runtime.getURL(page) },
        )
      ).ok,
      true,
    );
  for (let n = 0; n < 10; n++)
    await p.message(
      { type: "googleDriveStatus", passive: true },
      { id: "test", url: chrome.runtime.getURL("shelf.html") },
    );
  await p.pump();
  assert.equal(checks, 1);
  assert.equal(uploads, 0);
  assert.deepEqual(local.googleDriveJobs, jobs);
});
test("unknown storage and ambiguous legacy projections never imply sign-out; website session stays unverified", () => {
  const c = vm.createContext({ URL });
  vm.runInContext(source("provider-connection.js"), c);
  for (const p of ["google", "dropbox", "onedrive"])
    for (const state of [{ statusUnavailable: true }, { phase: "reconnect" }]) {
      const v = c.RedownProviderConnection.project(p, state);
      assert.equal(v.primary, "GO TO");
      assert.equal(v.websiteSession, "unknown");
      assert.equal(v.accountKnown, false);
    }
  assert.equal(
    c.RedownProviderConnection.project("google", {
      phase: "reconnect",
      accountKnown: false,
    }).primary,
    "LOGIN",
  );
});

test("healthy Dropbox verified accounting remains isolated from Google revoked and OneDrive unavailable states", async () => {
  const { worker } = await import("./helpers/background-worker.mjs");
  const h = worker();
  h.context.AbortController = AbortController;
  h.local.googleDriveState = {
    phase: "reconnect",
    code: "GOOGLE_AUTH_REQUIRED",
    accountKnown: true,
  };
  h.local["onedrive:state"] = {
    phase: "unavailable",
    code: "ONEDRIVE_GRAPH_503",
    accountKnown: true,
  };
  const identity = {
    accountId: "dbid:synthetic",
    connectionId: "synthetic-connection",
    namespace: "1",
    root: "/",
    rootReady: true,
  };
  h.local["dropbox:state"] = {
    ...identity,
    phase: "connected",
    checkedAt: Date.now(),
  };
  h.chrome.permissions = {
    contains: async () => true,
    request: async () => true,
  };
  await h.ready();
  let writes = 0,
    independentFixtureReads = 0;
  const p = h.context.RedownDropboxProvider.create({
    chrome: h.chrome,
    auth: {
      ready: async () => identity,
      connect: async () => {
        throw Error("No OAuth needed for healthy Dropbox");
      },
    },
    api: {
      upload: async (job, checkpoint) => {
        writes++;
        job.offset = 3;
        job.phase = "verifying";
        await checkpoint(job);
        const remote = {
          ...identity,
          proofVersion: 1,
          fileId: "id:synthetic",
          revision: "r1",
          contentHash: "a".repeat(64),
          path: "/isolation.png",
          name: "isolation.png",
          bytes: 3,
        };
        independentFixtureReads++;
        return structuredClone(remote);
      },
    },
    record: h.context.recordTransfer,
  });
  await p.dispatch({
    menuItemId: "provider:dropbox",
    srcUrl: "https://source.invalid/isolation.png",
    pageUrl: "https://site.invalid/",
  });
  await p.pump();
  assert.equal(writes, 1);
  assert.equal(independentFixtureReads, 1);
  assert.equal(h.local.providerSaveReceipts.totals.dropbox, "1");
  assert.equal(h.local["onedrive:state"].code, "ONEDRIVE_GRAPH_503");
  assert.equal(h.local.googleDriveState.code, "GOOGLE_AUTH_REQUIRED");
});

test("Google native admission verifies OAuth instead of reporting AUTH_CHECKED from a stored connected flag", async () => {
  const original = [
      {
        id: "uncertain-1",
        status: "uncertain",
        reported: true,
        attempts: 3,
        accountId: "original",
      },
    ],
    local = {
      googleDriveState: { phase: "connected", accountId: "original" },
      googleDriveJobs: structuredClone(original),
    },
    records = [],
    stages = [];
  let checks = 0;
  const chrome = {
    runtime: { id: "test" },
    permissions: { request: async () => true },
    storage: {
      local: {
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [
              k,
              structuredClone(local[k]),
            ]),
          ),
        set: async (patch) => Object.assign(local, structuredClone(patch)),
      },
    },
  };
  const c = vm.createContext({
    chrome,
    crypto: webcrypto,
    URL,
    AbortSignal,
    TextEncoder,
    console,
    redownSaveAttempts: {
      forClick: () => webcrypto.randomUUID(),
      stage: (_id, stage) => stages.push(stage),
    },
  });
  vm.runInContext(source("google-drive-stream.js"), c);
  vm.runInContext(source("google-drive-provider.js"), c);
  const p = c.RedownGoogleDriveProvider.create({
    chrome,
    api: {
      check: async () => {
        checks++;
        throw Object.assign(Error("OAuth2 not granted or revoked."), {
          code: "GOOGLE_AUTH_REQUIRED",
          status: "blocked",
          phase: "auth",
        });
      },
      connect: async () => {
        throw Error(
          "Known accounts must not force interactive auth on admission",
        );
      },
    },
    record: async (e) => records.push(e),
  });
  await p.dispatch({
    menuItemId: "provider:google-drive",
    srcUrl: "https://source.invalid/image.png",
  });
  assert.equal(checks, 1);
  assert.equal(stages.includes("AUTH_CHECKED"), false);
  assert.equal(records[0].code, "GOOGLE_AUTH_REQUIRED");
  assert.equal(records[0].phase, "auth");
  assert.deepEqual(local.googleDriveJobs, original);
});

test("missing extension credentials require reconnect while prior account/navigation and destination fields survive status reads", async () => {
  const { worker } = await import("./helpers/background-worker.mjs");
  const h = worker();
  h.local["onedrive:state"] = {
    phase: "connected",
    accountId: "synthetic-ms",
    driveId: "original-drive",
    rootId: "original-root",
    rootReady: true,
  };
  h.local["dropbox:state"] = {
    phase: "connected",
    accountId: "dbid:synthetic",
    namespace: "1",
    root: "/",
    rootReady: true,
  };
  await h.ready();
  const sender = { id: "test", url: "chrome-extension://test/shelf.html" };
  const one = await vm
    .runInContext("onedriveProvider", h.context)
    .message({ type: "onedriveStatus" }, sender);
  assert.equal(one.connection.primary, "GO TO");
  assert.equal(one.connection.oauthGrantState, "required");
  assert.equal(h.local["onedrive:state"].rootId, "original-root");
  const drop = h.context.RedownDropboxProvider.create({
    chrome: h.chrome,
    auth: {},
    api: {},
  });
  const d = await drop.message({ type: "dropboxStatus" }, sender);
  assert.equal(d.connection.primary, "GO TO");
  assert.equal(d.connection.oauthGrantState, "required");
  assert.equal(h.local["dropbox:state"].namespace, "1");
  assert.deepEqual(h.local.transferHistory, [{ id: "preserved" }]);
});

test("ten rapid Google native clicks share one real in-flight authorization check without admitting failed grants", async () => {
  let rejectCheck,
    checks = 0;
  const records = [],
    local = { googleDriveState: { phase: "connected", accountId: "original" } };
  const chrome = {
    runtime: { id: "test" },
    permissions: { request: async () => true },
    storage: {
      local: {
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [
              k,
              structuredClone(local[k]),
            ]),
          ),
        set: async (p) => Object.assign(local, structuredClone(p)),
      },
    },
  };
  const c = vm.createContext({ chrome, URL, crypto: webcrypto, console });
  vm.runInContext(source("google-drive-stream.js"), c);
  vm.runInContext(source("google-drive-provider.js"), c);
  const p = c.RedownGoogleDriveProvider.create({
    chrome,
    api: {
      check: () => {
        checks++;
        return new Promise((_, reject) => (rejectCheck = reject));
      },
    },
    record: async (r) => records.push(r),
  });
  const clicks = Array.from({ length: 10 }, (_, n) =>
    p.dispatch({
      menuItemId: "provider:google-drive",
      srcUrl: "https://source.invalid/unique-" + n + ".png",
    }),
  );
  await tick();
  assert.equal(checks, 1);
  rejectCheck(
    Object.assign(Error("Grant unavailable"), {
      code: "GOOGLE_AUTH_REQUIRED",
      phase: "auth",
      status: "blocked",
    }),
  );
  await Promise.all(clicks);
  assert.equal(records.length, 10);
  assert.equal(local.googleDriveJobs, undefined);
  assert.equal(checks, 1);
});

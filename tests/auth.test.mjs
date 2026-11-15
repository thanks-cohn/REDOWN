import test from "node:test";
import assert from "node:assert/strict";
import { createIdentity } from "../extension/lib/identity.js";
import { createAuth, AUTH_SCOPES } from "../extension/lib/auth.js";
const NOW = 1700000000000;
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status });
function setup({
  id = "dropbox",
  initial,
  expired = false,
  missingScope = false,
  cancelled = false,
  badState = false,
  denied = false,
  revoked = false,
  accountChanged = false,
  noConfig = false,
  noScopeResponse = false,
  noExpiry = false,
  holdFirstToken = false,
} = {}) {
  let releaseToken, firstTokenStarted, secondTokenStarted;
  const gate = new Promise((resolve) => {
    releaseToken = resolve;
  });
  const waitForToken = new Promise((resolve) => {
    firstTokenStarted = resolve;
  });
  const waitForSecondToken = new Promise((resolve) => {
    secondTokenStarted = resolve;
  });
  let exchanges = 0;
  const store = {};
  if (initial)
    store["basic:auth:" + id] = {
      connected: true,
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: expired ? NOW - 1 : noExpiry ? undefined : NOW + 3600000,
      scopes: missingScope ? [] : AUTH_SCOPES[id],
      identity:
        id === "dropbox"
          ? ["account"]
          : id === "onedrive"
            ? ["account", "root"]
            : ["account"],
    };
  const calls = [],
    popups = [],
    native = [],
    levels = [];
  const chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (value) => Object.assign(store, value),
        remove: async (key) => {
          delete store[key];
        },
        setAccessLevel: async (level) => levels.push(level),
      },
    },
    runtime: {
      id: "independent",
      getManifest: () => ({
        oauth2: {
          scopes: AUTH_SCOPES.google,
          client_id: noConfig
            ? "CONFIGURE_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
            : "123-own.apps.googleusercontent.com",
        },
      }),
    },
    identity: {
      getRedirectURL: (id) => `https://independent.chromiumapp.org/${id}`,
      getAuthToken: async (options) => {
        native.push(options);
        if (cancelled) throw Error("private popup data");
        return {
          token: "google-access",
          grantedScopes: missingScope ? [] : AUTH_SCOPES.google,
        };
      },
      removeCachedAuthToken: async (options) =>
        calls.push({ removed: options.token }),
      launchWebAuthFlow: async (options) => {
        popups.push(options);
        if (cancelled) throw Error("secret private response");
        const url = new URL(options.url);
        const redirect = new URL(url.searchParams.get("redirect_uri"));
        redirect.searchParams.set(
          "state",
          badState ? "other-state" : url.searchParams.get("state"),
        );
        redirect.searchParams.set(
          denied ? "error" : "code",
          denied ? "access_denied" : "authorization-code",
        );
        return redirect.href;
      },
    },
  };
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("/oauth2/token") || url.endsWith("/v2.0/token")) {
      exchanges++;
      if (exchanges === 2) secondTokenStarted();
      if (holdFirstToken && exchanges === 1) {
        firstTokenStarted();
        await gate;
      }
      return json({
        access_token: "new-access",
        refresh_token: "rotated-refresh",
        expires_in: 3600,
        ...(!noScopeResponse
          ? { scope: missingScope ? "User.Read" : AUTH_SCOPES[id].join(" ") }
          : {}),
      });
    }
    if (revoked) return json({ secret: "never exposed" }, 401);
    const account = accountChanged ? "other-account" : "account";
    if (url.includes("googleapis"))
      return json({ user: { permissionId: account } });
    if (url.includes("dropboxapi")) return json({ account_id: account });
    return json({ id: url.includes("root?") ? "root" : account });
  };
  const config = {
    clientIds: noConfig ? {} : { dropbox: "own-key", onedrive: "own-client" },
  };
  if (initial)
    store["basic:auth:" + id].binding = createIdentity({
      chrome,
      config,
    }).binding(id);
  return {
    auth: createAuth({ chrome, fetch, config, now: () => NOW }),
    calls,
    popups,
    native,
    store,
    levels,
    releaseToken,
    waitForToken,
    waitForSecondToken,
  };
}
for (const id of ["google", "dropbox", "onedrive"]) {
  test(`${id}: absent OAuth config is not confused with website login`, async () => {
    const f = setup({ id, noConfig: true });
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.connected, false);
    assert.equal(status.reason, "OAUTH_CONFIG_REQUIRED");
    assert.equal(f.popups.length, 0);
    assert.equal(f.calls.length, 0);
  });
  test(`${id}: valid refresh checks real provider without interactive popup`, async () => {
    const f = setup({ id, initial: true });
    const status = await f.auth.refresh(id);
    assert.equal(status.ready, true);
    assert.equal(status.connected, true);
    assert.equal(status.authorized, true);
    assert.equal(f.popups.length, 0);
    assert.ok(f.native.every((o) => o.interactive === false));
    assert.ok(!f.calls.some((c) => c.url?.includes("/token")));
  });
  test(`${id}: revoked access makes readiness false, even with prior connection and website cookies`, async () => {
    const f = setup({ id, initial: true, revoked: true });
    const status = await f.auth.status(id);
    assert.equal(status.connected, true);
    assert.equal(status.ready, false);
    assert.equal(status.reason, "AUTH_REVOKED");
    assert.equal(f.popups.length, 0);
    if (id === "google")
      assert.ok(f.calls.some((c) => c.removed === "google-access"));
  });
  test(`${id}: missing scopes require targeted approval instead of assuming ready`, async () => {
    const f = setup({ id, initial: true, missingScope: true });
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.authorized, false);
    assert.equal(status.reason, "AUTH_SCOPE_REQUIRED");
    assert.match(status.nextAction, /Reconnect\/Approve/);
    assert.equal(f.popups.length, 0);
  });
  test(`${id}: cancelled sign-in preserves safe reason and no refresh credential`, async () => {
    const f = setup({ id, cancelled: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_CANCELLED" });
    assert.equal(f.store["basic:auth:" + id], undefined);
  });
  test(`${id}: account switch detected instead of silently changing destination`, async () => {
    const f = setup({ id, initial: true, accountChanged: true });
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.reason, "AUTH_ACCOUNT_CHANGED");
  });
}
for (const id of ["dropbox", "onedrive"]) {
  test(`${id}: PKCE uses independent client, exact redirect/state and stores verified rotated token`, async () => {
    const f = setup({ id });
    assert.equal((await f.auth.connect(id)).ready, true);
    const u = new URL(f.popups[0].url);
    assert.equal(
      u.searchParams.get("client_id"),
      id === "dropbox" ? "own-key" : "own-client",
    );
    assert.equal(u.searchParams.get("code_challenge_method"), "S256");
    assert.equal(u.searchParams.get("code_challenge").length, 43);
    const exchange = f.calls.find((c) => c.url.includes("/token"));
    assert.equal(exchange.options.body.get("code_verifier").length, 43);
    assert.equal(exchange.options.body.get("client_secret"), null);
    assert.equal(f.store["basic:auth:" + id].refreshToken, "rotated-refresh");
    assert.ok(f.levels.every((v) => v.accessLevel === "TRUSTED_CONTEXTS"));
  });
  test(`${id}: expired and missing-expiry access tokens silently refresh without forcing OAuth`, async () => {
    for (const options of [{ expired: true }, { noExpiry: true }]) {
      const f = setup({ id, initial: true, ...options });
      assert.equal(await f.auth.token(id), "new-access");
      assert.equal(f.popups.length, 0);
      assert.equal(f.store["basic:auth:" + id].refreshToken, "rotated-refresh");
      assert.equal(f.calls.filter((c) => c.url.includes("/token")).length, 1);
    }
  });
  test(`${id}: wrong callback state rejected before token exchange`, async () => {
    const f = setup({ id, badState: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_CALLBACK_INVALID" });
    assert.equal(f.calls.length, 0);
  });
  test(`${id}: provider-denied consent has safe actionable error`, async () => {
    const f = setup({ id, denied: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_CANCELLED" });
    assert.equal(f.calls.length, 0);
  });
  test(`${id}: missing token scope cannot authenticate new client, refresh may retain verified prior scopes`, async () => {
    const f = setup({ id, noScopeResponse: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_SCOPE_REQUIRED" });
    const old = setup({
      id,
      initial: true,
      expired: true,
      noScopeResponse: true,
    });
    assert.equal((await old.auth.refresh(id)).ready, true);
  });
  test(`${id}: concurrent refresh callers share one token exchange`, async () => {
    const f = setup({ id, initial: true, expired: true });
    const tokens = await Promise.all([
      f.auth.token(id),
      f.auth.token(id),
      f.auth.token(id),
    ]);
    assert.deepEqual(tokens, ["new-access", "new-access", "new-access"]);
    assert.equal(f.calls.filter((c) => c.url.includes("/token")).length, 1);
  });
}
test("unknown provider is rejected before touching OAuth", async () => {
  const f = setup();
  await assert.rejects(f.auth.connect("r2"), { code: "PROVIDER_INVALID" });
});
test("Google reconnect clears Chrome cached token before explicit consent", async () => {
  const f = setup({ id: "google", initial: true });
  assert.equal((await f.auth.reconnect("google")).ready, true);
  assert.ok(f.calls.some((c) => c.removed === "google-access"));
  assert.ok(f.native.some((n) => n.interactive === true));
});

for (const id of ["dropbox", "onedrive"])
  test(`${id}: stale in-flight refresh cannot overwrite a newer explicit connection`, async () => {
    const f = setup({ id, initial: true, expired: true, holdFirstToken: true });
    const old = f.auth.token(id);
    const rejection = assert.rejects(old, { code: "AUTH_CHANGED" });
    await f.waitForToken;
    // Start the newer connection, let it reach the token exchange, then release
    // the stale exchange. Its old generation must be rejected before persisting.
    const current = f.auth.connect(id);
    await f.waitForSecondToken;
    f.releaseToken();
    await rejection;
    assert.equal((await current).ready, true);
  });
for (const id of ["dropbox", "onedrive"])
  test(`${id}: disconnect cancels in-flight consent without modifying provider/legacy state`, async () => {
    const f = setup({ id, holdFirstToken: true });
    const connecting = f.auth.connect(id);
    const rejected = assert.rejects(connecting, { code: "AUTH_CHANGED" });
    await f.waitForToken;
    await f.auth.disconnect(id);
    f.releaseToken();
    await rejected;
    assert.equal(f.store["basic:auth:" + id], undefined);
  });

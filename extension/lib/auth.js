import { CONFIG } from "../config.js";

import { createIdentity, REQUIRED_SCOPES, BASIC_STORAGE } from "./identity.js";
export const AUTH_SCOPES = REQUIRED_SCOPES;
const fail = (
  code,
  message,
  nextAction = "Reconnect/Approve this provider, then retry the save.",
) => Object.assign(new Error(message), { code, nextAction });
const b64 = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const normalized = (s) =>
  s.toLowerCase().replace(/^https:\/\/graph.microsoft.com\//, "");

export function createAuth({
  chrome,
  fetch = globalThis.fetch,
  config = CONFIG,
  now = Date.now,
  crypto = globalThis.crypto,
}) {
  const deployment = createIdentity({ chrome, config });
  const granted = (id, scopes) =>
    deployment.profile.scopes[id]
      .filter((s) => s !== "offline_access")
      .every((s) => scopes.map(normalized).includes(normalized(s)));
  const pending = new Map(),
    epochs = new Map();
  const generation = (id) => epochs.get(id) || 0;
  const checkGeneration = (id, ticket) => {
    if (generation(id) !== ticket)
      throw fail(
        "AUTH_CHANGED",
        "Authorization changed while checking access.",
        "Wait for Sign In to finish, then retry.",
      );
  };
  const key = (id) => `${BASIC_STORAGE.authPrefix}${id}`;
  function valid(id) {
    if (!Object.hasOwn(AUTH_SCOPES, id))
      throw fail(
        "PROVIDER_INVALID",
        "Unknown provider.",
        "Choose one of the three supported providers.",
      );
  }
  async function secure() {
    await chrome.storage.local.setAccessLevel({
      accessLevel: "TRUSTED_CONTEXTS",
    });
  }
  const load = async (id) => {
    const record = (await chrome.storage.local.get(key(id)))[key(id)];
    if (record && record.binding !== deployment.binding(id))
      throw fail(
        "AUTH_PROFILE_CHANGED",
        "The saved authorization belongs to a different or older deployment profile.",
        "Sign In or Reconnect explicitly. Existing History and counts are preserved.",
      );
    return record;
  };
  async function save(id, value, ticket = generation(id)) {
    await secure();
    checkGeneration(id, ticket);
    await chrome.storage.local.set({
      [key(id)]: { ...value, binding: deployment.binding(id) },
    });
  }
  function client(id) {
    return deployment.registration(id).clientId;
  }
  async function http(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw fail(
        "AUTH_NETWORK",
        "Could not reach the authorization provider.",
        "Check connectivity and Refresh; use Reconnect if permission was revoked.",
      );
    }
    if (response.status === 401 || response.status === 403)
      throw fail(
        "AUTH_REVOKED",
        `Provider access was rejected (HTTP ${response.status}).`,
      );
    return response;
  }
  async function probe(id, accessToken, expected) {
    const paths =
      id === "google"
        ? [
            "https://www.googleapis.com/drive/v3/about?fields=user(permissionId)",
          ]
        : id === "dropbox"
          ? ["https://api.dropboxapi.com/2/users/get_current_account"]
          : [
              "https://graph.microsoft.com/v1.0/me?$select=id",
              "https://graph.microsoft.com/v1.0/me/drive/root?$select=id",
            ];
    const identity = [];
    for (const path of paths) {
      const response = await http(path, {
        method: id === "dropbox" ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(id === "dropbox" ? { "Content-Type": "application/json" } : {}),
        },
        ...(id === "dropbox" ? { body: "null" } : {}),
      });
      if (!response.ok)
        throw fail(
          "AUTH_READINESS_HTTP",
          `Provider readiness could not be verified (HTTP ${response.status}).`,
          "Refresh later; do not assume the provider website login permits uploads.",
        );
      let data;
      try {
        data = await response.json();
      } catch {
        throw fail(
          "AUTH_RESPONSE_INVALID",
          "Provider readiness response was invalid.",
        );
      }
      const value =
        id === "google"
          ? data.user?.permissionId
          : id === "dropbox"
            ? data.account_id
            : data.id;
      if (typeof value !== "string" || !value)
        throw fail(
          "AUTH_RESPONSE_INVALID",
          "Provider did not identify the extension account or root.",
        );
      identity.push(value);
    }
    if (expected && JSON.stringify(expected) !== JSON.stringify(identity))
      throw fail(
        "AUTH_ACCOUNT_CHANGED",
        "The authorized account or root changed.",
      );
    return identity;
  }
  async function exchange(id, parameters, oldScopes) {
    const response = await http(deployment.registration(id).token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: client(id), ...parameters }),
    });
    // Never include raw OAuth descriptions, codes or bodies in user errors/logs.
    let result;
    try {
      result = await response.json();
    } catch {
      throw fail(
        "AUTH_RESPONSE_INVALID",
        "Authorization provider returned an invalid token response.",
      );
    }
    if (
      !response.ok ||
      typeof result.access_token !== "string" ||
      !result.access_token ||
      !Number.isFinite(result.expires_in) ||
      result.expires_in <= 0
    )
      throw fail(
        "AUTH_TOKEN_REJECTED",
        `Authorization could not be renewed (HTTP ${response.status}).`,
      );
    const scopes =
      typeof result.scope === "string"
        ? result.scope.split(/\s+/).filter(Boolean)
        : oldScopes || [];
    if (!granted(id, scopes))
      throw fail(
        "AUTH_SCOPE_REQUIRED",
        "Upload and verification permissions have not been granted.",
      );
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt: now() + result.expires_in * 1000,
      scopes,
    };
  }
  async function google(interactive) {
    const ticket = generation("google");
    client("google");
    let result;
    try {
      result = await chrome.identity.getAuthToken({
        interactive,
        scopes: deployment.profile.scopes.google,
        enableGranularPermissions: true,
      });
    } catch {
      throw fail(
        interactive ? "AUTH_CANCELLED" : "AUTH_REQUIRED",
        interactive
          ? "Google authorization was cancelled or denied."
          : "Google needs extension authorization.",
      );
    }
    const accessToken = typeof result === "string" ? result : result?.token;
    const scopes =
      typeof result === "string"
        ? deployment.profile.scopes.google
        : result?.grantedScopes || [];
    if (!accessToken)
      throw fail(
        "AUTH_REQUIRED",
        "Google did not supply an extension access token.",
      );
    if (!granted("google", scopes)) {
      await save("google", { connected: true, scopes: [] }, ticket);
      throw fail(
        "AUTH_SCOPE_REQUIRED",
        "Google Drive upload permission was not granted.",
      );
    }
    try {
      const identity = await probe(
        "google",
        accessToken,
        interactive ? undefined : (await load("google"))?.identity,
      );
      await save("google", { connected: true, scopes, identity }, ticket);
      return accessToken;
    } catch (error) {
      if (error.code === "AUTH_REVOKED")
        await chrome.identity.removeCachedAuthToken({ token: accessToken });
      throw error;
    }
  }
  async function getToken(id, forceProbe = true) {
    valid(id);
    client(id);
    const ticket = generation(id);
    await secure();
    let record = await load(id);
    if (id === "google") {
      if (!record?.connected)
        throw fail(
          "AUTH_REQUIRED",
          "Sign In to authorize this Basic edition explicitly.",
        );
      if (!granted(id, record.scopes || []))
        throw fail(
          "AUTH_SCOPE_REQUIRED",
          "Required upload permissions are missing.",
        );
      return google(false);
    }
    if (!record?.connected || !record.refreshToken)
      throw fail(
        "AUTH_REQUIRED",
        "Sign In to authorize this extension before saving.",
      );
    if (!granted(id, record.scopes || []))
      throw fail(
        "AUTH_SCOPE_REQUIRED",
        "Required upload permissions are missing.",
      );
    if (
      !record.accessToken ||
      !Number.isFinite(record.expiresAt) ||
      record.expiresAt <= now() + 60000
    ) {
      const token = await exchange(
        id,
        {
          grant_type: "refresh_token",
          refresh_token: record.refreshToken,
          ...(id === "onedrive"
            ? { scope: deployment.profile.scopes[id].join(" ") }
            : {}),
        },
        record.scopes,
      );
      record = {
        ...record,
        ...token,
        refreshToken: token.refreshToken || record.refreshToken,
      };
      // Persist rotating refresh credentials before subsequent network work.
      await save(id, record, ticket);
    }
    if (forceProbe) await probe(id, record.accessToken, record.identity);
    checkGeneration(id, ticket);
    return record.accessToken;
  }
  async function state(id) {
    valid(id);
    let record, reason, nextAction;
    try {
      deployment.registration(id);
      record = await load(id);
      await single(`token:${id}:${generation(id)}`, () => getToken(id));
      return {
        provider: id,
        connected: true,
        authorized: true,
        ready: true,
        reason: "READY",
        nextAction: "Right-click a supported file to save.",
      };
    } catch (error) {
      reason = error.code || "AUTH_UNAVAILABLE";
      nextAction =
        error.nextAction || "Refresh or Reconnect/Approve before saving.";
    }
    return {
      provider: id,
      connected: Boolean(record?.connected),
      authorized: Boolean(record && granted(id, record.scopes || [])),
      ready: false,
      setupRequired: [
        "OAUTH_CONFIG_REQUIRED",
        "OAUTH_MANIFEST_MISMATCH",
        "OAUTH_REDIRECT_MISMATCH",
        "EXTENSION_ID_MISMATCH",
        "IDENTITY_CONFIG_INVALID",
      ].includes(reason),
      reason,
      nextAction,
    };
  }
  function single(name, work) {
    if (pending.has(name)) return pending.get(name);
    const promise = Promise.resolve()
      .then(work)
      .finally(() => pending.delete(name));
    pending.set(name, promise);
    return promise;
  }
  async function connect(id) {
    valid(id);
    return single(`connect:${id}`, async () => {
      const clientId = client(id);
      const ticket = generation(id) + 1;
      epochs.set(id, ticket);
      await secure();
      if (id === "google") {
        await google(true);
        return state(id);
      }
      const redirect = deployment.registration(id).redirect;
      const nonce = b64(crypto.getRandomValues(new Uint8Array(32))),
        verifier = b64(crypto.getRandomValues(new Uint8Array(32))),
        started = now();
      const challenge = b64(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(verifier),
        ),
      );
      const authorize = new URL(deployment.registration(id).authorize);
      authorize.search = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirect,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state: nonce,
        scope: deployment.profile.scopes[id].join(" "),
        ...(id === "dropbox"
          ? { token_access_type: "offline" }
          : { response_mode: "query" }),
      });
      let response;
      try {
        response = await chrome.identity.launchWebAuthFlow({
          url: authorize.href,
          interactive: true,
        });
      } catch {
        throw fail(
          "AUTH_CANCELLED",
          "Authorization was cancelled or could not complete.",
        );
      }
      let callback;
      try {
        callback = new URL(response);
      } catch {
        throw fail(
          "AUTH_CALLBACK_INVALID",
          "Authorization callback was invalid.",
        );
      }
      if (
        callback.origin + callback.pathname !== redirect ||
        callback.hash ||
        callback.username ||
        callback.password ||
        callback.searchParams.getAll("state").length !== 1 ||
        callback.searchParams.get("state") !== nonce ||
        now() - started < 0 ||
        now() - started > 10 * 60000
      )
        throw fail(
          "AUTH_CALLBACK_INVALID",
          "Authorization callback was mismatched or expired.",
        );
      if (callback.searchParams.has("error"))
        throw fail(
          "AUTH_CANCELLED",
          "Provider denied or cancelled authorization.",
        );
      if (
        callback.searchParams.getAll("code").length !== 1 ||
        !callback.searchParams.get("code")
      )
        throw fail(
          "AUTH_CALLBACK_INVALID",
          "Authorization callback did not contain a single code.",
        );
      const token = await exchange(id, {
        grant_type: "authorization_code",
        code: callback.searchParams.get("code"),
        code_verifier: verifier,
        redirect_uri: redirect,
        ...(id === "onedrive"
          ? { scope: deployment.profile.scopes[id].join(" ") }
          : {}),
      });
      if (!token.refreshToken)
        throw fail(
          "AUTH_OFFLINE_REQUIRED",
          "Offline authorization was not granted.",
        );
      const identity = await probe(id, token.accessToken);
      await save(id, { ...token, identity, connected: true }, ticket);
      return state(id);
    });
  }
  return {
    status: state,
    connect,
    refresh: state,
    async reconnect(id) {
      valid(id);
      epochs.set(id, generation(id) + 1);
      let ownRecord;
      try {
        ownRecord = await load(id);
      } catch {
        /* Preserve incompatible records until explicit replacement. */
      }
      if (id === "google" && ownRecord?.connected) {
        try {
          const t = await chrome.identity.getAuthToken({
            interactive: false,
            scopes: deployment.profile.scopes.google,
          });
          const value = typeof t === "string" ? t : t?.token;
          if (value)
            await chrome.identity.removeCachedAuthToken({ token: value });
        } catch {
          /* No usable cached grant. */
        }
      }
      await chrome.storage.local.remove(key(id));
      return connect(id);
    },
    getStatus: state,
    checkReadiness: state,
    async disconnect(id) {
      valid(id);
      epochs.set(id, generation(id) + 1);
      await chrome.storage.local.remove(key(id));
      return {
        provider: id,
        connected: false,
        authorized: false,
        ready: false,
        reason: "AUTH_DISCONNECTED",
        nextAction: "Sign In to authorize this edition again.",
      };
    },
    token: (id) => single(`token:${id}:${generation(id)}`, () => getToken(id)),
  };
}

// One revocable, selected-bucket session per approved external connection.
import { createFileEngine, fail } from "./file-engine/engine.mjs";
import { createScopedSession } from "./file-engine/scoped-session.mjs";
import { request02, request03, session } from "./file-engine/session-validators.mjs";
import { extensionR2Adapter } from "./file-engine/adapters/extension-r2.mjs";
function authorizeLab({ roots, request, isCurrent, ttl = 36e5, clock = Date.now }) {
  if (!Array.isArray(roots) || !roots.length || roots.some((r) => r.provider !== "extension-r2" || r.key !== "")) throw fail("INVALID_SCOPE");
  const expires = clock() + Math.min(Math.max(ttl, 1), 288e5);
  let revoked = false;
  const active = async () => !revoked && clock() < expires && await isCurrent();
  const adapter = extensionR2Adapter({ request: async (...args) => {
    if (!await active()) throw fail("AUTHORIZATION_DENIED");
    const r = await request(...args);
    if (!await active()) {
      await r.body?.cancel();
      throw fail("AUTHORIZATION_DENIED");
    }
    return r;
  }, roots });
  let state = { schemaVersion: 1, revision: 1, objects: [], jobs: [], dedupe: {} };
  const store = { read: async () => structuredClone(state), update: async (fn) => fn(state) };
  const engine = createFileEngine({ store, adapters: [adapter], authorize: async (r) => await active() && ["list", "metadata", "read"].includes(r.operation) && [r.source, r.destination].filter(Boolean).every((i) => roots.some((s) => s.account === i.account && s.container === i.container && i.provider === s.provider)) });
  const facade = createScopedSession({ engine, scope: { operations: ["list", "metadata", "read"], locations: roots, maxOperations: 100 }, validateRequests: [request02, request03], validateSession: session });
  return Object.freeze({ expires, revoke() {
    revoked = true;
  }, async query(method, input = {}) {
    if (!await active()) return { apiVersion: "1.0.0", state: "failed", error: { code: "AUTHORIZATION_REVOKED_OR_EXPIRED" } };
    const response = await facade.query(method, input);
    if (!await active()) return { apiVersion: "1.0.0", state: "failed", error: { code: "AUTHORIZATION_REVOKED_OR_EXPIRED" } };
    if (method === "describe" && response.data) {
      response.data.transport = "Chrome native messaging / authenticated loopback";
      response.data.limits.maxBytes = 65536;
      response.data.expiresAt = expires;
      response.data.authorization = "Explicit extension approval; read-only selected buckets; user-selected duration (up to eight hours); revocable";
      response.data.unsupported = ["mutations", "direct-s3", "durable recovery"];
    }
    return response;
  } });
}
export {
  authorizeLab
};

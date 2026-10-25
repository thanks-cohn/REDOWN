// Extension-owned approval surface; native clients cannot approve their own requests.
import { authorizeLab } from "./lab-session.mjs";
const $ = (id) => document.getElementById(id), status = (text) => {
  $("status").textContent = text;
};
let port = null, sessionId = null;
const grants = /* @__PURE__ */ new Map(), pending = /* @__PURE__ */ new Map();
function stop() {
  for (const g of grants.values()) g.revoke();
  grants.clear();
  pending.clear();
  $("clients").replaceChildren();
  const previousPort = port;
  port = null;
  previousPort?.disconnect();
  status("Disconnected; all grants revoked");
}
$("revoke").onclick = stop;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.cloudflareAuth && changes.cloudflareAuth.newValue?.sessionId !== sessionId) stop();
});
$("discover").onclick = async () => {
  try {
    const a = await chrome.runtime.sendMessage({ type: "cfAccounts" });
    if (!a.ok) throw Error();
    $("buckets").replaceChildren();
    for (const account of a.accounts) {
      const b = await chrome.runtime.sendMessage({ type: "cfBuckets", accountId: account.id });
      if (!b.ok) throw Error();
      for (const bucket of b.buckets) {
        if (bucket.jurisdiction && bucket.jurisdiction !== "default") continue;
        const label = document.createElement("label"), check = document.createElement("input");
        check.type = "checkbox";
        check.dataset.root = JSON.stringify({ provider: "extension-r2", account: account.id, container: bucket.name, key: "" });
        label.append(check, document.createTextNode(account.name + " / " + bucket.name));
        $("buckets").append(label);
      }
    }
    status("Select buckets, then start the local connection. Discovery does not prove object-read permission.");
  } catch {
    status("Discovery failed: connect/reconnect Cloudflare in Settings, or check account permissions.");
  }
};
$("connect").onclick = async () => {
  stop();
  const auth = (await chrome.storage.local.get("cloudflareAuth")).cloudflareAuth;
  if (!auth?.sessionId || !auth.accessToken || auth.reconnectRequired) {
    status("Connect or reconnect Cloudflare in Settings first.");
    return;
  }
  sessionId = auth.sessionId;
  port = chrome.runtime.connectNative("com.redown.laboratory");
  const connectedPort = port;
  port.onDisconnect.addListener(() => {
    if (port !== connectedPort) return;
    const error = chrome.runtime.lastError;
    stop();
    status(error ? "Native helper unavailable or disconnected. Install the helper, reload REDOWN and try again." : "Disconnected; grants revoked");
  });
  port.onMessage.addListener(async (message) => {
    if (port !== connectedPort) return;
    if (message.type === "ready") {
      status("Local helper ready. Start Python; approve its matching connection code here.");
      return;
    }
    if (message.type === "closed") {
      grants.get(message.client)?.revoke();
      grants.delete(message.client);
      pending.get(message.client)?.remove();
      pending.delete(message.client);
      return;
    }
    if (message.type !== "request" || typeof message.id !== "string" || typeof message.client !== "string") return;
    const reply = (response) => {
      if (new TextEncoder().encode(JSON.stringify({ id: message.id, response })).length > 5e5) response = { apiVersion: "1.0.0", state: "failed", error: { code: "RESPONSE_BUDGET" } };
      if (port === connectedPort) port.postMessage({ id: message.id, response });
    };
    if (message.method === "pair") {
      if (pending.size + grants.size >= 8) {
        reply({ apiVersion: "1.0.0", state: "failed", error: { code: "CLIENT_LIMIT" } });
        return;
      }
      const row = document.createElement("article"), name = document.createElement("p");
      name.textContent = `Client: ${String(message.input?.name || "Unnamed").slice(0, 80)}. Code: ${message.client}`;
      row.append(name);
      const reject = document.createElement("button");
      reject.textContent = "Reject / revoke";
      reject.onclick = () => {
        grants.get(message.client)?.revoke();
        grants.delete(message.client);
        pending.delete(message.client);
        row.remove();
        reply({ apiVersion: "1.0.0", state: "failed", error: { code: "PAIRING_REJECTED" } });
      };
      const approve = document.createElement("button");
      approve.textContent = "Approve selected buckets for 5 minutes";
      approve.onclick = () => {
        const roots = [...$("buckets").querySelectorAll("input:checked")].map((c) => JSON.parse(c.dataset.root));
        if (!roots.length) {
          status("Select at least one bucket.");
          return;
        }
        const grant2 = authorizeLab({ roots, request: RedownCloudflareApi.request, isCurrent: async () => {
          const a = (await chrome.storage.local.get("cloudflareAuth")).cloudflareAuth;
          return a?.sessionId === sessionId && !!a.accessToken && !a.reconnectRequired;
        } });
        grants.set(message.client, grant2);
        pending.delete(message.client);
        approve.remove();
        reply({ apiVersion: "1.0.0", state: "available", data: { clientId: message.client, expiresAt: grant2.expires, mode: "extension" } });
      };
      row.append(approve, reject);
      pending.set(message.client, row);
      $("clients").append(row);
      return;
    }
    const grant = grants.get(message.client);
    reply(grant ? await grant.query(message.method, message.input) : { apiVersion: "1.0.0", state: "failed", error: { code: "PAIRING_REQUIRED" } });
  });
};

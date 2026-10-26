// Extension-owned approval surface; native clients cannot approve their own requests.
import { laboratoryCreate } from "./lab-worker.mjs";
import { authorizeLab } from "./lab-session.mjs";
const $ = (id) => document.getElementById(id), status = (text) => {
  $("status").textContent = text;
};
let port = null, sessionId = null;
const grants = /* @__PURE__ */ new Map(), pending = /* @__PURE__ */ new Map();
const PAIRING_TIMEOUT_MS = 120000;
function removePending(client) {
  const entry = pending.get(client);
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.row.remove();
  pending.delete(client);
}
function stop() {
  for (const g of grants.values()) g.revoke();
  grants.clear();
  for (const client of pending.keys()) removePending(client);
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
async function startConnection() {
  stop();
  const auth = (await chrome.storage.local.get("cloudflareAuth")).cloudflareAuth;
  if (!auth?.sessionId || !auth.accessToken || auth.reconnectRequired) {
    status("Connect or reconnect Cloudflare in Settings first.");
    return;
  }
  sessionId = auth.sessionId;
  status("Starting local helper…");
  try {
    port = chrome.runtime.connectNative("com.redown.laboratory");
  } catch (error) {
    status("Could not start the local helper: " + String(error?.message || error).slice(0, 300) + ". Reload REDOWN after installing/registering the helper.");
    return;
  }
  const connectedPort = port;
  port.onDisconnect.addListener(() => {
    if (port !== connectedPort) return;
    const error = chrome.runtime.lastError?.message;
    stop();
    status(error ? "Local helper disconnected: " + error.slice(0, 300) + ". Check helper installation and the registered REDOWN extension ID, then reload REDOWN." : "Local helper disconnected; grants revoked. Click Start local connection to reconnect.");
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
      removePending(message.client);
      document.getElementById(`client-${message.client}`)?.remove();
      return;
    }
    if (message.type !== "request" || typeof message.id !== "string" || typeof message.client !== "string") return;
    const reply = (response) => {
      if (new TextEncoder().encode(JSON.stringify({ id: message.id, response })).length > 5e5) response = { apiVersion: "1.0.0", state: "failed", error: { code: "RESPONSE_BUDGET" } };
      if (port === connectedPort) port.postMessage({ id: message.id, response });
    };
    if (message.method === "pair") {
      if (pending.has(message.client) || grants.has(message.client)) {
        reply({ apiVersion: "1.0.0", state: "failed", error: { code: "ALREADY_PAIRED" } });
        return;
      }
      if (pending.size + grants.size >= 8) {
        reply({ apiVersion: "1.0.0", state: "failed", error: { code: "CLIENT_LIMIT" } });
        return;
      }
      const row = document.createElement("article"), name = document.createElement("p");
      row.id = `client-${message.client}`;
      const deadline = Date.now() + PAIRING_TIMEOUT_MS;
      name.textContent = `Client: ${String(message.input?.name || "Unnamed").slice(0, 80)}. Code: ${message.client}. Approve within 120 seconds; this CLI needs its own approval even if the GUI is connected.`;
      row.append(name);
      const expire = () => {
        if (!pending.has(message.client)) return;
        removePending(message.client);
        reply({ apiVersion: "1.0.0", state: "failed", error: { code: "PAIRING_TIMEOUT" } });
        status("Pairing timed out without approval. Start a new Python connection and approve its new matching code within 120 seconds.");
      };
      const reject = document.createElement("button");
      reject.textContent = "Reject / revoke";
      reject.onclick = () => {
        grants.get(message.client)?.revoke();
        grants.delete(message.client);
        const wasPending = pending.has(message.client);
        removePending(message.client);
        row.remove();
        if (wasPending) reply({ apiVersion: "1.0.0", state: "failed", error: { code: "PAIRING_REJECTED" } });
      };
      const approve = document.createElement("button");
      approve.textContent = "APPROVE PYTHON CONNECTION";
      approve.className = "pair-approve";
      approve.onclick = () => {
        if (port !== connectedPort || !pending.has(message.client)) return;
        if (Date.now() >= deadline) { expire(); return; }
        const roots = [...$("buckets").querySelectorAll("input:checked")].map((c) => JSON.parse(c.dataset.root));
        if (!roots.length) {
          status("Select at least one bucket.");
          return;
        }
        const hours = Number($("grant-duration").value);
        if (![1, 4, 8].includes(hours)) { status("Choose an approval duration of 1, 4 or 8 hours."); return; }
        const write = $("write-approval").checked;
        if (write && roots.some(r => !["test-1-new","test-2-new","test-3-new","test-4-new"].includes(r.container))) { status("Write approval is restricted to test-1-new through test-4-new. Uncheck other buckets or use read-only approval."); return; }
        const grant2 = authorizeLab({ roots, write, extensionVersion: chrome.runtime.getManifest?.().version || "UNKNOWN", createObject: laboratoryCreate({request:RedownCloudflareApi.request, getProfiles:async () => (await chrome.storage.local.get("profiles")).profiles || [], fetcher:(...args)=>RedownCloudflareApi.boundedFetch(...args)}), ttl: hours * 3600000, renewAuthorization: () => RedownCloudflareApi.renewAuthorization(sessionId), request: RedownCloudflareApi.request, isCurrent: async () => {
          const a = (await chrome.storage.local.get("cloudflareAuth")).cloudflareAuth;
          return a?.sessionId === sessionId && !!a.accessToken && !a.reconnectRequired;
        } });
        grants.set(message.client, grant2);
        clearTimeout(pending.get(message.client).timer);
        pending.delete(message.client);
        approve.remove();
        name.append(document.createTextNode(` — Connected; ${write ? "conditional write in a unique laboratory namespace (no deletion)" : "read access"} approved for ${hours} hour(s).`));
        status("Python client connected and authorized. Keep this page open; revoke access here whenever needed.");
        reply({ apiVersion: "1.0.0", state: "available", data: { clientId: message.client, expiresAt: grant2.expires, mode: "extension" } });
      };
      row.append(approve, reject);
      pending.set(message.client, { row, timer: setTimeout(expire, PAIRING_TIMEOUT_MS) });
      $("clients").append(row);
      status(`Python approval requested. Compare code ${message.client} and approve within 120 seconds. Keep this Laboratory tab open.`);
      row.scrollIntoView?.({ block: "nearest" });
      approve.focus();
      return;
    }
    const grant = grants.get(message.client);
    reply(grant ? await grant.query(message.method, message.input) : { apiVersion: "1.0.0", state: "failed", error: { code: "PAIRING_REQUIRED" } });
  });
}
$("connect").onclick = () => startConnection().catch(error => {
  stop();
  status("Local connection could not start: " + String(error?.message || error).slice(0, 300) + ". Reload REDOWN and reopen this Laboratory page.");
});

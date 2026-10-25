import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
test("extension page explicitly rejects, approves selected scope and revokes", async () => {
  const dom = new JSDOM(readFileSync("extension/laboratory.html", "utf8"));
  const previous = { document: globalThis.document, chrome: globalThis.chrome, RedownCloudflareApi: globalThis.RedownCloudflareApi };
  const sent = [];
  let receive, disconnect;
  const auth = { sessionId: "session", accessToken: "NEVER_EXPOSE_THIS_TOKEN" };
  const port = { onMessage: { addListener: (fn) => receive = fn }, onDisconnect: { addListener: (fn) => disconnect = fn }, postMessage: (m) => sent.push(m), disconnect() {
  } };
  globalThis.document = dom.window.document;
  globalThis.chrome = { storage: { onChanged: { addListener() {
  } }, local: { get: async () => ({ cloudflareAuth: auth }) } }, runtime: { sendMessage: async (m) => m.type === "cfAccounts" ? { ok: true, accounts: [{ id: "account", name: "A" }] } : { ok: true, buckets: [{ name: "bucket" }] }, connectNative: () => port } };
  globalThis.RedownCloudflareApi = { request: async () => {
    throw Error("No cloud request authorized by this UI fixture");
  } };
  try {
    await import("../extension/laboratory.mjs");
    const $ = (id) => document.getElementById(id);
    await $("discover").onclick();
    document.querySelector("input").checked = true;
    await $("connect").onclick();
    await receive({ type: "request", client: "reject-client", id: "pair1", method: "pair", input: { name: "<img src=x>" } });
    assert.equal(document.querySelectorAll("img").length, 0);
    [...$("clients").querySelectorAll("button")].find((b) => b.textContent.startsWith("Reject")).click();
    assert.equal(sent.at(-1).response.error.code, "PAIRING_REJECTED");
    await receive({ type: "request", client: "approved-client", id: "pair2", method: "pair", input: { name: "Python" } });
    [...$("clients").querySelectorAll("button")].find((b) => b.textContent.startsWith("Approve")).click();
    assert.equal(sent.at(-1).response.state, "available");
    await receive({ type: "request", client: "approved-client", id: "describe", method: "describe", input: {} });
    assert.equal(sent.at(-1).response.data.locations[0].container, "bucket");
    assert.ok(!JSON.stringify(sent).includes(auth.accessToken));
    [...$("clients").querySelectorAll("button")].find((b) => b.textContent.startsWith("Reject")).click();
    await receive({ type: "request", client: "approved-client", id: "after-revoke", method: "describe", input: {} });
    assert.equal(sent.at(-1).response.error.code, "PAIRING_REQUIRED");
    disconnect();
    assert.match($("status").textContent, /Disconnected/);
  } finally {
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});

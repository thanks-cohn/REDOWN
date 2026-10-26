import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
test("extension page explicitly rejects, approves selected scope and revokes", async (t) => {
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
    $("grant-duration").value = "4";
    [...$("clients").querySelectorAll("button")].find((b) => b.classList.contains("pair-approve")).click();
    assert.equal(sent.at(-1).response.state, "available");
    assert.ok(Math.abs(sent.at(-1).response.data.expiresAt - Date.now() - 4 * 3600000) < 2000);
    assert.match($("status").textContent, /connected and authorized/i);
    await receive({ type: "request", client: "approved-client", id: "describe", method: "describe", input: {} });
    assert.equal(sent.at(-1).response.data.locations[0].container, "bucket");
    assert.ok(!JSON.stringify(sent).includes(auth.accessToken));
    [...$("clients").querySelectorAll("button")].find((b) => b.textContent.startsWith("Reject")).click();
    await receive({ type: "request", client: "approved-client", id: "after-revoke", method: "describe", input: {} });
    assert.equal(sent.at(-1).response.error.code, "PAIRING_REQUIRED");
    await receive({ type:'request',client:'write-client',id:'write-pair',method:'pair',input:{name:'Python write'} });
    $('write-approval').checked=true;
    [...$('clients').querySelectorAll('button')].find(b=>b.classList.contains('pair-approve')).click();
    assert.match($('status').textContent,/restricted to test-1-new/);
    const choice=$('buckets').querySelector('input');
    choice.dataset.root=JSON.stringify({provider:'extension-r2',account:'account',container:'test-1-new',key:''});
    [...$('clients').querySelectorAll('button')].find(b=>b.classList.contains('pair-approve')).click();
    await receive({type:'request',client:'write-client',id:'write-info',method:'describe',input:{}});
    assert.equal(sent.at(-1).response.data.writeEnabled,true);
    assert.match(sent.at(-1).response.data.locations[0].key,/^__redown_test__\//);
    assert.ok(!sent.at(-1).response.data.operations.includes('delete'));
    // Separate pending GUI/CLI connections: closing one must not revoke the other.
    await receive({type:'request',client:'gui-client',id:'gui-pair',method:'pair',input:{}});
    await receive({type:'request',client:'cli-client',id:'cli-pair',method:'pair',input:{}});
    assert.match($('status').textContent,/cli-client/);
    await receive({type:'closed',client:'gui-client'});
    assert.equal(document.getElementById('client-gui-client'),null);
    assert.ok(document.getElementById('client-cli-client'));
    const cliApprove=document.getElementById('client-cli-client').querySelector('.pair-approve');
    const realNow=Date.now();
    const now=t.mock.method(Date,'now',()=>realNow+119000);
    cliApprove.click(); // Delayed but still within the pairing deadline.
    assert.equal(sent.at(-1).response.state,'available');
    now.mock.restore();
    await receive({type:'closed',client:'cli-client'});
    assert.equal(document.getElementById('client-cli-client'),null);
    let expire;
    const originalTimer=globalThis.setTimeout;
    const timer=t.mock.method(globalThis,'setTimeout',(fn,ms,...args)=>{
      if(ms===120000){expire=fn;return 42;}
      return originalTimer(fn,ms,...args);
    });
    await receive({type:'request',client:'timeout-client',id:'timeout-pair',method:'pair',input:{}});
    const staleApprove=document.getElementById('client-timeout-client').querySelector('.pair-approve');
    expire();
    assert.equal(sent.at(-1).response.error.code,'PAIRING_TIMEOUT');
    const count=sent.length;
    staleApprove.click();
    assert.equal(sent.length,count,'expired approval cannot create a grant');
    timer.mock.restore();
    await receive({type:'request',client:'late-client',id:'late-pair',method:'pair',input:{}});
    const delayedTimer=t.mock.method(Date,'now',()=>realNow+130000);
    document.getElementById('client-late-client').querySelector('.pair-approve').click();
    assert.equal(sent.at(-1).response.error.code,'PAIRING_TIMEOUT','wall-clock expiry applies even if browser timers were suspended');
    delayedTimer.mock.restore();
    chrome.runtime.lastError = {message: "Specified native messaging host not found."};
    disconnect();
    assert.match($("status").textContent, /Specified native messaging host not found/);
  } finally {
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});

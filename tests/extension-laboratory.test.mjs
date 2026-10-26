import test from "node:test";
import assert from "node:assert/strict";
import { authorizeLab } from "../extension/lab-session.mjs";
import { extensionR2Adapter } from "../extension/file-engine/adapters/extension-r2.mjs";
const root = { provider: "extension-r2", account: "account", container: "bucket", key: "" };
const bytes = new TextEncoder().encode("Real transport fixture \u2014 not cloud proof");
function fixture() {
  const calls = [];
  return { calls, request: async (path, options = {}) => {
    calls.push([path, options.method || "GET"]);
    if (path.includes("?")) return Response.json({ result: { objects: [{ key: "fixture.txt", size: bytes.length, etag: "rev1" }], cursor: null } });
    return new Response(options.method === "HEAD" ? null : bytes, { headers: { etag: "rev1", "content-length": String(bytes.length) } });
  } };
}
const request = (operation, source = root) => ({ apiVersion: "0.3.0", operation, source, idempotencyKey: crypto.randomUUID() });
test("canonical read, bytes, scoped evidence and Atlas correlation", async () => {
  const f = fixture(), g = authorizeLab({ roots: [root], request: f.request, isCurrent: () => true });
  const info = await g.query("describe");
  assert.deepEqual(info.data.operations, ["list", "metadata", "read"]);
  assert.equal(info.data.providerContracts[0].authentication[0], "extension-oauth");
  assert.equal(info.data.providerContracts[0].operations.upload, "unsupported");
  const list = await g.query("execute", { request: request("list") });
  assert.equal(list.data.executor, "canonical-coordinator");
  const source = list.data.result.objects[0].identity;
  const read = await g.query("execute", { request: request("read", source) });
  assert.equal(read.data.state, "completed");
  assert.equal(Buffer.from(read.data.result.bytesBase64, "base64").toString(), new TextDecoder().decode(bytes));
  const proof = await g.query("evidence", { id: read.data.id });
  assert.equal(proof.data.verification.providerEvidence, true);
  assert.equal(proof.data.id, read.data.id);
  assert.ok((await g.query("resources", { id: read.data.id, metric: "getLatencyBreakdown" })).data);
  assert.ok(!JSON.stringify(proof).includes("fixture.txt"));
});
test("revocation, expiration and Cloudflare session change fail closed", async () => {
  let time = 0, current = true;
  const f = fixture(), g = authorizeLab({ roots: [root], request: f.request, isCurrent: () => current, clock: () => time, ttl: 10 });
  time = 10;
  assert.equal((await g.query("describe")).error.code, "LOCAL_SESSION_EXPIRED");
  const a = authorizeLab({ roots: [root], request: f.request, isCurrent: () => current });
  current = false;
  assert.equal((await a.query("describe")).state, "failed");
  current = true;
  a.revoke();
  assert.equal((await a.query("execute", { request: request("list") })).state, "failed");
  assert.equal(f.calls.length, 0);
});
test("authorization rejects cross bucket/account, mutation, unknown methods and inputs", async () => {
  const f = fixture(), g = authorizeLab({ roots: [root], request: f.request, isCurrent: () => true });
  for (const source of [{ ...root, account: "other" }, { ...root, container: "other" }]) assert.equal((await g.query("execute", { request: request("list", source) })).error.code, "AUTHORIZATION_DENIED");
  assert.equal((await g.query("execute", { request: { apiVersion: "0.3.0", operation: "upload", destination: { ...root, key: "new" }, content: "x", idempotencyKey: "mutation" } })).error.code, "AUTHORIZATION_DENIED");
  assert.equal((await g.query("execute", { request: {} })).error.code, "INVALID_INPUT");
  assert.equal((await g.query("eval", { script: "bad" })).error.code, "UNSUPPORTED_OPERATION");
  assert.equal((await g.query("inspect", { id: "another-client-job" })).error.code, "AUTHORIZATION_DENIED");
  assert.equal(f.calls.length, 0);
});
test("provider permission denial is classified, no retry/Worker provisioning", async () => {
  let calls = 0;
  const g = authorizeLab({ roots: [root], request: async () => {
    calls++;
    return new Response("", { status: 403 });
  }, isCurrent: () => true });
  const response = await g.query("execute", { request: request("read", { ...root, key: "fixture.txt" }) });
  assert.equal(response.data.error, "PROVIDER_PERMISSION_DENIED");
  assert.equal(calls, 1);
});
test("revoke during request suppresses late bytes and future evidence", async () => {
  let release;
  const wait = new Promise((r) => release = r);
  const g = authorizeLab({ roots: [root], request: async () => {
    await wait;
    return new Response(bytes, { headers: { etag: "rev1" } });
  }, isCurrent: () => true });
  const running = g.query("execute", { request: request("read", { ...root, key: "fixture.txt" }) });
  await new Promise((r) => setTimeout(r, 20));
  g.revoke();
  release();
  assert.equal((await running).error.code, "AUTHORIZATION_REVOKED");
});
test("bounded reads, truncation, pagination and exact key encoding", async () => {
  let path;
  const adapter = extensionR2Adapter({ roots: [root], request: async (p) => {
    path = p;
    return Response.json({ result: { objects: [], cursor: "next-page" } });
  } });
  const page = await adapter.list(root, { limit: 1 });
  assert.equal(page.cursor, "next-page");
  assert.equal(page.complete, false);
  const a = extensionR2Adapter({ roots: [root], request: async (p) => {
    path = p;
    return new Response(new Uint8Array(131073), { headers: { etag: "r" } });
  } });
  await assert.rejects(a.read({ ...root, key: "space #?/file.txt" }), { code: "SIZE_LIMIT" });
  assert.match(path, /space%20%23%3F\/file.txt/);
  const short = extensionR2Adapter({ roots: [root], request: async () => new Response("x", { headers: { etag: "r", "content-length": "2" } }) });
  await assert.rejects(short.read({ ...root, key: "x" }), { code: "TRUNCATED_READ" });
});

test('owner-selected grants default to an hour and cap at eight hours', async () => {
  let time=0;
  const f=fixture();
  const g=authorizeLab({roots:[root],request:f.request,isCurrent:()=>true,clock:()=>time});
  assert.equal(g.expires,3600000);
  time=6*60000;
  assert.equal((await g.query('describe')).state,'available');
  const long=authorizeLab({roots:[root],request:f.request,isCurrent:()=>true,clock:()=>time,ttl:24*3600000});
  assert.equal(long.expires-time,8*3600000);
  time=g.expires;
  assert.equal((await g.query('describe')).error.code,'LOCAL_SESSION_EXPIRED');
  long.revoke();
  assert.equal((await long.query('describe')).state,'failed');
});

test('OAuth renewal stays scoped, rate limited, redacted and cannot extend the grant',async()=>{
  let time=0,calls=0;const f=fixture();
  const grant=authorizeLab({roots:[root],request:f.request,isCurrent:()=>true,clock:()=>time,renewAuthorization:async()=>{calls++;return {state:'renewed',expiresAt:9999999,accessToken:'NEVER_RETURN'};}});
  assert.ok((await grant.query('describe')).data.methods.includes('renewAuthorization'));
  assert.equal((await grant.query('renewAuthorization',{token:'bad'})).error.code,'INVALID_INPUT');
  const result=await grant.query('renewAuthorization');assert.equal(result.data.state,'renewed');assert.ok(!JSON.stringify(result).includes('NEVER_RETURN'));assert.equal(calls,1);
  assert.equal((await grant.query('renewAuthorization')).error.code,'OAUTH_RENEWAL_RATE_LIMITED');
  time=40*60000;assert.equal((await grant.query('renewAuthorization')).state,'available');assert.equal(calls,2);
  time=grant.expires;assert.equal((await grant.query('renewAuthorization')).error.code,'LOCAL_SESSION_EXPIRED');assert.equal(calls,2);assert.equal(f.calls.length,0);
});

test('oversized declared provider body is cancelled before consumption, unknown lengths remain bounded', async () => {
  let consumed=0,cancelled=false;
  const body={getReader(){consumed++;throw new Error('must not read');},async cancel(){cancelled=true;}};
  const adapter=extensionR2Adapter({roots:[root], request:async()=>({ok:true,status:200,headers:new Headers({'content-length':'65537',etag:'r1'}),body})});
  await assert.rejects(adapter.read({...root,key:'large.bin'}),{code:'SIZE_LIMIT'});
  assert.equal(consumed,0); assert.equal(cancelled,true);
  const malformed=extensionR2Adapter({roots:[root],request:async()=>({ok:true,status:200,headers:new Headers({'content-length':'NaN',etag:'r1'}),body})});
  await assert.rejects(malformed.read({...root,key:'bad.bin'}),{code:'INVALID_PROVIDER_RESPONSE'});
});

// Actual Python processes, TCP and native frames; actual coordinator, injected provider.
// No installed Chrome or live Cloudflare result is claimed by this fixture.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {laboratoryDoctor} from "../extension/lab-worker.mjs";
import { authorizeLab } from "../extension/lab-session.mjs";
const root = { provider: "extension-r2", account: "account", container: "test-1-new", key: "" };
test("Python external process traverses native relay, canonical engine and Atlas", { timeout: 2e4 }, async () => {
  const home = await mkdtemp(path.join(tmpdir(), "redown-native-")), directory = path.join(home, ".redown-laboratory");
  await mkdir(directory);
  await writeFile(path.join(directory, "host-config.json"), JSON.stringify({ origin: "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/" }));
  const env = { ...process.env, HOME: home, USERPROFILE: home, PYTHONPATH: path.resolve("clients/python") };
  const host = spawn("python", ["-m", "redown.native_host", "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/"], { env, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = Buffer.alloc(0), errors = "", readyResolve;
  const ready = new Promise((r) => readyResolve = r);
  host.stderr.on("data", (x) => errors += x);
  const grants = /* @__PURE__ */ new Map();
  const bytes = new TextEncoder().encode("Native round trip fixture");
  let writeMode=false, failureMode=false; const written=new Map();
  const request = async (url, options = {}) => {
    const key=url.split('/objects/')[1]?.split('/').map(decodeURIComponent).join('/');
    if(failureMode && new URL('https://fixture'+url).searchParams.get('per_page')==='1')return Response.json({errors:[{code:10021,message:'DO_NOT_EXPORT_SECRET /private/key'}]},{status:400,headers:{'cf-ray':'0123456789abcdef-ORD'}});
    if(writeMode){
      if(url.includes('?')){const prefix=new URL('https://fixture'+url).searchParams.get('prefix')||'';const rows=[...written].filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).slice(0,1).map(([key,b])=>({key,size:b.length,etag:'written-revision'}));return Response.json({result:rows});}
      const bytes=written.get(key);return bytes ? new Response(options.method==='HEAD'?null:bytes,{headers:{etag:'written-revision','content-length':String(bytes.length)}}) : new Response(null,{status:404});
    }
    return url.includes("__redown_missing_") ? new Response(null, {status:404}) : url.includes("?") ? Response.json({ result: { objects: [{ key: "fixture.txt", size: bytes.length, etag: "r1" }] } }) : new Response(options.method === "HEAD" ? null : bytes, { headers: { etag: "r1", "content-length": String(bytes.length) } });
  };
  const send = (value) => {
    const body = Buffer.from(JSON.stringify(value)), length = Buffer.alloc(4);
    length.writeUInt32LE(body.length);
    host.stdin.write(Buffer.concat([length, body]));
  };
  const handle = async (m) => {
    if (m.type === "ready") {
      readyResolve();
      return;
    }
    if (m.type === "closed") {
      grants.get(m.client)?.revoke();
      return;
    }
    if (m.type !== "request") return;
    let response;
    if (m.method === "pair") {
      grants.set(m.client, authorizeLab({ roots: [root], request, write:writeMode, doctorProvider:laboratoryDoctor({request,getProfiles:async()=>[],fetcher:async()=>{throw Error('No cloud');}}), createObject:async(i,b)=>{
        if(written.has(i.key))throw Object.assign(Error(),{code:'CONFLICT'});written.set(i.key,b.slice());
      }, isCurrent: () => true }));
      response = { apiVersion: "1.0.0", state: "available", data: { clientId: m.client } };
    } else response = await grants.get(m.client).query(m.method, m.input);
    send({ id: m.id, response });
  };
  host.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE();
      if (buffer.length < length + 4) break;
      const message = JSON.parse(buffer.subarray(4, length + 4));
      buffer = buffer.subarray(length + 4);
      handle(message).catch((e) => {
        errors += e.stack;
        host.kill();
      });
    }
  });
  try {
    await ready;
    const reportPath = path.join(home, "report.json");
    const child = spawn("python", ["-m", "redown.lab", "conformance", "--source", JSON.stringify({ ...root, key: "fixture.txt" }), "--report", reportPath], { env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "", stderr = "";
    child.stdout.on("data", (x) => output += x);
    child.stderr.on("data", (x) => stderr += x);
    const code = await new Promise((r) => child.on("exit", r));
    assert.equal(code, 0, stderr + output + errors);
    const report = JSON.parse(await readFile(reportPath));
    for (const name of ["listing", "metadata", "file-read", "download-readback", "authorization-denial", "invalid-input", "cancellation-denial"]) assert.equal(report.cases.find((c) => c.name === name)?.state, "passed", JSON.stringify(report));
    assert.equal(report.acceptance, "INCOMPLETE");
    assert.ok(report.cases.find((c) => c.name === "file-read").evidence.verification.providerEvidence);
    assert.ok(!output.includes("Bearer"));
    assert.match(stderr, /Approve code/);
    const samples = path.join(home, 'samples');
    await mkdir(samples);
    await writeFile(path.join(samples, 'fixture.txt'), bytes);
    const architecturePath = path.join(home, 'architecture.json');
    const architecture = spawn('python', ['-m', 'redown.lab', 'architecture', '--directory', samples, '--report', architecturePath], {env, stdio:['ignore','pipe','pipe']});
    let architectureOutput = '';
    architecture.stdout.on('data', x => architectureOutput += x);
    architecture.stderr.resume();
    assert.equal(await new Promise(r => architecture.on('exit', r)), 2, architectureOutput);
    const result = JSON.parse(await readFile(architecturePath));
    assert.equal(result.cases.find(c => c.name === 'source-readback')?.status, 'PASS', JSON.stringify(result));
    assert.equal(result.cleanup.mutationsAttempted, false);
    assert.equal(result.evidenceTier, 'UNVERIFIED_CONNECTION');
    assert.ok(!architectureOutput.includes('"account": "account"'));
    writeMode=true;
    const adaptivePath=path.join(home,'adaptive.json');
    const adaptive=spawn('python',['-m','redown.lab','complete','--directory',samples,'--depth','Comprehensive','--report',adaptivePath],{env,stdio:['ignore','pipe','pipe']});
    let adaptiveOutput='';adaptive.stdout.on('data',x=>adaptiveOutput+=x);adaptive.stderr.resume();
    assert.equal(await new Promise(r=>adaptive.on('exit',r)),2,adaptiveOutput+errors);
    const evidence=JSON.parse(await readFile(adaptivePath));
    assert.equal(evidence.coverage.PASS,evidence.plan.plannedOperations,JSON.stringify(evidence));
    assert.equal(evidence.verifiedFiles,1);assert.ok(written.size>=2);
    assert.ok(evidence.results.find(r=>r.operation==='read').diskReadbackSha256);
    assert.equal(evidence.cleanup.status,'NOT_TESTED');
    assert.ok(!JSON.stringify(evidence).includes('Bearer'));
    failureMode=true;
    const failurePath=path.join(home,'native-provider-error.json');
    const failure=spawn('python',['-m','redown.lab','complete','--directory',samples,'--depth','Comprehensive','--report',failurePath],{env,stdio:['ignore','pipe','pipe']});failure.stdout.resume();failure.stderr.resume();
    assert.equal(await new Promise(r=>failure.on('exit',r)),1);
    const failed=JSON.parse(await readFile(failurePath));const original=failed.results.find(r=>r.operation==='upload');
    assert.equal(original.error,'PROVIDER_BAD_REQUEST');assert.equal(original.diagnostic.nativeCode,'10021');assert.equal(original.diagnostic.mutationPhase,'NOT_SUBMITTED');assert.equal(original.evidence.diagnostic.httpStatus,400);assert.ok(!JSON.stringify(failed).includes('DO_NOT_EXPORT_SECRET'));
    assert.ok(!(await readFile(failurePath.replace('.json','.md'),'utf8')).includes('/private/key'));
    const doctorPath=path.join(home,'doctor.json');
    const doctor=spawn('python',['-m','redown.lab','doctor','--report',doctorPath],{env,stdio:['ignore','pipe','pipe']});doctor.stdout.resume();doctor.stderr.resume();
    const doctorCode=await new Promise(r=>doctor.on('exit',r));
    const doctorReport=JSON.parse(await readFile(doctorPath));assert.equal(doctorCode,1,JSON.stringify(doctorReport));assert.equal(doctorReport.readOnly,true);assert.equal(doctorReport.mutationPhase,'NOT_SUBMITTED');assert.ok(doctorReport.steps.some(s=>s.diagnostic?.code==='LAB_WORKER_NOT_CONFIGURED'));


  } finally {
    host.stdin.end();
    await new Promise((r) => host.on("exit", r));
    await rm(home, { recursive: true, force: true });
  }
});

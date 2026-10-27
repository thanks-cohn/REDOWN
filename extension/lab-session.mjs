import {createStreamSpool} from './file-engine/stream-spool.mjs';
import {projectLabSummary} from './lab-report.mjs';
import {diagnosticFrom} from './file-engine/diagnostics.mjs';
// One revocable, selected-bucket session per approved external connection.
import { createFileEngine, fail } from "./file-engine/engine.mjs";
import { createScopedSession } from "./file-engine/scoped-session.mjs";
import { request02, request03, session } from "./file-engine/session-validators.mjs";
import { extensionR2Adapter } from "./file-engine/adapters/extension-r2.mjs";
function authorizeLab({ roots, request, isCurrent, renewAuthorization, extensionVersion = "UNKNOWN", doctorProvider, write = false, createObject, createStream, getStreamDirectory, ttl = 36e5, clock = Date.now, authorizationStatus, onLabReport, onLabProgress }) {
  if (!Array.isArray(roots) || !roots.length || roots.some((r) => r.provider !== "extension-r2" || r.key !== "")) throw fail("INVALID_SCOPE");
  if (write && (typeof createObject !== "function" || roots.some(r => !["test-1-new","test-2-new","test-3-new","test-4-new"].includes(r.container)))) throw fail("LAB_BUCKET_REQUIRED");
  const writePrefix = write ? "__redown_test__/" + crypto.randomUUID() + "/" : null;
  const locations = write ? roots.map(r => ({...r,key:writePrefix})) : roots;
  const operations = write ? ["list","metadata","read","upload","copy","mkdir"] : ["list","metadata","read"];
  const inside = i => locations.some(s => s.account===i.account && s.container===i.container && s.provider===i.provider && i.key.startsWith(s.key));
  const expires = clock() + Math.min(Math.max(ttl, 1), 288e5);
  let revoked = false, nextRenewal = 0;
  const inactiveCode = async () => revoked ? 'AUTHORIZATION_REVOKED' : clock() >= expires ? 'LOCAL_SESSION_EXPIRED' :
    typeof authorizationStatus === 'function' ? await authorizationStatus() : !await isCurrent() ? 'PROVIDER_SESSION_CHANGED' : null;
  const active = async () => !await inactiveCode();
  const unavailable = async () => {
    const code = await inactiveCode() || 'AUTHORIZATION_DENIED';
    return {apiVersion:'1.0.0',state:'failed',error:{code,diagnostic:diagnosticFrom(fail(code),{component:'session',stage:'connection'})}};
  };
  const spool=createStreamSpool({getDirectory:getStreamDirectory,active});
  const adapter = extensionR2Adapter({ createStream:write&&createStream?async(i,source,options)=>{
    if(!await active()||!inside(i))throw fail("AUTHORIZATION_DENIED");
    return createStream(i,source,{...options,check:async()=>{await options.check();if(!await active()||!inside(i))throw fail("AUTHORIZATION_DENIED");}});
  }:undefined, createObject: write ? async (i, bytes, context = {}) => {
    if (!await active() || !inside(i)) throw fail("AUTHORIZATION_DENIED");
    await createObject(i, bytes, {isActive: active, traceparent:context.traceparent});
    if (!await active()) throw fail("AUTHORIZATION_DENIED");
  } : undefined, request: async (...args) => {
    if (!await active()) throw fail("AUTHORIZATION_DENIED");
    const r = await request(...args);
    if (!await active()) {
      await r.body?.cancel();
      throw fail("AUTHORIZATION_DENIED");
    }
    return r;
  }, roots });
  let state = { schemaVersion: 1, revision: 1, objects: [], jobs: [], dedupe: {} };
  const store = { read: async () => structuredClone(state), update: async (fn) => {
    // Keep payload-bearing jobs bounded; dedupe tombstones survive for the grant.
    // Expired history is refused by the coordinator, never replayed.
    if (write && state.jobs.length > 16) {
      const terminal = new Set(["completed","failed","uncertain","cancelled","blocked_authorization","partially_completed"]);
      const discard=state.jobs.slice(0,-16).filter(j=>terminal.has(j.state));
      state.jobs=state.jobs.filter(j=>!discard.includes(j));
    }
    return fn(state);
  } };
  const engine = createFileEngine({ store, adapters: [adapter], authorize: async (r) => await active() && operations.includes(r.operation) && [r.source, r.destination].filter(Boolean).every(inside) });
  const facade = createScopedSession({ engine, scope: { operations, locations, maxOperations: write ? 100000 : 100 }, validateRequests: [request02, request03], validateSession: session, resolveTransfer:async r=>({...await spool.resolve(r),onProgress:p=>{streamingProgress=p;}}), finishTransfer:(r,j)=>spool.finish(r,j) });
  const observedRuns = new Map();
  let streamingResult=null,streamingPending=false,streamingProgress=null;
  return Object.freeze({ expires, revoke() {
    revoked = true;
    void spool.clear().catch(()=>{});
  }, async query(method, input = {}) {
    if (!await active()) return await unavailable();
    if(method==='streamExecute'){
      if(streamingPending||streamingResult)return {apiVersion:'1.0.0',state:'failed',error:{code:'STREAM_BUSY'}};
      if(!input?.request?.transfer)return {apiVersion:'1.0.0',state:'failed',error:{code:'STREAM_REQUIRED'}};
      streamingPending=true;streamingProgress=null;
      void this.query('execute',input).then(response=>{streamingResult=response;streamingPending=false;},()=>{streamingResult={apiVersion:'1.0.0',state:'failed',error:{code:'STREAM_FAILED'}};streamingPending=false;});
      return {apiVersion:'1.0.0',state:'available',data:{pending:true}};
    }
    if(method==='streamStatus'){
      if(Object.keys(input).length)return {apiVersion:'1.0.0',state:'failed',error:{code:'INVALID_INPUT'}};
      const data=streamingPending?{pending:true,progress:streamingProgress}:{pending:false,response:streamingResult};
      if(!streamingPending)streamingResult=null;
      return {apiVersion:'1.0.0',state:'available',data};
    }
    if(['streamOpen','streamAppend','streamSeal','streamPull','streamClose'].includes(method)) {
      try {if(method==='streamOpen'&&input.mode==='upload'&&!write)throw fail('AUTHORIZATION_DENIED');return {apiVersion:'1.0.0',state:'available',data:await spool.query(method,input)};}
      catch(error){return {apiVersion:'1.0.0',state:'failed',error:{code:error.code||'STREAM_STORAGE_FAILURE'}};}
    }
    if (method === 'labReport') {
      try {
        if(input && Object.keys(input).join()==='progress' && typeof onLabProgress==='function') {
          const p=input.progress;
          if(!p || Object.keys(p).sort().join()!=='completed,stage' || !['Inventorying files','Hashing local files','Checking authorization','Checking provider capabilities','Preparing test plan','Recording evidence'].includes(p.stage) || !Number.isSafeInteger(p.completed) || p.completed<0) throw Error('INVALID_LAB_REPORT');
          onLabProgress({stage:p.stage,bucket:locations[0].container,hashedFiles:p.completed});
          return {apiVersion:'1.0.0',state:'available',data:{received:true}};
        }
        if (!input || Object.keys(input).join()!=='summary' || typeof onLabReport!=='function') throw Error('INVALID_LAB_REPORT');
        const data=projectLabSummary(input.summary,locations,{...observedRuns.get(input.summary?.runId),scopeAuthorized:write});
        onLabReport(data);
        return {apiVersion:'1.0.0',state:'available',data:{received:true}};
      } catch(error) { return {apiVersion:'1.0.0',state:'failed',error:{code:error.message==='UNATTESTED_LAB_VERIFICATION'?error.message:'INVALID_LAB_REPORT'}}; }
    }
    if (method === 'renewAuthorization' && typeof renewAuthorization === 'function') {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) return {apiVersion:'1.0.0',state:'failed',error:{code:'INVALID_INPUT'}};
      if (clock() < nextRenewal) return {apiVersion:'1.0.0',state:'failed',error:{code:'OAUTH_RENEWAL_RATE_LIMITED'}};
      nextRenewal = clock() + 40 * 60000;
      try {
        const result = await renewAuthorization();
        if (!await active()) return await unavailable();
        if (!['renewed','renewal-unavailable'].includes(result?.state)) throw fail('OAUTH_RENEWAL_FAILED');
        return {apiVersion:'1.0.0',state:'available',data:{state:result.state,expiresAt:Number.isFinite(result.expiresAt)?result.expiresAt:null}};
      } catch (error) {
        return {apiVersion:'1.0.0',state:'failed',error:{code:['CLOUDFLARE_RECONNECT_REQUIRED','OAUTH_REFRESH_REJECTED','OAUTH_REFRESH_UNAVAILABLE','OAUTH_REFRESH_FAILED'].includes(error?.code)?error.code:'OAUTH_RENEWAL_FAILED'}};
      }
    }
    if (method === 'doctor') {
      if (!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!['rootIndex','operation'].includes(k)) || !Number.isInteger(input.rootIndex??0) || (input.rootIndex??0)<0 || (input.rootIndex??0)>=locations.length || !['upload','mkdir','read','copy','metadata','list'].includes(input.operation||'upload')) return {apiVersion:'1.0.0',state:'failed',error:{code:'INVALID_INPUT'}};
      if (typeof doctorProvider!=='function') return {apiVersion:'1.0.0',state:'failed',error:{code:'PROVIDER_OPERATION_UNSUPPORTED'}};
      let data;try{data=await doctorProvider(locations[input.rootIndex??0],{isActive:active});}catch(error){return {apiVersion:'1.0.0',state:'failed',error:{code:error.code||'DIAGNOSTICS_LOST',diagnostic:diagnosticFrom(error,{component:'doctor',stage:'doctor'})}};}
      if (!await active()) return await unavailable();
      return {apiVersion:'1.0.0',state:'available',data};
    }
    const response = await facade.query(method, input);
    if (!await active()) return await unavailable();
    if (method==='execute' && response.state==='available' && response.data?.state==='completed') {
      const r=input.request, identity=r?.destination||r?.source;
      const prefix=locations.find(l=>identity && l.container===identity.container && l.account===identity.account && identity.key.startsWith(l.key));
      const runId=prefix ? identity.key.slice(prefix.key.length).split('/')[0] : '';
      if (/^[a-f0-9-]{36}$/.test(runId) && (observedRuns.has(runId)||observedRuns.size<8)) {
        const counters=observedRuns.get(runId)||{uploads:0,reads:0,metadata:0,uploadBytes:0,readBytes:0,providerEvidence:false,ids:new Set()};
        // The facade returned this canonical job; reuse its receipt without another
        // evidence export/HMAC pass or provider request.
        const e={state:'available',data:{...response.data,verification:response.data.receipt}};
        if(e.state==='available' && e.data?.state==='completed' && !counters.ids.has(e.data.id)) {
          // Bounded by the existing 100,000-operation grant. No payloads retained here.
          counters.ids.add(e.data.id);
          const level=e.data.verification?.level;
          if(r.operation==='upload' && level==='content-sha256' && e.data.checkpoints?.length) {counters.uploads++;counters.uploadBytes+=e.data.checkpoints.reduce((n,c)=>n+c.size,0);}
          if(r.operation==='read' && level==='content-sha256') {counters.reads++;counters.readBytes+=response.data.result.size;}
          if(r.operation==='metadata' && level==='metadata-observed') counters.metadata++;
          counters.providerEvidence ||= e.data.verification?.providerEvidence===true;
          observedRuns.set(runId,counters);
        }
      }
    }
    if (method === "describe" && response.data) {
      if(typeof onLabReport==='function') response.data.methods.push('labReport');
      if (typeof renewAuthorization === 'function') {
        response.data.methods.push('renewAuthorization');
        response.data.oauthRenewal = {intervalSeconds:2400,credentials:'extension-only'};
      }
      if (typeof doctorProvider==='function') response.data.methods.push('doctor');
      response.data.transport = "Chrome native messaging / authenticated loopback";
      response.data.limits.maxBytes = 65536;
      response.data.limits.streaming = !!createStream;
      response.data.limits.streamChunkBytes = 262144;
      if(createStream)response.data.providerLimits={conditionalPublicationBytes:5363466240,reason:"R2 single conditional PUT limit; multipart staging does not remove this provider publication constraint",transferConcurrency:1,partBytes:8388608};
      if(createStream)response.data.methods.push('streamExecute','streamStatus','streamOpen','streamAppend','streamSeal','streamPull','streamClose');
      response.data.expiresAt = expires;
      response.data.authorization = write ? "Explicit write approval; four laboratory buckets; unique grant namespace; conditional create only; no deletion" : "Explicit extension approval; read-only selected buckets; user-selected duration (up to eight hours); revocable";
      response.data.extensionVersion = extensionVersion;
      response.data.writePrefix = writePrefix;
      response.data.writeEnabled = write;
      response.data.independentReadback = "OAuth Object API, separate from Worker creation";
      response.data.unsupported = write ? ["move", "rename", "delete", ...(createStream?[]:["streaming", "multipart"]), "durable recovery"] : ["mutations", "direct-s3", "durable recovery"];
    }
    return response;
  } });
}
export {
  authorizeLab
};

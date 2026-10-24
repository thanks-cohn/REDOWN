// Required baseline for every adapter. Provider fixtures supply identity construction and independent oracle.
import assert from 'node:assert/strict';
const request=(operation,args={})=>({apiVersion:'0.3.0',operation,idempotencyKey:crypto.randomUUID(),...args});
export async function providerBaseline(f){const run=async(op,args)=>{const response=await f.session.query('execute',{request:request(op,args)});assert.equal(response.state,'available',JSON.stringify(response));assert.equal(response.data.state,'completed',JSON.stringify(response.data));return response.data;};
 const description=(await f.session.query('describe')).data;assert.ok(description.supportedVersions.includes('0.3.0'));assert.equal(typeof description.providerContracts[0].features.nativeDirectories,'boolean');
 if(description.providerContracts[0].operations.upload==='unsupported'){
  const first=await run('list',{source:f.root,limit:1});assert.equal(first.result.objects.length,1);assert.ok(first.result.cursor);
  const next=await run('list',{source:f.root,limit:1,cursor:first.result.cursor});assert.notDeepEqual(first.result.objects[0].identity,next.result.objects[0].identity);
  const source=first.result.objects[0].identity;await run('metadata',{source});const read=await run('read',{source});assert.equal(typeof read.result.sha256,'string');
  const denied=await f.session.query('execute',{request:request('upload',{destination:f.child('denied'),content:'x'})});assert.equal(denied.data.error,'PROVIDER_OPERATION_UNSUPPORTED');
  assert.equal((await f.session.query('resources',{id:read.id,metric:'getTrace'})).data.state,'available');
  if(f.oracle)assert.equal(await f.oracle(source),read.result.bytesBase64);
  return;
 }
 const upload=await run('upload',{destination:f.child('new.bin'),bytesBase64:Buffer.from([0,255,128,0]).toString('base64')});const source=upload.result.identity;
 const read=await run('read',{source});assert.equal(read.result.bytesBase64,'AP+AAA==');
 const copied=await run('copy',{source,destination:f.child('copy.bin')});assert.equal(copied.checkpoints.length,1);assert.equal(copied.apiVersion,'0.3.0');
 const trace=await f.session.query('resources',{id:copied.id,metric:'getTrace'});assert.equal(trace.data.state,'available');
 const replay=await f.session.query('execute',{request:copied.request});assert.equal(replay.data.id,copied.id);
 const conflict=await f.session.query('execute',{request:request('upload',{destination:f.child('copy.bin'),content:'overwrite'})});assert.equal(conflict.data.error,'CONFLICT');
 const page=await run('list',{source:f.root,limit:1});assert.equal(page.result.objects.length,1);assert.ok(page.result.cursor);const next=await run('list',{source:f.root,limit:1,cursor:page.result.cursor});assert.notDeepEqual(next.result.objects[0].identity,page.result.objects[0].identity);
 if(description.providerContracts[0].features.revisionDelete){const removed=await run('delete',{source:copied.result.objects[0].identity||copied.checkpoints[0].destination,confirmed:true});assert.equal(removed.result.deleted.length,1);}else{const denied=await f.session.query('execute',{request:request('delete',{source,confirmed:true})});assert.equal(denied.data.error,'UNSUPPORTED_ATOMIC_DELETE');}
 assert.equal((await f.session.query('evidence',{id:upload.id})).data.fileApiVersion,'0.3.0');

}

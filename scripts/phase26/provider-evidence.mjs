import {bootstrap} from '../../agent/files/bootstrap.mjs';
import '../../tests/providers/local-registration.mjs';
import {runTasks} from '../aob/runner.mjs';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),reports=[],graph={nodes:[],edges:[]};
for(const type of ['simulation','native-reference','local-reference']){
 const temporary=await mkdtemp(join(tmpdir(),'redown-evidence-'));try{
 const directory=join(temporary,'files');await mkdir(directory);const journal=join(temporary,'journal.json');const session=await bootstrap({config:{adapters:[{type,directory}]},operations:['list','read','metadata','upload','copy','delete','reconcile'],journal});const description=(await session.query('describe')).data,root=description.locations[0],child=name=>root.locator?{...root,locator:{parentId:root.locator.id,name}}:{...root,key:name};
 const bytes=Buffer.from([0,255,0,128]),expected=sha(bytes);let copied;
 const execute=async(operation,args)=>{const envelope=await session.query('execute',{request:{apiVersion:'0.3.0',operation,idempotencyKey:crypto.randomUUID(),...args}});if(envelope.state!=='available'||envelope.data.state!=='completed')throw Error('OPERATION_FAILED');return envelope.data;};
 const report=await runTasks({application:{name:'REDOWN',provider:type},environment:{runtime:process.version,platform:process.platform},profile:'deterministic-authorized-reference',tasks:[{id:'transfer-with-integrity',action:'copy'}],target:{
 async execute(){const upload=await execute('upload',{destination:child('source.bin'),bytesBase64:bytes.toString('base64')});copied=await execute('copy',{source:upload.result.identity,destination:child('copy.bin')});return {operationId:copied.id,state:copied.state};},
 async verify(){let actual;if(type==='local-reference')actual=await readFile(join(directory,'copy.bin'));else{const state=JSON.parse(await readFile(journal,'utf8')),target=copied.checkpoints[0].destination,entry=type==='native-reference'?state.nativeObjects.find(n=>n.id===target.locator.id):state.objects.find(n=>n.key===target.key);actual=Buffer.from(entry.bytesBase64,'base64');}return {verified:sha(actual)===expected,method:type==='local-reference'?'independent fs.readFile':'independent fresh journal read',expectedSha256:expected,observedSha256:sha(actual)};},
 async diagnose(){return {evidence:(await session.query('evidence',{id:copied.id})).data,resources:(await session.query('resources',{id:copied.id,metric:'getTrace'})).data};},
 async cleanup(){await rm(temporary,{recursive:true,force:true});return {verified:true,scope:'entire exclusively owned temporary sandbox'};}
 }});reports.push(report);
 const refs=[['command','clients/python/redown/client.py'],['session','agent/files/api.mjs'],['engine','extension/file-engine/engine.mjs'],['adapter',type==='native-reference'?'extension/file-engine/adapters/native-reference.mjs':type==='local-reference'?'extension/file-engine/adapters/local-reference.mjs':'extension/file-engine/adapters/memory.mjs'],['result','verification/phase26/provider-evidence.json'],['verification','scripts/phase26/provider-evidence.mjs'],['resources','extension/file-engine/resources.mjs'],['test','clients/python/tests/test_client.py'],['preservation','FOREVER_WORKS/PHASE26/manifest.json']];
 for(const [kind,path] of refs)graph.nodes.push({id:type+':'+kind,kind,path,operationId:copied.id});for(let i=1;i<refs.length;i++)graph.edges.push({from:type+':'+refs[i-1][0],to:type+':'+refs[i][0],relation:'traceability-reference',boundary:'Source/test references; only session-to-result/verification/Atlas executed by this runner. Python process is tested separately.'});
 }finally{await rm(temporary,{recursive:true,force:true});}
}
await mkdir('verification/phase26',{recursive:true});await writeFile('verification/phase26/provider-evidence.json',JSON.stringify({version:'0.1.0',reports,graph,aacStatus:'supplemental source/test/runtime graph; not full AAC certification'},null,2)+'\n');
console.log(JSON.stringify({providers:reports.length,passed:reports.flatMap(r=>r.trials).filter(t=>t.state==='passed').length,certification:'NOT_CERTIFIED'}));

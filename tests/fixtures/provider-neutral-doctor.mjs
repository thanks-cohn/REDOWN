// Owner-composed local-only stdio fixture. No extension, R2, Worker or credentials.
import {createInterface} from 'node:readline';
import {createFileEngine} from '../../extension/file-engine/engine.mjs';
import {createFileSession} from '../../agent/files/api.mjs';
import {localReferenceAdapter} from '../../extension/file-engine/adapters/local-reference.mjs';
const adapter=await localReferenceAdapter(process.argv[2]);
const state={jobs:[],objects:[],dedupe:{}};
const store={read:async()=>structuredClone(state),update:async fn=>fn(state)};
const root={provider:adapter.id,account:'owner',container:'sandbox',key:''};
const engine=createFileEngine({store,adapters:[adapter],authorize:()=>true});
const session=createFileSession({engine,scope:{locations:[root],operations:['list','metadata','read'],maxOperations:10},probe:async identity=>{
 const page=await adapter.list(identity,{limit:1});
 return {schemaVersion:'redown.doctor.v1',provider:adapter.id,status:'PASS',readOnly:true,mutationPhase:'NOT_SUBMITTED',steps:[{stage:'provider.list',status:'PASS',observation:'Authorized local listing observed'}],capabilities:{declared:{list:true,upload:false},observed:{list:typeof page.complete==='boolean'}},liveWriteAcceptance:'NOT_TESTED'};
}});
for await(const line of createInterface({input:process.stdin})){
 const {method,input={}}=JSON.parse(line);process.stdout.write(JSON.stringify(await session.query(method,input))+'\n');
}

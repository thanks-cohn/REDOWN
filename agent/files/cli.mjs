// No network listener, credentials or automatic real-provider setup.
import {createFileSession} from './api.mjs';
import {createFileEngine} from '../../extension/file-engine/engine.mjs';
import {memoryAdapter} from '../../extension/file-engine/adapters/memory.mjs';
import {initialState} from '../../extension/file-engine/simulation.mjs';
const args=process.argv.slice(2);
if(args[0]!=='--simulation'||args.length!==3||args[1]!=='--operations')throw Error('Usage: node agent/files/cli.mjs --simulation --operations list,metadata,read,copy');
let state=initialState();const store={read:async()=>structuredClone(state),update:async fn=>fn(state)};
const session=createFileSession({engine:createFileEngine({store,adapters:['fake-r2','fake-drive'].map(id=>memoryAdapter(store,id))}),scope:{operations:args[2].split(','),locations:['fake-r2','fake-drive'].map(provider=>({provider,account:'demo',container:'sandbox',key:''})),maxOperations:32}});
// Consume bytes before decoding/JSON parsing; an oversized or invalid line never reaches execution.
let chunks=[],size=0,discard=false;
const respond=value=>process.stdout.write(JSON.stringify(value)+'\n');
for await(const chunk of process.stdin){
 let start=0;
 for(let i=0;i<=chunk.length;i++)if(i===chunk.length||chunk[i]===10){
  const part=chunk.subarray(start,i);size+=part.length;
  if(size>3*1024*1024){chunks=[];discard=true;}else if(!discard&&part.length)chunks.push(part);
  if(i<chunk.length){
   if(discard)respond({apiVersion:'1.0.0',state:'failed',error:{code:'INPUT_BUDGET'}});
   else if(size){try{const request=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(k=>!['method','input'].includes(k)))throw Error();respond(await session.query(request.method,request.input));}catch{respond({apiVersion:'1.0.0',state:'failed',error:{code:'INVALID_INPUT'}});}}
   chunks=[];size=0;discard=false;
  }
  start=i+1;
 }
}
if(size||discard)respond({apiVersion:'1.0.0',state:'failed',error:{code:'INCOMPLETE_LINE'}});

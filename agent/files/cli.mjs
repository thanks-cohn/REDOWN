// No network listener, credentials or automatic real-provider setup.
import {bootstrap,readOwnerConfig} from './bootstrap.mjs';
const args=process.argv.slice(2);
const usage='Usage: node agent/files/cli.mjs (--simulation|--native-reference|--config OWNER_JSON) --operations list,metadata,read [--journal PRIVATE_PATH]';
const opts={};
try{
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--simulation'||arg==='--native-reference'){if(opts.profile||opts.config)throw Error();opts.profile=arg.slice(2);}
  else if(['--config','--operations','--journal'].includes(arg)){const value=args[++i];if(!value||value.startsWith('--'))throw Error();const key=arg.slice(2);if(opts[key])throw Error();opts[key]=value;}
  else throw Error();
 }
 if(!opts.profile&&!opts.config||!opts.operations||opts.profile&&opts.config)throw Error();
}catch{process.stderr.write(usage+'\n');process.exit(2);}
let session;
try{session=await bootstrap({profile:opts.profile,operations:opts.operations.split(','),journal:opts.journal,config:opts.config?readOwnerConfig(opts.config):undefined});}
catch(error){process.stderr.write(JSON.stringify({error:{code:/^[A-Z_0-9]+$/.test(error.code||'')?error.code:'BOOTSTRAP_FAILED'}})+'\n');process.exit(2);}
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

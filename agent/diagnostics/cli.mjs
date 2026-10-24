import {readFile,stat} from 'node:fs/promises';
import {createDiagnosticAPI} from './api.mjs';
import {registry} from './registry.mjs';
try{
 const [operation='describe',...args]=process.argv.slice(2);let bundle,runtimeBundle,resourceBundle,input={},seen=new Set();const limits=registry().limits;
 for(let i=0;i<args.length;i+=2){const flag=args[i],value=args[i+1];if(!value||seen.has(flag))throw Error();seen.add(flag);
  if(flag==='--input'){if(Buffer.byteLength(value)>limits.inputBytes)throw Error();input=JSON.parse(value);}
  else if(['--bundle','--explorer-bundle','--runtime-bundle','--resource-bundle'].includes(flag)){
   const runtime=flag==='--runtime-bundle',resource=flag==='--resource-bundle';if(!runtime&&!resource&&bundle!==undefined)throw Error();const limit=resource?1048576:runtime?limits.runtimeBundleBytes:limits.explorerBundleBytes;
   if((await stat(value)).size>limit)throw Error();const bytes=await readFile(value);if(bytes.length>limit)throw Error();const parsed=JSON.parse(bytes);if(resource)resourceBundle=parsed;else if(runtime)runtimeBundle=parsed;else bundle=parsed;
  }else throw Error();
 }
 const result=createDiagnosticAPI({bundle,runtimeBundle,resourceBundle}).query(operation,input);console.log(JSON.stringify(result,null,2));process.exitCode=result.state==='failed'?2:result.state==='unavailable'?3:0;
}catch{console.log(JSON.stringify({diagnosticApiVersion:registry().gatewayVersion,state:'failed',scope:'offline/read-only; repository knowledge and imported observations',error:{code:'INVALID_INPUT_OR_BUNDLE'}}));process.exitCode=2;}

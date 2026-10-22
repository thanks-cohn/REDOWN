import {readFile,stat} from 'node:fs/promises';
import {createDiagnosticAPI} from './api.mjs';
try{
 const [operation='describe',...args]=process.argv.slice(2);let bundle,input={},seen=new Set();
 for(let i=0;i<args.length;i+=2){const flag=args[i],value=args[i+1];if(!value||seen.has(flag))throw Error();seen.add(flag);
  if(flag==='--input'){if(Buffer.byteLength(value)>8192)throw Error();input=JSON.parse(value);}
  else if(flag==='--bundle'){if((await stat(value)).size>262144)throw Error();const bytes=await readFile(value);if(bytes.length>262144)throw Error();bundle=JSON.parse(bytes);}
  else throw Error();
 }
 const result=createDiagnosticAPI({bundle}).query(operation,input);console.log(JSON.stringify(result,null,2));process.exitCode=result.state==='failed'?2:result.state==='unavailable'?3:0;
}catch{console.log(JSON.stringify({diagnosticApiVersion:'1.0.0',state:'failed',error:{code:'INVALID_INPUT_OR_BUNDLE'}}));process.exitCode=2;}

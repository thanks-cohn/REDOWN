import {readFile,stat} from 'node:fs/promises';
import {createExplorerAPI} from './api.mjs';
try{
 const [operation='describeExplorer',...args]=process.argv.slice(2);let bundle,input={};
 for(let i=0;i<args.length;i+=2){if(args[i]==='--bundle'){if(bundle)throw Error();if((await stat(args[i+1])).size>262144)throw Error();const data=await readFile(args[i+1]);if(data.length>262144)throw Error();bundle=JSON.parse(data);}else if(args[i]==='--input'){input=JSON.parse(args[i+1]);}else throw Error();}
 const result=createExplorerAPI({bundle}).query(operation,input);console.log(JSON.stringify(result,null,2));process.exitCode=result.state==='failed'?2:result.state==='unavailable'?3:0;
}catch{console.log(JSON.stringify({explorerDiagnosticVersion:'1.0.0',state:'failed',error:{code:'INVALID_INPUT_OR_BUNDLE'}}));process.exitCode=2;}

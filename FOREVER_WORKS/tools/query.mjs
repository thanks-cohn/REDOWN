// Offline documentation adapter. Uses the unmodified pinned upstream public API.
import {createForeverApi} from '../upstream/forever-works/src/index.js';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const [operation='help',...args]=process.argv.slice(2);
try{
 const api=await createForeverApi(root+'forever');
 let result;
 if(operation==='help')result={publicApi:api.describe(),documentationOperations:['currentState','issues','help'],scope:'Offline preservation queries; documentation operations are not Forever API operations.'};
 else if(operation==='currentState')result=JSON.parse(await readFile(root+'FOREVER_WORKS/current-state.json','utf8'));
 else if(operation==='issues')result=JSON.parse(await readFile(root+'FOREVER_WORKS/verification/issues.json','utf8'));
 else {
  if(!api.describe().operations.includes(operation))throw Error('unsupported-operation');
  result=api[operation](...args);
 }
 process.stdout.write(typeof result==='string'?result:JSON.stringify(result,null,2)+'\n');
 if(operation==='validateModel'&&!result.valid)process.exitCode=1;
}catch(error){console.error(JSON.stringify(error.toJSON?.()||{error:{code:'query-failed',message:error.message}}));process.exitCode=1;}

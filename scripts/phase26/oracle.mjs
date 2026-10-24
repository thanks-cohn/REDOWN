// Independent laboratory caller: no REDOWN engine, adapter, client or journal imports.
import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
const config=JSON.parse(readFileSync('work/r2-lab-secrets.json','utf8'));
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
 try{const body=JSON.parse(line);if(!['stat','read','cleanup'].includes(body.method)||!['test-1-new','test-2-new','test-3-new','test-4-new'].includes(body.bucket)||!body.key?.startsWith(config.prefix))throw Error('ORACLE_SCOPE_DENIED');const response=await fetch(config.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(25000),headers:{authorization:config.authorization,'content-type':'application/json'},body:JSON.stringify(body)}),value=await response.json();if(!response.ok||value.ok!==true)throw Error('ORACLE_FAILED');process.stdout.write(JSON.stringify({result:value.result})+'\n');}catch(error){process.stdout.write(JSON.stringify({error:/^[A-Z_0-9]+$/.test(error.message)?error.message:'ORACLE_TRANSPORT_FAILURE'})+'\n');}
}

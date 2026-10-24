// Generates a connector-readable deployment payload for this NEW lab Worker only. Does not deploy.
import {readFile,writeFile} from 'node:fs/promises';
const c=JSON.parse(await readFile('work/r2-lab-deployment.json','utf8'));
if(!/^redown-p2-lab-[a-f0-9]{8}$/.test(c.name)||!/^__redown_test__\/[a-f0-9-]+\/$/.test(c.prefix))throw Error('INVALID_LAB_ID');
const source=await readFile('worker/laboratory/index.mjs','utf8');
const metadata={main_module:'lab.mjs',compatibility_date:'2026-10-23',compatibility_flags:['global_fetch_strictly_public'],bindings:[...['test-1-new','test-2-new','test-3-new','test-4-new'].map((bucket_name,i)=>({type:'r2_bucket',name:'B'+i,bucket_name})),...Object.entries({RUN_PREFIX:c.prefix,AUTH_SHA256:c.authSha256,EXPIRES_AT:String(c.expires),FIXTURE_URLS:JSON.stringify(c.urls)}).map(([name,text])=>({type:'plain_text',name,text}))]};
const body=['--redownLabUpload','Content-Disposition: form-data; name="metadata"','Content-Type: application/json','',JSON.stringify(metadata),'--redownLabUpload','Content-Disposition: form-data; name="lab.mjs"; filename="lab.mjs"','Content-Type: application/javascript+module','',source,'--redownLabUpload--'].join('\r\n');
const code='async () => {const r=await cloudflare.request({method:"PUT",path:"/accounts/"+accountId+"/workers/scripts/'+c.name+'",contentType:"multipart/form-data; boundary=redownLabUpload",rawBody:true,body:'+JSON.stringify(body)+'});return {success:r.success,status:r.status};}';
await writeFile('work/r2-lab-deploy-code.json',JSON.stringify({code}));console.log('work/r2-lab-deploy-code.json (hashed bearer only; no account credentials)');

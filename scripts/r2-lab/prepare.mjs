// Local preparation only; never probes accounts, deploys, or grants production access.
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const subdomain=process.argv[2];
if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(subdomain||''))throw Error('Usage: node scripts/r2-lab/prepare.mjs <authorized-workers-subdomain>');
await mkdir('work',{recursive:true});
const run=randomUUID(),name='redown-p2-lab-'+run.slice(0,8),prefix='__redown_test__/'+run+'/',expires=Date.now()+4*60*60*1000;
const authorization='Bearer '+randomBytes(32).toString('hex'),fixtureCommit='4eccf9069342fac51e56eac488fd41925042294c';
const corpus=JSON.parse(await readFile('test-fixtures/r2-lab/manifest.json'));
const config={run,prefix,name,expires,authorization,endpoint:'https://'+name+'.'+subdomain+'.workers.dev',fixtureCommit,budgets:{maxRequests:2000,maxBytes:32*1024*1024,maxObjects:256,maxObjectBytes:2*1024*1024}};
await writeFile('work/r2-lab-secrets.json',JSON.stringify(config),{mode:0o600,flag:'wx'});
await writeFile('work/r2-lab-deployment.json',JSON.stringify({name,prefix,expires,authSha256:createHash('sha256').update(authorization).digest('hex'),urls:corpus.fixtures.map(f=>'https://raw.githubusercontent.com/thanks-cohn/REDOWN/'+fixtureCommit+'/test-fixtures/r2-lab/'+f.name)}),{flag:'wx'});
console.log(JSON.stringify({prepared:true,name,prefix,expires,warning:'Not deployed. Verify this NEW Worker name is absent before using the deployment plan.'}));

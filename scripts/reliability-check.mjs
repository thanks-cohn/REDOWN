// Explicit local verification only. No browser launch, credentials, cloud calls or repair.
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import baseline from '../agent/diagnostics/regression-baseline.json' with {type:'json'};
import {evaluateRegression} from './reliability-policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2);
if(args.length>1||args.length===1&&args[0]!=='--strict'){console.error('Usage: node scripts/reliability-check.mjs [--strict]');process.exitCode=2;}
else{
 const startedAt=new Date().toISOString();
 const run=(command,argv,timeout)=>{const result=spawnSync(command,argv,{cwd:root,encoding:'utf8',timeout,maxBuffer:16*1024*1024});return {exitCode:result.status,error:result.error?.code||null,stdout:result.stdout||'',stderr:result.stderr||''};};
 const report={version:'1.0.0',startedAt,node:process.version,platform:process.platform,architecture:process.arch,scope:'local repository code and simulated providers; no installed Chrome or live Cloudflare verification',stages:[],release:{state:'blocked',reason:'Local verification cannot certify browser/cloud/package readiness',recordedGates:JSON.parse(readFileSync(join(root,'docs/runtime/release-gates.json'),'utf8'))}};
 try{
  const git=run('git',['ls-files','-z','--','extension','agent','scripts','tests','schemas','local','worker','.github','package.json','package-lock.json'],10000);if(git.exitCode!==0||git.error)throw Error('SOURCE_INVENTORY_FAILED');
  const files=git.stdout.split('\0').filter(Boolean).sort();if(!files.length)throw Error('EMPTY_SOURCE_INVENTORY');
  report.source={commit:run('git',['rev-parse','HEAD'],10000).stdout.trim(),trackedDirty:Boolean(run('git',['status','--porcelain','--untracked-files=no'],10000).stdout.trim()),files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(root,path))).digest('hex')}))};
  report.source.sha256=createHash('sha256').update(JSON.stringify(report.source.files)).digest('hex');
  for(const [id,command,argv] of [['syntax',process.execPath,['scripts/check-syntax.mjs']],['architecture',process.execPath,['agent/explorer/cli.mjs','validateArchitecture']],['api-registry',process.execPath,['agent/diagnostics/cli.mjs','validateRegistry']],['issue-inventory',process.execPath,['agent/diagnostics/cli.mjs','validateIssues']]]){
   const result=run(command,argv,60000);let passed=!result.error&&result.exitCode===0;
   if(id==='architecture'||id==='api-registry'||id==='issue-inventory')try{passed=passed&&JSON.parse(result.stdout).state==='available';}catch{passed=false;}
   report.stages.push({id,state:passed?'passed':'failed',...result});
  }
  const tests=readdirSync(join(root,'tests')).filter(p=>p.endsWith('.test.mjs')).sort().map(p=>'tests/'+p);
  const result=run(process.execPath,['--test','--test-reporter=./scripts/reliability-reporter.mjs',...tests],180000);
  let events=[],malformed=false;try{events=result.stdout.split('\n').filter(Boolean).map(line=>JSON.parse(line));}catch{malformed=true;}
  report.regression=evaluateRegression({events,baseline,exitCode:result.exitCode,executionError:Boolean(result.error)||malformed});
  report.regression.execution={exitCode:result.exitCode,error:result.error,stderr:result.stderr};
  report.state=report.stages.some(s=>s.state==='failed')||report.regression.state==='failed'?'failed':report.regression.state;
 }catch(error){report.state='failed';report.code=error.message==='SOURCE_INVENTORY_FAILED'||error.message==='EMPTY_SOURCE_INVENTORY'?error.message:'VERIFICATION_EXECUTION_FAILED';}
 report.finishedAt=new Date().toISOString();const dir=resolve(root,'work/reliability');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'latest.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({state:report.state,release:report.release.state,source:report.source?.sha256,stages:report.stages.map(({id,state})=>({id,state})),regression:report.regression,report:'work/reliability/latest.json'},null,2));
 process.exitCode=args.includes('--strict')||report.state==='failed'?1:0;
}

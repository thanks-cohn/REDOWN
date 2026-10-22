// Fixed, reviewable local tests only. No remote commands, adapters or credentials.
import catalog from '../agent/explorer/smoke-presets.json' with {type:'json'};
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),root=fileURLToPath(new URL('../',import.meta.url));
if(args.length===1&&args[0]==='--list'){console.log(JSON.stringify(catalog,null,2));}
else if(args.length===2&&args[0]==='--preset'&&(args[1]==='all'||catalog.presets.some(p=>p.id===args[1]))){
 const selected=catalog.presets.filter(p=>args[1]==='all'||p.id===args[1]);
 const files=[...new Set(selected.flatMap(p=>p.files))];
 console.log(JSON.stringify({smokeVersion:catalog.smokeVersion,preset:args[1],scope:'local code with simulated providers; no live cloud writes or certification',files}));
 const run=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',timeout:120000});
 if(run.error)console.error(JSON.stringify({code:'SMOKE_EXECUTION_FAILED',reason:run.error.code||'unknown'}));
 process.exitCode=run.status??2;
}else{console.error('Usage: node scripts/explorer-smoke.mjs --list | --preset diagnostics|transfers|navigation|connections|urls-and-status|all');process.exitCode=2;}

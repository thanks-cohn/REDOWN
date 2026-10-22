// One cross-platform syntax check, launched directly by Node; no npm.cmd or shell.
import {spawnSync} from 'node:child_process';
import {resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import targets from './syntax-targets.json' with {type:'json'};
export function checkSyntax({files=targets,root=fileURLToPath(new URL('../',import.meta.url))}={}){
 const results=[];
 for(const file of files){
  if(typeof file!=='string'||isAbsolute(file)||file.split(/[\\/]/).some(p=>p==='..'||p==='.')||!file.endsWith('.mjs')&&!file.endsWith('.js'))return {state:'failed',results,code:'INVALID_SYNTAX_TARGET'};
  const run=spawnSync(process.execPath,['--check',resolve(root,file)],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  results.push({file,state:run.status===0&&!run.error?'passed':'failed',exitCode:run.status,error:run.error?.code||null});
 }
 return {state:results.length&&results.every(r=>r.state==='passed')?'passed':'failed',results};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 if(process.argv.length!==2){console.error('Usage: node scripts/check-syntax.mjs');process.exitCode=2;}
 else{const result=checkSyntax();console.log(JSON.stringify(result,null,2));process.exitCode=result.state==='passed'?0:1;}
}

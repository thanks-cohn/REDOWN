import {API_VERSION} from './file-engine/contract.mjs';
import {createSimulationEngine} from './file-engine/simulation.mjs';
import {openBetaStore} from './file-engine/indexeddb-store.mjs';
export function installBetaExplorer({document,chrome,indexedDB=globalThis.indexedDB,confirm=globalThis.confirm,prompt=globalThis.prompt}){
const $=id=>document.getElementById(id);
let engine,store,opening,enabled=false,clipboard=null,selected=null,cursor=null,generation=0;
const identity=(provider,key)=>({provider,account:'demo',container:'sandbox',key});
function message(text,state=''){ $('status').textContent=text;$('status').dataset.state=state; }
async function gate(){enabled=(await chrome.storage.local.get('betaModeEnabled')).betaModeEnabled===true;$('explorer').hidden=!enabled;$('gate').textContent=enabled?'Beta Mode enabled · Simulation foundation':'Beta Explorer is hidden. Enable the existing Beta Mode in Dashboard settings. Saved simulation jobs are retained.';if(!enabled){generation++;clipboard=null;selected=null;$('preview').hidden=true;$('trace').textContent='';}}
async function initialize(){if(!opening)opening=openBetaStore(indexedDB).then(value=>{store=value;engine=createSimulationEngine(store);});await opening;}
async function allowed(){await gate();if(!enabled)throw Error('BETA_MODE_DISABLED');await initialize();}
async function run(operation,args={}){await allowed();return engine.run({apiVersion:API_VERSION,operation,idempotencyKey:crypto.randomUUID(),...args});}
async function browse(append=false){
  await allowed();const ticket=++generation;
  const result=await run('list',{source:identity($('provider').value,$('prefix').value),query:$('query').value,limit:50,...(append&&cursor?{cursor}:{})});
  if(ticket!==generation||!enabled)return;
  if(result.state!=='completed'){message(result.error,'failed');return;}
  if(!append){$('files').replaceChildren();selected=null;}
  for(const object of result.result.objects){const row=document.createElement('li'),check=document.createElement('input'),button=document.createElement('button');check.type='radio';check.name='selected';check.setAttribute('aria-label','Select '+object.key);check.onchange=()=>{selected=object;};button.textContent=(object.folder?'Folder · ':'')+object.key;button.onclick=()=>{if(object.folder){$('prefix').value=object.key;$('query').value='';safe(()=>browse());}else{check.checked=true;selected=object;}};row.append(check,button);$('files').append(row);}
  cursor=result.result.cursor;$('next').hidden=!cursor;message('Simulated listing · '+(result.result.complete?'complete':'more pages available'),'completed');await refreshJobs();
}
async function refreshJobs(){const jobs=await engine.inspect();$('jobs').replaceChildren(...jobs.slice().reverse().map(job=>{const option=document.createElement('option');option.value=job.id;option.textContent=job.request.operation+' · '+job.state+' · '+job.id;return option;}));}
const pending=new Set();
function safe(fn){const task=Promise.resolve().then(fn).catch(error=>message(error.code||error.message||'Action unavailable','failed')).finally(()=>pending.delete(task));pending.add(task);return task;}
function requireSelection(){if(!selected)throw Error('Select one file or folder.');return identity(selected.provider,selected.key);}
async function mutation(operation,args){const result=await run(operation,args);message(result.state==='completed'?'Simulation completed':result.error,result.state);await refreshJobs();$('trace').textContent=JSON.stringify(await engine.diagnose(result.id),null,2);if(result.state==='completed')await browse();return result;}
$('navigation').onsubmit=event=>{event.preventDefault();safe(()=>browse());};
$('provider').onchange=()=>{clipboard=null;$('prefix').value='';safe(()=>browse());};
$('next').onclick=()=>safe(()=>browse(true));
$('up').onclick=()=>{const parts=$('prefix').value.replace(/\/$/,'').split('/');parts.pop();$('prefix').value=parts.length?parts.join('/')+'/':'';safe(()=>browse());};
$('copy').onclick=()=>safe(async()=>{await allowed();clipboard={operation:'copy',source:requireSelection()};message('Simulated selection copied.');});
$('cut').onclick=()=>safe(async()=>{await allowed();clipboard={operation:'move',source:requireSelection()};message('Simulated selection cut; source retained until paste.');});
$('paste').onclick=()=>safe(async()=>{if(!clipboard)throw Error('Copy or cut a simulated item first.');const captured=structuredClone(clipboard);if(captured.operation==='move'&&!confirm('Move this simulated item?'))return;const name=captured.source.key.replace(/\/$/,'').split('/').pop()+(captured.source.key.endsWith('/')?'/':'');const result=await mutation(captured.operation,{source:captured.source,destination:identity($('destination').value,$('prefix').value+name),...(captured.operation==='move'?{confirmed:true}:{})});if(result.state==='completed'&&captured.operation==='move')clipboard=null;});
$('delete').onclick=()=>safe(async()=>{const source=requireSelection();if(confirm('Delete the selected simulated item and its children?'))await mutation('delete',{source,confirmed:true});});
$('rename').onclick=()=>safe(async()=>{const source=requireSelection(),name=prompt('New name (same folder):');if(!name)return;if(name.includes('/')||name.includes('\\'))throw Error('Enter a single name.');const parts=source.key.replace(/\/$/,'').split('/');parts.pop();await mutation('rename',{source,destination:{...source,key:(parts.length?parts.join('/')+'/':'')+name+(source.key.endsWith('/')?'/':'')},confirmed:true});});
$('mkdir').onclick=()=>safe(async()=>{const name=prompt('New simulated folder name:');if(!name)return;if(/[\/\\]/.test(name))throw Error('Enter a single name.');await mutation('mkdir',{destination:identity($('provider').value,$('prefix').value+name+'/')});});
$('upload').onchange=()=>safe(async()=>{const file=$('upload').files[0];if(!file)return;if(file.size>65536)throw Error('Text fixtures are limited to 64 KiB.');if(file.type&&!file.type.startsWith('text/'))throw Error('Choose a text fixture.');await mutation('upload',{destination:identity($('provider').value,$('prefix').value+file.name),content:await file.text()});$('upload').value='';});
$('read').onclick=()=>safe(async()=>{const source=requireSelection();if(source.key.endsWith('/'))throw Error('Open the folder to browse it.');const result=await run('read',{source});if(result.state!=='completed')throw Error(result.error);if(!enabled)return;$('preview').textContent=result.result.content;$('preview').hidden=false;await refreshJobs();});
$('refresh-jobs').onclick=()=>safe(async()=>{await allowed();await refreshJobs();});
$('inspect').onclick=()=>safe(async()=>{await allowed();$('trace').textContent=JSON.stringify(await engine.diagnose($('jobs').value),null,2);});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.betaModeEnabled)safe(async()=>{await gate();if(enabled)await browse();});});
safe(async()=>{await gate();if(!enabled)return;await initialize();await browse();});

return {async settle(){while(pending.size)await Promise.allSettled([...pending]);},close(){store?.close();}};
}
export const controller=typeof document!=='undefined'&&typeof chrome!=='undefined'?installBetaExplorer({document,chrome}):null;

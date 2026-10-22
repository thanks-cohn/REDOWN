/* Debug-only local inspector; generated data is redacted and shown before download. */
(function(root){
'use strict';
function install({document,send,observer=()=>root.redownExplorerBridge,copy=value=>navigator.clipboard.writeText(value),download=value=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='redown-explorer-support.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}}){
 const $=id=>document.getElementById(id);if(!$('explorer-diagnostics-panel'))return;
 let generated=null,version=0;
 const status=text=>{$('explorer-diagnostics-status').textContent=text;};
 const visible=()=>document.documentElement.classList.contains('debug-mode');
 async function query(operation,input={}){
  if(!visible())throw Error('Enable Debug Mode to inspect Explorer diagnostics.');
  const response=await send({type:'explorerDiagnosticsV1',operation,input});if(!response?.ok)throw Error('Diagnostics unavailable. Check that the installed extension supports Explorer diagnostics1.0.');return response.result;
 }
 async function flush(){const bridge=observer();if(!bridge)return;await bridge.ready;await bridge.captureState?.();const bundle=bridge.collector.exportBundle();if(bundle.operations.length)await query('ingest',{bundle});}
 function show(value){$('explorer-diagnostics-output').textContent=JSON.stringify(value,null,2);}
 async function list(failures=false){const token=++version;await flush();const result=await query('exportDiagnosticBundle');if(token!==version||!visible())return;
  const select=$('explorer-diagnostic-id'),previous=select.value;select.replaceChildren();for(const op of result.data?.operations||[]){if(failures&&!['failed','unknown'].includes(op.state))continue;const option=document.createElement('option');option.value=op.id;option.textContent=`${op.operation} · ${op.state} · ${op.id}`;select.append(option);}if([...select.options].some(o=>o.value===previous))select.value=previous;show(result);status(`${select.options.length} operations shown. Missing or truncated stages remain unknown.`);
 }
 const bind=(id,action)=>$(id)?.addEventListener('click',()=>{if(!visible())return;void Promise.resolve().then(action).catch(error=>status(error.message||'Diagnostics unavailable.'));});
 bind('explorer-diagnostics-probe',async()=>{
  const button=$('explorer-diagnostics-probe');if(button.disabled)return;
  button.disabled=true;const token=++version;
  try{status('Checking read-only source access and Worker configuration…');const result=await query('runReadOnlyProbe',observer()?.probeInput());if(token!==version||!visible())return;show(result);status('Probe complete. Review checks and diagnostic ID; no files were changed.');}
  finally{button.disabled=false;}
 });
 bind('explorer-diagnostics-inspect' ,()=>list());bind('explorer-diagnostics-failures',()=>list(true));
 bind('explorer-diagnostics-trace',async()=>{const id=$('explorer-diagnostic-id').value;if(!id)return status('Select an operation first.');const trace=await query('getOperationTrace',{id}),diagnosis=await query('diagnoseOperation',{id});show({trace,diagnosis});});
 bind('explorer-diagnostics-copy',async()=>{const id=$('explorer-diagnostic-id').value;if(!id)return status('Select an operation first.');await copy(id);status('Diagnostic ID copied.');});
 bind('explorer-diagnostics-export',async()=>{await flush();const result=await query('exportDiagnosticBundle');generated=result.data||null;show(result);$('explorer-diagnostics-download').hidden=!generated;status('Review this redacted bundle before sharing. Fingerprints still link activity within their scope.');});
 bind('explorer-diagnostics-download',()=>{if(generated)download(generated);});
 bind('explorer-diagnostics-clear',async()=>{++version;await query('clear');observer()?.collector.setEnabled(false);observer()?.collector.setEnabled(true);try{await observer()?.refreshIdentity();}catch{}generated=null;$('explorer-diagnostics-download').hidden=true;$('explorer-diagnostic-id').replaceChildren();show({cleared:true});status('Explorer diagnostic records cleared. Files, credentials and profiles were not changed.');});
 return {list};
}
root.RedownExplorerDiagnosticUI={install};
if(root.document&&root.chrome?.runtime)install({document:root.document,send:message=>chrome.runtime.sendMessage(message)});
})(globalThis);

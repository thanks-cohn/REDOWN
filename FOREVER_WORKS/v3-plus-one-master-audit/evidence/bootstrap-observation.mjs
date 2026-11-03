// Observe actual guarded wrapper; do not call helper.ready() when core is absent.
import {worker} from '../../../tests/helpers/background-worker.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
const entry=readFileSync('extension/service-worker.js','utf8'),out=[];
for(const failingImport of ['background.js','cloudflare-api.js']){
 const h=worker(undefined,{backgroundSource:entry,import:failingImport});
 await vm.runInContext('entryEvidenceQueue',h.context);
 const status=await h.context.RedownBoot.status();
 out.push({failingImport,core:h.context.RedownWorkerCoreStatus,toolbarListeners:h.chrome.action.onClicked.listeners.length,menuListeners:h.chrome.contextMenus.onClicked.listeners.length,messageListeners:h.chrome.runtime.onMessage.listeners.length,worker:status.components.worker,overall:status.overall,evidence:h.local.entryPointEvidence.map(e=>e.code)});
}
writeFileSync('FOREVER_WORKS/v3-plus-one-master-audit/evidence/bootstrap-observation.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));

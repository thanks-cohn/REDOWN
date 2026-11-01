// Fixed local fault comparison. Never connects Chrome or providers. The pinned
// baseline background runs with current shared imports: registration-only proof.
import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import {worker} from '../tests/helpers/background-worker.mjs';
const before=execFileSync('git',['show','5fbcfc07cb16773250692f6c8f304ad65131e345:extension/background.js'],{encoding:'utf8'});
const result={scope:'harness only; pinned baseline background, current shared imports; no installed Chrome or live provider',baseline:'5fbcfc07cb16773250692f6c8f304ad65131e345'};
for(const [name,backgroundSource] of [['before',before],['after',undefined]]){
 const h=worker(undefined,{backgroundSource});await h.ready();
 delete h.local.rightClickNativeIds;
 const next=worker(h.local,{backgroundSource,nativeEntries:[...h.native]});await next.ready();
 await vm.runInContext('entryEvidenceQueue',next.context);
 result[name]={freshResets:h.calls.filter(c=>c[0]==='removeAll').length,missingCacheWakeResets:next.calls.filter(c=>c[0]==='removeAll').length,root:next.native.has('redown'),manage:next.native.has('redown-manage'),destination:next.native.has('v3:one'),registration:next.local.rightClickMenuStatus.state};
}
mkdirSync('work/boot',{recursive:true});writeFileSync('work/boot/before-after.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

import {worker} from '../tests/helpers/background-worker.mjs';
import vm from 'node:vm';
import {mkdirSync,writeFileSync} from 'node:fs';
const h=worker();await h.ready();await vm.runInContext('entryEvidenceQueue',h.context);
const results={};for(const operation of ['status','audit','repair','history'])results[operation]=await h.context.RedownBoot.query(operation);
h.local.rightClickMenuStatus.state='applying';results.interrupted=await h.context.RedownBoot.audit();
const failed=worker(undefined,{storage:true});await failed.ready();results.storageUnavailable=await failed.context.RedownBoot.status();
mkdirSync('work/boot',{recursive:true});writeFileSync('work/boot/schema-fixtures.json',JSON.stringify(results,null,2)+'\n');

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const notifySource=source.slice(source.indexOf('async function notify('),source.indexOf('\nfunction cloudflareErrorMessage'));
test('desktop notifications require explicit opt-in and reflect subsequent changes',async()=>{
  const calls=[];const stored={};
  const context=vm.createContext({chrome:{storage:{local:{get:async()=>stored}},notifications:{create:async value=>calls.push(value)}},console});
  vm.runInContext(notifySource,context);
  await context.notify('REDOWN complete','done');assert.equal(calls.length,0);
  stored.notificationsEnabled=true;
  await context.notify('REDOWN complete','done');assert.equal(calls.length,1);
  stored.notificationsEnabled=false;
  await context.notify('REDOWN failed','error');assert.equal(calls.length,1);
});
test('notification storage failures do not fail a completed transfer',async()=>{
  const context=vm.createContext({chrome:{storage:{local:{get:async()=>{throw Error('storage unavailable');}}}},console:{warn(){}}});
  vm.runInContext(notifySource,context);
  await assert.doesNotReject(()=>context.notify('REDOWN complete','done'));
});

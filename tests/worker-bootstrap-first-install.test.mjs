import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {worker} from './helpers/background-worker.mjs';

const entry = readFileSync('extension/service-worker.js','utf8');
const evidence = h => vm.runInContext('entryEvidenceQueue',h.context);

test('manifest uses guarded classic entry, normal worker has exactly one toolbar and menu writer', async () => {
  const manifest=JSON.parse(readFileSync('extension/manifest.json','utf8'));
  assert.equal(manifest.background.service_worker,'service-worker.js');
  assert.equal(manifest.action.default_popup,undefined);
  const h=worker(undefined,{backgroundSource:entry});
  await h.ready();
  assert.equal(h.context.RedownWorkerCoreStatus,'ready');
  assert.equal(h.chrome.action.onClicked.listeners.length,1);
  assert.equal(h.chrome.contextMenus.onClicked.listeners.length,1);
  // The file handoff has an isolated listener; it never registers another
  // toolbar opener or menu writer. Core messaging remains the first owner.
  assert.equal(h.chrome.runtime.onMessage.listeners.length,2);
  assert.equal(h.chrome.runtime.onMessage.listeners[1]({type:'unrelated'},{},()=>{throw Error('Must not consume core messages');}),false);
  assert.equal((await h.context.RedownBoot.status()).components.worker.state,'ready');
});

test('fresh worker with failing heavy core still registers the original toolbar opener', async () => {
  const h=worker(undefined,{backgroundSource:entry,import:'background.js'});
  await h.ready();
  await evidence(h);
  assert.equal(h.context.RedownWorkerCoreStatus,'failed');
  assert.equal(h.chrome.action.onClicked.listeners.length,1);
  assert.equal(h.chrome.runtime.onInstalled.listeners.length,1);
  assert.equal(h.chrome.contextMenus.onClicked.listeners.length,0);
  assert.equal(h.chrome.runtime.onMessage.listeners.length,1);
  const status=await h.context.RedownBoot.status();
  assert.equal(status.components.worker.state,'failed');
  assert.equal(status.overall,'blocked');
  assert.ok(h.local.entryPointEvidence.some(e=>e.code==='CORE_IMPORT_FAILED'));
  h.local.debugModeEnabled=true;
  const diagnostics=await new Promise(resolve => {
    const done=h.chrome.runtime.onMessage.listeners[0](
      {type:'bootV1',operation:'status'},
      {id:'test',url:'chrome-extension://test/options.html'},
      resolve
    );
    assert.equal(done,true);
  });
  assert.equal(diagnostics.ok,true);
  assert.equal(diagnostics.result.components.worker.state,'failed');
  h.calls.length=0;
  h.chrome.action.onClicked.listeners[0]({id:1,windowId:7});
  assert.deepEqual(structuredClone(h.calls[0]),['panel',{windowId:7}]);
});

test('late core import failure does not register a second toolbar listener', async () => {
  const h=worker(undefined,{backgroundSource:entry,import:'cloudflare-api.js'});
  await h.ready();
  await evidence(h);
  assert.equal(h.context.RedownWorkerCoreStatus,'failed');
  assert.equal(h.context.RedownEntryListenerRegistered,true);
  assert.equal(h.chrome.action.onClicked.listeners.length,1);
  assert.equal((await h.context.RedownBoot.status()).components.worker.state,'failed');
  assert.ok(h.local.entryPointEvidence.some(e=>e.code==='CORE_IMPORT_FAILED'));
});

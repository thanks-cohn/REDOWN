import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
const source=(await Promise.all(['right-click-current.js','right-click-backup.js'].map(p=>readFile(new URL('../extension/'+p,import.meta.url),'utf8')))).join('\n');
function setup(database=new IDBFactory()){
 const c=vm.createContext({structuredClone,TextEncoder,TextDecoder,crypto:webcrypto,Uint8Array,URL,btoa,atob});vm.runInContext(source,c);return {store:c.RedownRightClickCurrent.create(database),codec:c.RedownRightClickBackup};
}
const config={version:1,revision:1,destinations:[{id:'one',profileId:'p',accountId:'a',bucketName:'redown',prefix:'photos',label:'Pictures',enabled:true,parentId:null}]};
test('T22 T23 encrypted independent bundle survives new database, validates schema and restores no authorization',async()=>{
 const source=setup();await source.store.commitPatch({rightClickV3:config},{profiles:[{id:'p',accountId:'a',bucketName:'redown',workerUrl:'https://worker.invalid',token:'NEVER_EXPORT'}]});
 const bundle=await source.store.dump(),text=await source.codec.encode(bundle,'a long private passphrase');assert.ok(!text.includes('Pictures'));assert.ok(!JSON.stringify(bundle).includes('NEVER_EXPORT'));
 const independent=String(text),fresh=setup();assert.deepEqual(Object.keys(await fresh.store.readState()),[]);
 const decoded=await fresh.codec.decode(independent,'a long private passphrase');await fresh.store.restore(decoded);
 assert.equal((await fresh.store.readState()).rightClickV3.destinations[0].label,'Pictures');assert.equal(decoded.requiresReconnect,true);assert.ok(!JSON.stringify(decoded).includes('token'));assert.ok((await fresh.store.dump()).stores.pointers.every(p=>p.applied===null));
 await assert.rejects(fresh.store.restore(decoded),/CURRENT already exists/);
});
test('T23 corrupted ciphertext, wrong passphrase, unsupported schema and plaintext credentials fail before import',async()=>{
 const h=setup();await h.store.commitPatch({rightClickV3:config});const bundle=await h.store.dump(),text=await h.codec.encode(bundle,'a long private passphrase');
 await assert.rejects(h.codec.decode(text,'different passphrase'),/integrity/);
 const altered=JSON.parse(text);altered.ciphertext='AAAA'+altered.ciphertext.slice(4);await assert.rejects(h.codec.decode(JSON.stringify(altered),'a long private passphrase'),/integrity/);
 for(const mutate of [b=>b.schemaVersion=99,b=>b.stores.state[0].value.token='secret',b=>b.stores.records[0].namespace='["google-drive","p","a","","redown"]',b=>b.stores.state[0].value.destinations[0].prefix='../escape']){
  const bad=structuredClone(bundle);mutate(bad);assert.throws(()=>h.codec.validate(bad));
 }
});
test('user-selected-file adapter marks verified only after writer close and authenticated read-back',async()=>{
 const {JSDOM}=await import('jsdom');
 const ui=await readFile(new URL('../extension/right-click-backup-settings.js',import.meta.url),'utf8');
 for(const corrupt of [false,true]){
  const dom=new JSDOM('<select id="directory-history-policy"><option value="daily">Daily</option></select><input id="directory-backup-passphrase"><button id="directory-backup-export"></button><button id="directory-backup-import"></button><p id="directory-backup-status"></p>',{runScripts:'outside-only'}),w=dom.window,backend=setup();
  await backend.store.commitPatch({rightClickV3:config});let text,closed=false,reads=0;const saved=[];
  w.RedownRightClickCurrent={create:()=>backend.store};w.RedownRightClickBackup=backend.codec;
  w.chrome={storage:{local:{get:async()=>({}),set:async patch=>saved.push(patch)}}};
  w.showSaveFilePicker=async()=>({createWritable:async()=>({write:async value=>{text=value;},close:async()=>{closed=true;}}),getFile:async()=>{assert.equal(closed,true);reads++;return {text:async()=>corrupt?'corrupt':text};}});
  w.eval(ui);w.document.getElementById('directory-backup-passphrase').value='a long private passphrase';w.document.getElementById('directory-backup-export').click();
  for(let i=0;i<100&&!w.document.getElementById('directory-backup-status').textContent.includes(corrupt?'Invalid backup file':'External encrypted backup verified');i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(reads,1);assert.equal(saved.some(p=>p.rightClickExternalBackup?.verifiedAt),!corrupt);assert.equal(w.document.getElementById('directory-backup-passphrase').value,'');dom.window.close();
 }
});

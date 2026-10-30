import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const modelSource=await readFile(new URL('../extension/nested-locations.js',import.meta.url),'utf8');
const awaitedConfigSource=await readFile(new URL('../extension/destination-config.js',import.meta.url),'utf8');
const awaitedLegacySource=await readFile(new URL('../extension/right-click-legacy.js',import.meta.url),'utf8');
const begin=source.indexOf('async function buildMenus() {');
const end=source.indexOf('/* Explicit, opt-in gallery capture',begin);
assert.ok(begin>=0&&end>begin);

function harness(profiles,labelFallback){
  const created=[];
  const context=vm.createContext({
    ROOT_MENU_ID:'REDOWN',
    chrome:{
      contextMenus:{removeAll:async()=>{created.length=0;},create:item=>created.push(item)},
      storage:{local:{get:async()=>({rightClickMode:'simple',simpleLabelFallback:labelFallback}),set:async()=>{}}}
    },
    getProfiles:async()=>profiles,
    RedownNestedLocations:{menuMode:()=> 'simple'}
  });
  vm.runInContext(modelSource,context);
  vm.runInContext(awaitedConfigSource+awaitedLegacySource,context);
  vm.runInContext(source.slice(begin,end),context);
  return {created,build:()=>vm.runInContext('buildMenus()',context)};
}

test('Simple menu places default and extra destinations immediately under REDOWN, never inside a preset submenu',async()=>{
  const h=harness([{
    id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'bucket-one',
    defaultPrefix:'images/portraits/final',menuLabel:'',
    showInContextMenu:true,menuOrder:1,
    simpleOptions:[
      {id:'a',bucketName:'bucket-one',prefix:'projects/characters/ozempic',label:'Custom label'},
      {id:'b',bucketName:'bucket-one',prefix:'assets/raw/sounds',label:''},
      {id:'c',bucketName:'bucket-one',prefix:'',label:''}
    ]
  }]);
  await h.build();
  assert.deepEqual(h.created.filter(x=>String(x.id).startsWith('quick:')||String(x.id).startsWith('simple-option:')).map(x=>({id:x.id,parentId:x.parentId,title:x.title})),[
    {id:'quick:p',parentId:'REDOWN',title:'final'},
    {id:'simple-option:p:a',parentId:'REDOWN',title:'Custom label'},
    {id:'simple-option:p:b',parentId:'REDOWN',title:'sounds'},
    {id:'simple-option:p:c',parentId:'REDOWN',title:'bucket-one'}
  ]);
  assert.ok(!h.created.some(x=>String(x.id).startsWith('simple:p')));
});

test('Legacy bucket-label preference cannot override modern path-derived labels or explicit names',async()=>{
  const h=harness([{
    id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'bucket-one',
    simpleBucketName:'alternate-bucket',defaultPrefix:'images/portraits/final',menuLabel:'',
    showInContextMenu:true,menuOrder:1,
    simpleOptions:[
      {id:'a',bucketName:'bucket-two',prefix:'collections/deep',label:''},
      {id:'b',bucketName:'bucket-two',prefix:'collections/deep',label:'Named by user'}
    ]
  }],'bucket');
  await h.build();
  assert.deepEqual(h.created.filter(x=>String(x.id).startsWith('quick:')||String(x.id).startsWith('simple-option:')).map(x=>({id:x.id,parentId:x.parentId,title:x.title})),[
    {id:'quick:p',parentId:'REDOWN',title:'final'},
    {id:'simple-option:p:a',parentId:'REDOWN',title:'deep'},
    {id:'simple-option:p:b',parentId:'REDOWN',title:'Named by user'}
  ]);
});

test('Menu Label is default for existing profiles without a saved preference',async()=>{
  const h=harness([{
    id:'p',type:'cloudflare-r2',bucketName:'gallery',defaultPrefix:'images/final',menuLabel:'My Choice',showInContextMenu:true,
    simpleOptions:[{id:'blank',bucketName:'gallery',prefix:'other/leaf',label:''}]
  }]);
  await h.build();
  assert.deepEqual(h.created.filter(x=>String(x.id).startsWith('quick:')||String(x.id).startsWith('simple-option:')).map(x=>x.title),['My Choice','leaf']);
});
test('explicit Simple label wins over the lowest-directory fallback',async()=>{
  const h=harness([{id:'p',type:'cloudflare-r2',bucketName:'gallery',defaultPrefix:'images/final',menuLabel:'My Choice',showInContextMenu:true,simpleOptions:[]}],'deepest');
  await h.build();
  assert.equal(h.created.find(x=>x.id==='quick:p').title,'My Choice');
});

test('blank and whitespace Simple labels retain automatic naming under every fallback setting',async()=>{
 for(const preference of [undefined,'menu','deepest','bucket']){
  const h=harness([{id:'p',type:'cloudflare-r2',bucketName:'gallery',defaultPrefix:'images/final',menuLabel:'   ',simpleOptions:[{id:'named',prefix:'images/other',label:'  My label  '},{id:'blank',prefix:'images/leaf',label:''},{id:'root',prefix:'',label:''}]}],preference);await h.build();
  assert.deepEqual(h.created.filter(x=>String(x.id).startsWith('quick:')||String(x.id).startsWith('simple-option:')).map(x=>x.title),['final','My label','leaf','gallery']);
 }
});

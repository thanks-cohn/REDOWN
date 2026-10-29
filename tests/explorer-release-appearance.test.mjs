import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=source('extension/beta/explorer.html');
const css=source('extension/beta/explorer.css');
const explorer=source('extension/beta/explorer.mjs');
const shelf=source('extension/shelf.html');
const themeScript=source('extension/explorer-theme.js');

test('Explorer starts with only LOGIN while signed out; no old account-discovery tile',()=>{
  for(const id of ['account-chooser','account-standby-action','accounts']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/id="account-chooser"[^>]*data-state="disconnected"/);
  assert.match(html,/id="account-standby-action"[^>]*>LOGIN<\/button>/);
  assert.doesNotMatch(html,/id="account-standby(?:-heading|-detail)?"/);
  assert.match(html,/id="account-picker-caption"[^>]*hidden/);
  assert.match(explorer,/if\(!cloudflareSignedIn\)\{\s*accountVisual\('disconnected'\)/);
  assert.match(explorer,/if\(cloudflareSignedIn\)await loadAccounts\(lastLocation\)/);
  assert.match(explorer,/accountVisual\(accounts\.length\?'ready':'empty'\)/);
  assert.match(explorer,/accountVisual\('failed'\)/);
  assert.match(explorer,/\$\('accounts'\)\.tabIndex=-1/);
  assert.match(source('extension/beta/account-picker.js'),/aria-expanded/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test('release Explorer has a permanent name and one Shelf Settings entrypoint',()=>{
  assert.match(html,/<title>REDOWN Explorer<\/title>/);
  assert.match(html,/<h1>REDOWN Explorer<\/h1>/);
  assert.doesNotMatch(html,/Beta Explorer|sidebar-toolbar-mode/);
  assert.match(html,/id="open-shelf-settings"/);
  assert.match(source('extension/beta/sidebar-settings.js'),/chrome\.sidePanel\.open/);
});
test('Test It Tools are not rendered in normal mode or reserve invisible padding',()=>{
  assert.match(html,/class="test-it-tools-wrap" hidden/);
  assert.match(themeScript,/testTools\.hidden=!enabled/);
  assert.match(css,/main:has\(\.test-it-tools-wrap:not\(\[hidden\]\)\)/);
  assert.match(shelf,/id="shelf-debug-enabled"/);
});
test('Shelf exposes independent Explorer palettes without changing the original palette controls',()=>{
  assert.match(shelf,/id="explorer-theme-mode"/);
  assert.match(shelf,/id="explorer-custom-theme"/);
  for(const p of ['porcelain','midnight','ocean','neon']){
    assert.match(shelf,new RegExp('name="shelf-theme" value="'+p+'"'));
    assert.ok(css.includes('[data-explorer-theme="'+p+'"]'));
  }
});
test('Explorer theme preferences and Debug Mode respond to storage changes',async()=>{
  const nodes=Object.fromEntries(['explorer-theme-mode','explorer-custom-theme','explorer-custom-theme-row','shelf-debug-enabled','test-it-tools-menu','test-it-tools-button'].map(id=>[id,{value:'',hidden:true,checked:false,attrs:{},handlers:{},addEventListener(event,fn){this.handlers[event]=fn},setAttribute(k,v){this.attrs[k]=v}}]));
  const wrap={hidden:true};
  const document={
    documentElement:{dataset:{}},
    getElementById:id=>nodes[id]||null,
    querySelector:selector=>selector==='.test-it-tools-wrap'?wrap:null,
  };
  // A tiny Chrome storage mock tests the real production controller without
  // starting Chrome, modifying a user's settings, or contacting Cloudflare.
  const values={shelfColorScheme:'ocean',explorerThemeMode:'match',explorerColorScheme:'neon',debugModeEnabled:false};
  const listeners=[];
  const chrome={storage:{local:{
    async get(keys){return Object.fromEntries(keys.map(k=>[k,values[k]]))},
    async set(data){const changes={};for(const [key,value] of Object.entries(data)){changes[key]={oldValue:values[key],newValue:value};values[key]=value}listeners.forEach(fn=>fn(changes,'local'))}
  },onChanged:{addListener:fn=>listeners.push(fn)}}};
  vm.runInNewContext(themeScript,{document,chrome});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.documentElement.dataset.explorerTheme,'ocean');
  assert.equal(wrap.hidden,true);
  nodes['explorer-theme-mode'].value='custom';
  nodes['explorer-theme-mode'].handlers.change();
  assert.equal(document.documentElement.dataset.explorerTheme,'neon');
  await new Promise(resolve=>setImmediate(resolve));
  nodes['shelf-debug-enabled'].checked=true;
  nodes['shelf-debug-enabled'].handlers.change();
  assert.equal(wrap.hidden,false);
  await new Promise(resolve=>setImmediate(resolve));
  nodes['shelf-debug-enabled'].checked=false;
  nodes['shelf-debug-enabled'].handlers.change();
  assert.equal(wrap.hidden,true);
  assert.equal(nodes['test-it-tools-menu'].hidden,true);
  nodes['explorer-theme-mode'].value='match';
  nodes['explorer-theme-mode'].handlers.change();
  assert.equal(document.documentElement.dataset.explorerTheme,'ocean');
  await new Promise(resolve=>setImmediate(resolve));
  listeners.forEach(fn=>fn({shelfColorScheme:{newValue:'midnight'}},'local'));
  assert.equal(document.documentElement.dataset.explorerTheme,'midnight');
});

test('LOGIN and LOG OUT remain centered and the Mac-style account slot does not morph',()=>{
  assert.match(explorer,/action\.textContent=loginState\?'LOGIN':state==='loading'\?'LOADING…':'RETRY'/);
  assert.match(explorer,/\$\('account-picker-caption'\)\.hidden=!ready/);
  assert.match(css,/\.account-chooser:not\(\[data-state="ready"\]\)/);
  assert.match(css,/\.session-actions\{justify-content:center\}/);
  assert.match(css,/#disconnect\.logout-button\{min-width:128px\}/);
  assert.match(css,/width:128px;min-height:37px/);
  assert.match(explorer,/\$\('connect'\)\.click\(\)/);
  assert.match(html,/id="account-standby-action"/);
  assert.match(html,/id="disconnect"/);
});

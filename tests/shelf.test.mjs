import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('extension/shelf.html','utf8'),script=readFileSync('extension/shelf.js','utf8');
const settle=()=>new Promise(r=>setTimeout(r,20));
async function shelf(data={},response={ok:true,accounts:[]}){
 const dom=new JSDOM(html,{url:'https://extension.test/shelf.html#settings',runScripts:'outside-only'}),listeners=[],opened=[];
 dom.window.chrome={storage:{local:{async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,data[k]]));},async set(value){Object.assign(data,value);for(const fn of listeners)fn(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,{newValue:v}])),'local');}},onChanged:{addListener(fn){listeners.push(fn);}}},runtime:{getURL:p=>'https://extension.test/'+p,async sendMessage(){return response;}},tabs:{async create(o){opened.push(o);}}};
 dom.window.eval(script);await settle();return {dom,data,opened,doc:dom.window.document};
}
test('Shelf defaults to Shelf; both choices persist and survive reopening without touching other data',async()=>{
 const data={profiles:[{type:'cloudflare-r2',name:'test'}],transferHistory:[]},s=await shelf(data);
 assert.equal(s.doc.querySelector('[value=shelf]').checked,true);
 for(const value of ['popup','shelf']){const input=s.doc.querySelector('[value='+value+']');input.checked=true;input.dispatchEvent(new s.dom.window.Event('change'));await settle();assert.equal(data.toolbarOpenMode,value);const reopened=await shelf(data);assert.equal(reopened.doc.querySelector('[value='+value+']').checked,true);reopened.dom.window.close();}
 assert.equal(data.profiles[0].name,'test');assert.equal(s.doc.getElementById('settings-view').hidden,false);s.dom.window.close();
});
test('provider order, pending integrations, verified account state and actual history remain honest',async()=>{
 const s=await shelf({cloudflareAuth:{accessToken:'fixture'},transferHistory:[{ok:false,profileName:'Failed fixture',at:'2026-10-29T00:00:00Z'}]});
 assert.deepEqual([...s.doc.querySelectorAll('h3')].map(x=>x.textContent),['Google Drive','Dropbox','Microsoft OneDrive','Cloudflare R2']);assert.equal(s.doc.getElementById('cf-state').textContent,'Connected');s.dom.window.eval(readFileSync('extension/shelf-history.js','utf8'));await s.dom.window.RedownShelfHistory.open();assert.match(s.doc.getElementById('history-timeline').textContent,/Failed fixture/);assert.equal(s.doc.querySelectorAll('.state').length,4);s.dom.window.close();
 const bad=await shelf({cloudflareAuth:{accessToken:'fixture'}},{ok:false});assert.equal(bad.doc.getElementById('cf-state').textContent,'Check sign-in');bad.dom.window.close();
});
test('History opens Today by default and preserves clickable source and hosting-page URLs',async()=>{
 const now=new Date().toISOString();
 const data={transferHistory:[
   {id:'failed',at:now,ok:false,sourceUrl:'https://files.example.net/missing.webp',pageUrl:'https://journal.example.org/article',error:'Source returned an HTTP error',profileName:'Cloudflare'},
   {id:'success',at:now,ok:true,location:'R2: bucket/photos/one.webp',sourceUrl:'https://images.example.net/photo.webp',pageUrl:'https://journal.example.org/photos',profileName:'Cloudflare'},
   {id:'long',at:now,ok:true,location:'R2: bucket/photos/long.webp',sourceUrl:'https://images.example.net/assets/'+('very-long-path/'.repeat(12))+'image.webp',pageUrl:'https://journal.example.org/photos',profileName:'Cloudflare'}
 ]};
 const s=await shelf(data);
 try{
   s.dom.window.eval(readFileSync('extension/shelf-history.js','utf8'));
   const ui=s.dom.window.RedownShelfHistory;
   await ui.open();
   const days=[...s.doc.querySelectorAll('details.history-day')];
   assert.ok(days.some(day=>day.open&&day.textContent.includes('Today')),'Today should be expanded whenever History opens');
   const links=[...s.doc.querySelectorAll('.history-entry-link')];
   assert.ok(links.some(link=>link.href==='https://images.example.net/photo.webp'));
   assert.ok(links.some(link=>link.href==='https://journal.example.org/photos'));
   assert.ok(links.every(link=>link.target==='_blank'&&link.rel.includes('noopener')));
   const failed=s.doc.querySelector('.history-transfer[data-state="failed"]');
   assert.match(failed.querySelector('.history-entry-head').textContent,/Error: https:\/\/files.example.net\/missing.webp/);
   assert.ok(failed.querySelector('.history-technical-details')&&!failed.querySelector('.history-technical-details').open);
   assert.ok([...s.doc.querySelectorAll('.history-entry-details')].some(details=>!details.open),'Long entries should begin collapsed');
   const section=days.find(day=>day.open);
   section.open=false;
   await ui.open();
   assert.ok([...s.doc.querySelectorAll('details.history-day')].some(day=>day.open&&day.textContent.includes('Today')),'reopening History should expand Today again');
 }finally{s.dom.window.close();}
});
test('Explorer selector and its wrapper are gone; Test It remains and Popup has a Settings escape',()=>{
 const explorer=readFileSync('extension/beta/explorer.html','utf8');assert.doesNotMatch(explorer,/toolbar-mode|toolbarOpenMode|bottom-right-controls/);assert.match(explorer,/id="test-it-tools-button"/);assert.equal(existsSync('extension/beta/toolbar-mode.js'),false);assert.match(readFileSync('extension/popup.html','utf8'),/href="shelf.html#settings"/);
});
test('existing toolbar implementation applies default Shelf and Popup in both directions',async()=>{
 const {default:vm}=await import('node:vm');const source=readFileSync('extension/background.js','utf8');const fn=source.slice(source.indexOf('async function applyToolbarOpenMode()'),source.indexOf('chrome.action.onClicked.addListener',source.indexOf('async function applyToolbarOpenMode()')));
 let mode;const calls=[];const context=vm.createContext({chrome:{storage:{local:{async get(){return {toolbarOpenMode:mode}}}},sidePanel:{async setOptions(o){calls.push(['panel',o.enabled])}},action:{async setPopup(o){calls.push(['popup',o.popup])}}}});vm.runInContext(fn,context);
 for(const selected of [undefined,'popup','shelf']){mode=selected;await vm.runInContext('applyToolbarOpenMode()',context);}
 assert.deepEqual(calls,[['panel',true],['popup',''],['panel',false],['popup','popup.html'],['panel',true],['popup','']]);
});

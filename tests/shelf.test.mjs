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
test('Shelf defaults to Shelf and preserves explicitly selected native Popup across reopening',async()=>{
 const data={profiles:[{name:'test'}]},s=await shelf(data);
 assert.equal(s.doc.querySelector('[value=shelf]').checked,true);
 for(const value of ['popup','shelf']){
  const input=s.doc.querySelector('[name="toolbar-mode"][value='+value+']');input.checked=true;input.dispatchEvent(new s.dom.window.Event('change'));await settle();
  assert.equal(data.toolbarOpenMode,value);const next=await shelf(data);assert.equal(next.doc.querySelector('[name="toolbar-mode"][value='+value+']').checked,true);next.dom.window.close();
 }
 assert.equal(data.profiles[0].name,'test');s.dom.window.close();
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
test('toolbar configuration preserves explicit popup and defaults unknown modes to Shelf',async()=>{
 const {worker,config}=await import('./helpers/background-worker.mjs');
 for(const mode of [undefined,'popup','shelf']){
  const data=config();data.toolbarOpenMode=mode;const h=worker(data);await h.ready();
  assert.equal(data.toolbarOpenMode,mode);assert.equal(await h.chrome.action.getPopup({tabId:1}),mode==='popup'?'chrome-extension://test/popup.html':'');
 }
});

test('Shelf and compact popup Home controls use a clear small house icon instead of a diagonal launch arrow',()=>{
 const shelfDom=new JSDOM(html),popupDom=new JSDOM(readFileSync('extension/popup.html','utf8'));
 try{
  const shelfHome=shelfDom.window.document.querySelector('#dashboard');
  assert.equal(shelfHome.getAttribute('aria-label'),'Open REDOWN Home');
  assert.ok(shelfHome.querySelector('svg.home-glyph path'),'Shelf Home must have an actual vector house');
  assert.doesNotMatch(shelfHome.textContent,/↗/);
  const popupHome=popupDom.window.document.querySelector('#dashboard');
  assert.match(popupHome.textContent,/Go to Dashboard/);
  assert.ok(popupHome.querySelector('svg path'),'compact popup must show a vector house');
  assert.doesNotMatch(popupHome.textContent,/↗/);
 }finally{shelfDom.window.close();popupDom.window.close();}
});

test('Shelf reassurance appears immediately beneath navigation; Cloud Storage is title-cased',()=>{
 const doc=new JSDOM(html).window.document;
 const nav=doc.querySelector('nav[aria-label="Shelf"]'),clouds=doc.querySelector('#clouds-view');
 assert.equal(nav.nextElementSibling.tagName,'MAIN');
 assert.equal(clouds.firstElementChild.className,'shelf-assurance');
 assert.equal(clouds.firstElementChild.textContent.replace(/\s+/g,' ').trim(),'YOUR FILES · YOUR CLOUDS · YOUR CONTROL');
 assert.equal(doc.querySelector('#cloudflare-heading').textContent,'Your Cloud Storage');
});
test('unverified Cloudflare retains card-level status but no duplicate warning in the introduction',async()=>{
 const h=await shelf({cloudflareAuth:{accessToken:'fixture'}},{ok:false});
 try{
   assert.equal(h.doc.querySelector('#cf-state').dataset.state,'error');
   assert.match(h.doc.querySelector('#cf-state').textContent,/Check sign-in/);
   assert.ok(!h.doc.getElementById('connection-summary').textContent.includes('Cloudflare needs attention'));
   assert.equal(h.doc.getElementById('connection-summary').textContent,'');
 }finally{h.dom.window.close();}
});

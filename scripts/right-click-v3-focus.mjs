// Real browser interaction regression. Mock messages only; no extension install/cloud calls.
// REDOWN_PLAYWRIGHT_MODULE and REDOWN_CHROMIUM_PATH follow beta-explorer-preview.mjs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const {chromium}=await import(process.env.REDOWN_PLAYWRIGHT_MODULE||'playwright');
const [html,css,domain,ui]=await Promise.all(['extension/beta/explorer.html','extension/beta/right-click-v3.css','extension/right-click-v3.js','extension/beta/right-click-v3-ui.js'].map(read));
const testedUI=process.env.REDOWN_V3_UI_PATH?await readFile(process.env.REDOWN_V3_UI_PATH,'utf8'):ui;
const browser=await chromium.launch({headless:true,...(process.env.REDOWN_CHROMIUM_PATH?{executablePath:process.env.REDOWN_CHROMIUM_PATH}:{}),args:['--no-sandbox']});
let passed=0;
try {
 for(const width of [1200,390]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
 page.setDefaultTimeout(5000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>${css}</style>${html.match(/<section id="v3-setup"[\s\S]*?<\/section>/)[0]}`}));
 await page.goto('http://localhost/');
 await page.evaluate(()=>{
  const profile={id:'p',accountId:'a',accountName:'Account',bucketName:'bucket'};
  const dest=(id,label,prefix)=>({id,label,prefix,parentId:null,profileId:'p',accountId:'a',bucketName:'bucket',enabled:true});
  let config={version:1,revision:0,destinations:[dest('alpha','Alpha','alpha'),dest('beta','Beta','beta')]};
  window.__calls=[];window.__listeners=[];window.__holdSave=false;window.__holdFolders=false;
  window.chrome={runtime:{sendMessage:async m=>{
   window.__calls.push(m);
   if(m.type==='rightClickV3Snapshot')return {ok:true,config:structuredClone(config),profiles:[profile],engine:'v3'};
   if(m.type==='saveRightClickV3'){
    if(window.__holdSave)await new Promise(r=>window.__releaseSave=r);
    config={...config,revision:config.revision+1,destinations:m.destinations};
    return {ok:true,revision:config.revision,engine:'v3',menuUpdated:true};
   }
   if(m.type==='cfDestinationFolders'){
    if(window.__holdFolders)await new Promise(r=>window.__releaseFolders=r);
    return {ok:true,folders:['research/notes/','photos/'],cursor:''};
   }
   throw Error('Unexpected '+m.type);
  }},storage:{onChanged:{addListener:fn=>window.__listeners.push(fn)}}};
 });
 await page.addScriptTag({content:domain});await page.addScriptTag({content:testedUI});
 const $=id=>page.locator('#v3-'+id),row=id=>page.locator(`[role=treeitem][data-key="${id}"]`);
 const focus=async locator=>assert.equal(await locator.evaluate(n=>n===document.activeElement),true,'expected focused '+await locator.getAttribute('aria-label'));
 const saved=()=>page.waitForFunction(()=>document.getElementById('v3-status').textContent==='Saved and ready',null,{timeout:5000});
 const add=()=>page.getByRole('button',{name:'Add destination in bucket',exact:true}).click();
 await row('alpha').waitFor();
 console.log(`START ${width}px`);await add();await focus($('prefix'));
 // Click, don't fill: this reproduced the parent onclick stealing focus before typing.
 await $('label').click();await page.keyboard.type('Research notes');await focus($('label'));
 assert.equal(await $('label').inputValue(),'Research notes');
 await $('prefix').click();await page.keyboard.type('research');await focus($('prefix'));
 assert.equal(await $('prefix').inputValue(),'research');
 await $('profile').click();await $('profile').selectOption('p');await focus($('profile'));
 await $('parent').click();await $('parent').selectOption('alpha');await focus($('parent'));
 await $('parent').selectOption('');
 await $('browse').click();await page.getByRole('searchbox',{name:'Filter existing folders'}).click();
 await page.keyboard.type('notes');assert.equal(await page.getByRole('button',{name:'Choose photos',exact:true}).isVisible(),false);
 await page.getByRole('button',{name:'Choose research/notes',exact:true}).click();await focus($('prefix'));
 assert.equal(await $('prefix').inputValue(),'research/notes');
 await page.evaluate(()=>window.__holdSave=true);
 console.log('form and folder controls passed');await page.keyboard.press('Enter');
 const created=page.getByRole('treeitem',{name:'Research notes · bucket/research/notes',exact:true});
 await focus(created);assert.equal(await $('add').isVisible(),false);
 // Acknowledgement must not steal focus from an editor opened while save is pending.
 await add();await $('label').click();await page.keyboard.type('Next draft');
 await page.evaluate(()=>{window.__holdSave=false;window.__releaseSave();});await saved();await focus($('label'));
 assert.equal(await $('label').inputValue(),'Next draft');
 await page.keyboard.press('Escape');await focus(row('bucket:p'));
 await page.keyboard.press('ArrowDown');await focus(row('alpha'));
 await page.keyboard.press('b');await focus(row('beta'));
 await page.keyboard.press('Home');await focus(row('account:a'));
 await page.keyboard.type('Res');await focus(created);await page.keyboard.press('End');await focus(created);
 console.log('create/save/cancel/navigation passed');
 // Rename via F2, multi-character input, Escape, then confirmation with Enter.
 await page.keyboard.press('F2');let edit=page.locator('input[data-edit]');await focus(edit);
 await page.keyboard.type('Discard');await page.keyboard.press('Escape');await focus(created);
 await page.keyboard.press('F2');edit=page.locator('input[data-edit]');
 await edit.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Renamed notes');await focus(edit);
 await page.keyboard.press('Enter');await saved();
 const renamed=page.getByRole('treeitem',{name:'Renamed notes · bucket/research/notes',exact:true});await focus(renamed);
 const check=page.getByRole('checkbox',{name:'Include Renamed notes in Chrome',exact:true});
 await check.click();await saved();await focus(check);assert.equal(await check.isChecked(),false);
 await page.keyboard.press('Space');await saved();await focus(check);assert.equal(await check.isChecked(),true);
 console.log('rename and checkbox passed');
 // Action menus and + must operate on their own row, regardless of previous selection.
 await row('alpha').locator('.v3-name').click();
 await renamed.getByRole('button',{name:'Add child destination to Renamed notes',exact:true}).click();
 assert.equal(await $('parent').inputValue(),await renamed.getAttribute('data-key'));
 await page.keyboard.press('Escape');await focus(renamed);
 // Async tree-folder redraw preserves the inline form, draft, caret and focus.
 await add();await page.evaluate(()=>window.__holdFolders=true);
 await page.getByRole('button',{name:'Load folders in bucket',exact:true}).click();
 await $('label').click();await page.keyboard.type('Draft intact');
 const anchor=await $('add').evaluate(n=>n.parentElement.dataset.key);
 await page.evaluate(()=>{window.__holdFolders=false;window.__releaseFolders();});
 await page.getByRole('button',{name:'Use research/notes as destination',exact:true}).waitFor();
 await focus($('label'));assert.equal(await $('label').inputValue(),'Draft intact');
 assert.equal(await $('add').evaluate(n=>n.parentElement.dataset.key),anchor);
 await page.keyboard.type('!');assert.equal(await $('label').inputValue(),'Draft intact!');
 await $('cancel').click();await focus(row('bucket:p'));
 await page.getByRole('button',{name:'Use research/notes as destination',exact:true}).click();
 assert.equal(await $('prefix').inputValue(),'research/notes');await page.keyboard.press('Escape');await focus(row('bucket:p'));
 // An asynchronous folder refresh must also preserve an inline rename draft/caret.
 await renamed.locator('.v3-name').click();await page.keyboard.press('F2');
 await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Uncommitted draft');
 await page.evaluate(()=>window.__holdFolders=true);
 await page.getByRole('button',{name:'Load folders in bucket',exact:true}).click();
 await page.locator('[data-edit]').click();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await page.evaluate(()=>{window.__holdFolders=false;window.__releaseFolders();});
 await page.waitForFunction(()=>document.getElementById('v3-status').textContent==='Folders loaded.');
 await focus(page.locator('[data-edit]'));assert.equal(await page.locator('[data-edit]').inputValue(),'Uncommitted draft');
 assert.equal(await page.locator('[data-edit]').evaluate(n=>n.selectionStart),1);
 await page.keyboard.press('Escape');await focus(renamed);
 // More menu retains its native toggle behavior; deletion keeps the existing Undo focus.
 await renamed.locator('summary').click();assert.equal(await renamed.locator('details').getAttribute('open'),'');
 await page.getByRole('button',{name:'Rename Renamed notes',exact:true}).click();await focus(page.locator('[data-edit]'));
 await page.keyboard.press('Escape');await renamed.locator('.v3-name').click();await page.keyboard.press('Delete');
 await saved();await focus($('undo'));assert.equal(await renamed.count(),0);
 await $('undo').click();await saved();await focus($('undo'));assert.equal(await renamed.count(),1);
 assert.equal(await $('outline').locator('[role=treeitem][tabindex="0"]').count(),1);
 assert.deepEqual(errors,[]);
 await page.close();passed++;console.log(`PASS real click/type/folder/Enter/Escape/rename/check/delete/save/redraw at ${width}px`);
 }
 console.log(`${passed} Chromium interaction scenarios passed (mock messages, no installed-extension/live-provider claim).`);
} finally {await browser.close();}

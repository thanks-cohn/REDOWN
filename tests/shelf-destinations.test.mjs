import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const read=path=>readFile(path,'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

async function mount(provider,state){
  const dom=new JSDOM(await read('extension/shelf.html'),{runScripts:'outside-only'});
  const opened=[],messages=[];
  const storage={
    googleDriveState:{phase:provider==='google-drive'?'connected':'disconnected',folderId:'folder'},
    'dropbox:state':{phase:provider==='dropbox'?'connected':'disconnected',rootReady:true,checkedAt:Date.now()},
    'dropbox:transfer':{},
    'onedrive:state':{phase:provider==='onedrive'?'connected':'disconnected',rootReady:true},
    'onedrive:transfer':{},
    ...state
  };
  dom.window.chrome={
    tabs:{create:async o=>{opened.push(o);return {id:7};}},
    runtime:{sendMessage:async m=>{messages.push(m.type);return {ok:true};}},
    storage:{local:{get:async()=>storage},onChanged:{addListener:()=>{}}}
  };
  dom.window.eval(await read('extension/shelf-'+provider+'.js'));
  await tick();
  return {dom,button:dom.window.document.getElementById('shelf-'+provider),opened,messages};
}
for(const [provider,url,connectMessage] of [
  ['google-drive','https://drive.google.com/drive/u/0/my-drive','googleDriveOpen'],
  ['dropbox','https://www.dropbox.com/home','dropboxConnect'],
  ['onedrive','https://onedrive.live.com/','onedriveConnect']
]){
  test(provider+' connected Shelf acts as GO TO without OAuth',async()=>{
    const h=await mount(provider);
    assert.match(h.button.textContent,/GO TO/);
    h.button.click();await tick();
    assert.deepEqual(JSON.parse(JSON.stringify(h.opened)),[{url}]);
    assert.ok(!h.messages.includes(connectMessage));
    h.dom.window.close();
  });
}
test('Destinations gateway does not interrupt the original provider ordering',async()=>{
  const dom=new JSDOM(await read('extension/shelf.html'));
  const d=dom.window.document;
  assert.ok(d.querySelector('.destinations-heading svg textPath'));assert.equal(d.querySelectorAll('.destinations-grid .destination-tile').length,3);
  assert.ok(d.querySelector('.google-drive-control').nextElementSibling.matches('.dropbox-control'));
  assert.ok(d.querySelector('.dropbox-control').nextElementSibling.matches('.onedrive-control'));
  assert.ok(d.querySelector('.onedrive-control').parentElement.matches('.destinations-grid'));assert.ok(d.querySelector('.destinations-grid').nextElementSibling.matches('.eyebrow'));
  dom.window.close();
});

test('work OneDrive GO TO opens the Microsoft 365 OneDrive launcher',async()=>{
  const h=await mount('onedrive',{'onedrive:state':{phase:'connected',rootReady:true,driveType:'business'}});
  h.button.click();await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(h.opened)),[{url:'https://www.office.com/launch/onedrive'}]);
  assert.ok(!h.messages.includes('onedriveConnect'));
  h.dom.window.close();
});

test('equal minimalist cloud tiles show only an icon and a short action',async()=>{
 const dom=new JSDOM(await read('extension/shelf.html'));
 const doc=dom.window.document,tiles=[...doc.querySelectorAll('.destinations-grid .destination-tile')];
 assert.equal(tiles.length,3);
 assert.deepEqual(tiles.map(t=>t.querySelector('.destination-action').getAttribute('aria-label')),
   ['Log in to Google Drive','Checking Dropbox','Log in to OneDrive']);
 for(const tile of tiles){
   assert.ok(tile.querySelector('.destination-icon'));
   assert.ok(tile.querySelector('.destination-word'));
   assert.ok(tile.querySelector('.destination-options > summary'));
   assert.ok(tile.querySelector('.destination-options-menu [role="status"]'));
   assert.equal(tile.querySelector('.destination-action').querySelectorAll('small').length,0);
 }
 assert.equal(doc.querySelector('.destinations-banner'),null);
 assert.equal(doc.getElementById('shelf-onedrive-diagnostic'),null);
 const overview=doc.querySelector('.overview');
 assert.ok(overview.querySelector('.destinations-grid').compareDocumentPosition(
   overview.querySelector('.overview-title')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
 const css=await read('extension/shelf.css');
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 dom.window.close();
});
test('disconnected cloud tiles show LOGIN rather than opening a provider website',async()=>{
 const cases=[
  ['google-drive',{googleDriveState:{phase:'disconnected'}}],
  ['dropbox',{'dropbox:state':{phase:'disconnected'}}],
  ['onedrive',{'onedrive:state':{phase:'disconnected'}}]
 ];
 for(const [provider,override] of cases){
   const h=await mount(provider,override);
   assert.equal(h.button.textContent.trim(),'LOGIN');
   assert.equal(h.opened.length,0);
   h.dom.window.close();
 }
});

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
    assert.deepEqual(h.opened,[{url}]);
    assert.ok(!h.messages.includes(connectMessage));
    h.dom.window.close();
  });
}
test('Destinations gateway does not interrupt the original provider ordering',async()=>{
  const dom=new JSDOM(await read('extension/shelf.html'));
  const d=dom.window.document;
  assert.ok(d.querySelector('.destinations-banner'));
  assert.ok(d.querySelector('.google-drive-control').nextElementSibling.matches('.dropbox-control'));
  assert.ok(d.querySelector('.dropbox-control').nextElementSibling.matches('.onedrive-control'));
  assert.ok(d.querySelector('.onedrive-control').nextElementSibling.matches('h1.overview-title'));
  dom.window.close();
});

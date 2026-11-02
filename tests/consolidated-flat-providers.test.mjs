import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ctx=vm.createContext({});
for(const file of ['google-drive-menu.js','dropbox-menu.js','onedrive-menu.js'])
  vm.runInContext(read('extension/'+file),ctx,{filename:file});
const google=ctx.RedownGoogleDriveMenu,dropbox=ctx.RedownDropboxMenu,onedrive=ctx.RedownOneDriveMenu;
const root=()=>[{id:'redown'}, {id:'v3:provider:cloudflare',parentId:'redown'},
  {id:'v3:folder',parentId:'v3:provider:cloudflare'},
  {id:'redown-manage',parentId:'redown'}];

for(const phase of ['disconnected','reconnect','connected','connecting']){
  test('CONSOLIDATED flat provider leaves, Cloudflare alone nested: '+phase,()=>{
    let entries=root();
    entries=google.compose(entries,google.fragment({phase,folderId:'folder'},'redown'),'redown');
    entries=google.composeSibling(entries,dropbox.fragment({phase,root:'/',rootReady:true,accountId:'dbid:test',connectionId:'c'},'redown'),'redown');
    const result=onedrive.compose(entries,onedrive.fragment({phase,rootReady:true,accountId:'a',driveId:'d',rootId:'r',connectionId:'c'},'redown'),'redown');
    assert.equal(result.error,null);
    entries=result.entries;
    const top=entries.filter(x=>x.parentId==='redown').map(x=>x.id);
    assert.deepEqual(top,['v3:provider:cloudflare','provider:google-drive','provider:dropbox','provider:onedrive','redown-manage']);
    for(const provider of ['provider:google-drive','provider:dropbox','provider:onedrive']){
      assert.equal(entries.filter(x=>x.id===provider).length,1);
      assert.equal(entries.some(x=>x.parentId===provider),false,'extra provider submenu: '+provider);
    }
    assert.ok(entries.some(x=>x.parentId==='v3:provider:cloudflare'),'Cloudflare subtree removed');
  });
}

test('old provider submenu fragments cannot be registered',()=>{
  const base=root();
  const wrong=google.compose(base,{providerId:'google-drive',entries:[
    {id:'provider:google-drive',parentId:'redown'},
    {id:'provider:google-drive:connect',parentId:'provider:google-drive'}
  ]},'redown');
  assert.equal(wrong,base);
  assert.equal(onedrive.compose(base,{providerId:'onedrive',entries:[
    {id:'provider:onedrive',parentId:'redown'},
    {id:'provider:onedrive:connect',parentId:'provider:onedrive'}
  ]},'redown').error,'ONEDRIVE_MENU_FRAGMENT_INVALID');
});

test('V3 verified celebrations and energy balls remain installed',()=>{
  const html=read('extension/shelf.html');
  const script=read('extension/shelf-save-feedback.js');
  assert.match(html,/shelf-celestial\.js/);
  assert.match(html,/shelf-save-feedback\.js/);
  assert.match(script,/money-flash/);
  assert.match(script,/word\.slice\(0,i\)/);
  assert.match(script,/receipt\?\.verified!==true/);
  assert.doesNotMatch(script,/Verified · from this update/);
  assert.match(script,/destination-action-copy'\)\?\.append\(count\)/);
});

test('Google direct background save and Dropbox proof guard survive integration',()=>{
  const bg=read('extension/background.js'),drive=read('extension/google-drive-provider.js'),
    db=read('extension/dropbox-provider.js');
  assert.match(bg,/importScripts\("google-drive-stream\.js"\)/);
  assert.match(bg,/v3-consolidated-flat-providers-1/);
  assert.match(drive,/providerKind:'google'/);
  assert.doesNotMatch(drive,/chrome\.tabs\.create/);
  assert.match(db,/proofVersion===1/);
  assert.match(db,/await auth\.connect\(\)/);
});

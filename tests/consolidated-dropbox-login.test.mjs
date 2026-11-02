import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {randomUUID, webcrypto} from 'node:crypto';
const read=path=>readFile('extension/'+path,'utf8');
const snapshot=v=>JSON.parse(JSON.stringify(v));

test('P0 Dropbox flat menu stays clickable during persisted connecting and reconnect states',async()=>{
  const ctx=vm.createContext({});
  vm.runInContext(await read('dropbox-menu.js'),ctx);
  for(const phase of ['connecting','disconnected','reconnect','connected']){
    const entries=ctx.RedownDropboxMenu.fragment({phase},'redown').entries;
    assert.equal(entries.length,1);
    assert.equal(entries[0].enabled,true);
    assert.equal(entries[0].parentId,'redown');
  }
});

function fixture(phase,permission=true,stale=false){
  const data={'dropbox:state':{phase,rootReady:true,accountId:'dbid:one',namespace:'123',connectionId:'connection-one'}};
  const records=[];let logins=0,uploads=0;
  const local={
    get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,data[k]])),
    set:async patch=>Object.assign(data,patch)
  };
  const chrome={runtime:{id:'extension'},storage:{local},
    permissions:{request:async()=>permission},
    alarms:{create:async()=>{},clear:async()=>{}}
  };
  const identity={accountId:'dbid:one',namespace:'123',connectionId:'connection-one'};
  const auth={
    connect:async()=>{logins++;data['dropbox:state']={...data['dropbox:state'],phase:'connected'};return identity;},
    ready:async()=>{if(stale)throw Error('stale refresh');return identity;}
  };
  const api={upload:async job=>{
    uploads++;job.offset=2;
    return {proofVersion:1,...identity,root:'/',fileId:'id:file-1',name:'test.bin',path:'/test.bin',revision:'rev-1',contentHash:'a'.repeat(64),bytes:2};
  }};
  const source={url:'https://source.invalid/test.bin',sourceUrl:'https://source.invalid/test.bin'};
  const ctx=vm.createContext({chrome,crypto:{randomUUID},AbortController,
    RedownDropboxAuth:{create:()=>auth,fail:(message,status='blocked')=>Object.assign(Error(message),{status})},
    RedownDropboxAPI:{create:()=>api,sourceSnapshot:()=>source,sourceURL:u=>new URL(u)},URL
  });
  vm.runInContext(awaitSource,ctx);
  const provider=ctx.RedownDropboxProvider.create({chrome,auth,api,record:async x=>records.push(snapshot(x))});
  return {provider,data,records,get logins(){return logins;},get uploads(){return uploads;}};
}
const awaitSource=await read('dropbox-provider.js');

for(const phase of ['connecting','disconnected','reconnect']){
  test('P0 Dropbox native click reopens OAuth and resumes exact save from '+phase,async()=>{
    const f=fixture(phase);
    await f.provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/test.bin'});
    await f.provider.pump();
    assert.equal(f.logins,1,'OAuth must not silently return');
    assert.equal(f.uploads,1);
    assert.equal(f.records.filter(x=>x.ok===true&&x.verified===true).length,1);
    assert.equal(f.records.at(-1).destination.proofVersion,1);
  });
}
test('P0 Dropbox stale connected projection is not treated as valid credentials',async()=>{
  const f=fixture('connected',true,true);
  await f.provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/test.bin'});
  await f.provider.pump();
  assert.equal(f.logins,1);
  assert.equal(f.uploads,1);
});

test('P0 native Dropbox login can start even if clicked source lacks permission, never uploads',async()=>{
  const f=fixture('disconnected',false);
  await f.provider.dispatch({menuItemId:'provider:dropbox',linkUrl:'https://source.invalid/test.bin'});
  assert.equal(f.logins,1,'OAuth is independent of source-host permission');
  assert.equal(f.uploads,0);
  assert.equal(f.records.some(x=>x.ok===true),false);
});

test('P0 Shelf LOGIN does not remain disabled in a stale connecting state',async()=>{
  const dom=new JSDOM(`<div class="destination-tile">
    <button id="shelf-dropbox"><span id="shelf-dropbox-label"></span></button>
    <a id="shelf-dropbox-open"></a><button id="shelf-dropbox-disconnect"></button>
    <button id="shelf-dropbox-cancel"></button><small id="shelf-dropbox-status"></small>
    </div>`,{url:'https://example.invalid/',runScripts:'outside-only'});
  const sent=[];
  const chrome={storage:{local:{get:async()=>({'dropbox:state':{phase:'connecting'},'dropbox:transfer':{}}),
    onChanged:{addListener:()=>{}}}},runtime:{sendMessage:async msg=>{sent.push(msg.type);return {ok:true};}}};
  dom.window.chrome=chrome;
  dom.window.eval(await read('shelf-dropbox.js'));
  await Promise.resolve();await Promise.resolve();
  const button=dom.window.document.getElementById('shelf-dropbox');
  assert.equal(button.disabled,false);
  button.click();
  await Promise.resolve();await Promise.resolve();
  assert.ok(sent.includes('dropboxConnect'));
  dom.window.close();
});

test('P0 PKCE failure cannot leave Dropbox forever connecting',async()=>{
  const data={};
  const storage={get:async key=>({[key]:data[key]}),set:async patch=>Object.assign(data,patch),remove:async()=>{},
    setAccessLevel:async()=>{}};
  const chrome={runtime:{id:'mkadkgpekmkknfbniacdlmgikihjjepf'},
    identity:{getRedirectURL:()=> 'https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/dropbox'},
    storage:{local:storage,session:storage}};
  const crypto={getRandomValues:a=>webcrypto.getRandomValues(a),subtle:{digest:async()=>{throw Error('test PKCE failure');}}};
  const ctx=vm.createContext({chrome,crypto,TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),Uint8Array});
  vm.runInContext(await read('dropbox-auth.js'),ctx);
  const auth=ctx.RedownDropboxAuth.create({chrome,crypto});
  await assert.rejects(auth.connect());
  assert.equal(data['dropbox:state'].phase,'reconnect');
});

test('P0 Shelf RETRY visibly explains authorization failure in the provider card',async()=>{
  const dom=new JSDOM(`<div class="destination-tile">
    <button id="shelf-dropbox"><span class="destination-action-copy"><span id="shelf-dropbox-label"></span></span></button>
    <a id="shelf-dropbox-open"></a><button id="shelf-dropbox-disconnect"></button>
    <button id="shelf-dropbox-cancel"></button><small id="shelf-dropbox-status"></small>
    </div>`,{url:'https://example.invalid/',runScripts:'outside-only'});
  dom.window.chrome={storage:{local:{get:async()=>({'dropbox:state':{phase:'reconnect',error:'Dropbox root could not be verified.'},'dropbox:transfer':{}}),onChanged:{addListener:()=>{}}}},runtime:{sendMessage:async msg=>({ok:msg.type!=='dropboxConnect',error:'Dropbox root could not be verified.'})}};
  dom.window.eval(await read('shelf-dropbox.js'));
  await Promise.resolve();await Promise.resolve();
  const button=dom.window.document.getElementById('shelf-dropbox');
  const error=dom.window.document.querySelector('.dropbox-inline-login-error');
  assert.equal(button.disabled,false);
  assert.equal(dom.window.document.getElementById('shelf-dropbox-label').textContent,'RETRY');
  assert.equal(error.hidden,false);
  assert.match(error.textContent,/root could not be verified/);
  dom.window.close();
});

test('Neon SUCCESS is bigger and never alters verified-only receipt handling',async()=>{
  const css=await read('shelf.css'),feedback=await read('shelf-save-feedback.js');
  assert.match(css,/clamp\(39px,5\.8vw,55px\)/);
  assert.match(css,/clamp\(44px,6\.2vw,62px\)/);
  assert.match(feedback,/receipt\?\.verified!==true/);
  assert.match(feedback,/money-flash/);
  assert.match(feedback,/word\.slice\(0,i\)/);
});

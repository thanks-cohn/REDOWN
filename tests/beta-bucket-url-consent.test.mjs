import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const [html,api,quick]=await Promise.all([
  readFile('extension/beta/explorer.html','utf8'),
  readFile('extension/public-addresses.js','utf8'),
  readFile('extension/beta/quick-links.js','utf8')
]);
const until=async predicate=>{
  for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}
  assert.ok(predicate(),'bucket URL view did not settle');
};
async function fixture({managed='disabled',deny=false}={}){
  const dom=new JSDOM(html,{url:'https://extension.test/beta/explorer.html',runScripts:'outside-only'});
  const w=dom.window,d=w.document,calls=[];
  let enabled=managed==='enabled';
  w.chrome={
    runtime:{sendMessage:async message=>{
      calls.push(message);
      if(message.type==='cfAccounts')return {ok:true,accounts:[{id:'a',name:'Account'}]};
      if(message.type==='cfBuckets')return {ok:true,buckets:[{name:'photos'}]};
      if(message.type==='cfPublicAddresses')return {
        ok:true,accountId:'a',bucketName:'photos',errors:[],
        managedPublicAccess:managed==='unknown'?'unknown':enabled?'enabled':'disabled',
        addresses:[{kind:'managed',label:'Cloudflare R2',base:'https://pub-abcdef.r2.dev/',state:enabled?'configured':'restricted'}]
      };
      if(message.type==='cfEnablePublicAccess'){
        if(deny)return {ok:false,code:'EXPLORER_PERMISSION_DENIED',error:'Cloudflare denied this change'};
        enabled=true;return {ok:true,accountId:'a',bucketName:'photos'};
      }
      throw Error('Unexpected message '+message.type);
    }},
    storage:{onChanged:{addListener(){}}}
  };
  w.eval(api);w.eval(quick);
  await until(()=>d.getElementById('quick-url-bucket').value==='photos'&&calls.some(m=>m.type==='cfPublicAddresses'));
  await until(()=>d.getElementById('quick-url-feedback').textContent.includes('Only configured'));
  return {dom,d,calls};
}
test('Bucket URLs asks Yes or No only when public managed access is verifiably disabled',async()=>{
  const x=await fixture();try{
    assert.equal(x.d.getElementById('quick-url-consent').hidden,false);
    assert.match(x.d.getElementById('quick-url-consent').textContent,/entire selected bucket/);
    assert.equal(x.calls.filter(m=>m.type==='cfEnablePublicAccess').length,0);
    x.d.getElementById('quick-url-no').click();
    assert.equal(x.d.getElementById('quick-url-consent').hidden,true);
    assert.equal(x.calls.filter(m=>m.type==='cfEnablePublicAccess').length,0);
    assert.match(x.d.getElementById('quick-url-feedback').textContent,/remains private/);
  }finally{x.dom.window.close();}
  const unknown=await fixture({managed:'unknown'});try{
    assert.equal(unknown.d.getElementById('quick-url-consent').hidden,true);
    assert.equal(unknown.calls.filter(m=>m.type==='cfEnablePublicAccess').length,0);
  }finally{unknown.dom.window.close();}
});
test('Bucket URLs Yes explicitly enables once, reads verified configuration and offers a URL',async()=>{
  const x=await fixture();try{
    x.d.getElementById('quick-url-yes').click();
    await until(()=>x.d.getElementById('quick-url-feedback').textContent.includes('verified the public bucket'));
    const writes=x.calls.filter(m=>m.type==='cfEnablePublicAccess');
    assert.equal(writes.length,1);
    assert.deepEqual({accountId:writes[0].accountId,bucketName:writes[0].bucketName,confirmed:writes[0].confirmed},
      {accountId:'a',bucketName:'photos',confirmed:true});
    assert.equal(x.d.getElementById('quick-url-consent').hidden,true);
    assert.match(x.d.getElementById('quick-urls-list').textContent,/pub-abcdef.r2.dev/);
  }finally{x.dom.window.close();}
});
test('Cloudflare denial does not claim public URL success or immediately retry a possibly changed setting',async()=>{
  const x=await fixture({deny:true});try{
    x.d.getElementById('quick-url-yes').click();
    await until(()=>x.d.getElementById('quick-url-feedback').textContent.includes('not confirmed'));
    assert.equal(x.calls.filter(m=>m.type==='cfEnablePublicAccess').length,1);
    assert.equal(x.d.getElementById('quick-url-consent').hidden,true);
    assert.doesNotMatch(x.d.getElementById('quick-url-feedback').textContent,/verified the public bucket/);
  }finally{x.dom.window.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=source('extension/beta/explorer.html');
const css=source('extension/beta/explorer.css');

test('Explorer paints its stored NEON palette before releasing the first visible frame',async()=>{
  assert.match(html,/data-explorer-boot="pending"/);
  assert.match(css,/html\[data-explorer-boot="pending"\] body\{visibility:hidden\}/);
  let resolveStorage,frame,changes,transitions=0;
  const root={dataset:{},removed:null,removeAttribute(name){this.removed={name,theme:this.dataset.explorerTheme}}};
  const document={
    documentElement:root,getElementById:id=>id==='file-workspace'?{}:null,querySelector:()=>null,
    startViewTransition(callback){transitions++;callback();return {finished:Promise.resolve(),skipTransition(){}}}
  };
  const chrome={storage:{local:{get:()=>new Promise(resolve=>{resolveStorage=resolve})},
    onChanged:{addListener(fn){changes=fn}}}};
  vm.runInNewContext(source('extension/explorer-theme.js'),{
    document,chrome,requestAnimationFrame:fn=>{frame=fn}
  });
  assert.equal(root.dataset.explorerTheme,undefined,'do not paint an incorrect fallback palette');
  assert.equal(root.removed,null,'the loading shield remains until preferences resolve');
  resolveStorage({shelfColorScheme:'neon',explorerThemeMode:'match'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(root.dataset.explorerTheme,'neon');
  assert.equal(transitions,0,'initial hydration must not animate');
  frame();
  assert.deepEqual(root.removed,{name:'data-explorer-boot',theme:'neon'});
  changes({shelfColorScheme:{newValue:'ocean'}},'local');
  assert.equal(root.dataset.explorerTheme,'ocean');
  assert.equal(transitions,1,'later explicit changes retain the cinematic transition');
});

test('bucket URL cards are standalone prefixes and selected files use exact Legacy Get URL links',async()=>{
  assert.match(css,/\.quick-urls-section\{\s*margin-top:8px;border:0/);
  const dom=new JSDOM(html,{url:'https://extension.test/beta/explorer.html',runScripts:'outside-only'});
  const w=dom.window;
  const sourceContext={accountId:'account',bucketName:'redown'};
  const address={kind:'worker',label:'REDOWN domain',base:'https://files.example.com/assets/',state:'configured'};
  const snapshot={...sourceContext,addresses:[address]};
  const calls=[];
  w.chrome={
    runtime:{async sendMessage(message){
      calls.push(message.type);
      if(message.type==='cfAccounts')return{ok:true,accounts:[{id:'account',name:'A'}]};
      if(message.type==='cfBuckets')return{ok:true,buckets:[{name:'redown'}]};
      if(message.type==='cfPublicAddresses')return{ok:true,...snapshot};
      throw Error('Unexpected request '+message.type);
    }},
    storage:{onChanged:{addListener(){}}}
  };
  w.eval(source('extension/public-addresses.js'));
  w.eval(source('extension/beta/quick-links.js'));
  await new Promise(resolve=>setTimeout(resolve,20));
  const list=w.document.getElementById('quick-urls-list');
  assert.equal(list.querySelector('code')?.textContent,'https://files.example.com/assets/');
  assert.match(w.document.getElementById('quick-url-context').textContent,/prefix/i);
  assert.equal(list.querySelector('button')?.textContent,'Copy prefix');
  const callsBefore=calls.length;
  const key='folder/My file #1.png';
  w.document.dispatchEvent(new w.CustomEvent('redown:explorer-url-selection',{
    detail:{source:sourceContext,key}
  }));
  const actual=list.querySelector('code')?.textContent;
  const legacy=w.RedownPublicAddresses.addresses(snapshot,sourceContext,key)[0].url;
  assert.equal(actual,legacy,'URL tab must use the exact Legacy right-click mapping');
  assert.ok(actual.includes('folder/My%20file%20%231.png'));
  assert.equal(list.querySelector('button')?.textContent,'Copy URL');
  assert.equal(calls.length,callsBefore,'selecting a file must not fetch the same bucket URLs again');
  dom.window.close();
});

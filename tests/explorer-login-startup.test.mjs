import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('extension/beta/explorer.html');
const explorer=read('extension/beta/explorer.mjs');
const css=read('extension/beta/explorer.css');
const accountStart=explorer.indexOf('function syncAccountPicker()');
const accountEnd=explorer.indexOf("$('account-standby-action').addEventListener",accountStart);
assert.ok(accountStart>=0&&accountEnd>accountStart);
const accountCode=explorer.slice(accountStart,accountEnd);
function fixture(authenticated=false){
  const dom=new JSDOM(html,{url:'https://extension.test/beta/explorer.html'});
  const d=dom.window.document;
  let syncs=0;
  const context={RedownAccountPicker:{sync(){syncs++}}};
  const paint=new Function('$','globalThis','busy','cloudflareSignedIn',
    accountCode+';return accountVisual;')(id=>d.getElementById(id),context,false,authenticated);
  return {dom,d,paint,get syncs(){return syncs}};
}
test('first DOM frame shows only the centered LOGIN, not the old Cloudflare loading tile',()=>{
  const f=fixture();
  try{
    const shell=f.d.getElementById('account-chooser'),action=f.d.getElementById('account-standby-action');
    assert.equal(shell.dataset.state,'disconnected');
    assert.equal(action.textContent,'LOGIN');
    assert.equal(action.hidden,false);
    assert.equal(action.getAttribute('aria-label'),'Log in to Cloudflare securely');
    assert.equal(f.d.getElementById('account-picker-caption').hidden,true);
    assert.equal(f.d.getElementById('account-picker-trigger').hidden,true);
    assert.equal(f.d.getElementById('session-actions').hidden,true);
    for(const id of ['account-standby','account-standby-heading','account-standby-detail']){
      assert.equal(f.d.getElementById(id),null, 'old loading tile must never be in the DOM');
    }
    assert.match(css,/\.account-chooser:not\(\[data-state="ready"\]\)/);
    assert.doesNotMatch(css,/@keyframes account-signal/);
  }finally{f.dom.window.close();}
});
test('unauthenticated discovery attempts cannot replace LOGIN with an interim tile',()=>{
  const f=fixture(false);
  try{
    for(const state of ['loading','disconnected','unauthorized']){
      f.paint(state);
      assert.equal(f.d.getElementById('account-chooser').dataset.state,state==='loading'?'disconnected':state);
      assert.equal(f.d.getElementById('account-standby-action').textContent,'LOGIN');
      assert.equal(f.d.getElementById('account-standby-action').hidden,false);
      assert.equal(f.d.getElementById('account-picker-caption').hidden,true);
    }
    assert.match(explorer,/if\(!cloudflareSignedIn\)\{\s*accountVisual\('disconnected'\)/);
    assert.match(explorer,/if\(cloudflareSignedIn\)await loadAccounts\(lastLocation\)/);
  }finally{f.dom.window.close();}
});
test('after authentication, the same slot loads and switches to the real account chooser',()=>{
  const f=fixture(true);
  try{
    const action=f.d.getElementById('account-standby-action');
    f.paint('loading');
    assert.equal(f.d.getElementById('session-actions').hidden,false);
    assert.equal(action.textContent,'LOADING…');
    assert.equal(action.disabled,true);
    assert.equal(f.d.getElementById('account-picker-caption').hidden,true);
    const select=f.d.getElementById('accounts');
    const o=f.d.createElement('option');o.value='fixture';o.textContent='Fixture account';select.add(o);
    select.value='fixture';
    f.paint('ready');
    assert.equal(f.d.getElementById('account-chooser').dataset.state,'ready');
    assert.equal(action.hidden,true);
    assert.equal(f.d.getElementById('account-picker-caption').hidden,false);
    assert.equal(f.d.getElementById('session-actions').hidden,false);
    assert.equal(select.disabled,false);
    f.paint('unauthorized');
    assert.equal(f.d.getElementById('account-standby-action').textContent,'LOGIN');
    assert.equal(f.d.getElementById('session-actions').hidden,true,'no LOGIN and LOG OUT together');
    assert.ok(f.syncs>0);
  }finally{f.dom.window.close();}
});

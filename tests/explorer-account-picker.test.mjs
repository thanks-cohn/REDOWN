import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=source('extension/beta/explorer.html');
const css=source('extension/beta/explorer.css');
const script=source('extension/beta/account-picker.js');
function fixture(){
  const dom=new JSDOM(html,{url:'https://extension.test/beta/explorer.html',runScripts:'outside-only',pretendToBeVisual:true});
  const {window:w}=dom,d=w.document,select=d.getElementById('accounts'),shell=d.getElementById('account-chooser');
  select.replaceChildren(...[
    ['a','VeryLongCloudflareMember@example.com\'s Account'],
    ['b','Another Cloudflare Team'],
    ['c','A very long third organizational account']
  ].map(([id,name])=>{const option=d.createElement('option');option.value=id;option.textContent=name;return option;}));
  select.value='a';select.disabled=false;shell.dataset.state='ready';
  w.eval(script);const picker=w.RedownAccountPicker;picker.sync();
  return {dom,w,d,select,shell,picker,trigger:d.getElementById('account-picker-trigger'),menu:d.getElementById('account-picker-menu')};
}

test('Explorer uses a native selector as state, with premium visual trigger rather than browser menu',()=>{
  assert.ok(html.indexOf('src="account-picker.js"')<html.indexOf('src="explorer.mjs"'));
  assert.match(html,/id="account-picker-menu"[^>]*role="listbox"/);
  assert.match(css,/\.account-picker-value\{[^}]*text-overflow:ellipsis;white-space:nowrap/);
  assert.match(css,/\.account-chooser\[data-state="ready"\] #accounts\{[^}]*visibility:hidden/);
  assert.match(script,/native\.dispatchEvent\(new Event\('change'/);
});
test('selected account displays only the name and retains full value for access',()=>{
  const f=fixture();try{
    assert.equal(f.trigger.hidden,false);
    assert.equal(f.trigger.textContent.replace(/\s/g,'').includes('VeryLongCloudflareMember@example.com\'sAccount'),true);
    assert.equal(f.d.getElementById('account-picker-value').textContent,'VeryLongCloudflareMember@example.com\'s Account');
    assert.equal(f.trigger.title,'VeryLongCloudflareMember@example.com\'s Account');
    assert.equal(f.select.value,'a');
    assert.equal(f.select.tabIndex,-1);
    assert.equal(f.select.getAttribute('aria-hidden'),'true');
    assert.equal(f.trigger.getAttribute('aria-haspopup'),'listbox');
  }finally{f.dom.window.close();}
});
test('keyboard and pointer account selection updates the original select exactly once',()=>{
  const f=fixture();try{
    let changes=0;f.select.addEventListener('change',()=>changes++);
    f.trigger.click();
    assert.equal(f.trigger.getAttribute('aria-expanded'),'true');
    assert.equal(f.menu.hidden,false);
    assert.equal(f.menu.querySelectorAll('[role="option"]').length,3);
    assert.equal(f.menu.querySelector('[aria-selected="true"]').textContent.includes('VeryLongCloudflareMember'),true);
    f.menu.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    f.menu.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    assert.equal(f.select.value,'b');
    assert.equal(changes,1);
    assert.equal(f.d.getElementById('account-picker-value').textContent,'Another Cloudflare Team');
    assert.equal(f.menu.hidden,true);
    f.trigger.click();
    f.menu.children[2].click();
    assert.equal(f.select.value,'c');
    assert.equal(changes,2);
  }finally{f.dom.window.close();}
});
test('Escape, outside pointer and disabled state close the dropdown without changing account',()=>{
  const f=fixture();try{
    f.trigger.click();
    f.menu.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(f.menu.hidden,true);
    assert.equal(f.select.value,'a');
    f.trigger.click();f.d.body.dispatchEvent(new f.w.Event('pointerdown',{bubbles:true}));
    assert.equal(f.menu.hidden,true);
    f.trigger.click();f.select.disabled=true;f.picker.sync();
    assert.equal(f.trigger.disabled,true);
    assert.equal(f.menu.hidden,true);
    f.shell.dataset.state='loading';f.picker.sync();
    assert.equal(f.trigger.hidden,true);
  }finally{f.dom.window.close();}
});

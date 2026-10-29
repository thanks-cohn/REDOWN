import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Shelf, Explorer, and toolbar use the same R path and Midnight is red on black',()=>{
  const context=vm.createContext({});
  vm.runInContext(file('extension/brand-icon.js'),context);
  const icon=context.RedownBrandIcon;
  const midnight=icon.colors('midnight','theme');
  assert.equal(midnight.background,'#070609');
  assert.ok(midnight.a.startsWith('#b')||midnight.a.startsWith('#e'));
  assert.match(icon.svg('midnight'),/M31 99V28h35c23/);
  for(const theme of ['porcelain','midnight','ocean','neon']){
    const html=icon.svg(theme);
    assert.match(html,/M62 84h21l22 15/);
    assert.ok(html.includes(icon.colors(theme).a));
  }
  assert.match(file('extension/shelf.html'),/data-redown-icon/);
  assert.match(file('extension/beta/explorer.html'),/data-redown-icon/);
  assert.doesNotMatch(file('extension/beta/explorer.css'),/hue-rotate\(85deg\)/);
  assert.match(file('extension/background.js'),/RedownBrandIcon\.imageData\(toolbarBrandPalette,toolbarBrandBackground/);
});
test('Independent Explorer and Shelf each receive their own shared mark without duplicate SVG paths',()=>{
  const context=vm.createContext({});
  vm.runInContext(file('extension/brand-icon.js'),context);
  const icon=context.RedownBrandIcon;
  for(const [path,theme] of [['extension/shelf.html','midnight'],['extension/beta/explorer.html','neon']]){
    const dom=new JSDOM(file(path));
    try{
      icon.paint(dom.window.document,theme,'theme');
      const svg=dom.window.document.querySelector('[data-redown-icon] svg');
      assert.ok(svg);
      assert.equal(dom.window.document.querySelector('[data-redown-icon]').dataset.brandPalette,theme);
      assert.ok(svg.outerHTML.includes(icon.colors(theme).a));
    }finally{dom.window.close();}
  }
});
test('Local transfer recorder archives every new record but retains 50 for compatibility',async()=>{
  const context=vm.createContext({crypto:{randomUUID:(()=>{let n=0;return()=>String(++n)})()},console});
  vm.runInContext(file('extension/transfer-counter.js'),context);
  const store={data:{},async get(){return {...this.data}},async set(next){Object.assign(this.data,next)}};
  const all=[];
  const recorder=context.RedownTransferCounter.create(store,null,{append:async entry=>{all.push(entry)}});
  for(let i=0;i<65;i++)await recorder.record({ok:true,sourceUrl:'https://fixture.test/'+i,location:'R2: fixtures'});
  assert.equal(all.length,65);
  assert.equal(store.data.transferHistory.length,50);
  assert.equal((await recorder.read()).total,'65');
  assert.equal(new Set(all.map(entry=>entry.id)).size,65);
});
test('History displays only one page at once and exposes older month, numbered-week, day disclosures',async()=>{
  const dom=new JSDOM(file('extension/shelf.html'),{
    url:'https://extension.test/shelf.html#history',runScripts:'outside-only'
  });
  try{
    const w=dom.window,d=w.document,now=new Date();
    const time=days=>{const date=new Date(now);date.setDate(date.getDate()-days);return date.toISOString()};
    const data=Array.from({length:95},(_,i)=>({
      id:String(i),at:time(i),ok:true,filename:'entry'+i+'.png',location:'R2: test'
    }));
    const archive={async importLegacy(){},async page(offset,size){return {items:data.slice(offset,offset+size),total:data.length}}};
    w.RedownHistoryArchive={create:()=>archive};
    w.chrome={storage:{local:{async get(){return{transferHistory:data.slice(0,50)}}},onChanged:{addListener(){}}}};
    w.eval(file('extension/shelf-history.js'));
    await w.RedownShelfHistory.open();
    assert.equal(d.getElementById('history-page-label').textContent,'1 / 3');
    assert.equal(d.querySelectorAll('.history-transfer').length,40);
    assert.equal(d.getElementById('history-pagination').hidden,false);
    const year=d.querySelector('.history-year');
    assert.ok(year.open);
    assert.match(year.querySelector('.history-day summary')?.textContent||'',/Today/);
    assert.ok(year.querySelectorAll('.history-week').length);
    assert.ok([...year.querySelectorAll('.history-day')].every(x=>!x.open));
    const months=[...year.querySelectorAll('.history-month')];
    assert.ok(months.length);
    months[0].querySelector('summary').click();
    assert.equal(months[0].open,true);
    const weeks=[...months[0].querySelectorAll('.history-week')];
    assert.ok(weeks.length>0);
    assert.match(weeks[0].querySelector('summary').textContent,/Week/);
    weeks[0].querySelector('summary').click();
    assert.equal(weeks[0].open,true);
    const day=weeks[0].querySelector('.history-day');
    day.querySelector('summary').click();
    assert.equal(day.open,true);
    assert.ok(day.querySelector('.history-transfer'));
    d.getElementById('history-next').click();
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(d.getElementById('history-page-label').textContent,'2 / 3');
    assert.equal(d.querySelectorAll('.history-transfer').length,40);
  }finally{dom.window.close();}
});

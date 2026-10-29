import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Destinations dock jumps to new Explorer setup instead of Legacy options',()=>{
  const dom=new JSDOM(source('extension/beta/explorer.html'),{
    url:'https://extension.test/beta/explorer.html',runScripts:'outside-only',pretendToBeVisual:true
  });
  try{
    const w=dom.window,d=w.document,panel=d.getElementById('explorer-destinations');
    let scrolled=null,clicked=0;
    assert.ok(panel);
    panel.scrollIntoView=options=>{scrolled=options};
    d.getElementById('quick-tab-setup').addEventListener('click',()=>{clicked++});
    w.eval(source('extension/beta/sidebar-settings.js'));
    d.getElementById('open-destinations').click();
    assert.equal(clicked,1,'existing setup tab receives click');
    assert.equal(scrolled?.behavior,'smooth');
    assert.equal(scrolled?.block,'start');
    assert.equal(d.activeElement.id,'quick-tab-setup');
    const script=source('extension/beta/sidebar-settings.js');
    assert.doesNotMatch(script,/options\.html#right-click-presets/);
    assert.match(script,/querySelector\('\.quick-links-panel'\)/);
  }finally{dom.window.close();}
});

test('History opens year, recent week, month, numbered week, then day; transfers remain hidden until day opens',async()=>{
  const dom=new JSDOM(source('extension/shelf.html'),{
    url:'https://extension.test/shelf.html#history',runScripts:'outside-only',pretendToBeVisual:true
  });
  try{
    const w=dom.window,d=w.document;
    const now=new Date();
    const ago=days=>{const x=new Date(now);x.setDate(x.getDate()-days);return x.toISOString()};
    const entries=[
      {id:'a',at:ago(0),ok:true,filename:'today.png',location:'R2: redown/today.png'},
      {id:'b',at:ago(9),ok:true,filename:'recent.png',location:'R2: redown/recent.png'},
      {id:'c',at:'2022-09-15T18:00:00Z',ok:true,filename:'old.png',location:'R2: redown/old.png'}
    ];
    let listener;
    const archive={async importLegacy(){},async page(offset,limit){
      const items=[...entries].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
      return {items:items.slice(offset,offset+limit),total:items.length};
    }};
    w.RedownHistoryArchive={create:()=>archive};
    w.chrome={storage:{local:{async get(){return {transferHistory:entries}}},onChanged:{addListener(fn){listener=fn}}}};
    w.eval(source('extension/shelf-history.js'));
    await w.RedownShelfHistory.open();
    const timeline=d.getElementById('history-timeline');
    let years=[...timeline.querySelectorAll('.history-year')];
    assert.ok(years.length>=2);
    assert.equal(years[0].open,true);
    assert.equal(years[1].open,false);
    assert.equal(d.querySelector('.history-heading .eyebrow').textContent,'YOUR PERSONAL ARCHIVE');
    assert.equal(d.getElementById('history-pagination').hidden,true);
    const days=[...years[0].querySelectorAll('.history-day')];
    assert.ok(days.length>=1);
    assert.equal(days.every(day=>day.open===false),true);
    assert.equal(d.querySelectorAll('.history-transfer').length,3,'real rows are present inside collapsed day groups');
    const oldYear=years.at(-1);
    oldYear.querySelector('summary').click();
    assert.equal(years[0].open,false);
    assert.equal(oldYear.open,true);
    const month=oldYear.querySelector('.history-month');
    assert.ok(month);
    month.querySelector('summary').click();
    assert.equal(month.open,true);
    const week=month.querySelector('.history-week');
    assert.ok(week);
    assert.match(week.querySelector('summary').textContent,/Week/);
    week.querySelector('summary').click();
    assert.equal(week.open,true);
    const day=week.querySelector('.history-day');
    day.querySelector('summary').click();
    assert.equal(day.open,true);
    assert.match(day.textContent,/old.png/);
    assert.match(source('extension/shelf.css'),/\.history-heading/);
    listener({transferHistory:{newValue:entries}},'local');
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.ok(timeline.querySelector('.history-year'));
  }finally{dom.window.close();}
});

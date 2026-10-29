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

test('Shelf History expands only one year and one month at once',async()=>{
  const dom=new JSDOM(source('extension/shelf.html'),{
    url:'https://extension.test/shelf.html#history',runScripts:'outside-only',pretendToBeVisual:true
  });
  try{
    const w=dom.window,d=w.document;
    const entries=[
      {at:'2026-10-29T18:00:00Z',ok:true,filename:'oct.png',location:'R2: redown/oct.png'},
      {at:'2026-09-15T18:00:00Z',ok:true,filename:'sep.png',location:'R2: redown/sep.png'},
      {at:'2025-12-12T18:00:00Z',ok:false,filename:'old.png',error:'Fixture failed'}
    ];
    let listener;
    w.chrome={storage:{local:{async get(){return {transferHistory:entries}}},onChanged:{addListener(fn){listener=fn}}}};
    w.eval(source('extension/shelf-history.js'));
    await w.RedownShelfHistory.open();
    const timeline=d.getElementById('history-timeline');
    let years=[...timeline.querySelectorAll('.history-year')];
    assert.equal(years.length,2);
    assert.equal(years[0].dataset.group,'2026');
    assert.equal(years[0].open,true);
    assert.equal(years[1].open,false);
    let months=[...years[0].querySelectorAll('.history-month')];
    assert.equal(months.length,2);
    assert.equal(months[0].open,true);
    assert.equal(months[1].open,false);
    months[1].querySelector('summary').click();
    assert.equal(months[0].open,false);
    assert.equal(months[1].open,true);
    years[1].querySelector('summary').click();
    assert.equal(years[0].open,false);
    assert.equal(years[1].open,true);
    years[0].querySelector('summary').click();
    assert.equal(years[0].open,true);
    assert.equal(years[1].open,false);
    assert.equal(months[1].open,true,'open month remembered when returning to year');
    // New retained history re-renders without forgetting the active group.
    listener({transferHistory:{newValue:[...entries]}},'local');
    years=[...timeline.querySelectorAll('.history-year')];
    months=[...years[0].querySelectorAll('.history-month')];
    assert.equal(years[0].open,true);
    assert.equal(months[1].open,true);
    assert.match(years[0].querySelector('summary').textContent,/2 transfers/);
    assert.match(months[1].querySelector('summary').textContent,/1 transfer/);
    assert.match(source('extension/shelf.css'),/interpolate-size:allow-keywords/);
  }finally{dom.window.close();}
});

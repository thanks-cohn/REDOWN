import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const settingsHTML=readFileSync(new URL('../extension/shelf.html',import.meta.url),'utf8');
const explorerHTML=readFileSync(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
const appearanceSource=readFileSync(new URL('../extension/explorer-theme.js',import.meta.url),'utf8');
const explorerCSS=readFileSync(new URL('../extension/beta/explorer.css',import.meta.url),'utf8');
const afterPaint=()=>new Promise(resolve=>setTimeout(resolve,15));

function harness(initial={}){
  const data={...initial},listeners=[];
  const open=(html)=>{
    const dom=new JSDOM(html,{url:'https://redown.test/shelf.html#settings',runScripts:'outside-only'});
    const chrome={storage:{
      local:{
        async get(keys){return Object.fromEntries(keys.map(key=>[key,data[key]]));},
        async set(patch){
          const changes=Object.fromEntries(Object.entries(patch).map(([key,value])=>[
            key,{oldValue:data[key],newValue:value}
          ]));
          Object.assign(data,patch);
          for(const listener of listeners)listener(changes,'local');
        }
      },
      onChanged:{addListener(listener){listeners.push(listener);}}
    }};
    dom.window.chrome=chrome;
    dom.window.eval(appearanceSource);
    return dom;
  };
  return {open,data};
}

test('normal navigation is default for fresh and migrated profiles, retaining glossy SVGs',async()=>{
  const h=harness({explorerThemeMode:'match'}),shelf=h.open(settingsHTML),explorer=h.open(explorerHTML);
  try{
    await afterPaint();
    const control=shelf.window.document.getElementById('explorer-big-navigation-buttons');
    assert.ok(control,'Shelf Settings must expose Big Buttons');
    assert.equal(control.type,'checkbox');
    assert.equal(control.checked,false,'fresh install must not opt into large controls');
    assert.equal(explorer.window.document.documentElement.dataset.explorerNavigationSize,'normal');
    assert.match(explorerCSS,/:root:not\(\[data-explorer-navigation-size="big"\]\) :is\(#back,#forward,#up\)\{/);
    assert.match(explorerCSS,/width:36px;height:36px;min-width:36px;min-height:36px/);
    assert.match(explorerCSS,/:is\(#back,#forward,#up\)\{width:48px;height:48px/);
    for(const id of ['back','forward','up']){
      const nav=explorer.window.document.getElementById(id);
      assert.ok(nav.querySelector('svg.directory-nav-glyph path.directory-nav-glyph-face'));
    }
  }finally{shelf.window.close();explorer.window.close();}
});

test('Big Buttons is opt-in, persists, and synchronizes open Explorers without changing themes',async()=>{
  const h=harness({shelfColorScheme:'ocean'}),shelf=h.open(settingsHTML),explorer=h.open(explorerHTML);
  let reopened=null;
  try{
    await afterPaint();
    const control=shelf.window.document.getElementById('explorer-big-navigation-buttons');
    control.checked=true;
    control.dispatchEvent(new shelf.window.Event('change',{bubbles:true}));
    await afterPaint();
    assert.equal(h.data.explorerBigNavigationButtons,true);
    assert.equal(explorer.window.document.documentElement.dataset.explorerNavigationSize,'big');
    reopened=h.open(explorerHTML);
    await afterPaint();
    assert.equal(reopened.window.document.documentElement.dataset.explorerNavigationSize,'big');
    assert.equal(explorer.window.document.documentElement.dataset.explorerTheme,'ocean');
    control.checked=false;
    control.dispatchEvent(new shelf.window.Event('change',{bubbles:true}));
    await afterPaint();
    assert.equal(h.data.explorerBigNavigationButtons,false);
    assert.equal(explorer.window.document.documentElement.dataset.explorerNavigationSize,'normal');
    assert.equal(reopened.window.document.documentElement.dataset.explorerNavigationSize,'normal');
    assert.equal(explorer.window.document.documentElement.dataset.explorerTheme,'ocean');
  }finally{reopened?.window.close();shelf.window.close();explorer.window.close();}
});

test('only a strict opt-in selects Big, and menu preference never affects unrelated toolbar buttons',async()=>{
  const h=harness({explorerBigNavigationButtons:'true'}),explorer=h.open(explorerHTML);
  try{
    await afterPaint();
    assert.equal(explorer.window.document.documentElement.dataset.explorerNavigationSize,'normal');
    assert.ok(!explorerCSS.includes(':is(#back,#forward,#up,#refresh)'));
    assert.ok(!explorerCSS.includes(':is(#back,#forward,#up,#path)'));
    assert.match(explorerCSS,/#forward svg\.directory-nav-glyph\{transform:rotate\(180deg\)\}/);
    assert.match(explorerCSS,/#up svg\.directory-nav-glyph\{transform:rotate\(90deg\)\}/);
  }finally{explorer.window.close();}
});

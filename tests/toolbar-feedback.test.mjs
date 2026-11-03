import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('function createToolbarFeedback('),source.indexOf('const toolbarFeedback='));
function fixture(overrides={},pause){
  const frames=[],titles=[],delays=[];let loads=0,restores=0;
  const makePixels=size=>{
    const data=new Uint8ClampedArray(size*size*4);
    for(let i=0;i<data.length;i+=4)data.set([100,150,200,255],i);
    return {data,width:size,height:size};
  };
  const saved=Object.fromEntries([16,32,48].map(size=>[size,makePixels(size)]));
  const api={setIcon:async value=>frames.push(value),setTitle:async value=>titles.push(value.title),...overrides};
  const context=vm.createContext({
    Uint8ClampedArray,
    ImageData:class {constructor(data,width,height){Object.assign(this,{data,width,height});}},
    toolbarBrandPalette:'midnight',toolbarBrandBackground:'theme'
  });
  context.redownRestoreToolbarIcon=async()=>{
    restores++;
    await api.setIcon({imageData:saved});
  };
  vm.runInContext(factory,context);
  const feedback=context.createToolbarFeedback(api,async size=>{loads++;return makePixels(size);},
    pause|| (async ms=>delays.push(ms)));
  return {feedback,frames,titles,delays,context,saved,get loads(){return loads;},get restores(){return restores;}};
}
const pixel=(frame,size,x,y)=>[...frame.imageData[size].data.slice((y*size+x)*4,(y*size+x)*4+4)];

test('verified success keeps existing R flash and restores the unmodified palette',async()=>{
  const h=fixture();
  await h.feedback('success');
  assert.equal(h.frames.length,14);
  assert.equal(h.loads,3);
  assert.deepEqual(h.delays,[120,160,120,...Array(10).fill(60)]);
  const first=h.frames[0].imageData[16].data;
  assert.ok(first[1]>first[0]&&first[1]>first[2]);
  assert.equal(h.restores,1);
  assert.deepEqual(pixel(h.frames.at(-1),32,7,25),[100,150,200,255]);
});

test('a failed save cannot paint a laser or alter the native toolbar icon',async()=>{
  const h=fixture();
  await h.feedback('failure');
  assert.equal(h.frames.length,0);
  assert.equal(h.titles.length,0);
  assert.equal(h.restores,0);
  assert.equal(h.loads,0);
});

test('no native toolbar failure laser remains in background code',()=>{
  assert.doesNotMatch(source,/drawToolbarFailureDot|toolbarFailureDotPending|toolbarFailureDotRevision/);
  assert.doesNotMatch(source,/toolbarFeedback\(['"]failure['"]\)/);
  assert.doesNotMatch(source,/chrome\.storage\.onChanged[\s\S]*changes\.redownFailureDot/);
  assert.match(source,/const imageData=globalThis\.RedownBrandIcon\?\.imageData\(toolbarBrandPalette,toolbarBrandBackground\);/);
});

test('failure records remain available to Shelf History without modifying the icon',()=>{
  assert.match(source,/if\(entry\?\.ok===false\)\{/);
  assert.match(source,/chrome\.storage\.local\.set\(\{redownFailureDot:\{pending:true,at:Date\.now\(\)\}\}\)/);
  assert.doesNotMatch(source,/if\(entry\?\.status==='uncertain'\)void toolbarFeedback\('failure'\)/);
});

test('clear restores the native unmodified brand icon',async()=>{
  const h=fixture();
  await h.feedback('clear');
  assert.equal(h.frames.length,1);
  assert.deepEqual(pixel(h.frames.at(-1),32,7,25),[100,150,200,255]);
  assert.equal(h.titles.at(-1),'REDOWN — Your Cloud Companion');
});

test('a newer clear cancels an older success flash and restores the plain icon',async()=>{
  const waiting=[],h=fixture({},()=>new Promise(resolve=>waiting.push(resolve)));
  const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
  const first=h.feedback('success');await settle();assert.equal(h.frames.length,1);
  const second=h.feedback('clear');await settle();
  waiting.shift()();await first;
  await second;
  assert.equal(h.restores,1);
  assert.deepEqual(pixel(h.frames.at(-1),32,7,25),[100,150,200,255]);
});

test('cosmetic API failures never reject transfers',async()=>{
  const h=fixture({setIcon:async()=>{throw Error('unavailable');}});
  await assert.doesNotReject(()=>h.feedback('failure'));
  await assert.doesNotReject(()=>h.feedback('success'));
});

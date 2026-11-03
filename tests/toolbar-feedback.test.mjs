import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const painter=source.slice(source.indexOf('function drawToolbarFailureDot('),source.indexOf('async function paintToolbarBrand('));
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
    toolbarBrandPalette:'midnight',toolbarBrandBackground:'theme',toolbarFailureDotPending:false
  });
  vm.runInContext(painter,context);
  context.redownRestoreToolbarIcon=async()=>{
    restores++;
    await api.setIcon({imageData:context.toolbarFailureDotPending?
      context.drawToolbarFailureDot(saved,{theme:context.toolbarBrandPalette}):saved});
  };
  vm.runInContext(factory,context);
  const feedback=context.createToolbarFeedback(api,async size=>{loads++;return makePixels(size);},
    pause|| (async ms=>delays.push(ms)));
  return {feedback,frames,titles,delays,context,saved,get loads(){return loads;},get restores(){return restores;}};
}
const pixel=(frame,size,x,y)=>[...frame.imageData[size].data.slice((y*size+x)*4,(y*size+x)*4+4)];
test('verified success keeps existing R flash and restores palette',async()=>{
  const h=fixture();
  await h.feedback('success');
  assert.equal(h.frames.length,14);
  assert.equal(h.loads,3);
  assert.deepEqual(h.delays,[120,160,120,...Array(10).fill(60)]);
  const first=h.frames[0].imageData[16].data;
  assert.ok(first[1]>first[0]&&first[1]>first[2]);
  assert.equal(h.restores,1);
  assert.equal(h.frames.at(-1).imageData[16].data[0],100);
});
test('failure pulses exactly twice, finishes steady in lower-left, and does not touch card UI',async()=>{
  const h=fixture();h.context.toolbarFailureDotPending=true;
  await h.feedback('failure');
  assert.equal(h.frames.length,5,'four pulse frames and one stable restoration');
  assert.deepEqual(h.delays,[150,170,150]);
  const bright=pixel(h.frames[0],32,12,25),rest=pixel(h.frames[1],32,12,25);
  assert.ok(bright[0]>rest[0],'first pulse is brighter red');
  assert.ok(bright[0]>bright[1]&&bright[0]>bright[2]);
  assert.ok(pixel(h.frames.at(-1),32,7,25)[0]>100,'red indicator persists');
  assert.match(h.titles.at(-1),/Save failed/,'accessible title stays meaningful');
  assert.deepEqual(pixel(h.frames.at(-1),32,30,2),[100,150,200,255],
    'distant corners retain the regular brand image');
});
test('Neon changes dot to electric blue without changing location or base icon',async()=>{
  const h=fixture();h.context.toolbarBrandPalette='neon';h.context.toolbarFailureDotPending=true;
  await h.feedback('failure');
  const p=pixel(h.frames.at(-1),32,7,25);
  assert.ok(p[2]>p[0]&&p[2]>p[1], 'Neon lamp has electric blue RGB');
  assert.deepEqual(pixel(h.frames.at(-1),16,15,0),[100,150,200,255]);
});
test('an unacknowledged failure survives a later verified success, and clear stops pulses',async()=>{
  const h=fixture();h.context.toolbarFailureDotPending=true;
  await h.feedback('success');
  assert.ok(pixel(h.frames.at(-1),32,7,25)[0]>100);
  h.context.toolbarFailureDotPending=false;
  await h.feedback('clear');
  assert.deepEqual(pixel(h.frames.at(-1),32,7,25),[100,150,200,255]);
  assert.equal(h.titles.at(-1),'REDOWN — Your Cloud Companion');
});
test('a newer signal cancels an older flash without clearing the persistent state',async()=>{
  const waiting=[],h=fixture({},()=>new Promise(resolve=>waiting.push(resolve)));
  const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
  const first=h.feedback('success');await settle();assert.equal(h.frames.length,1);
  h.context.toolbarFailureDotPending=true;
  const second=h.feedback('failure');await settle();
  waiting.shift()();await first;
  await settle();assert.ok(h.frames.length>=2);
  while(waiting.length){waiting.shift()();await settle();}
  await second;
  assert.equal(h.restores,1);
  assert.ok(pixel(h.frames.at(-1),32,7,25)[0]>100);
});
test('cosmetic API failures never reject transfers',async()=>{
  const h=fixture({setIcon:async()=>{throw Error('unavailable');}});
  await assert.doesNotReject(()=>h.feedback('failure'));
  await assert.doesNotReject(()=>h.feedback('success'));
});
test('only definitive failed History receipts raise the lamp; pending/uncertain outcomes remain distinct',()=>{
  assert.match(source,/if\(entry\?\.ok===false\)\{/);
  assert.doesNotMatch(source,/if\(entry\?\.status==='uncertain'\)void toolbarFeedback\('failure'\)/);
});

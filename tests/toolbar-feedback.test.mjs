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
   data.set([100,150,200,128]);
   return {data,width:size,height:size};
 };
 const saved=Object.fromEntries([16,32,48].map(size=>[size,makePixels(size)]));
 const api={setIcon:async value=>frames.push(value),setTitle:async value=>titles.push(value.title),...overrides};
 const context=vm.createContext({
   Uint8ClampedArray,
   ImageData:class {constructor(data,width,height){Object.assign(this,{data,width,height});}},
   toolbarBrandPalette:'midnight',toolbarBrandBackground:'theme',
   redownRestoreToolbarIcon:async()=>{restores++;await api.setIcon({imageData:saved});}
 });
 vm.runInContext(factory,context);
 const feedback=context.createToolbarFeedback(api,async size=>{loads++;return makePixels(size);},
   pause|| (async ms=>delays.push(ms)));
 return {feedback,frames,titles,delays,get loads(){return loads;},get restores(){return restores;}};
}
test('status flashes keep the same R shape, preserve alpha, and restore the theme icon',async()=>{
 const h=fixture();
 for(const state of ['success','failure']){
  h.frames.length=0;h.delays.length=0;
  await h.feedback(state);
  assert.equal(h.frames.length,14);
  assert.equal(h.loads,3,'identical palette reuses icon raster data');
  const pixel=h.frames[0].imageData[16].data;
  if(state==='success')assert.ok(pixel[1]>pixel[0]&&pixel[1]>pixel[2]);
  else assert.ok(pixel[0]>pixel[1]&&pixel[0]>pixel[2]);
  assert.equal(pixel[3],128);
  assert.equal(pixel[7],0);
  assert.deepEqual(Object.keys(h.frames[0].imageData),['16','32','48']);
  assert.ok(h.frames.slice(0,3).every(frame=>Boolean(frame.imageData)));
  let distance=Infinity;
  for(const frame of h.frames.slice(3,-1)){
    const data=frame.imageData[16].data;
    const next=Math.abs(data[0]-100)+Math.abs(data[1]-150)+Math.abs(data[2]-200);
    assert.ok(next<=distance);distance=next;assert.equal(data[3],128);
  }
  assert.equal(distance,0);
  assert.equal(h.frames.at(-1).imageData[16].data[0],100);
  assert.deepEqual(h.delays,[120,160,120,...Array(10).fill(60)]);
  assert.equal(h.titles.at(-1),'REDOWN');
 }
 assert.equal(h.restores,2);
});
test('a newer result cancels the old flash; only the latest restores the theme icon',async()=>{
 const waiting=[],h=fixture({},()=>new Promise(resolve=>waiting.push(resolve)));
 const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
 const first=h.feedback('success');await settle();assert.equal(h.frames.length,1);
 const second=h.feedback('failure');await settle();assert.equal(h.frames.length,2);
 waiting.shift()();await first;assert.equal(h.frames.length,2);
 for(let i=0;i<13;i++){waiting.shift()();await settle();}
 await second;assert.equal(h.frames.length,15);assert.equal(h.restores,1);
 const red=h.frames[1].imageData[16].data;assert.ok(red[0]>red[1]);
});
test('cosmetic action API failures never reject transfers and still attempt theme restoration',async()=>{
 const h=fixture({setIcon:async()=>{throw Error('unavailable');}});
 await assert.doesNotReject(()=>h.feedback('success'));
 assert.equal(h.restores,1);assert.equal(h.titles.at(-1),'REDOWN');
});

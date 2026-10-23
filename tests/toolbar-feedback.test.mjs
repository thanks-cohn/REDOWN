import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const factory=source.slice(source.indexOf('function createToolbarFeedback('),source.indexOf('const toolbarFeedback='));
function fixture(overrides={}){
 const frames=[],titles=[];let loads=0;
 const context=vm.createContext({Uint8ClampedArray,ImageData:class {constructor(data,width,height){Object.assign(this,{data,width,height});}}});
 vm.runInContext(factory,context);
 const feedback=context.createToolbarFeedback({setIcon:async value=>frames.push(value.imageData),setTitle:async value=>titles.push(value.title),...overrides},async size=>{loads++;const data=new Uint8ClampedArray(size*size*4);data.set([100,150,200,128]);return {data,width:size,height:size};},async()=>{});
 return {feedback,frames,titles,get loads(){return loads;}};
}
test('eased toolbar tint preserves alpha and detail sizes, caches artwork and changes green to red',async()=>{
 const h=fixture();await h.feedback('success');assert.equal(h.frames.length,6);assert.equal(h.loads,3);
 const green=h.frames.at(-1)[16].data;
 assert.ok(green[1]>green[0]&&green[1]>green[2]);assert.equal(green[3],128);assert.equal(green[7],0);
 assert.deepEqual(Object.keys(h.frames[0]),['16','32','48']);
 const first=h.frames[0][16].data,last=h.frames[5][16].data;
 assert.ok(first[0]>last[0]);assert.match(h.titles[0],/complete/);
 await h.feedback('failure');assert.equal(h.loads,3);const red=h.frames.at(-1)[16].data;assert.ok(red[0]>red[1]&&red[0]>red[2]);assert.match(h.titles.at(-1),/failed/);
});
test('a newer result cancels old animation frames',async()=>{
 const h=fixture();await Promise.all([h.feedback('success'),h.feedback('failure')]);
 assert.equal(h.frames.length,6);assert.match(h.titles.at(-1),/failed/);
});
test('cosmetic action API failures never reject transfers',async()=>{
 const h=fixture({setIcon:async()=>{throw Error('unavailable');}});
 await assert.doesNotReject(()=>h.feedback('success'));
});

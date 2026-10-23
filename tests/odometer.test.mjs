import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../extension/odometer.js',import.meta.url),'utf8'),c=vm.createContext({setTimeout,clearTimeout});vm.runInContext(source,c);const {plan,create}=c.RedownOdometer;
function clock(){let id=0,time=0;const jobs=new Map();return {setTimer:(fn,delay)=>{jobs.set(++id,{fn,time:time+delay});return id;},clearTimer:id=>jobs.delete(id),tick(){const [id,job]=[...jobs].sort((a,b)=>a[1].time-b[1].time)[0]||[];if(!job)return false;jobs.delete(id);time=job.time;job.fn();return true;}};}
test('large roll-ups stay bounded, increase exactly and slow down across the last three single steps',()=>{
 const frames=plan('12','9007199254740993123');assert.ok(frames.length<=21);let previous=12n;for(const frame of frames){assert.ok(BigInt(frame.value)>previous);previous=BigInt(frame.value);}assert.equal(previous,9007199254740993123n);const tail=frames.slice(-3);assert.equal(BigInt(tail[1].value)-BigInt(tail[0].value),1n);assert.equal(BigInt(tail[2].value)-BigInt(tail[1].value),1n);assert.ok(tail[0].delay<tail[1].delay&&tail[1].delay<tail[2].delay);assert.ok(frames.reduce((sum,f)=>sum+f.delay,0)<2500);
});
test('completion clicks once after landing; restart cancels obsolete completion and callbacks',()=>{
 const timer=clock(),painted=[],settled=[],clicks=[];const r=create({...timer,paint:v=>painted.push(v),settled:v=>settled.push(v),click:()=>clicks.push(1)});r.roll('9','12');timer.tick();const seen=painted.at(-1);r.roll(seen,'20');let ticks=0;while(timer.tick())assert.ok(++ticks<30);assert.equal(painted.at(-1),'20');assert.deepEqual(settled,['20']);assert.equal(clicks.length,1);r.cancel();assert.equal(timer.tick(),false);
});
test('reduced motion, unchanged values and counter resets settle without animation or sound',()=>{
 for(const [from,to,reduced] of [['1','1',false],['20','0',false],['0','100',true]]){const timer=clock(),values=[],clicks=[];const r=create({...timer,paint:v=>values.push(v),settled:()=>{},click:()=>clicks.push(1),reduced:()=>reduced});r.roll(from,to);assert.deepEqual(values,[to]);assert.equal(timer.tick(),false);assert.equal(clicks.length,0);}
});
test('closing during a roll cancels all remaining updates and sound',()=>{
 const timer=clock(),values=[],clicks=[];const r=create({...timer,paint:v=>values.push(v),settled:()=>assert.fail('Canceled roll must not settle'),click:()=>clicks.push(1)});r.roll('2','99');timer.tick();r.cancel();const length=values.length;assert.equal(timer.tick(),false);assert.equal(values.length,length);assert.equal(clicks.length,0);
});

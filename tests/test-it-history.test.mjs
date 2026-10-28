import test from 'node:test';
import assert from 'node:assert/strict';
import {questionHistory} from '../extension/beta/test-it-history.mjs';
const state = (index=59) => ({index,records:Array.from({length:60},(_,i)=>({exerciseId:i+1,verdict:i<56?'PASSED':'NOT_TESTED'}))});
for(const [from,to] of [[59,2],[54,25],[29,0]])test(`direct question jump ${from+1} → ${to+1}, full visited set and future gate`,()=>{
 const s=state(from);s.records.forEach(r=>r.verdict='NOT_TESTED');const h=questionHistory(s,60);
 assert.equal(h.entries().length,from+1);assert.equal(h.jump(from+1),false);assert.equal(h.jump(to),true);assert.equal(s.index,to);assert.equal(h.h.origin,from);
});
test('59 Previous actions reach question one without altering results, copies or count; multiple jumps return directly',()=>{
 const s=state(),h=questionHistory(s,60),before=JSON.stringify(s.records);s.objects=[{id:'copy',key:'current/location'}];
 for(let i=58;i>=0;i--)assert.equal(h.jump(i),true);
 assert.equal(h.jump(-1),false);assert.equal(s.index,0);assert.equal(h.entries().length,60);
 for(const i of [25,11,45])assert.equal(h.jump(i),true);
 assert.equal(h.h.origin,59);h.jump(h.h.origin);assert.equal(s.index,59);assert.equal(h.h.origin,null);
 assert.equal(JSON.stringify(s.records),before);assert.deepEqual(s.objects,[{id:'copy',key:'current/location'}]);
});
test('verified retries replace one authoritative result; counts ignore attempts, canceled work preserves prior pass',()=>{
 const s=state(),h=questionHistory(s,60);h.jump(56);let a=h.begin();assert.equal(h.counts().PASSED,56);
 a.record.observedGuiInteraction={operation:'rename',verified:true};h.finish(57,a.id,'PASSED');assert.equal(h.counts().PASSED,57);
 a=h.begin();h.finish(57,a.id,null,'Cancel');assert.equal(s.records[56].verdict,'PASSED');
 a=h.begin();h.finish(57,a.id,'BLOCKED','Provider rejected');assert.equal(h.counts().PASSED,56);assert.equal(s.records[56].verdict,'BLOCKED');
 a=h.begin();h.finish(57,a.id,'UNCERTAIN');assert.equal(h.counts().PASSED,56);assert.equal(s.records.length,60);
 assert.equal(h.h.attempts[57].length,4);assert.equal(s.records.filter(r=>r.exerciseId===57).length,1);
});
test('old callbacks cannot replace a newer attempt, and active draft/navigation survive JSON reload',()=>{
 const s=state(),h=questionHistory(s,60);h.jump(2);const old=h.begin(),next=h.begin();
 assert.equal(h.finish(3,old.id,'PASSED'),false);next.record.actualApiOperation='rename';h.jump(25);
 const copy=JSON.parse(JSON.stringify(s)),resumed=questionHistory(copy,60);
 assert.equal(copy.index,25);assert.equal(resumed.h.origin,59);assert.equal(resumed.h.highest,59);assert.equal(resumed.h.active[3].id,next.id);
 assert.equal(resumed.finish(3,next.id,'BLOCKED','Rejected'),true);assert.equal(copy.records[2].verdict,'BLOCKED');assert.equal(copy.records[25].verdict,'PASSED');
 const report=JSON.parse(JSON.stringify(copy));assert.equal(report.records[2].actualApiOperation,'rename');assert.equal(report.records[2].verdict,'BLOCKED');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync('extension/'+p,'utf8');
const settle=async()=>{for(let i=0;i<15;i++)await new Promise(r=>setImmediate(r));};
function harness(limit,premium=false){
 const dom=new JSDOM(read('shelf.html'),{url:'https://extension.invalid/#history',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,listeners=[],calls=[];
 const now=new Date(),at=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,1).toISOString();
 const records=Array.from({length:25},(_,i)=>({id:String(i),at,filename:i%3===0?'notes.txt':'photo.png',ok:i%3===1?false:i%3===0?undefined:true,status:i%3===1?'failed':i%3===0?'pending':'completed',verified:i%3===2,sourceUrl:'https://images.example/photo.png?id='+i,pageUrl:'https://example/page',error:i%3===1?'Exact backend diagnostic <unsafe>':undefined,providerKind:'dropbox',destination:{path:'/photo.png'}}));
 records.push({...records[2],id:'old',at:'2024-01-01T00:00:00Z'});
 w.eval(read('history-gallery-policy.js'));
 const policy=w.RedownHistoryGalleryPolicy,resolve=policy.resolveHistoryGalleryPolicy;
 policy.resolveHistoryGalleryPolicy=options=>resolve({freeGalleryEntryLimit:limit,...options});
 w.chrome={storage:{local:{get:async()=>({transferHistory:records,quickGlancePremiumEnabled:premium})},onChanged:{addListener:f=>listeners.push(f)}}};
 w.RedownHistoryQuickGlance={create:()=>({attach:(body,r)=>calls.push(r.id),start(){},dispose(){}})};
 d.querySelector('#history-view').hidden=false;
 w.eval(read('shelf-history.js'));
 return {w,d,dom,records,calls,policy,async open(){await w.RedownShelfHistory.open();},async tier(value){premium=value;listeners[0]({quickGlancePremiumEnabled:{newValue:value}},'local');await settle();}};
}
for(const limit of [0,5,10,20,100,undefined,-1,NaN,Infinity,1.5,'20'])test('Free quota counts mixed records and preserves Classic: '+String(limit),async()=>{
 const h=harness(limit);try{
 await h.open();const expected=Math.min(25,h.policy.resolveHistoryGalleryPolicy().freeGalleryEntryLimit);
 assert.equal(h.d.querySelectorAll('.history-gallery-entry').length,expected);
 assert.equal(h.d.querySelectorAll('.history-transfer').length,26);
 assert.deepEqual(h.calls,h.records.slice(0,expected).map(r=>r.id));
 assert.equal(h.d.querySelectorAll('.history-gallery-entry')[0]?.querySelector('.history-gallery-provider')?.textContent,expected?'Dropbox':undefined);
 const classic=[...h.d.querySelectorAll('.history-transfer')].slice(expected);
 assert.ok(classic.every(r=>!r.classList.contains('history-gallery-entry')));
 }finally{h.dom.window.close();}
});
test('Premium all dates; tier repaint retains expanded date groups and all records',async()=>{
 const h=harness(0,true);try{await h.open();assert.equal(h.d.querySelectorAll('.history-gallery-entry').length,26);
 const before=[...h.d.querySelectorAll('[data-group]')].map(n=>[n.dataset.group,n.open]);
 await h.tier(false);assert.equal(h.d.querySelectorAll('.history-gallery-entry').length,0);
 assert.deepEqual([...h.d.querySelectorAll('[data-group]')].map(n=>[n.dataset.group,n.open]),before);
 await h.tier(true);assert.equal(h.d.querySelectorAll('.history-gallery-entry').length,26);
 }finally{h.dom.window.close();}
});
test('gallery composition, safe recovery link, complete hidden diagnostics and no failed URL drawer',async()=>{
 const h=harness(20);try{await h.open();
 const saved=h.d.querySelector('.history-gallery-entry[data-state=success]');
 assert.deepEqual([...saved.querySelector('.history-transfer-body').children].map(n=>n.className),['history-gallery-header','history-gallery-caption','history-gallery-more','history-url-disclosure']);
 assert.ok(!saved.querySelector('.history-gallery-caption').textContent.includes('Successful'));
 const failed=h.d.querySelector('.history-gallery-failure'),link=failed.querySelector('a'),more=failed.querySelector('.history-gallery-more');
 assert.equal(link.href,h.records[1].sourceUrl);assert.equal(link.rel,'noopener noreferrer');assert.equal(link.target,'_blank');
 assert.equal(failed.querySelector('.history-url-disclosure'),null);assert.equal(failed.querySelectorAll('summary').length,1);
 assert.ok(more.textContent.includes(h.records[1].error));assert.ok(!more.open);
 assert.ok(more.textContent.includes(h.records[1].pageUrl));
 more.open=true;more.dispatchEvent(new h.w.Event('toggle'));assert.ok(link.hidden);more.open=false;more.dispatchEvent(new h.w.Event('toggle'));assert.ok(!link.hidden);
 for(const raw of ['javascript:alert(1)','https://u:p@example.com/a','data:image/png,x']){
 h.records[1].sourceUrl=raw;h.records[1].pageUrl='';await h.tier(true);
 assert.equal(h.d.querySelector('.history-gallery-failure').querySelector('a'),null);
 }
 }finally{h.dom.window.close();}
});
test('policy stable ties, local midnight, rollover and new arrivals',()=>{
 const h=harness();try{
 const {select,resolveHistoryGalleryPolicy}=h.policy,policy=resolveHistoryGalleryPolicy({freeGalleryEntryLimit:1});
 const day=new Date(2026,10,3,12),first={at:new Date(2026,10,3,1).toISOString()},tie={...first},old={at:new Date(2026,10,2,23,59).toISOString()},next={at:new Date(2026,10,4,0).toISOString()};
 assert.deepEqual([...select([first,tie,old,next,{at:'invalid'}],policy,day)],[first]);
 assert.deepEqual([...select([first,tie,next],policy,new Date(2026,10,4,1))],[next]);
 const fresh={at:new Date(2026,10,3,2).toISOString()};assert.deepEqual([...select([first,tie,fresh],policy,day)],[fresh]);
 }finally{h.dom.window.close();}
});

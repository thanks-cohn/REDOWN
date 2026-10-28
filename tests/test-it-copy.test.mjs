import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {installTestIt} from '../extension/beta/test-it.mjs';
import {createFileApi} from '../extension/beta/file-api.mjs';
const html=readFileSync(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(index=21,setup=()=>{}){
 const dom=new JSDOM(html,{pretendToBeVisual:true}),doc=dom.window.document;
 const current={accountId:'a',bucketName:'b',prefix:'source/'},key='source/original.txt';
 const object={etag:'etag',size:5,version:'v1'},sha256='hash';
 const original={identity:JSON.stringify(['a','b',key]),source:current,key,stamp:JSON.stringify(['etag',5,null,'v1']),sha256,object};
 const saved={version:1,id:'session',index,originals:[original],objects:[],destinations:[],locations:{a:current,b:{...current,prefix:'practice/'}},records:[],pending:null};
 let state={current,selected:[{key}],visible:[]},clip=null,pastes=0,persisted=null,storageFail=false;
 const objects=new Map([[key,{object,sha256}]]);let fail=false;
 const adapter={inspect:async({key})=>objects.get(key)||{object:null},stat:async({key})=>({object:objects.get(key)?.object||null}),
 copy:async({entries,destination})=>{if(fail)throw Error('Provider unavailable');const destinationKey=destination.prefix+'original.txt';objects.set(destinationKey,{object:{...object,version:'v2'},sha256});return {completed:1,results:[{sourceKey:entries[0].key,destinationKey,status:'copied',verified:true,destinationVersion:'v2',destinationEtag:'etag',size:5}]};}};
 setup(adapter,objects);const api=createFileApi(adapter);
 const practice=installTestIt({document:doc,api,storage:{get:async()=>({betaExplorerTestIt:saved}),set:async value=>{if(storageFail)throw Error("Storage unavailable");persisted=structuredClone(value);}},getState:()=>state,approve:async()=>true,stopTour(){}});
 await tick();doc.getElementById('test-it').click();
 const explorer=readFileSync(new URL('../extension/beta/explorer.mjs',import.meta.url),'utf8');
 const body=explorer.match(/function guideAction\(action,detail=\{\}\)\{([^\n]+)\}/)[1];
 let invocation={method:'toolbar'};
 const emitBody=new Function('document','CustomEvent','commandInvocation','crypto','chosen','context','action','detail',body);
 const emit=(action,detail)=>emitBody(doc,dom.window.CustomEvent,invocation,crypto,()=>state.selected,()=>state.current,action,detail);
 const command=action=>emit('command',{action,...(action==='paste'?{entries:clip?.entries,source:clip?.source}:{})});
 const copyBody=explorer.match(/^  copy\(\)\{(.*)\},$/m)[1];
 const explorerCopy=new Function('guideAction','context','chosen','status','controls','selected','let busy=false,clipboard=null;'+copyBody+';return clipboard;');
 doc.getElementById('copy').onclick=()=>{clip=explorerCopy((action,detail)=>emit(action,detail),()=>state.current,()=>state.selected,()=>{},()=>{},new Set(state.selected.map(e=>e.key)));};
 doc.getElementById('paste').onclick=()=>{if(clip&&state.current){command('paste');pastes++;}};
 doc.addEventListener('keydown',e=>{if(e.ctrlKey&&['c','v'].includes(e.key)){invocation={method:'keyboard',key:e.key,ctrl:true};try{doc.getElementById(e.key==='c'?'copy':'paste').click();}finally{invocation={method:'toolbar'};}}});
 const keypress=key=>doc.body.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true}));
 const menu=doc.getElementById('context'),button=doc.createElement('button');menu.append(button);button.onclick=()=>doc.getElementById('copy').click();
 const menuCopy=()=>{button.onclick=()=>doc.getElementById('copy').click();invocation={method:'contextmenu'};try{button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,detail:1}));}finally{invocation={method:'toolbar'};}};
 return {dom,doc,practice,saved,get persisted(){return persisted;},set storageFail(v){storageFail=v;},menuCopy,menuPaste:()=>{button.onclick=()=>doc.getElementById('paste').click();invocation={method:'contextmenu'};try{button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,detail:1}));}finally{invocation={method:'toolbar'};}},keypress,api,objects,set fail(v){fail=v;},get clip(){return clip;},get pastes(){return pastes;},set state(s){state=s;},get state(){return state;}};
}
test('context-menu Copy uses scoped approved identities, survives synthetic forwarding and leaves Explorer clipboard usable across navigation',async()=>{
 const f=await fixture();try{
 f.menuCopy();await tick();assert.equal(f.saved.records[21].verdict,'PASSED');assert.ok(f.clip);
 f.doc.querySelector('[data-guide-next]').click();f.state={...f.state,current:{...f.state.current,prefix:'practice/'},selected:[]};
 f.doc.getElementById('paste').click();await tick();assert.equal(f.pastes,1);assert.equal(f.clip.entries[0].key,'source/original.txt');assert.equal(f.saved.records[22].verdict,'NOT_TESTED');
 }finally{f.dom.window.close();}
});
test('same key in another bucket and mixed or wrong selections cannot satisfy source Copy',async()=>{
 for(const change of [s=>({...s,current:{...s.current,bucketName:'other'}}),s=>({...s,selected:[{key:'wrong'}]}),s=>({...s,selected:[...s.selected,{key:'wrong'}]})]){
 const f=await fixture();try{f.state=change(f.state);f.menuCopy();await tick();assert.equal(f.saved.records[21].verdict,'NOT_TESTED');assert.ok(f.clip);}finally{f.dom.window.close();}
 }
});
test('Ctrl+C and Ctrl+V retain keyboard evidence through toolbar forwarding',async()=>{
 const f=await fixture(50);try{f.keypress('c');await tick();assert.equal(f.saved.records[50].verdict,'PASSED');assert.ok(f.clip);f.doc.querySelector('[data-guide-next]').click();f.keypress('v');await tick();assert.equal(f.pastes,1);assert.equal(f.saved.records[51].verdict,'NOT_TESTED');}finally{f.dom.window.close();}
});

test('21–25 progress only after API read-back, preserve original, and preview the same owned copy',async()=>{
 const f=await fixture(20);try{
 await f.practice.observe('select-file');assert.equal(f.saved.records[20].verdict,'PASSED');
 f.doc.querySelector('[data-guide-next]').click();f.menuCopy();await tick();assert.equal(f.saved.records[21].verdict,'PASSED');
 f.doc.querySelector('[data-guide-next]').click();f.state={...f.state,current:{...f.state.current,prefix:'practice/'},selected:[]};f.doc.getElementById('paste').click();
 const result=await f.api.run('copy',{source:f.clip.source,destination:f.state.current,entries:f.clip.entries,conflict:'skip'});
 assert.equal(result.state,'completed');assert.equal(f.saved.records[22].verdict,'PASSED');const copy=f.practice.session.owned(f.state.current,'practice/original.txt');assert.ok(copy);assert.equal(f.saved.records[22].testOwnedObjectIdentities[0],copy.id);assert.ok(f.objects.has('source/original.txt'));
 f.doc.querySelector('[data-guide-next]').click();f.state={...f.state,current:f.clip.source};await f.practice.observe('refresh');assert.equal(f.saved.records[23].verdict,'PASSED');
 f.doc.querySelector('[data-guide-next]').click();f.doc.getElementById('preview-content').innerHTML='<pre>bytes</pre>';
 f.state={...f.state,previewKey:'source/original.txt'};await f.practice.observe('preview-open');assert.equal(f.saved.records[24].verdict,'NOT_TESTED');
 f.state={...f.state,previewKey:copy.key};await f.practice.observe('preview-open');assert.equal(f.saved.records[24].verdict,'PASSED');
 }finally{f.dom.window.close();}
});
test('missing destinations, existing user filenames, and provider failure never pass Paste or establish ownership',async()=>{
 for(const mode of ['missing','duplicate','provider']){const f=await fixture(22);try{
 const destination={...f.state.current,prefix:'practice/'};
 if(mode==='duplicate')f.objects.set('practice/original.txt',{object:{etag:'user',size:9,version:'user'},sha256:'user'});
 if(mode==='provider')f.fail=true;
 const result=await f.api.run('copy',{source:f.state.current,destination:mode==='missing'?null:destination,entries:f.state.selected,conflict:'skip'});
 assert.notEqual(result.state,'completed');assert.notEqual(f.saved.records[22].verdict,'PASSED');assert.equal(f.saved.objects.length,0);assert.ok(f.objects.has('source/original.txt'));
 if(mode==='duplicate')assert.equal(f.objects.get('practice/original.txt').sha256,'user');
 }finally{f.dom.window.close();}}
});

test('ordinary Explorer Copy still fills clipboard with Test It stopped',async()=>{
 const f=await fixture();try{f.doc.querySelector('[data-guide-exit]').click();f.menuCopy();assert.equal(f.clip.operation,'copy');assert.equal(f.clip.entries[0].key,'source/original.txt');assert.equal(f.saved.records[21].verdict,'NOT_TESTED');}finally{f.dom.window.close();}
});

test('context-menu Paste and Ctrl+V complete only after verified API evidence',async()=>{
 for(const keyboard of [false,true]){const f=await fixture(keyboard?50:21);try{
 if(keyboard)f.keypress('c');else f.menuCopy();await tick();f.doc.querySelector('[data-guide-next]').click();
 f.state={...f.state,current:{...f.state.current,prefix:'practice/'},selected:[]};
 if(keyboard)f.keypress('v');else f.menuPaste();await tick();const index=keyboard?51:22;
 assert.equal(f.saved.records[index].verdict,'NOT_TESTED');
 const result=await f.api.run('copy',{source:f.clip.source,destination:f.state.current,entries:f.clip.entries,conflict:'skip'});
 assert.equal(result.state,'completed');assert.equal(f.saved.records[index].verdict,'PASSED');assert.ok(f.saved.objects[0].id);
 }finally{f.dom.window.close();}}
});

for(const mode of ['completed','clipboard','verified','uncertain'])test('Restart Test It UI after '+mode+' starts exercise 1 only after persistence',async()=>{
 const f=await fixture();try{
 f.menuCopy();await tick();const oldId=f.practice.session.state.id;
 if(mode==='verified'||mode==='uncertain'){
  if(mode==='uncertain')f.fail=true;
  await f.api.run('copy',{source:f.state.current,destination:{...f.state.current,prefix:'practice/'},entries:f.state.selected,conflict:'skip'});
 }
 const old=structuredClone(f.practice.session.state),cloud=structuredClone([...f.objects]);
 await f.doc.getElementById('test-it-restart').onclick();await tick();
 assert.notEqual(f.practice.session.state.id,oldId);assert.equal(f.practice.session.state.index,0);assert.equal(f.persisted.betaExplorerTestIt.index,0);
 assert.equal(f.practice.session.state.records.length,60);assert.ok(f.practice.session.state.records.every(r=>r.verdict==='NOT_TESTED'));
 assert.deepEqual(f.persisted.betaExplorerTestItRecovery[0].session,old);assert.deepEqual([...f.objects],cloud);
 assert.ok(f.doc.querySelector('.test-it-card'));assert.equal(f.practice.session.active,true);
 if(mode==='uncertain')assert.match(f.doc.querySelector('.test-it-card').textContent,/We've kept its recovery details/);
 // The reopened guide can observe ordinary progress.
 await f.practice.observe('bucket');
 }finally{f.dom.window.close();}
});
test('Restart UI storage failure does not report success or replace previous session',async()=>{
 const f=await fixture();try{f.menuCopy();await tick();const old=structuredClone(f.practice.session.state);f.storageFail=true;
 await f.doc.getElementById('test-it-restart').onclick();assert.equal(f.practice.session.state.id,old.id);assert.deepEqual(f.practice.session.state.records,old.records);
 assert.equal(f.doc.querySelector('.test-it-card'),null);
 }finally{f.dom.window.close();}
});

test('Export keeps fresh results and recovery evidence in separate JSON files',async()=>{
 const f=await fixture();const create=URL.createObjectURL,revoke=URL.revokeObjectURL,blobs=[],names=[];
 try{
 f.fail=true;await f.api.run('copy',{source:f.state.current,destination:{...f.state.current,prefix:'practice/'},entries:f.state.selected,conflict:'skip'});
 const oldId=f.practice.session.state.id;await f.doc.getElementById('test-it-restart').onclick();await tick();
 URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:test-'+blobs.length;};URL.revokeObjectURL=()=>{};
 f.dom.window.HTMLAnchorElement.prototype.click=function(){names.push(this.download);};
 f.doc.getElementById('test-it-export').click();await tick();
 assert.equal(blobs.length,2);const active=JSON.parse(await blobs[0].text()),archive=JSON.parse(await blobs[1].text());
 assert.equal(active.id,f.practice.session.state.id);assert.ok(!('recovery' in active));assert.ok(active.records.every(r=>r.verdict==='NOT_TESTED'));
 assert.equal(archive.recovery[0].session.id,oldId);assert.equal(archive.recovery[0].session.pending.operation,'copy');assert.match(names[1],/recovery/);
 }finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;f.dom.window.close();}
});

test('Retry reconciles missed verified Paste without another write and never invents keyboard invocation',async()=>{
 for(const keyboard of [false,true]){const f=await fixture(keyboard?51:22);try{
 f.menuCopy();f.doc.getElementById('paste').click();
 const destination={...f.state.current,prefix:'practice/'};const result=await f.api.run('copy',{source:f.state.current,destination,entries:f.state.selected,conflict:'skip'});assert.equal(result.state,'completed');
 const index=keyboard?51:22,record=f.saved.records[index];record.verdict='NOT_TESTED';record.observedGuiInteraction=null;f.doc.querySelector('[data-guide-next]').disabled=true;
 await f.doc.querySelector('[data-guide-retry]').onclick();await tick();
 assert.equal(record.verdict,keyboard?'NOT_TESTED':'PASSED');assert.equal(f.saved.objects.length,1);assert.ok(f.objects.has('source/original.txt'));
 }finally{f.dom.window.close();}}
});

test('Rename Back retains the verified name after failure and recognizes a successful prerequisite retry',async()=>{
 let contract,serial=2,calls=0;
 const f=await fixture(26,(adapter,objects)=>{
   contract={supported:false,exactIdentity:true,noOverwrite:true,verifyDestinationBeforeDelete:true};adapter.practiceMutations={rename:contract};
   adapter.rename=async({entry,newName},options)=>{
     calls++;const before=objects.get(entry.key),expected=options.practice.sources[0];assert.equal(before.object.version,expected.object.version);
     const destinationKey=entry.key.slice(0,entry.key.lastIndexOf('/')+1)+newName;assert.equal(objects.has(destinationKey),false);
     const object={...before.object,version:'v'+ ++serial};objects.set(destinationKey,{object,sha256:before.sha256});objects.delete(entry.key);
     return {completed:1,results:[{sourceKey:entry.key,destinationKey,status:'copied',verified:true,destinationVersion:object.version,destinationEtag:object.etag,size:object.size}]};
   };
 });
 try{
   const source=f.state.current,destination={...source,prefix:'practice/'};
   assert.equal((await f.api.run('copy',{source,destination,entries:f.state.selected,conflict:'skip'})).state,'completed');
   const copy=f.practice.session.state.objects[0];f.state={...f.state,current:destination,selected:[{key:copy.key}]};
   const rename=newName=>f.api.run('rename',{source:destination,entry:f.state.selected[0],newName});
   assert.equal((await rename('renamed.txt')).state,'failed');assert.equal(calls,0);assert.equal(f.practice.session.state.workflow?.rename,undefined);assert.equal(f.saved.records[26].verdict,'BLOCKED');assert.ok(f.objects.has(copy.key));
   f.practice.paintOwnership();assert.match(f.doc.querySelector('[data-guide-text]').textContent,/first rename has not succeeded/);assert.match(f.doc.querySelector('[data-guide-text]').textContent,/Last verified name: practice\/original.txt/);
   contract.supported=true;assert.equal((await rename('renamed.txt')).state,'completed');assert.equal(f.saved.records[25].verdict,'PASSED');assert.notEqual(f.saved.records[26].verdict,'PASSED');assert.equal(f.doc.querySelector('[data-guide-next]').disabled,true);
   f.state={...f.state,selected:[{key:'practice/renamed.txt'}]};assert.equal((await rename('original.txt')).state,'completed');assert.equal(f.saved.records[26].verdict,'PASSED');assert.equal(f.doc.querySelector('[data-guide-next]').disabled,false);assert.equal(f.practice.session.owned(destination,copy.key).id,copy.id);assert.ok(f.objects.has('source/original.txt'));
 }finally{f.dom.window.close();}
});

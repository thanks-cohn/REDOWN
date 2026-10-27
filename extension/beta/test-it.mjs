import {createGuide} from './guided-interaction.mjs';
import {createSession,validateMatrix,IMPLEMENTED,WRITES,SCHEMA} from './test-session.mjs';
const STORAGE='betaExplorerTestItV1';
const targets={1:'#test-it',9:'#buckets',10:'#buckets',11:'#buckets',12:'#refresh',13:'#files',14:'#refresh',15:'#crumbs',17:'#filter',18:'#sort',19:'#sort',20:'#sort',21:'#view',22:'#files',23:'#files',24:'#files',25:'#files',26:'#files',27:'#dropzone',28:'#context'};
const ids=a=>a.map(x=>x.key).sort().join('\0');
export async function installTestIt({document:doc,storage,api,snapshot,tour,version='unknown',matrix:provided}){
  const matrix=validateMatrix(provided||await (await fetch(new URL('./test-matrix.json',import.meta.url))).json());
  const model=createSession(matrix,{version}),s=model.session,$=id=>doc.getElementById(id);let enabled=false,paused=false,card=null,pending=null,firstBucket=null,saving=Promise.resolve(),disposed=false,verifying=false;
  // Never persist raw Explorer snapshots, object names, account IDs or request inputs.
  function persist(){const data=model.exportData();saving=saving.catch(()=>{}).then(()=>storage?.set({[STORAGE]:data})).catch(()=>{if(card)card.querySelector('[data-guide-status]').textContent='Progress could not be saved. Export results before closing this tab.';});return saving;}
  try{const saved=(await storage?.get(STORAGE))?.[STORAGE];if(saved?.schema===SCHEMA&&saved.master?.commit===s.master.commit&&saved.records?.length===60&&saved.records.every((r,i)=>r.exercise_id===s.records[i].exercise_id)){
    for(const key of ['session_id','started_at','state','records','index'])s[key]=saved[key];s.index=Math.max(0,Math.min(59,Number(s.index)||0));s.paused=true;
    for(const r of s.records)if(r.status==='UNCERTAIN'){r.evidence.push({kind:'interrupted-document',timing:r.timing});r.timing={action:null,visible:null,verified:null,verification_start:null};r.reason='Interrupted attempt retained; repeat the read-only GUI action to measure this document.';}
  }}catch{/* Storage unavailable: new session remains usable. */}
  function update(){if(!card)return;const r=model.current();card.querySelector('[data-guide-status]').textContent=`${r.status}${r.reason?': '+r.reason:''}${paused?' • Paused. Resume here or exit with X.':''}`;card.querySelector('[data-guide-next]').disabled=paused||!['PASSED','FAILED','BLOCKED'].includes(r.status);}
  function show({card:c,index}){
    card=c;s.index=index;pending=null;const e=matrix.exercises[index],r=model.current();
    c.setAttribute('aria-label','Test It');c.querySelector('[data-guide-progress]').textContent=`Test It · ${e.section} · ${index+1} of 60`;
    if([10,11].includes(index+1)&&!firstBucket&&r.status==='NOT_TESTED'){r.status='BLOCKED';r.reason='First-bucket identity was not verified in this document; return to exercise 9 before comparing buckets.';}
    if(!IMPLEMENTED.includes(index+1)&&r.status==='NOT_TESTED'){r.status='BLOCKED';r.reason='This exercise has no complete evidence verifier in this build. Mutations, fixture scope, media rendering and dependent fixture workflows remain unimplemented.';}
    if(!c.querySelector('[data-test-tools]')){
      const tools=doc.createElement('div');tools.dataset.testTools='';tools.innerHTML='<p>Read-only acceptance subset. Cloud writes are blocked while Test It is open, including Pause. X exits immediately.</p><label>Reason for skipping <input data-test-reason maxlength="300" autocomplete="off"></label><div class="guide-actions"><button type="button" data-test-pause>Pause</button><button type="button" data-test-export>Export Test Results</button></div>';
      c.append(tools);tools.querySelector('[data-test-pause]').onclick=()=>{paused=!paused;s.paused=paused;tools.querySelector('[data-test-pause]').textContent=paused?'Resume':'Pause';pending=null;update();void persist();};tools.querySelector('[data-test-export]').onclick=exportResults;
    }
    c.querySelector('[data-test-reason]').value='';update();void persist();
  }
  const guide=createGuide({document:doc,label:'Test It',canAdvance:()=>!paused&&['PASSED','FAILED','BLOCKED'].includes(model.current().status),steps:matrix.exercises.map((e,i)=>({title:e.title,target:targets[i+1]||'#test-it',text:e.instruction+' Expected: '+e.expected.description,action:'test-evidence'})),onShow:show,beforeAdvance:({skipped})=>{
    if(paused||verifying)return false;const r=model.current();if(skipped){const reason=card.querySelector('[data-test-reason]').value.trim();if(!reason){card.querySelector('[data-guide-status]').textContent='Enter a reason before Skip. No pass will be recorded.';return false;}r.disposition='SKIPPED';r.reason=model.redact.text(reason);if(r.status!=='PASSED')r.status='NOT_TESTED';}else if(!['PASSED','FAILED','BLOCKED'].includes(r.status))return false;
    void persist();return true;
  },onExit:()=>{enabled=false;paused=true;s.paused=true;card=null;pending=null;void persist();},onFinish:()=>{enabled=false;paused=true;s.paused=true;s.finished_at=new Date().toISOString();card=null;void persist();}});
  function exportResults(){const data=model.exportData(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download='REDOWN-'+s.session_id+'-results.json';doc.body.append(a);a.click();a.remove();doc.defaultView.setTimeout(()=>URL.revokeObjectURL(url),1000);void persist();return data;}
  function remember(raw){if(!raw||typeof raw!=='object')return;for(const [k,v]of Object.entries(raw)){if(typeof v==='string'&&/key|name|prefix|account|url|token|secret/i.test(k)){model.redact.remember(v);model.redact.remember(encodeURIComponent(v));}else if(v&&typeof v==='object')remember(v);}}
  const observer={
    guard(operation){if(enabled&&WRITES.has(operation)){const r=model.current();r.evidence.push({kind:'guard',operation,outcome:'BLOCKED',timestamp:new Date().toISOString()});void persist();throw Object.assign(Error('Test It blocks cloud writes in this partial build. Exit with X to use normal Explorer operations.'),{code:'TEST_IT_MUTATION_BLOCKED'});}},
    start({id,operation,input,options}){if(!enabled||paused||(!pending&&!options.testVerification))return null;remember(input);const r=options.testVerification?s.records.find(r=>r.exercise_id===options.testVerification):model.current();if(!r)return null;const context={exercise_id:r.exercise_id,operation_id:id,verification:Boolean(options.testVerification)};r.operations.push({operation_id:id,operation,verification:context.verification,started:model.now(),state:'running'});return context;},
    result(context,result){if(!context)return;const r=s.records.find(r=>r.exercise_id===context.exercise_id),op=r.operations.find(o=>o.operation_id===context.operation_id);if(op){op.state=result.state;op.finished=model.now();op.error=result.error?model.redact.text(result.error):null;op.code=typeof result.code==='string'?model.redact.text(result.code):result.code||null;op.elapsed_ms=op.finished.monotonic_ms-op.started.monotonic_ms;}if(!context.verification&&['failed','uncertain','cancelled'].includes(result.state)){r.status=result.state==='failed'?'FAILED':'UNCERTAIN';r.reason=model.redact.text(result.error);void persist();update();}},
    transport(context,event){model.transport(context,event);void persist();}
  };
  function match(event,before){const n=s.index+1,t=event.target,closest=selector=>t.closest?.(selector);if(n===9||n===10||n===11)return event.type==='click'&&closest('#buckets button');if(n===12||n===14)return event.type==='click'&&closest('#refresh');if(n===13)return event.type==='dblclick'&&closest('.file.folder');if(n===15)return event.type==='click'&&closest('#crumbs button');
    if(n===17)return event.type==='input'&&t.id==='filter';if([18,19,20].includes(n))return event.type==='change'&&t.id==='sort';if(n===21)return event.type==='click'&&t.id==='view';
    if([22,23,24].includes(n))return event.type==='click'&&closest('.file:not(.folder)')&&(n===22?!event.ctrlKey&&!event.metaKey&&!event.shiftKey:n===23?(event.ctrlKey||event.metaKey)&&!event.shiftKey:event.shiftKey&&!event.ctrlKey&&!event.metaKey);
    if(n===25)return !event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.type==='keydown'&&['ArrowDown','ArrowUp'].includes(event.key)&&closest('#files');if(n===26)return event.type==='contextmenu'&&closest('.file');if(n===27)return event.type==='contextmenu'&&closest('#dropzone')&&!closest('.file');if(n===28)return !before.menuHidden&&((event.type==='keydown'&&event.key==='Escape')||(event.type==='click'&&!closest('#context')));return false;
  }
  function capture(event){if(enabled&&event.type==='click'&&event.target.closest?.('#get-url')){event.preventDefault();event.stopImmediatePropagation();const r=model.current();r.evidence.push({kind:'guard',operation:'publicUrls',outcome:'BLOCKED',reason:'Public URL popover can change bucket access outside the file API; unavailable during Test It.'});void persist();return;}if(!enabled||paused||verifying||event.target.closest?.('.guide-card'))return;const before=snapshot();remember(before);if(!match(event,before))return;
    if(model.current().status==='PASSED')return;
    if(!pending){pending={before,events:[],record:model.current(),targetKey:event.target.closest?.('.file')?.dataset.key};}
    pending.events.push({type:event.type,is_trusted:event.isTrusted===true,key:['ArrowDown','ArrowUp','Escape'].includes(event.key)?event.key:null,ctrl:Boolean(event.ctrlKey||event.metaKey),shift:Boolean(event.shiftKey)});
    model.action(pending.events.at(-1));void persist();doc.defaultView.requestAnimationFrame(()=>void check());
  }
  async function check(){if(!pending||!enabled||paused||verifying)return;const p=pending,r=p.record,n=s.index+1,after=snapshot(),before=p.before;remember(after);if(r!==model.current())return;
    r.timing.visible=model.now();let checks=null;
    if(n>=9&&n<=15){
      if(after.listingState!=='ready'||!after.current||!r.operations.some(o=>o.operation==='list'&&o.state==='completed'&&!o.verification))return;
      const bucket=c=>JSON.stringify([c?.accountId,c?.bucketName]),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      const contextCheck=n===9?true:n===10?Boolean(firstBucket)&&bucket(after.current)!==firstBucket:n===11?Boolean(firstBucket)&&bucket(after.current)===firstBucket:[12,14].includes(n)?same(after.current,before.current):n===13?after.current.prefix===p.targetKey:n===15?after.current.prefix!==before.current?.prefix&&Boolean(before.current?.prefix.startsWith(after.current.prefix)):false;
      verifying=true;r.timing.verification_start=model.now();
      try{const fresh=await api.run('list',{source:after.current,cursor:''},{testVerification:r.exercise_id});const now=snapshot();const confirmed=r.requests.some(q=>q.kind==='http'&&q.verification&&q.outcome_confirmed);
        checks={expected_location:contextCheck,fresh_provider_query:confirmed,fresh_list_success:fresh.state==='completed',same_context: same(now.current,after.current),displayed_objects_match:ids(now.items)===ids(fresh.data?.entries||[])};
        if(n===9&&Object.values(checks).every(Boolean))firstBucket=bucket(after.current);
      }catch(error){checks={fresh_query_completed:false};r.reason=model.redact.text(error.message);}finally{verifying=false;}
    }else if(n===17){if(!after.filter)return;checks={filter_applied:after.rows.every(e=>e.displayName.toLocaleLowerCase().includes(after.filter.toLocaleLowerCase())),exact_loaded_matches:ids(after.rows)===ids(after.items.filter(e=>e.displayName.toLocaleLowerCase().includes(after.filter.toLocaleLowerCase()))),loaded_objects_unchanged:ids(before.items)===ids(after.items)};}
    else if([18,19,20].includes(n)){
      if((n===18&&after.sort!=='name')||(n===19&&after.sort!=='name-desc')||(n===20&&!['size','date'].includes(after.sort)))return;
      const expected=after.items.filter(e=>e.displayName.toLocaleLowerCase().includes(after.filter.toLocaleLowerCase())).sort((a,b)=>Number(b.folder)-Number(a.folder)||(after.sort==='size'?Number(b.size||0)-Number(a.size||0):after.sort==='date'?(Date.parse(b.uploaded||b.last_modified)||0)-(Date.parse(a.uploaded||a.last_modified)||0):0)||(after.sort==='name-desc'?-1:1)*a.displayName.localeCompare(b.displayName,undefined,{numeric:true}));checks={correct_sort:after.rows.map(e=>e.key).join('\0')===expected.map(e=>e.key).join('\0'),nonempty_list:expected.length>1};
    }else if(n===21){if(!p.seenGrid&&after.grid)p.seenGrid=true;if(!p.seenGrid||after.grid)return;checks={both_views_observed:true,entries_preserved:ids(before.rows)===ids(after.rows)};}
    else if(n===22)checks={exact_selection:after.selected.length===1&&after.selected[0]===p.targetKey};
    else if(n===23)checks={multiple_selected:after.selected.length>1,target_selected:after.selected.includes(eventKey(p))};
    else if(n===24){const a=before.anchor,b=before.rows.findIndex(e=>e.key===p.targetKey);if(a<0||b<0)return;const expected=before.rows.slice(Math.min(a,b),Math.max(a,b)+1).map(e=>e.key);checks={range_length:expected.length>1,range_selected:expected.every(k=>after.selected.includes(k)),exact_range:after.selected.length===expected.length};}
    else if(n===25){const i=before.rows.findIndex(e=>e.key===before.focusKey),offset=p.events[0].key==='ArrowDown'?1:-1,expected=before.rows[Math.max(0,Math.min(before.rows.length-1,i+offset))]?.key;checks={focus_moved:expected!==before.focusKey&&after.focusKey===expected,selection_followed:after.selected.length===1&&after.selected[0]===expected};}
    else if(n===26)checks={menu_visible:!after.menuHidden,selection_target:after.selected.includes(p.targetKey),actions_present:after.menuActions.length>0};
    else if(n===27)checks={menu_visible:!after.menuHidden,only_location_actions:after.menuActions.every(x=>['paste','mkdir','refresh'].includes(x))};
    else if(n===28)checks={menu_closed:after.menuHidden,no_operation_started:r.operations.length===0};
    if(checks){model.finish(r,checks,n>=9&&n<=15?'fresh_provider_list_and_dom':'independent_dom_snapshot');pending=null;update();void persist();}
  }
  function eventKey(p){return p.targetKey;}
  for(const type of ['click','dblclick','contextmenu','keydown','input','change','drop','pointerup'])doc.addEventListener(type,capture,true);
  function start(event){tour?.guide.stop();$('explorer-menu').hidden=true;$('explorer-menu-button').setAttribute('aria-expanded','false');enabled=true;paused=false;s.paused=false;guide.start(s.index);void persist();
    if(s.index===0&&model.current().status!=='PASSED'){model.action({type:event?.type||'menu-reopen',target:'test-it'});model.current().timing.visible=model.now();model.finish(model.current(),{guide_open:guide.active,real_explorer_present:Boolean($('files'))},'independent_dom_snapshot');update();void persist();}
  }
  $('test-it').addEventListener('click',start);$('export-test-results').addEventListener('click',exportResults);
  $('take-tour').addEventListener('click',()=>guide.stop());
  const pagehide=()=>{if(enabled)guide.stop();};doc.defaultView.addEventListener('pagehide',pagehide);
  return {observer,start,guide,model,exportResults,visible:()=>{if(pending)doc.defaultView.requestAnimationFrame(()=>void check());},destroy(){disposed=true;guide.stop();for(const type of ['click','dblclick','contextmenu','keydown','input','change','drop','pointerup'])doc.removeEventListener(type,capture,true);$('test-it').removeEventListener('click',start);$('export-test-results').removeEventListener('click',exportResults);doc.defaultView.removeEventListener('pagehide',pagehide);},get disposed(){return disposed;}};
}

import {createPractice,PRACTICE_STORAGE} from './test-practice.mjs';
import {createGuide} from './guided-interaction.mjs';
import {createSession,validateMatrix,IMPLEMENTED,WRITES,SCHEMA} from './test-session.mjs';
const STORAGE='betaExplorerTestItV2';
const ids=a=>a.map(x=>x.key).sort().join('\0');
export async function installTestIt({document:doc,storage,api,snapshot,tour,version='unknown',matrix:provided,navigate=async()=>{}}){
  const matrix=validateMatrix(provided||await (await fetch(new URL('./test-matrix.json',import.meta.url))).json());
  const model=createSession(matrix,{version}),s=model.session,$=id=>doc.getElementById(id);let enabled=false,paused=false,card=null,pending=null,saving=Promise.resolve(),disposed=false,verifying=false,setupInput=null,setupRunning=false,autoTimer=null,consentSource=null;
  // Results exclude private Explorer snapshots. Separate local setup metadata holds the approved account/bucket and generated fixture keys, never credentials.
  function persist(){const data=model.exportData();saving=saving.catch(()=>{}).then(()=>storage?.set({[STORAGE]:data})).catch(()=>{if(card)card.querySelector('[data-guide-status]').textContent='Progress could not be saved. Export results before closing this tab.';});return saving;}
  try{const saved=(await storage?.get(STORAGE))?.[STORAGE];if(saved?.schema===SCHEMA&&saved.master?.version===s.master.version&&saved.records?.length===60&&saved.records.every((r,i)=>r.exercise_id===s.records[i].exercise_id)){
    for(const key of ['session_id','started_at','state','records','index'])s[key]=saved[key];s.index=Math.max(0,Math.min(59,Number(s.index)||0));s.paused=true;
    for(const r of s.records)if(r.status==='UNCERTAIN'){r.evidence.push({kind:'interrupted-document',timing:r.timing});r.timing={action:null,visible:null,verified:null,verification_start:null};r.reason='Interrupted attempt retained; repeat the read-only GUI action to measure this document.';}
  }}catch{/* Storage unavailable: new session remains usable. */}
  const practice=createPractice({api,active:()=>enabled,authorize:async(input,run)=>{setupInput=input;try{return await run();}finally{setupInput=null;}},save:async value=>{s.state.practice_objects=[...(value.previous_attempts||[]).flatMap(attempt=>attempt.objects),...value.objects].map(({id,reference_fixture_id,key,protection,expected_sha256,last_verified_sha256,expected_existence,verified_existence,ancestry,recovery_source,last_confirmed_operation})=>({id,reference_fixture_id,key,protection,expected_sha256,last_verified_sha256,expected_existence,verified_existence,ancestry,recovery_source,last_confirmed_operation}));s.state.practice_namespace=value.root;await storage?.set({[PRACTICE_STORAGE]:structuredClone(value)});void persist();},onEvidence:event=>{s.state.manifest??=[];s.state.manifest.push(event);}});
  try{practice.restore((await storage?.get(PRACTICE_STORAGE))?.[PRACTICE_STORAGE],s.session_id);}catch{}s.state.practice_ready=false;
  function target(index){const n=index+1,scope=practice.scope;
    if(!practice.ready)return '#test-it';
    if(n===1)return '#buckets button[data-bucket='+JSON.stringify(scope.source.bucketName)+']';
    if(n===2||n===4)return '#files .file[data-key='+JSON.stringify(scope.working)+']';
    if(n===6)return '#files .file[data-key='+JSON.stringify(scope.working+'picture-a.png')+']';
    if(n===7)return '#files .file[data-key='+JSON.stringify(scope.working+'notes.txt')+']';
    return matrix.exercises[index].interaction.target;
  }
  async function prepare(){if(setupRunning||paused)return;const current=snapshot().current;if(!consentSource||(practice.scope?.objects.length!==9&&(current?.accountId!==consentSource.accountId||current?.bucketName!==consentSource.bucketName))){guide.refresh();return;}setupRunning=true;const button=card?.querySelector('[data-test-setup]');if(button)button.disabled=true;
    try{if(practice.scope?.objects.length===9){await practice.verify();}else{await practice.setup(consentSource,s.session_id);}
      s.state.approved_scope='Unique consented practice namespace; exercise mutations disabled';s.state.cleanup='Nine practice objects retained, including six protected recovery objects. No automatic cleanup.';s.state.practice_ready=true;
      if(enabled){await navigate({...practice.scope.source,prefix:s.index===0?'':[1,3].includes(s.index)?practice.scope.root:practice.scope.working});guide.refresh();}
    }catch(error){s.state.practice_ready=false;if(card)card.querySelector('[data-guide-status]').textContent='Practice preparation stopped. Your existing files have not been selected for testing. '+model.redact.text(error.message)+' You can retry with a new practice area or exit with X.';}
    finally{setupRunning=false;if(button)button.disabled=false;void persist();}
  }
  function update(){if(!card)return;const r=model.current();card.querySelector('[data-guide-status]').textContent=`${r.status==='PASSED'?'Checked':r.status==='NOT_TESTED'?'Ready':r.status==='UNCERTAIN'?'Checking…':r.status==='BLOCKED'?'Unavailable':'Please retry'}${r.reason?': '+r.reason:''}${paused?' • Paused. Resume here or exit with X.':''}`;card.querySelector('[data-guide-next]').disabled=paused||!['PASSED','FAILED','BLOCKED'].includes(r.status);}
  function show({card:c,index}){
    card=c;s.index=index;pending=null;const e=matrix.exercises[index],r=model.current();
    c.setAttribute('aria-label','Test It');c.querySelector('[data-guide-progress]').textContent=`Test It · ${e.section} · ${index+1} of 60`;
    if(IMPLEMENTED.includes(index+1)&&r.status==='BLOCKED'&&e.prerequisites.every(id=>s.records.find(r=>r.exercise_id===id)?.status==='PASSED')){r.evidence.push({kind:'prerequisites-now-satisfied',previous_status:r.status,previous_reason:r.reason});r.status='NOT_TESTED';r.reason=null;}
    if(!IMPLEMENTED.includes(index+1)&&r.status==='NOT_TESTED'){r.status='BLOCKED';r.reason='This activity is not ready in this version. You can skip it or exit safely.';}
    if(index>0&&matrix.exercises[index].prerequisites.some(id=>s.records.find(r=>r.exercise_id===id)?.status!=='PASSED')){r.status='BLOCKED';r.reason='Complete the earlier activity first, or skip this one safely.';}
    if(!c.querySelector('[data-test-tools]')){
      const tools=doc.createElement('div');tools.dataset.testTools='';tools.innerHTML='<div data-test-intro><p>REDOWN will create a safe practice area so you can try moving, copying, renaming, and deleting files without risking your own files.</p><p>This version prepares verified practice copies and guides navigation and viewing. File-changing exercises remain unavailable.</p></div><p data-test-location></p><button type="button" data-test-setup>Create practice area in this bucket</button><label>Reason for skipping <input data-test-reason maxlength="300" autocomplete="off"></label><div class="guide-actions"><button type="button" data-test-pause>Pause</button><button type="button" data-test-export>Export Test Results</button></div>';
      c.append(tools);tools.querySelector('[data-test-setup]').onclick=prepare;tools.querySelector('[data-test-pause]').onclick=()=>{paused=!paused;s.paused=paused;tools.querySelector('[data-test-pause]').textContent=paused?'Resume':'Pause';pending=null;update();void persist();};tools.querySelector('[data-test-export]').onclick=exportResults;
    }
    c.querySelector('[data-test-reason]').value='';c.querySelector('[data-test-intro]').hidden=practice.ready;const setup=c.querySelector('[data-test-setup]');setup.hidden=practice.ready;setup.disabled=setupRunning;setup.textContent=practice.scope?.objects.length===9?'Recheck saved practice area':'Create practice area in this bucket';const current=practice.scope?.objects.length===9?practice.scope.source:snapshot().current;consentSource=current?{...current}:null;c.querySelector('[data-test-location]').textContent=practice.ready?'Practice copies checked. Follow the highlighted control.':current?`Selected account: ${current.accountName||current.accountId}. Bucket: ${current.bucketName}. Only a new practice area will be created.`:'Choose an account and bucket in Explorer, then return here.';update();void persist();
  }
  const guide=createGuide({document:doc,label:'Test It',canAdvance:()=>!paused&&['PASSED','FAILED','BLOCKED'].includes(model.current().status),steps:matrix.exercises.map((e,i)=>({title:e.title,target:()=>target(i),text:e.instruction,action:'test-evidence'})),onShow:show,beforeAdvance:({skipped})=>{
    if(paused||verifying||setupRunning)return false;const r=model.current();if(skipped){const reason=card.querySelector('[data-test-reason]').value.trim();if(!reason){card.querySelector('[data-guide-status]').textContent='Please enter a short reason before skipping.';return false;}r.disposition='SKIPPED';r.reason=model.redact.text(reason);if(r.status!=='PASSED')r.status='NOT_TESTED';}else if(!['PASSED','FAILED','BLOCKED'].includes(r.status))return false;
    void persist();return true;
  },onExit:()=>{detach();clearTimeout(autoTimer);enabled=false;paused=true;s.paused=true;card=null;pending=null;void persist();},onFinish:()=>{detach();clearTimeout(autoTimer);enabled=false;paused=true;s.paused=true;s.finished_at=new Date().toISOString();card=null;void persist();}});
  function exportResults(){const data=model.exportData(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download='REDOWN-'+s.session_id+'-results.json';doc.body.append(a);a.click();a.remove();doc.defaultView.setTimeout(()=>URL.revokeObjectURL(url),1000);void persist();return data;}
  function remember(raw){if(!raw||typeof raw!=='object')return;for(const [k,v]of Object.entries(raw)){if(typeof v==='string'&&/key|name|prefix|account|url|token|secret/i.test(k)){model.redact.remember(v);model.redact.remember(encodeURIComponent(v));}else if(v&&typeof v==='object')remember(v);}}
  const observer={
    guard(operation,input){if((enabled||setupRunning)&&WRITES.has(operation)&&!(setupRunning&&operation==='upload'&&input===setupInput)){const r=model.current();r.evidence.push({kind:'guard',operation,outcome:'BLOCKED',timestamp:new Date().toISOString()});void persist();throw Object.assign(Error('Test It blocks cloud writes during these activities. Exit with X to use normal Explorer operations.'),{code:'TEST_IT_MUTATION_BLOCKED'});}},
    start({id,operation,input,options}){if(setupRunning){remember(input);s.state.setup_operations??=[];s.state.setup_operations.push({operation_id:id,operation,started:model.now(),state:'running'});return {setup:true,operation_id:id};}if((!enabled&&!setupRunning)||paused||(!pending&&!options.testVerification&&!setupRunning))return null;remember(input);const r=options.testVerification?s.records.find(r=>r.exercise_id===options.testVerification):model.current();if(!r)return null;const context={exercise_id:r.exercise_id,operation_id:id,verification:Boolean(options.testVerification)};r.operations.push({operation_id:id,operation,verification:context.verification,started:model.now(),state:'running'});return context;},
    result(context,result){if(!context)return;if(context.setup){const op=s.state.setup_operations?.find(o=>o.operation_id===context.operation_id);if(op){op.state=result.state;op.finished=model.now();op.elapsed_ms=op.finished.monotonic_ms-op.started.monotonic_ms;op.error=result.error?model.redact.text(result.error):null;}void persist();return;}const r=s.records.find(r=>r.exercise_id===context.exercise_id),op=r.operations.find(o=>o.operation_id===context.operation_id);if(op){op.state=result.state;op.finished=model.now();op.error=result.error?model.redact.text(result.error):null;op.code=typeof result.code==='string'?model.redact.text(result.code):result.code||null;op.elapsed_ms=op.finished.monotonic_ms-op.started.monotonic_ms;}if(!setupRunning&&!context.verification&&['failed','uncertain','cancelled'].includes(result.state)){r.status=result.state==='failed'?'FAILED':'UNCERTAIN';r.reason=model.redact.text(result.error);r.error_and_cancellation={state:result.state,error:r.reason,code:result.code||null};void persist();update();}},
    transport(context,event){if(context?.setup){s.state.setup_requests??=[];s.state.setup_requests.push({operation_id:context.operation_id,kind:event.kind,request_id:event.request_id,monotonic_ms:event.monotonic_ms,utc:event.utc,http_status:event.http_status??null,response_redacted:model.redact.response(event.response),error:event.error?model.redact.text(event.error):null});}else model.transport(context,event);void persist();}
  };
  function match(event,before){const n=s.index+1,t=event.target,closest=selector=>t.closest?.(selector),scope=practice.scope;
    if(!practice.ready)return false;
    if(n===1)return event.type==='click'&&closest('#buckets button')?.dataset.bucket===scope.source.bucketName;
    if(n===2||n===4)return event.type==='dblclick'&&closest('.file.folder')?.dataset.key===scope.working;
    if(n===3)return event.type==='click'&&closest('#crumbs button');
    if(n===5)return event.type==='click'&&closest('#refresh');
    if(n===6||n===7)return event.type==='click'&&closest('.file')?.dataset.key===scope.working+(n===6?'picture-a.png':'notes.txt')&&!event.ctrlKey&&!event.shiftKey&&!event.metaKey;
    if(n===8||n===9)return event.type==='click'&&closest('.file:not(.folder)')&&(n===8?(event.ctrlKey||event.metaKey)&&!event.shiftKey:event.shiftKey&&!event.ctrlKey&&!event.metaKey);
    if(n===10)return event.type==='input'&&t.id==='filter';
    if(n===11)return event.type==='change'&&t.id==='sort';
    if(n===12||n===13)return event.type==='click'&&closest('#view');
    return false;
  }
  function capture(event){if(enabled&&event.type==='click'&&event.target.closest?.('#get-url')){event.preventDefault();event.stopImmediatePropagation();const r=model.current();r.evidence.push({kind:'guard',operation:'publicUrls',outcome:'BLOCKED',reason:'Public URL popover can change bucket access outside the file API; unavailable during Test It.'});void persist();return;}if(!enabled||paused||verifying||event.target.closest?.('.guide-card'))return;const before=snapshot();remember(before);if(!match(event,before))return;
    if(['PASSED','BLOCKED'].includes(model.current().status))return;
    if(s.index>0){const expected=[2,4].includes(s.index+1)?practice.scope.root:practice.scope.working;if(before.current?.accountId!==practice.scope.source.accountId||before.current?.bucketName!==practice.scope.source.bucketName||before.current?.prefix!==expected)return;}
    if(!pending){pending={before,events:[],record:model.current(),targetKey:event.target.closest?.('.file')?.dataset.key};}
    pending.events.push({type:event.type,is_trusted:event.isTrusted===true,key:['ArrowDown','ArrowUp','Escape'].includes(event.key)?event.key:null,ctrl:Boolean(event.ctrlKey||event.metaKey),shift:Boolean(event.shiftKey)});
    model.action(pending.events.at(-1));void persist();doc.defaultView.requestAnimationFrame(()=>void check());
  }
  async function check(){if(!pending||!enabled||paused||verifying)return;const p=pending,r=p.record,n=s.index+1,after=snapshot(),before=p.before;remember(after);if(r!==model.current())return;
    r.timing.visible=model.now();let checks=null;
    const scope=practice.scope;
    if(n<=5){
      if(after.listingState!=='ready'||!after.current||!r.operations.some(o=>o.operation==='list'&&o.state==='completed'&&!o.verification))return;
      const expectedPrefix=n===1?'':n===3?scope.root:scope.working;
      const contextCheck=after.current.accountId===scope.source.accountId&&after.current.bucketName===scope.source.bucketName&&after.current.prefix===expectedPrefix;
      verifying=true;r.timing.verification_start=model.now();
      try{const fresh=await api.run('list',{source:after.current,cursor:''},{testVerification:r.exercise_id});const now=snapshot();checks={expected_location:contextCheck,fresh_provider_query:r.requests.some(q=>q.kind==='http'&&q.verification&&q.outcome_confirmed),fresh_list_success:fresh.state==='completed',same_context:JSON.stringify(now.current)===JSON.stringify(after.current),displayed_objects_match:ids(now.items)===ids(fresh.data?.entries||[])};}
      catch(error){checks={fresh_query_completed:false};r.reason=model.redact.text(error.message);}finally{verifying=false;}
    }else if(n===6||n===7)checks={exact_selection:after.selected.length===1&&after.selected[0]===p.targetKey,changed:n!==7||!before.selected.includes(p.targetKey)};
    else if(n===8)checks={multiple_selected:after.selected.length>1,target_selected:after.selected.includes(p.targetKey),all_owned:after.selected.every(k=>scope.objects.some(o=>o.key===k&&o.protection==='working'))};
    else if(n===9){const a=before.anchor,b=before.rows.findIndex(e=>e.key===p.targetKey);if(a<0||b<0)return;const expected=before.rows.slice(Math.min(a,b),Math.max(a,b)+1).map(e=>e.key);checks={range_length:expected.length>1,range_selected:expected.every(k=>after.selected.includes(k)),exact_range:after.selected.length===expected.length};}
    else if(n===10){if(after.filter!=='picture-a')return;checks={exact_target:after.rows.length===1&&after.rows[0].key===scope.working+'picture-a.png',loaded_objects_unchanged:ids(before.items)===ids(after.items)};}
    else if(n===11){if(after.sort!=='name'||after.filter)return;const expected=[...after.items].sort((a,b)=>Number(b.folder)-Number(a.folder)||a.displayName.localeCompare(b.displayName,undefined,{numeric:true}));checks={correct_sort:after.rows.map(e=>e.key).join('\0')===expected.map(e=>e.key).join('\0'),nonempty_list:expected.length>1};}
    else if(n===12||n===13)checks={requested_view:after.grid===(n===12),view_changed:after.grid!==before.grid,entries_preserved:ids(before.rows)===ids(after.rows)};
    if(checks){model.finish(r,checks,n<=5?'fresh_provider_list_and_dom':'independent_dom_snapshot');pending=null;r.backup_verification={verified_at:scope.verified_at,verified_objects:scope.objects.length,mutations_enabled:false};update();void persist();if(r.status==='PASSED'&&enabled){if(n===1)await navigate({...scope.source,prefix:scope.root});autoTimer=setTimeout(()=>{if(enabled&&!paused&&model.current()===r)card?.querySelector('[data-guide-next]')?.click();},300);}}
  }
  const eventTypes=['click','dblclick','contextmenu','keydown','input','change'];
  function detach(){for(const type of eventTypes)doc.removeEventListener(type,capture,true);}
  function attach(){detach();for(const type of eventTypes)doc.addEventListener(type,capture,true);}
  function start(){guide.stop();tour?.guide.stop();attach();$('explorer-menu').hidden=true;$('explorer-menu-button').setAttribute('aria-expanded','false');enabled=true;paused=false;s.paused=false;guide.start(s.index);void persist();
  }
  $('test-it').addEventListener('click',start);$('export-test-results').addEventListener('click',exportResults);
  const stopForTour=()=>guide.stop();$('take-tour').addEventListener('click',stopForTour);
  const pagehide=()=>{if(enabled)guide.stop();};doc.defaultView.addEventListener('pagehide',pagehide);
  return {observer,start,guide,model,exportResults,visible:()=>{if(pending)doc.defaultView.requestAnimationFrame(()=>void check());},destroy(){disposed=true;guide.stop();detach();$('test-it').removeEventListener('click',start);$('export-test-results').removeEventListener('click',exportResults);doc.defaultView.removeEventListener('pagehide',pagehide);$('take-tour').removeEventListener('click',stopForTour);},get disposed(){return disposed;}};
}

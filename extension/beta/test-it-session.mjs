import {location,name} from './file-api.mjs';
// Session provenance is established only by an absent-before destination, a
// provider copy receipt, and independent metadata + byte read-back.
const writes=new Set(['copy','move','rename','delete','upload','mkdir','remoteIngest','extractArchiveEntry','createBucket','prepareBucket']);
const id=(source,key)=>JSON.stringify([source.accountId,source.bucketName,key]);
const stamp=o=>JSON.stringify([o?.etag,Number(o?.size),o?.uploaded||o?.last_modified||null,o?.version||null]);
const leaf=key=>key.slice(key.lastIndexOf('/')+1);
export function createPracticeSession({api,storage,saved,recovery=[],approve,onEvidence=()=>{},onOwnership=()=>{},captureEvidence=()=>({})}){
  const state=saved||{version:1,id:crypto.randomUUID(),index:0,originals:[],objects:[],destinations:[],records:[],pending:null};
  let recoveryRuns=structuredClone(recovery);
  let progressSave=null;
  let active=false,locked=false,inFlight=0,restarting=false,saveQueue=Promise.resolve();
  function persist(value){const task=saveQueue.catch(()=>{}).then(()=>storage.set(value));saveQueue=task;return task;}
  function snapshot(current,runs=recoveryRuns){return structuredClone({
    betaExplorerTestIt:current,
    betaExplorerTestItRecovery:runs,
    betaExplorerTestItOwnership:{originals:[...runs.flatMap(r=>r.session.originals),...current.originals],objects:[...runs.flatMap(r=>r.session.objects),...current.objects],destinations:[...runs.flatMap(r=>r.session.destinations),...current.destinations]}
  });}
  async function save(){await persist(snapshot(state));}
  // GUI evidence can share one snapshot per turn; journals still call save()
  // synchronously before dispatch and after provider receipts.
  function saveProgress(){return progressSave ||= Promise.resolve().then(()=>{progressSave=null;return save();});}
  function ownershipChanged(){try{onOwnership();}catch{/* Presentation cannot change ownership. */}}
  function emitEvidence(event){try{onEvidence(event);}catch{(state.observationFailures||=[]).push({operation:event.operation,providerVerdict:event.verdict,reason:'Test It observer callback failed.',at:Date.now()});void save().catch(()=>{});}}
  async function read(source,key){const r=await api.run('inspect',{source,key});if(r.state!=='completed')throw Error(r.error||'The file could not be checked.');return r.data;}
  function owned(source,key){return state.objects.find(o=>!o.deleted&&!o.quarantined&&o.sessionId===state.id&&o.identity===id(source,key));}
  function capability(operation){
    const contract=api.practiceMutations?.[operation];
    // Ownership is checked by the session ledger before ordinary Explorer
    // dispatch. Disposable copies use the provider's ordinary guarantees.
    const supported=api.capabilities.includes(operation)&&contract?.supported!==false;
    return {...contract,supported,reason:contract?.reason||'OPERATION_UNAVAILABLE'};
  }
  function involved(p,source,key){return p?.entries?.some(e=>id(p.source,e.key)===id(source,key))||p?.destinations?.some(d=>id(d.source,d.key)===id(source,key));}
  function quarantined(source,key){return (state.quarantinedActions||[]).some(p=>involved(p,source,key));}
  function reserved(source,key){const identity=id(source,key);return recoveryRuns.some(r=>
    r.session.objects.some(o=>o.identity===identity)||
    r.session.pending?.destinations?.some(d=>id(d.source,d.key)===identity)||
    (r.session.quarantinedActions||[]).some(p=>involved(p,source,key)));}
  function originalIdentity(record,seen=new Set()){
    if(record.originalIdentity)return record.originalIdentity;
    if(state.originals.some(o=>o.identity===record.identity))return record.identity;
    if(!record.parentId||seen.has(record.parentId))return null;seen.add(record.parentId);
    const direct=state.originals.find(o=>o.identity===record.parentId);if(direct)return direct.identity;
    const parent=state.objects.find(o=>o.id===record.parentId&&o.parentId!==o.id);return parent?originalIdentity(parent,seen):null;
  }
  async function check(record){const actual=await read(record.source,record.key);if(!actual.object||stamp(actual.object)!==record.stamp||actual.sha256!==record.sha256)throw Error('A tracked file changed. Refresh and check it before continuing.');return actual;}
  async function originals(){for(const o of state.originals)await check(o);}
  async function source(source,key){let record=state.originals.find(o=>o.identity===id(source,key));if(record){await check(record);return record;}const value=await read(source,key);if(!value.object?.etag||!(value.object.uploaded||value.object.last_modified||value.object.version))throw Error('This file does not have enough identity information for safe practice.');if(!await approve('Practice with this file?',source.bucketName+'/'+key+'\nYour original will remain untouched.'))throw Error('Practice source was not approved.');record={identity:id(source,key),source:{...source},key,stamp:stamp(value.object),sha256:value.sha256,object:value.object,approvedAt:Date.now()};state.originals.push(record);await save();ownershipChanged();return record;}
  async function destination(target,source){
    const dest=location(target);
    if((dest.accountId!==source.accountId||dest.bucketName!==source.bucketName)&&!api.crossBucketCopy)throw Error('Cross-bucket copying is not supported by this adapter.');
    const identity=id(dest,dest.prefix);
    if(!state.destinations.some(d=>d.identity===identity)){state.destinations.push({identity,source:dest});await save();}
  }
  async function validate(operation,input){
    if(!['copy','move','rename','delete'].includes(operation))throw Error('Exit Test It before using this operation.');
    if(state.pending){
      try{await reconcile();}catch{
        // Keep the complete evidence, but do not freeze unrelated safe work.
        (state.quarantinedActions||=[]).push({...structuredClone(state.pending),quarantinedAt:Date.now()});state.pending=null;await save();
      }
    }
    const entries=input.entries||[input.entry];if(!entries.length||entries.some(e=>!e||e.folder))throw Error('Practice works with individual files only.');
    await originals();const records=[];
    for(const e of entries){if(quarantined(input.source,e.key))throw Error("REDOWN is still checking this file's last action. Choose another verified copy.");const own=owned(input.source,e.key);if(operation!=='copy'&&reserved(input.source,e.key))throw Error('This copy belongs to an earlier Test It session. Create a fresh copy for this session.');if(operation!=='copy'&&!own)throw Error('Your original is protected. Choose a verified practice copy.');if(own&&operation!=='copy'&&own.sessionId!==state.id)throw Error('This copy belongs to an earlier Test It session. Create a fresh copy for this session.');const record=own||await source(input.source,e.key);await check(record);records.push(record);}
    if(operation!=='copy'&&!capability(operation).supported)throw Object.assign(Error('This provider does not support '+operation+'. No files were changed.'),{diagnostic:capability(operation).reason});
    const target=operation==='rename'?{...input.source,prefix:input.entry.key.slice(0,input.entry.key.lastIndexOf('/')+1)}:input.destination;
    const destinations=[];
    if(operation!=='delete'){
      await destination(target,input.source);if(input.conflict==='replace')throw Error('Replace is unavailable in Test It. Use Skip or Keep Both.');
      for(const e of entries){let key=(target.prefix||'')+(operation==='rename'?input.newName:leaf(e.key));
        if(operation==='copy'&&id(input.source,e.key)===id(target,key)&&input.conflict==='keep'){const n=leaf(e.key),dot=n.lastIndexOf('.');key=(target.prefix||'')+(dot>0?n.slice(0,dot):n)+' (copy)'+(dot>0?n.slice(dot):'');}
        if(quarantined(target,key))throw Error('REDOWN is still checking this destination. Choose another location.');
        if(reserved(target,key))throw Error('This destination belongs to an earlier Test It session. Choose an unused destination; its recovery details are retained.');
        const existing=(await api.run('stat',{source:target,key}));if(existing.state!=='completed')throw Error('The destination could not be checked.');
        if(existing.data.object){const own=owned(target,key);if(!own)throw Error('That destination contains an existing user file. Choose another location.');await check(own);if(input.conflict!=='skip')throw Error('Use Skip for this conflict, or choose an unused destination.');}
        destinations.push({source:{...target},key,absent:!existing.data.object});
      }
    }
    return {records,destinations,entries};
  }
  async function perform(operation,input,options,execute){
    if(!active)return execute();
    if(operation==='download'){
      const correlation=options.testItCorrelation||captureEvidence();const o=owned(input.source,input.entry.key);if(!o)throw Error('Choose a verified practice copy to download.');await check(o);const started=performance.now();let result;try{result=await execute();}catch(error){emitEvidence({operation,correlation,verdict:'BLOCKED',response:{downloadId:error.downloadId,downloadState:error.downloadState||'unobserved'},changes:[{id:o.id}],observed:error.message});throw error;}
      emitEvidence({operation,correlation,verdict:result.downloadState==='complete'?'PASSED':'UNCERTAIN',response:{downloadState:result.downloadState,downloadId:result.downloadId},changes:[{id:o.id}],latencyMs:performance.now()-started,observed:result.downloadState==='complete'?'Chrome reported completion. Local downloaded bytes were not independently hashed.':'Chrome download completion was not observed.'});return result;
    }
    if(!writes.has(operation)){
      const result=await execute();
      if(['list','preview'].includes(operation))emitEvidence({observationOnly:true,operation,response:operation==='list'?{entries:result.entries?.length,cursorPresent:Boolean(result.cursor)}:{type:result.type,size:result.size,truncated:result.truncated}});
      return result;
    }
    if(locked)throw Error('Wait for the current file check.');locked=true;
    if(operation==='mkdir'){
      try{
        const target=location(input.source),folder=target.prefix+name(input.name),folderKey=folder+'/';
        const exact=await api.run('stat',{source:target,key:folder});
        const listing=await api.run('list',{source:{...target,prefix:folderKey}});
        if(exact.state!=='completed'||listing.state!=='completed')throw Error('The new folder destination could not be checked.');
        if(exact.data.object||listing.data.folderExists||listing.data.entries?.length||listing.data.cursor)throw Error('That name already exists. Choose an unused folder name.');
        const journal={id:crypto.randomUUID(),sessionId:state.id,source:target,key:folderKey,status:'pending',at:Date.now()};
        (state.practiceFolders||=[]).push(journal);await save();
        // The adapter must enforce create-only marker semantics as well as the
        // preflight namespace check. No folder or child receives copy ownership.
        options.practice={sessionId:state.id,operation:'mkdir',folderKey};
        try{const result=await execute();if(result.key!==folderKey)throw Error('Folder creation was not confirmed.');journal.status='created';await save();emitEvidence({operation:'mkdir',observationOnly:true,response:{key:folderKey,status:'created'}});return result;}
        catch(error){journal.status='needs-review';await save();throw error;}
      }finally{locked=false;}
    }
    let correlation={};try{correlation=options.testItCorrelation||captureEvidence();}catch{/* Observer failures cannot change provider execution. */}
    const report=event=>emitEvidence({...event,correlation});
    const started=performance.now();let plan,providerResponse,dispatched=false;
    try{
      plan=await validate(operation,input);
      state.pending={operation,source:input.source,entries:plan.entries,records:structuredClone(plan.records),destinations:plan.destinations,correlation,startedAt:Date.now()};await save();dispatched=true;
      // The provider must enforce its declared ownership contract against these
      // exact records, rather than reselecting the latest object by key.
      options.practice={sessionId:state.id,operation,sources:structuredClone(plan.records),destinations:structuredClone(plan.destinations)};
      const response=providerResponse=await execute();
      state.pending.responseReceived=true;
      // Keep only explicit receipt fields. Never export tokens, URLs or raw errors.
      const receipts=(response.results||[]).map(r=>({sourceKey:r.sourceKey,destinationKey:r.destinationKey,status:r.status,verified:r.verified,sourceEtag:r.sourceEtag,sourceVersion:r.sourceVersion,stage:r.stage,code:r.code,httpStatus:r.httpStatus,destinationEtag:r.destinationEtag,destinationVersion:r.destinationVersion,size:r.size}));
      state.pending.receipts=receipts;state.pending.completed=response.completed;state.pending.hasErrors=Boolean(response.errors?.length||response.partialMove);await save();
      if(response.errors?.length||response.partialMove)throw Error('That file did not arrive where expected. We have recorded the problem.');
      state.pending.latencyMs=performance.now()-started;
      await reconcile({targeted:true});return response;
    }catch(error){
      if(dispatched){report({operation,verdict:'UNCERTAIN',response:state.pending?.receipts||null,latencyMs:performance.now()-started,observed:'Remote result needs reconciliation. No destructive retry was made.'});}
      else report({operation,verdict:'BLOCKED',observed:error.message,diagnostic:error.diagnostic||null,latencyMs:performance.now()-started});
      if(dispatched&&state.pending?.receipts?.length){try{const result=await reconcile({targeted:true});if(result.failed)return providerResponse||{completed:0,errors:[{error:'The last action did not change any files.'}]};return {completed:plan.records.length,reconciled:true,results:state.lastVerifiedOperation?.response?.receipts||[]};}catch{/* Preserve pending evidence for read-only recovery. */}}
      throw Object.assign(Error(dispatched?'REDOWN is checking the last file action. You can use another verified copy while this file is checked.':error.message),{uncertain:dispatched});
    }finally{locked=false;}
  }
  async function reconcile({readOnly=false,action,targeted=false}={}){
    if(!action)for(const quarantinedAction of [...(state.quarantinedActions||[])]){
      try{await reconcile({readOnly,action:quarantinedAction,targeted});}catch{/* Keep unresolved objects quarantined; unrelated copies remain usable. */}
    }
    await originals();
    const pending=action||state.pending,updates=[],changes=[];let failed=false;
    if(pending){
      // Older saved sessions persisted receipts only after a provider reply.
      const responseReceived=pending.responseReceived===true||pending.responseReceived===undefined&&Array.isArray(pending.receipts);
      const records=pending.records||pending.entries.map(e=>owned(pending.source,e.key)||state.originals.find(o=>o.identity===id(pending.source,e.key)));
      failed=responseReceived&&pending.receipts?.length===records.length&&pending.receipts.every(r=>r.status==='failed'&&r.stage==='source.read'&&!r.verified);
      if(failed){
        for(const record of records){if(!record)throw Error('The last action needs review.');await check(record);}
        for(const dest of pending.destinations)if((await read(dest.source,dest.key)).object)throw Error('The destination needs checking before this action can be cleared.');
      }
      for(let i=0;!failed&&i<records.length;i++){
        const previous=records[i];if(!previous)throw Error('We could not identify the last file action. Its details are saved for review.');
        const receipt=pending.receipts?.find(r=>r.sourceKey===previous.key),dest=pending.destinations[i];
        if(pending.operation==='delete'){
          // Absence alone cannot prove our DELETE completed, nor exclude a
          // still-running write. Require the terminal provider response.
          if(!responseReceived||pending.hasErrors||pending.completed!==records.length)throw Error('We could not confirm the deletion. This file stays protected while we check.');
          const found=await read(previous.source,previous.key);if(found.object)throw Error('We could not confirm the deletion. This file stays protected while we check.');
          updates.push({previous,deleted:true});changes.push({id:previous.id,deleted:true});continue;
        }
        if(receipt?.status==='conflict'&&responseReceived){await check(previous);changes.push({conflict:true,sourceKey:previous.key});continue;}
        if(!responseReceived||!receipt?.verified||receipt.status!=='copied'||!dest?.absent||receipt.destinationKey!==dest.key||!receipt.destinationVersion)throw Error('We could not confirm the last copy or move. Its files stay protected while we check.');
        const actual=await read(dest.source,dest.key),object=actual.object;
        if(!object||actual.sha256!==previous.sha256||Number(object.size)!==receipt.size||String(object.etag).replaceAll('"','')!==String(receipt.destinationEtag).replaceAll('"','')||object.version&&object.version!==receipt.destinationVersion)throw Error('The destination changed or could not be checked. Its details are saved for review.');
        if(pending.operation==='copy')await check(previous);
        else if((await read(previous.source,previous.key)).object)throw Error('We could not confirm that move. Both locations stay protected while we check.');
        const existing=state.objects.find(o=>!o.deleted&&o.identity===id(dest.source,dest.key));
        const next={id:existing?.id||(pending.operation==='copy'?crypto.randomUUID():previous.id),sessionId:state.id,parentId:previous.id||previous.identity,originalIdentity:originalIdentity(previous),identity:id(dest.source,dest.key),source:dest.source,key:dest.key,stamp:stamp(object),sha256:actual.sha256,object,receipt,deleted:false};
        updates.push({previous,next,deleted:pending.operation!=='copy'});changes.push({id:next.id,key:next.key,source:next.source,from:{source:previous.source,key:previous.key},sha256:next.sha256,parentId:next.parentId});
      }
    }
    // Check unaffected objects too, without rejecting a moved/deleted old key.
    if(!targeted)for(const o of state.objects.filter(o=>!o.deleted&&!quarantined(o.source,o.key)&&!pending?.entries.some(e=>id(pending.source,e.key)===o.identity)))await check(o);
    if(pending&&!readOnly){
      for(const {previous,next,deleted} of updates){const old=state.objects.find(o=>o.identity===previous.identity&&!o.deleted);if(deleted&&old)old.deleted=true;if(next&&!state.objects.some(o=>!o.deleted&&o.identity===next.identity))state.objects.push(next);}
      const event={operation:pending.operation,verdict:failed?'BLOCKED':'PASSED',response:{completed:pending.completed,receipts:pending.receipts||[]},latencyMs:pending.latencyMs,changes,correlation:pending.correlation,observed:failed?'The last action did not change any files. You can try again.':'Terminal provider receipts reconciled with fresh remote metadata and SHA-256; originals unchanged.',reconciled:true};
      (state.reconciliations||=[]).push({pending:structuredClone(pending),event,at:Date.now()});if(!failed)state.lastVerifiedOperation=event;if(action)state.quarantinedActions=state.quarantinedActions.filter(p=>p!==action);else state.pending=null;state.originalVerification={at:Date.now(),originals:state.originals.map(o=>({identity:o.identity,sha256:o.sha256})),copies:state.objects.filter(o=>!o.deleted).map(o=>o.id)};await save();ownershipChanged();emitEvidence(event);
    }
    return {originals:state.originals.length,copies:state.objects.filter(o=>!o.deleted&&!quarantined(o.source,o.key)).length,quarantined:(state.quarantinedActions||[]).length,failed};
  }
  async function run(...args){
    if(restarting&&writes.has(args[0]))throw Error('Wait for Test It to restart.');
    inFlight++;try{return await perform(...args);}finally{inFlight--;}
  }
  async function restart(){
    if(inFlight||restarting)throw Error('Wait for the current file operation before restarting.');
    restarting=true;const wasActive=active;active=false;
    try{
      // Read-only reconciliation must never erase the original pending evidence.
      await saveQueue.catch(()=>{});
      let reconciliation={status:'checked'};
      try{await reconcile({readOnly:true});}catch(error){reconciliation={status:'needs-review',reason:error.message};}
      const archived={session:structuredClone(state),archivedAt:Date.now(),reconciliation};
      const runs=[...recoveryRuns,archived];
      const fresh={version:1,id:crypto.randomUUID(),index:0,originals:[],objects:[],destinations:[],records:[],workflow:null,pending:null};
      // A single storage transaction retains recovery and replaces active results.
      // Do not switch in-memory state until persistence succeeds (including quota checks).
      try{await persist(snapshot(fresh,runs));}catch(error){throw Error('Recovery details could not be saved. Restore browser storage, export your previous results, then try Restart Test It again. '+error.message);}
      recoveryRuns=runs;
      for(const key of Object.keys(state))delete state[key];
      Object.assign(state,fresh);
      return {unfinished:Boolean(archived.session.pending),sessionId:fresh.id};
    }finally{restarting=false;active=wasActive;}
  }
  return {state,get recovery(){return structuredClone(recoveryRuns);},run,restart,capability,quarantined,get busy(){return inFlight>0||restarting;},source,owned,save,saveProgress,reconcile,check,originals,assertOwned(source,entries){if(entries.some(e=>quarantined(source,e.key)||involved(state.pending,source,e.key)))throw Error('REDOWN is still checking the previous action on this copy. Use Retry before cutting or pasting it again.');if(!entries.length||entries.some(e=>e.folder||quarantined(source,e.key)||involved(state.pending,source,e.key)||!owned(source,e.key)||owned(source,e.key).sessionId!==state.id))throw Error('Your original is protected. Select only verified practice copies.');},get active(){return active;},set active(value){active=value;}};
}

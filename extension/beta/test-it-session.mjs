// Session provenance is established only by an absent-before destination, a
// provider copy receipt, and independent metadata + byte read-back.
const writes=new Set(['copy','move','rename','delete','upload','mkdir','remoteIngest','extractArchiveEntry','createBucket','prepareBucket']);
const id=(source,key)=>JSON.stringify([source.accountId,source.bucketName,key]);
const stamp=o=>JSON.stringify([o?.etag,Number(o?.size),o?.uploaded||o?.last_modified||null,o?.version||null]);
const leaf=key=>key.slice(key.lastIndexOf('/')+1);
export function createPracticeSession({api,storage,saved,approve,onEvidence=()=>{},captureEvidence=()=>({}),requireLocations=false}){
  const state=saved||{version:1,id:crypto.randomUUID(),index:0,originals:[],objects:[],destinations:[],records:[],pending:null};
  let setupFolder=null;
  let active=false,locked=false,inFlight=0,restarting=false,saveQueue=Promise.resolve();
  function persist(value){const task=saveQueue.catch(()=>{}).then(()=>storage.set(value));saveQueue=task;return task;}
  async function save(){await persist({betaExplorerTestIt:structuredClone(state),betaExplorerTestItOwnership:structuredClone({originals:state.originals,objects:state.objects,destinations:state.destinations})});}
  function emitEvidence(event){try{onEvidence(event);}catch{(state.observationFailures||=[]).push({operation:event.operation,providerVerdict:event.verdict,reason:'Test It observer callback failed.',at:Date.now()});void save().catch(()=>{});}}
  async function read(source,key){const r=await api.run('inspect',{source,key});if(r.state!=='completed')throw Error(r.error||'The file could not be checked.');return r.data;}
  function owned(source,key){return state.objects.find(o=>!o.deleted&&o.identity===id(source,key));}
  async function check(record){const actual=await read(record.source,record.key);if(!actual.object||stamp(actual.object)!==record.stamp||actual.sha256!==record.sha256)throw Error('A tracked file changed. Refresh and check it before continuing.');return actual;}
  async function originals(){for(const o of state.originals)await check(o);}
  async function source(source,key){let record=state.originals.find(o=>o.identity===id(source,key));if(record){await check(record);return record;}const value=await read(source,key);if(!value.object?.etag||!(value.object.uploaded||value.object.last_modified||value.object.version))throw Error('This file does not have enough identity information for safe practice.');if(!await approve('Practice with this file?',source.bucketName+'/'+key+'\nYour original will remain untouched.'))throw Error('Practice source was not approved.');record={identity:id(source,key),source:{...source},key,stamp:stamp(value.object),sha256:value.sha256,object:value.object,approvedAt:Date.now()};state.originals.push(record);await save();return record;}
  async function destination(target){if(state.locations&&!Object.values(state.locations).some(l=>id(l,l.prefix||'')===id(target,target.prefix||'')))throw Error('Choose approved Location A or Location B. This destination is not approved.');if(!state.originals.length||target.accountId!==state.originals[0].source.accountId||target.bucketName!==state.originals[0].source.bucketName)throw Error('Practice stays in the approved existing bucket.');const identity=id(target,target.prefix||'');if(!state.destinations.some(d=>d.identity===identity)){if(!await approve('Allow practice copies here?',target.bucketName+'/'+(target.prefix||'')+'\nOnly newly created copies may be changed. Existing files will be preserved.'))throw Error('Destination was not approved.');state.destinations.push({identity,source:{...target}});await save();}}
  async function configureLocations(a,b){
    if(!a||!b||id(a,a.prefix||'')===id(b,b.prefix||''))throw Error('Choose two distinct locations. Location B must differ from Location A.');
    if(a.accountId!==b.accountId||a.bucketName!==b.bucketName)throw Error('Cross-bucket practice is not verified by this adapter. Choose a different folder in the same bucket.');
    const result=await api.run('list',{source:b});if(result.state!=='completed')throw Error(result.error||'Location B could not be checked.');
    if(result.data.folderExists===false){
      const p=b.prefix.replace(/\/$/,''),slash=p.lastIndexOf('/'),parent={...b,prefix:p.slice(0,slash+1)},name=p.slice(slash+1);
      if(!name||!await approve('Create this practice folder?',b.bucketName+'/'+b.prefix+'\nOnly this folder marker will be created. No bucket will be created.'))throw Error('Practice folder was not approved.');
      setupFolder={source:parent,name};try{const made=await api.run('mkdir',setupFolder);if(made.state!=='completed')throw Error(made.error||'Folder creation was not confirmed.');}finally{setupFolder=null;}
    }
    if(!await approve('Use these two practice locations?','Location A: '+a.bucketName+'/'+(a.prefix||'')+'\nLocation B: '+b.bucketName+'/'+b.prefix+'\nOriginal files remain protected.'))throw Error('Practice locations were not approved.');
    state.locations={a:{...a},b:{...b}};state.destinations=[a,b].map(source=>({identity:id(source,source.prefix||''),source:{...source}}));await save();
  }
  async function validate(operation,input){
    if(!['copy','move','rename','delete'].includes(operation))throw Error('Exit Test It before using this operation.');
    if(requireLocations&&!state.locations)throw Error('Select and approve distinct Location A and Location B before copying.');
    if(state.pending)throw Error('An earlier action needs checking. Use Retry before making more changes.');
    const entries=input.entries||[input.entry];if(!entries.length||entries.some(e=>!e||e.folder))throw Error('Practice works with individual files only.');
    if(operation!=='copy'&&!api.conditionalPracticeMutations)throw Error('This bucket cannot enforce practice-copy ownership during changes yet. Rename, Move and Delete are blocked to protect your files.');
    await originals();const records=[];
    for(const e of entries){const own=owned(input.source,e.key);if(operation!=='copy'&&!own)throw Error('Your original is protected. Choose a verified practice copy.');if(own&&operation!=='copy'&&own.sessionId!==state.id)throw Error('This copy belongs to an earlier Test It session. Create a fresh copy for this session.');const record=own||await source(input.source,e.key);await check(record);records.push(record);}
    const target=operation==='rename'?{...input.source,prefix:input.entry.key.slice(0,input.entry.key.lastIndexOf('/')+1)}:input.destination;
    const destinations=[];
    if(operation!=='delete'){
      await destination(target);if(input.conflict==='replace')throw Error('Replace is unavailable in Test It. Use Skip or Keep Both.');
      for(const e of entries){let key=(target.prefix||'')+(operation==='rename'?input.newName:leaf(e.key));
        if(operation==='copy'&&id(input.source,e.key)===id(target,key)&&input.conflict==='keep'){const n=leaf(e.key),dot=n.lastIndexOf('.');key=(target.prefix||'')+(dot>0?n.slice(0,dot):n)+' (copy)'+(dot>0?n.slice(dot):'');}
        const existing=(await api.run('stat',{source:target,key}));if(existing.state!=='completed')throw Error('The destination could not be checked.');
        if(existing.data.object){const own=owned(target,key);if(!own)throw Error('That destination contains an existing user file. Choose another location.');await check(own);if(input.conflict!=='skip')throw Error('Use Skip for this conflict, or choose an unused destination.');}
        destinations.push({source:{...target},key,absent:!existing.data.object});
      }
    }
    return {records,destinations,entries};
  }
  async function perform(operation,input,options,execute){
    if(!active)return execute();
    if(operation==='mkdir'&&setupFolder&&JSON.stringify(input)===JSON.stringify(setupFolder))return execute();
    if(operation==='download'){
      const o=owned(input.source,input.entry.key);if(!o)throw Error('Choose a verified practice copy to download.');await check(o);const started=performance.now(),result=await execute();
      emitEvidence({operation,verdict:result.downloadState==='complete'?'PASSED':'UNCERTAIN',response:{downloadState:result.downloadState,downloadId:result.downloadId},changes:[{id:o.id}],latencyMs:performance.now()-started,observed:result.downloadState==='complete'?'Chrome reported completion. Local downloaded bytes were not independently hashed.':'Chrome download completion was not observed.'});return result;
    }
    if(!writes.has(operation)){
      const result=await execute();
      if(['list','preview'].includes(operation))emitEvidence({observationOnly:true,operation,response:operation==='list'?{entries:result.entries?.length,cursorPresent:Boolean(result.cursor)}:{type:result.type,size:result.size,truncated:result.truncated}});
      return result;
    }
    if(locked)throw Error('Wait for the current file check.');locked=true;
    let correlation={};try{correlation=captureEvidence();}catch{/* Observer failures cannot change provider execution. */}
    const report=event=>emitEvidence({...event,correlation});
    const started=performance.now();let plan,dispatched=false;
    try{
      plan=await validate(operation,input);
      state.pending={operation,source:input.source,entries:plan.entries,destinations:plan.destinations,startedAt:Date.now()};await save();dispatched=true;
      const response=await execute();
      // Keep only explicit receipt fields. Never export tokens, URLs or raw errors.
      const receipts=(response.results||[]).map(r=>({sourceKey:r.sourceKey,destinationKey:r.destinationKey,status:r.status,verified:r.verified,sourceEtag:r.sourceEtag,sourceVersion:r.sourceVersion,destinationEtag:r.destinationEtag,destinationVersion:r.destinationVersion,size:r.size}));
      state.pending.receipts=receipts;await save();
      if(response.errors?.length||response.partialMove)throw Error('That file did not arrive where expected. We have recorded the problem.');
      const changes=[];
      if(operation==='delete'){
        for(const r of plan.records){const found=await api.run('stat',{source:r.source,key:r.key});if(found.state!=='completed'||found.data.object)throw Error('Deletion could not be checked.');r.deleted=true;changes.push({id:r.id,deleted:true});}
      }else for(let i=0;i<plan.records.length;i++){
        const previous=plan.records[i],receipt=receipts.find(r=>r.sourceKey===previous.key);
        if(receipt?.status==='conflict'&&input.conflict==='skip'){changes.push({conflict:true,sourceKey:previous.key});continue;}
        const dest=plan.destinations[i];
        if(!receipt?.verified||receipt.status!=='copied'||receipt.destinationKey!==dest.key||!dest.absent||!receipt.destinationVersion)throw Error('The new copy could not be independently identified.');
        const actual=await read(dest.source,dest.key);
        const clean=String(actual.object?.etag||'').replaceAll('"','');
        if(!actual.object||actual.object.version&&actual.object.version!==receipt.destinationVersion||clean!==String(receipt.destinationEtag).replaceAll('"','')||Number(actual.object.size)!==receipt.size||actual.sha256!==previous.sha256||!(actual.object.uploaded||actual.object.last_modified||actual.object.version))throw Error('The new copy did not pass its independent check.');
        if(operation!=='copy'){const absent=await api.run('stat',{source:previous.source,key:previous.key});if(absent.state!=='completed'||absent.data.object)throw Error('The copy did not finish moving.');previous.deleted=true;}
        const next={id:operation==='copy'?crypto.randomUUID():previous.id,sessionId:state.id,parentId:previous.id||previous.identity,identity:id(dest.source,dest.key),source:dest.source,key:dest.key,stamp:stamp(actual.object),sha256:actual.sha256,object:actual.object,receipt,deleted:false};state.objects.push(next);changes.push({id:next.id,key:next.key,source:next.source,from:{source:previous.source,key:previous.key},sha256:next.sha256,parentId:next.parentId});
      }
      await originals();state.pending=null;await save();
      report({operation,verdict:'PASSED',response:{completed:response.completed,receipts},changes,latencyMs:performance.now()-started,observed:'Independent remote metadata and SHA-256 read-back matched; originals unchanged.'});return response;
    }catch(error){
      if(dispatched){report({operation,verdict:'UNCERTAIN',response:state.pending?.receipts||null,latencyMs:performance.now()-started,observed:'Remote result needs reconciliation. No destructive retry was made.'});}
      else report({operation,verdict:'BLOCKED',observed:'Safety preflight: '+error.message,latencyMs:performance.now()-started});
      throw Object.assign(Error(dispatched?'That file did not arrive where expected. We have recorded the problem. Use Retry to check the files.':error.message),{uncertain:dispatched});
    }finally{locked=false;}
  }
  async function reconcile(){await originals();for(const o of state.objects.filter(o=>!o.deleted))await check(o);if(state.pending){
    // Only an unchanged source AND absent destination proves no write occurred.
    for(const e of state.pending.entries){const o=owned(state.pending.source,e.key)||state.originals.find(o=>o.identity===id(state.pending.source,e.key));if(!o)throw Error('The unfinished action needs manual review.');await check(o);}
    for(const d of state.pending.destinations){const r=await api.run('stat',{source:d.source,key:d.key});if(r.state!=='completed'||r.data.object)throw Error('The unfinished action needs manual review. No files will be changed.');}
    if(state.pending.operation==='delete')throw Error('The unfinished deletion needs manual review.');state.pending=null;
  }await save();return {originals:state.originals.length,copies:state.objects.filter(o=>!o.deleted).length};}
  async function run(...args){
    if(restarting&&writes.has(args[0]))throw Error('Wait for Test It to restart.');
    inFlight++;try{return await perform(...args);}finally{inFlight--;}
  }
  async function restart(){
    if(inFlight||restarting)throw Error('Wait for the current file operation before restarting.');
    restarting=true;const wasActive=active;active=false;
    try{
      await reconcile();
      const fresh={...state,id:crypto.randomUUID(),index:0,records:[],workflow:null,pending:null};
      // Persist before switching state. Failure leaves the old session recoverable.
      await persist({betaExplorerTestIt:structuredClone(fresh),betaExplorerTestItOwnership:structuredClone({originals:state.originals,objects:state.objects,destinations:state.destinations})});
      Object.assign(state,fresh);
    }finally{restarting=false;active=wasActive;}
  }
  return {state,run,restart,configureLocations,get busy(){return inFlight>0||restarting;},source,owned,save,reconcile,check,originals,assertOwned(source,entries){if(!entries.length||entries.some(e=>e.folder||!owned(source,e.key)||owned(source,e.key).sessionId!==state.id))throw Error('Your original is protected. Select only verified practice copies.');},get active(){return active;},set active(value){active=value;}};
}

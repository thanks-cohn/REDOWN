import {createGuide} from './guided-interaction.mjs';
import {createPracticeSession} from './test-it-session.mjs';
// Each entry is an exercise, not a claim of acceptance.
const rows=[
['Open an existing bucket','#buckets','Click the bucket you want to practice in.','bucket'],
['Open an existing folder','#files','Double-click a folder containing files you approve for viewing.','folder'],
['Return to the parent folder','#crumbs','Click the parent folder in the breadcrumbs.','parent'],
['Return to the same folder','#files','Double-click the folder you just left.','return-folder'],
['Refresh the file list','#refresh','Click Refresh and wait for the files to load.','refresh'],
['Select a file','#files','Click a file you approve for practice.','select'],
['Select a different file','#files','Click a different file.','different'],
['Select multiple files','#files','Hold Ctrl and click another file.','multi'],
['Select a contiguous range','#files','Hold Shift and click a file farther down the list.','range'],
['Find a file','#filter','Type part of a filename in Filter.','filter'],
['Sort files by name','#sort','Choose Name A–Z. Clear the filter if needed.','sort'],
['Switch to Grid view','#view','Click Grid view.','grid'],
['Switch back to List view','#view','Click List view.','list'],
['Open an image in Window Preview','#preview','Choose Window Preview, then open an image you approve for viewing.','image'],
['Navigate to the next image','#preview-next','Click Next or press Right Arrow to view the next image.','next-image'],
['Return to the previous image','#preview-previous','Click Previous or press Left Arrow to return to the previous image.','previous-image'],
['Enter image Lightbox Mode','#preview-lightbox','Click the image lightbox button.','lightbox'],
['Exit Lightbox Mode','#preview-content','Press Escape to leave the lightbox.','exit-lightbox'],
['Open Side Preview','#preview-mode','Close Window Preview and choose Side Preview.','side'],
['Resize, close, and reopen Side Preview','#preview-divider','Resize the divider, close Side Preview, then reopen it.','resize-side'],
['Choose a source file','#files','Select an existing file and approve it as a read-only copy source. Your original will not be changed.','source'],
['Copy the source','#copy','Right-click your selected source and choose Copy.','copy-menu'],
['Paste wherever you like','#paste','Paste wherever you like, including this folder. Wait for REDOWN to find and verify your copy.','copy'],
['Confirm the original remains','#files','REDOWN checks the original and your copy automatically.','original'],
['Preview the new copy','#preview','Open the new copy and click Preview.','copy-preview'],
['Rename the copy','#rename','Close the preview. Select the practice copy and choose Rename.','rename'],
['Rename it back','#rename','Rename that practice copy back to its earlier name.','rename-back'],
['Duplicate the working copy','#duplicate','Select the working copy and click Duplicate.','duplicate'],
['Copy the duplicate using Ctrl+C','#files','Select the new duplicate and press Ctrl+C.','copy-key'],
['Paste it into another location','#paste','Open another existing folder and paste the duplicate.','copy-other'],
['Cut a test-created copy','#cut','Right-click a working copy and choose Cut.','cut-menu'],
['Paste it into another location','#paste','Open another folder and click Paste.','move'],
['Move that copy back','#move-to','Select the moved copy and use Move to… to return it.','move-back'],
['Move it again using Ctrl+X','#files','Select a working copy and press Ctrl+X.','cut-key'],
['Paste it back using Ctrl+V','#files','Open another folder and press Ctrl+V.','move-key'],
['Drag a working copy into another folder','#files','Drag a verified working copy onto another folder.','drag'],
['Move the dragged copy back','#move-to','Use Move to… to return the dragged copy.','move-back'],
['Select two test-created copies','#files','Select two verified practice copies with Ctrl+Click.','two-owned'],
['Move both copies together','#move-to','Use Move to… to move both selected copies.','move-two'],
['Return both copies','#move-to','Select both moved copies and return them with Move to….','return-two'],
['Create an extra copy','#duplicate','Select a working copy and click Duplicate.','duplicate'],
['Verify both working copies exist','#refresh','Click Refresh to check the copies and the untouched original.','inventory'],
['Rename the extra copy','#rename','Select the extra practice copy and give it a different name.','rename'],
['Move the extra copy into another folder','#move-to','Use Move to… on the extra practice copy.','move'],
['Move it back','#move-to','Return that extra copy to its previous folder.','move-back'],
['Create a filename conflict between copies','#copy-to','Copy a practice file to a location containing another tracked copy of the same name, with Conflicts: skip.','conflict'],
['Resolve the conflict safely','#conflict','Choose Conflicts: skip and repeat the copy to confirm both copies are preserved.','conflict'],
['Delete one extra copy','#delete','Select one extra verified practice copy and click Delete.','delete'],
['Restore it from the preserved source','#copy-to','Copy the preserved original into the now-unused location.','restore'],
['Delete another extra copy, then verify the original','#delete','Delete another extra practice copy. The original will be checked automatically.','delete'],
['Copy using Ctrl+C','#files','Select an approved source or working copy and press Ctrl+C.','copy-key'],
['Paste using Ctrl+V','#files','Open an unused destination and press Ctrl+V.','copy-key-paste'],
['Cut that working copy with Ctrl+X','#files','Select the new working copy and press Ctrl+X.','cut-key'],
['Paste it elsewhere','#paste','Open another folder and paste the working copy.','move'],
['Return that copy','#move-to','Use Move to… to return the last moved copy.','move-back'],
['Find a renamed working copy','#filter','Rename a working copy if needed, then find it with Filter.','find-owned'],
['Download a working copy','#download','Select a practice copy and click Download.','download'],
['Preview a supported document','#preview','Select an approved text file or PDF and open Preview.','document'],
['Verify originals and tracked copies','#refresh','Click Refresh to check every original and remaining tracked copy.','inventory'],
['Export results and optional cleanup','#test-it-export','Export your results. Cleanup is optional from the Explorer menu.','export']
];
export const exercises=Object.freeze(rows.map(([title,target,text,kind],i)=>Object.freeze({id:i+1,chapter:'ABCDEF'[Math.floor(i/10)],title,target,text,kind})));
export function installTestIt({document:doc,api,storage,getState,approve,stopTour}){
  const $=id=>doc.getElementById(id);let session,guide,index=0,baseline=null,lastInput={},command=null,checking=false,generation=0,initializing=true,restarting=false,cleaning=false;
  let folder=null,previousImage=null,lastMove=null,renameFrom=null,lastCreated=null,sideChecks={},multiEvidence=[],clipboardCommand=null;
  const records=()=>{for(const e of exercises)if(!session.state.records.find(r=>r.exerciseId===e.id))session.state.records.push({exerciseId:e.id,requestedAction:e.text,observedGuiInteraction:null,actualApiOperation:null,providerResponse:null,expectedResult:e.title,independentlyObservedResult:null,sha256Comparisons:[],latencyMs:null,testOwnedObjectIdentities:[],verdict:'NOT_TESTED'});};
  const record=()=>session.state.records[index];
  async function save(){try{await session.save();return true;}catch{guide?.message('Progress could not be saved. Exit and restore browser storage before making changes.');return false;}}
  function evidence(event){if(!guide?.active)return;if(event.correlation&&event.correlation.exerciseId!==exercises[index].id){const r=session.state.records.find(r=>r.exerciseId===event.correlation.exerciseId);if(r){r.lateOperationEvidence=event;void save();}return;}const r=record();if(event.observationOnly){(r.readObservations||=[]).push({operation:event.operation,response:event.response});void save();return;}(r.apiObservations||=[]).push(event);Object.assign(r,{actualApiOperation:event.operation,providerResponse:event.response||null,independentlyObservedResult:event.observed,latencyMs:event.latencyMs,verdict:event.verdict==='PASSED'?r.verdict:event.verdict,testOwnedObjectIdentities:(event.changes||[]).map(c=>c.id).filter(Boolean),sha256Comparisons:(event.changes||[]).filter(c=>c.sha256).map(c=>({objectId:c.id,expected:c.sha256,observed:c.sha256}))});void save();
    if(event.verdict!=='PASSED'){guide.message(event.verdict==='UNCERTAIN'?'REDOWN is checking the last file action.':event.observed||"This copy couldn't be verified, so REDOWN won't change it.");return;}
    const operationCommand=event.correlation?.command||command;
    const kind=exercises[index].kind,op=event.operation,changes=event.changes||[],keys=changes.map(c=>c.key).filter(Boolean),conflict=changes.some(c=>c.conflict);
    let matches=false;
    if(['copy','duplicate','copy-other','copy-key-paste','restore'].includes(kind)&&op==='copy'&&!conflict){matches=keys.length>0;if(kind==='copy')matches=matches&&operationCommand?.action==='paste'&&changes.every(c=>session.state.originals.some(o=>o.identity===c.parentId&&operationCommand.entries.includes(o.key)));if(kind==='duplicate')matches=matches&&operationCommand?.action==='duplicate';if(kind==='copy-key-paste')matches=matches&&operationCommand?.input.key?.toLowerCase()==='v'&&operationCommand?.input.ctrl;if(kind==='copy-other')matches=matches&&changes.every(c=>c.from&&(c.source.accountId!==c.from.source.accountId||c.source.bucketName!==c.from.source.bucketName||c.key.slice(0,c.key.lastIndexOf('/')+1)!==c.from.key.slice(0,c.from.key.lastIndexOf('/')+1)));if(kind==='restore')matches=matches&&session.state.originals.some(o=>operationCommand?.entries?.includes(o.key));if(kind==='copy-other'&&lastCreated)matches=matches&&changes.some(c=>c.parentId===lastCreated);if(keys.length){lastCreated=changes[0].id;session.state.workflow={...session.state.workflow,workingCopyId:lastCreated};}}
    if(kind==='conflict')matches=op==='copy'&&conflict;
    if(kind==='rename'||kind==='rename-back'){matches=op==='rename'&&keys.length===1;if(kind==='rename-back')matches=matches&&keys[0]===renameFrom;if(kind==='rename'){renameFrom=operationCommand?.entries?.[0];session.state.workflow={...session.state.workflow,renameFrom};}}
    if(['move','move-back','move-key','drag','move-two','return-two'].includes(kind)&&op==='move'){
      matches=keys.length>0;if(kind==='move-key')matches=matches&&operationCommand?.input.key?.toLowerCase()==='v'&&operationCommand.input.ctrl;
      if(kind==='drag')matches=matches&&operationCommand?.input.type==='drop';
      if(kind==='move-two'||kind==='return-two'){multiEvidence.push(...changes);matches=multiEvidence.length===2;}
      const moved=kind==='move-two'||kind==='return-two'?multiEvidence:changes;
      if(kind==='move-back'||kind==='return-two')matches=matches&&lastMove&&moved.every(c=>lastMove.some(old=>old.id===c.id&&old.key===c.key&&old.source.accountId===c.source?.accountId&&old.source.bucketName===c.source?.bucketName));
      if(matches){lastMove=moved.map(c=>({id:c.id,key:c.from?.key,source:c.from?.source}));session.state.workflow={...session.state.workflow,lastMove};}
    }
    if(kind==='download')matches=op==='download'&&event.response?.downloadState==='complete';
    if(kind==='delete')matches=op==='delete'&&changes.length===1;
    if(['move-two','return-two'].includes(kind)&&!matches&&multiEvidence.length<2){guide.message('First copy verified. Waiting for the other copy.');void save();return;}
    if(matches){pass({type:'verified-operation',command:operationCommand,...event});if(op==='copy'&&keys.length)guide.message('Good. REDOWN found and verified your copy at '+changes[0].source.bucketName+'/'+changes[0].key+'.');}else{r.observationFailure={reason:'Verified operation did not meet this exercise’s interaction or state requirements.',operation:op,command:structuredClone(operationCommand)};guide.message('Explorer completed and verified the operation. It did not match this exercise. Retry the requested action; provider success is recorded.');void save();}
  }
  function pass(observed){if(!guide?.active)return;const r=record();r.verdict='PASSED';r.observedGuiInteraction=observed;r.independentlyObservedResult=r.independentlyObservedResult||'Observed the intended GUI state after its interaction.';void save();doc.dispatchEvent(new doc.defaultView.CustomEvent('redown:gui',{detail:{action:'test-it-'+exercises[index].id}}));}
  function snapshot(){return getState();}
  async function observe(action,detail={}){
    if(!guide?.active||checking)return;const step=exercises[index],s=snapshot(),b=baseline||s,k=step.kind;
    // Compute identities before command handling, including context-menu Copy.
    const selected=s.selected.filter(e=>!e.folder),selection=selected.map(e=>e.key);
    if(action==='command'){(record().interactions||=[]).push({commandId:detail.commandId,action:detail.action,invocation:detail.invocation,source:detail.source,destination:detail.destination,entries:detail.entries?.map(e=>e.key),clipboard:detail.clipboard,at:Date.now()});void save();if(detail.action==='paste'&&command&&['duplicate','copy-to','move-to'].includes(command.action)){command={...command,input:command.input};return;}const invocation=detail.invocation;const commandInput=invocation?{type:invocation.method==='keyboard'?'keydown':invocation.method==='contextmenu'?'contextmenu':invocation.method==='drop'?'drop':'click',key:invocation.key,ctrl:Boolean(invocation.ctrl),context:invocation.method==='contextmenu'}:{...lastInput};command={id:detail.commandId,action:detail.action,input:commandInput,entries:detail.entries?.map(e=>e.key)||(detail.action==='paste'?clipboardCommand?.entries:null)||s.selected.map(e=>e.key),location:detail.source||s.current,destination:detail.destination};if(['copy','cut'].includes(detail.action))clipboardCommand=command;if(['copy-menu','cut-menu'].includes(k)&&command.input.context!==true)return;
      const isCopy=k==='copy-key'||k==='copy-menu',isCut=k==='cut-key'||k==='cut-menu';
      if((isCopy&&detail.action==='copy'||isCut&&detail.action==='cut')&&s.selected.length&&s.selected.every(e=>!e.folder)){
        if(isCopy&&k==='copy-menu'&&!(selected.length===1&&session.state.originals.some(o=>o.key===selection[0]&&o.source.accountId===s.current?.accountId&&o.source.bucketName===s.current?.bucketName)))return;
        if(isCut&&s.selected.some(e=>!session.owned(s.current,e.key)||session.owned(s.current,e.key).sessionId!==session.state.id))return;
        if(k.endsWith('key')&&!(command.input.ctrl&&command.input.key?.toLowerCase()===(isCopy?'c':'x')))return;
        if(index===28&&lastCreated&&!s.selected.every(e=>session.owned(s.current,e.key)?.id===lastCreated))return;
        if(detail.clipboard&&detail.clipboard.operation!==(isCopy?'copy':'move'))return;pass({action:detail.action,input:command.input,selection:command.entries,clipboard:detail.clipboard});
      }return;
    }
    let ok=false;
    if(k==='bucket')ok=action==='bucket-open'&&s.current&&!s.current.prefix;
    if(k==='folder'){ok=action==='folder-open'&&Boolean(s.current?.prefix);if(ok)folder=s.current.prefix;}
    if(k==='parent'){const from=detail.previous,to=detail.current,p=from?.prefix||'',parent=p.replace(/\/$/,'').slice(0,p.replace(/\/$/,'').lastIndexOf('/')+1);ok=['folder-open','bucket-open'].includes(action)&&detail.completed===true&&detail.origin==='breadcrumb'&&Boolean(p)&&from.accountId===to?.accountId&&from.bucketName===to?.bucketName&&to.prefix===parent&&s.current?.prefix===to.prefix;}
    if(k==='return-folder')ok=action==='folder-open'&&s.current?.prefix===folder;
    if(k==='refresh')ok=action==='refresh'&&s.current?.prefix===b.current?.prefix;
    if(k==='select')ok=action==='select-file'&&selected.length===1;
    if(k==='different')ok=action==='select-file'&&selected.length===1&&selection[0]!==b.selected[0]?.key;
    if(k==='multi')ok=action==='select-file'&&selected.length>=2&&lastInput.ctrl;
    if(k==='range')ok=action==='select-file'&&selected.length>=2&&lastInput.shift;
    if(k==='filter'||k==='find-owned')ok=action==='ui'&&lastInput.target==='filter'&&$('filter').value.trim()&&s.visible.length>0&&s.visible.every(e=>e.displayName.toLocaleLowerCase().includes($('filter').value.toLocaleLowerCase()))&&(k!=='find-owned'||s.visible.some(e=>session.owned(s.current,e.key)&&session.state.objects.some(o=>o.id===session.owned(s.current,e.key)?.id&&o.deleted&&o.key!==e.key)));
    if(k==='sort')ok=action==='ui'&&lastInput.target==='sort'&&$('sort').value==='name'&&s.visible.every((e,i,a)=>i===0||a[i-1].folder&&!e.folder||a[i-1].folder===e.folder&&a[i-1].displayName.localeCompare(e.displayName,undefined,{numeric:true})<=0);
    if(k==='grid'||k==='list')ok=action==='switch-view'&&s.grid===(k==='grid');
    if(k==='image')ok=action==='preview-open'&&detail.rendered===true&&s.previewMode==='window'&&Boolean(doc.querySelector('#preview-content img'));
    if(k==='next-image'||k==='previous-image'){
      const direction=k==='next-image'?1:-1;
      ok=action==='preview-open'&&detail.rendered===true&&s.previewMode==='window'&&Boolean(doc.querySelector('#preview-content img'))&&detail.direction===direction&&['button','keyboard'].includes(detail.invocation)&&Boolean(detail.previousKey)&&detail.currentKey===s.previewKey&&detail.expectedKey===s.previewKey&&s.previewKey!==detail.previousKey;
      if(k==='next-image'&&ok){previousImage=detail.previousKey;session.state.workflow={...session.state.workflow,previousImage};}
    }
    if(k==='lightbox')ok=['ui','lightbox-change'].includes(action)&&s.lightbox;
    if(k==='exit-lightbox')ok=['ui','lightbox-change'].includes(action)&&!s.lightbox&&b.lightbox&&(detail.key||lastInput.key)==='Escape';
    if(k==='side')ok=s.previewMode==='side'&&s.sideState==='open'&&Boolean(s.previewKey)&&action==='preview-open';
    if(k==='resize-side'){if(s.previewWidth!==b.previewWidth)sideChecks.resized=true;if(s.sideState==='closed')sideChecks.closed=true;ok=sideChecks.resized&&sideChecks.closed&&s.sideState==='open'&&Boolean(s.previewKey);}
    if(k==='two-owned')ok=action==='select-file'&&selected.length===2&&selected.every(e=>session.owned(s.current,e.key));
    if(k==='source'&&action==='select-file'&&selected.length===1){checking=true;const ticket=generation;try{await session.source(s.current,selection[0]);if(ticket!==generation)return;if(ticket===generation)ok=true;}catch(e){guide?.message(e.message);}finally{checking=false;}}
    if(['original','inventory'].includes(k)&&action==='refresh'){
      checking=true;const ticket=generation;try{const inventory=await session.reconcile();ok=inventory.originals>0&&(k!=='inventory'||inventory.copies>=2||index===58);record().independentlyObservedResult={inventory,sha256:'All recorded originals and live copies matched their saved SHA-256 and metadata.'};if(ticket!==generation)ok=false;}catch(e){guide?.message(e.message);record().verdict='BLOCKED';await save();}finally{checking=false;}
    }
    if(k==='copy-preview'||k==='document'){
      ok=action==='preview-open'&&Boolean(s.previewKey)&&Boolean(doc.querySelector('#preview-content img, #preview-content pre, #preview-content iframe'));
      if(k==='copy-preview'){const own=session.owned(s.current,s.previewKey);ok=ok&&Boolean(own)&&own.id===(lastCreated||session.state.records[22]?.testOwnedObjectIdentities?.[0]);if(ok){checking=true;try{await session.check(own);}catch{ok=false;guide.message('This copy could not be checked.');}finally{checking=false;}}}else ok=ok&&/\.(pdf|txt|md|json|csv|log|js|mjs|css|html)$/i.test(s.previewKey);
    }
    if(ok)pass({action,input:{...lastInput},location:s.current,selection,previewKey:s.previewKey});
  }
  function workingCopy(){return session.state.objects.findLast(o=>!o.deleted&&o.id===lastCreated)||session.state.objects.findLast(o=>!o.deleted);}
  function originalFor(copy){const direct=session.state.originals.find(o=>o.identity===copy?.originalIdentity);if(direct)return direct;let record=copy,seen=new Set();while(record?.parentId&&!seen.has(record.parentId)){seen.add(record.parentId);const original=session.state.originals.find(o=>o.identity===record.parentId);if(original)return original;record=session.state.objects.find(o=>o.id===record.parentId&&o.parentId!==o.id);}return session.state.originals.at(-1);}
  function instruction(e){
    const copy=workingCopy(),original=originalFor(copy),path=o=>o.source.bucketName+'/'+o.key;
    let text=e.text;
    if(['rename','rename-back'].includes(e.kind))text='Select the red-outlined Test Copy and rename it'+(e.kind==='rename-back'&&renameFrom?' back to '+renameFrom:'')+'.';
    if(e.kind==='move-back')text='Move the red-outlined Test Copy back into its previous folder.';
    if(e.kind==='delete')text='Delete only the extra red-outlined Test Copy.';
    if(e.id>=21&&original)text+='\nOriginal: '+path(original);
    if(e.id>=23&&copy)text+='\nYour copy: '+path(copy);
    if(e.kind==='move-back'&&copy){const destination=lastMove?.find(o=>o.id===copy.id);if(destination?.source)text+='\nReturn to: '+destination.source.bucketName+'/'+destination.key.slice(0,destination.key.lastIndexOf('/')+1);}
    return text;
  }
  function paintOwnership(){
    if(!session)return;const current=getState().current;
    for(const row of doc.querySelectorAll('#files .file')){
      const copy=current&&session.owned(current,row.dataset.key),quarantine=current&&(session.quarantined(current,row.dataset.key)||session.state.pending?.entries?.some(e=>session.state.pending.source.accountId===current.accountId&&session.state.pending.source.bucketName===current.bucketName&&e.key===row.dataset.key));
      const original=current&&session.state.originals.some(o=>o.source.accountId===current.accountId&&o.source.bucketName===current.bucketName&&o.key===row.dataset.key);
      const entry=getState().visible?.find(e=>e.key===row.dataset.key);
      const matches=copy&&(!entry||['etag','version','size','uploaded','last_modified'].every(k=>entry[k]==null||copy.object[k]==null||String(entry[k])===String(copy.object[k])));
      const label=matches&&!quarantine?'Test Copy':original?'Original · Protected':quarantine?'Checking test action':'';
      row.classList.toggle('test-owned-copy',label==='Test Copy');row.classList.toggle('test-original',Boolean(original));
      let badge=row.querySelector('.test-ownership-label');if(!label){badge?.remove();continue;}if(!badge){badge=doc.createElement('span');badge.className='test-ownership-label';(row.querySelector('.file-name')||row).append(badge);}if(badge.textContent!==label)badge.textContent=label;
    }
    const text=doc.querySelector('.test-it-card [data-guide-text]');if(text&&guide?.active)text.textContent=instruction(exercises[index]);
  }
  async function verifyOriginalAutomatically(){
    if(!guide?.active||exercises[index].kind!=='original'||checking)return;
    checking=true;const ticket=generation;guide.message('REDOWN is checking the original and your copy.');
    try{const inventory=await session.reconcile();const copy=workingCopy();if(ticket!==generation||!guide?.active)return;if(!copy||!inventory.originals)throw Error('Create a verified Test Copy first.');await session.check(copy);if(ticket!==generation)return;record().independentlyObservedResult={inventory,checkedAt:Date.now(),originals:session.state.originals.map(o=>({key:o.key,source:o.source,sha256:o.sha256})),copy:{id:copy.id,key:copy.key,sha256:copy.sha256}};pass({action:'automatic-original-check',freshRemoteEvidence:true});guide.message('The original is unchanged and your Test Copy is verified.');}catch(error){if(ticket===generation)guide?.message(error.message);}finally{checking=false;}
  }
  async function start(){if(initializing||restarting||cleaning)return;if(guide?.active)return;stopTour();doc.querySelector('.tour-invitation')?.remove();session.active=true;generation++;records();index=Math.min(session.state.index,59);previousImage=session.state.workflow?.previousImage||null;lastCreated=session.state.workflow?.workingCopyId||null;lastMove=session.state.workflow?.lastMove||null;renameFrom=session.state.workflow?.renameFrom||null;
    guide=createGuide({document:doc,steps:exercises.map(e=>({...e,text:()=>instruction(e),action:'test-it-'+e.id,target:()=>e.kind==='export'?'#test-it-tools-button':e.target})),startIndex:index,allowBack:false,draggable:true,
      onStep:i=>{generation++;index=i;session.state.index=i;baseline=snapshot();sideChecks={};multiEvidence=[];record().verdict=record().verdict==='PASSED'?'PASSED':'NOT_TESTED';void save();queueMicrotask(()=>void verifyOriginalAutomatically());},
      onSkip:i=>{session.state.records[i].verdict='NOT_TESTED';session.state.records[i].independentlyObservedResult='Participant skipped this exercise. Dependent operations still require verified copies.';void save();},
      onRetry:async()=>{if(checking||session.busy)return;checking=true;const ticket=generation;try{const result=await session.reconcile();if(ticket!==generation||!guide?.active)return;const event=session.state.lastVerifiedOperation;if(event?.correlation?.exerciseId===exercises[index].id&&event.changes?.every(c=>c.conflict||c.deleted||session.state.objects.some(o=>!o.deleted&&o.id===c.id&&o.key===c.key&&o.source.accountId===c.source?.accountId&&o.source.bucketName===c.source?.bucketName))){evidence(event);if(record().verdict==='PASSED')return;}if(result.quarantined){guide.message("REDOWN is still checking an earlier file action. Other verified copies are available.");return;}guide.message(`Checked ${result.originals} original(s) and ${result.copies} practice copy/copies. Try the interaction again.`);}catch(e){guide?.message(e.message);}finally{checking=false;}},
      onExit:()=>{generation++;session.active=false;void save();},onFinish:()=>{session.active=false;void save();}});guide.start();guide.message('Your existing files remain protected. Practice changes are limited to verified copies. Use X to exit at any time.');}
  function input(event){if(event.target.closest?.('[data-tour-start]'))guide?.stop();if(!guide?.active||event.target.closest?.('.guide-card'))return;const el=event.target.closest?.('[id]');/* Menu and keyboard handlers forward commands with button.click(). */if(event.type==='click'&&event.detail===0&&['copy','cut','paste'].includes(el?.id)&&(lastInput.context||lastInput.type==='keydown'))return;lastInput={type:event.type,target:el?.id||'',key:event.key,ctrl:Boolean(event.ctrlKey||event.metaKey),shift:Boolean(event.shiftKey),context:event.type==='contextmenu'||Boolean(event.target.closest?.('#context'))};if(event.type==='keydown'&&event.key==='Escape')setTimeout(()=>void observe('ui'),0);else if(['click','input','change','pointerup'].includes(event.type))setTimeout(()=>void observe('ui'),0);}
  for(const type of ['click','contextmenu','keydown','input','change','pointerup','drop'])doc.addEventListener(type,input,true);
  doc.addEventListener('redown:gui',event=>{if(!event.detail?.action?.startsWith('test-it-'))void observe(event.detail.action,{...event.detail,action:event.detail.commandAction||event.detail.action}).catch(error=>{record().observationFailure={action:event.detail.action,error:error.message};void save();guide?.message('Test It observation failed. Explorer results are recorded separately. Retry the exercise.');});});
  function downloadJson(value,filename){
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=doc.createElement('a');
    link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function exportResults(){
    if(!session||restarting)return;records();
    if(guide?.active&&exercises[index].kind==='export')pass({action:'export',format:'JSON'});
    await save();const report=structuredClone(session.state);
    report.evidenceBoundary='Recorded participant GUI and provider observations only. NOT_TESTED means no verified completion. Exact approved file paths are included; no auth credentials are exported.';
    downloadJson(report,'redown-test-it-'+session.state.id+'.json');
    // Recovery is a separate report so the active JSON contains only this run.
    const recovery=session.recovery;
    if(recovery.length)downloadJson({version:1,recovery},'redown-test-it-recovery-'+session.state.id+'.json');
  }
  $('test-it-restart').onclick=async()=>{
    if(initializing||restarting||cleaning)return;
    if(checking||session.busy){await approve('Restart is waiting','Wait for the current file operation or check to finish, then choose Restart Test It again.');return;}
    restarting=true;
    try{
      if(!await approve('Restart Test It?','Replace the current session results and begin at exercise 1? Cloud files and practice-copy ownership will be preserved. Previously downloaded reports will stay unchanged.'))return;
      if(checking||session.busy)throw Error('Wait for the current file operation before restarting.');
      guide?.stop();generation++;
      const result=await session.restart();
      index=0;baseline=null;lastInput={};command=null;folder=null;previousImage=null;lastMove=null;renameFrom=null;lastCreated=null;sideChecks={};multiEvidence=[];clipboardCommand=null;
      restarting=false;await start();
      if(result.unfinished)guide?.message("Your previous test had an unfinished file action. We've kept its recovery details. Your new test can begin.");
    }catch(e){await approve('Test It could not restart',e.message+' Your previous results and ownership records have been retained.');}
    finally{restarting=false;}
  };
  $('test-it').onclick=()=>void start();$('test-it-export').onclick=()=>void exportResults();
  $('test-it-cleanup').onclick=async()=>{if(!session||checking||restarting||cleaning||session.busy)return;const copies=session.state.objects.filter(o=>!o.deleted);if(!copies.length)return;cleaning=true;try{await session.reconcile();if(!await approve('Delete these practice copies?',copies.map(o=>o.source.bucketName+'/'+o.key).join('\n')+'\nOriginals and unrelated files will be preserved.'))return;session.active=true;for(const o of copies){const r=await api.run('delete',{source:o.source,entries:[{key:o.key,folder:false}]});if(r.state!=='completed')throw Error(r.error||'Cleanup stopped.');}guide?.message('The listed practice copies were removed.');}catch(e){guide?.message(e.message);}finally{cleaning=false;session.active=Boolean(guide?.active);}};
  $('take-tour').addEventListener('click',()=>guide?.stop());
  void (async()=>{try{const stored=await storage.get(['betaExplorerTestIt','betaExplorerTestItRecovery']),saved=stored?.betaExplorerTestIt,recovery=stored?.betaExplorerTestItRecovery||[];session=createPracticeSession({api,storage,saved,recovery,approve,onEvidence:evidence,onOwnership:paintOwnership,captureEvidence:()=>({exerciseId:exercises[index].id,command:structuredClone(command)})});records();api.setPolicy(session);initializing=false;paintOwnership();}catch{$('test-it').disabled=true;$('test-it').title='Browser storage is unavailable.';}})();
  return {observe,paintOwnership,get lastCommand(){return command?.action;},get session(){return session;}};
}

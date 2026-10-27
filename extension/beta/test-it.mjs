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
['Navigate to the next image','#preview-next','Press Right Arrow to view the next image.','next-image'],
['Return to the previous image','#preview-previous','Press Left Arrow to return to the previous image.','previous-image'],
['Enter image Lightbox Mode','#preview-lightbox','Click the image lightbox button.','lightbox'],
['Exit Lightbox Mode','#preview-content','Press Escape to leave the lightbox.','exit-lightbox'],
['Open Side Preview','#preview-mode','Close Window Preview and choose Side Preview.','side'],
['Resize, close, and reopen Side Preview','#preview-divider','Resize the divider, close Side Preview, then reopen it.','resize-side'],
['Choose a source file','#files','Select a file you want to practice with. Your original will not be changed.','source'],
['Copy the source','#copy','Right-click your selected source and choose Copy.','copy-menu'],
['Paste into an approved destination','#paste','Open an existing practice folder and click Paste. Approve the destination when asked.','copy'],
['Confirm the original remains','#files','Return to the original folder and click Refresh.','original'],
['Preview the new copy','#preview','Open the new copy and click Preview.','copy-preview'],
['Rename the copy','#rename','Close the preview. Select the practice copy and choose Rename.','rename'],
['Rename it back','#rename','Rename that practice copy back to its earlier name.','rename-back'],
['Duplicate the working copy','#duplicate','Select the working copy and click Duplicate.','duplicate'],
['Copy the duplicate using Ctrl+C','#files','Select the new duplicate and press Ctrl+C.','copy-key'],
['Paste it into another approved location','#paste','Open another existing folder and paste the duplicate.','copy-other'],
['Cut a test-created copy','#cut','Right-click a working copy and choose Cut.','cut-menu'],
['Paste it into another approved location','#paste','Open another approved folder and click Paste.','move'],
['Move that copy back','#move-to','Select the moved copy and use Move to… to return it.','move-back'],
['Move it again using Ctrl+X','#files','Select a working copy and press Ctrl+X.','cut-key'],
['Paste it back using Ctrl+V','#files','Open another approved folder and press Ctrl+V.','move-key'],
['Drag a working copy into another folder','#files','Drag a verified working copy onto another approved folder.','drag'],
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
['Restore it from the preserved source','#copy-to','Copy the preserved original into the now-unused approved location.','restore'],
['Delete another extra copy, then verify the original','#delete','Delete another extra practice copy. The original will be checked automatically.','delete'],
['Copy using Ctrl+C','#files','Select an approved source or working copy and press Ctrl+C.','copy-key'],
['Paste using Ctrl+V','#files','Open an unused approved destination and press Ctrl+V.','copy-key-paste'],
['Cut that working copy with Ctrl+X','#files','Select the new working copy and press Ctrl+X.','cut-key'],
['Paste it elsewhere','#paste','Open another approved folder and paste the working copy.','move'],
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
  function evidence(event){if(!guide?.active)return;const r=record();if(event.observationOnly){r.actualApiOperation=event.operation;r.providerResponse=event.response;void save();return;}Object.assign(r,{actualApiOperation:event.operation,providerResponse:event.response||null,independentlyObservedResult:event.observed,latencyMs:event.latencyMs,verdict:event.verdict==='PASSED'?r.verdict:event.verdict,testOwnedObjectIdentities:(event.changes||[]).map(c=>c.id).filter(Boolean),sha256Comparisons:(event.changes||[]).filter(c=>c.sha256).map(c=>({objectId:c.id,expected:c.sha256,observed:c.sha256}))});void save();
    if(event.verdict!=='PASSED'){guide.message('That file did not arrive where expected. We’ve recorded the problem. Use Retry to check the files.');return;}
    const kind=exercises[index].kind,op=event.operation,changes=event.changes||[],keys=changes.map(c=>c.key).filter(Boolean),conflict=changes.some(c=>c.conflict);
    let matches=false;
    if(['copy','duplicate','copy-other','copy-key-paste','restore'].includes(kind)&&op==='copy'&&!conflict){matches=keys.length>0;if(kind==='copy')matches=matches&&command?.action==='paste'&&changes.every(c=>session.state.originals.some(o=>o.identity===c.parentId&&command.entries.includes(o.key)));if(kind==='duplicate')matches=matches&&command?.action==='duplicate';if(kind==='copy-key-paste')matches=matches&&command?.input.key?.toLowerCase()==='v'&&command?.input.ctrl;if(kind==='copy-other')matches=matches&&session.state.destinations.length>=2;if(kind==='restore')matches=matches&&session.state.originals.some(o=>command?.entries?.includes(o.key));if(kind==='copy-other'&&lastCreated)matches=matches&&changes.some(c=>c.parentId===lastCreated);if(keys.length)lastCreated=changes[0].id;}
    if(kind==='conflict')matches=op==='copy'&&conflict;
    if(kind==='rename'||kind==='rename-back'){matches=op==='rename'&&keys.length===1;if(kind==='rename-back')matches=matches&&keys[0]===renameFrom;if(kind==='rename')renameFrom=command?.entries?.[0];}
    if(['move','move-back','move-key','drag','move-two','return-two'].includes(kind)&&op==='move'){
      matches=keys.length>0;if(kind==='move-key')matches=matches&&command?.input.key?.toLowerCase()==='v'&&command.input.ctrl;
      if(kind==='drag')matches=matches&&command?.input.type==='drop';
      if(kind==='move-two'||kind==='return-two'){multiEvidence.push(...changes);matches=multiEvidence.length===2;}
      if(kind==='move-back'||kind==='return-two')matches=matches&&lastMove&&(kind==='return-two'?multiEvidence.map(c=>c.key):keys).every(k=>lastMove.includes(k));
      if(matches)lastMove=command?.entries;
    }
    if(kind==='download')matches=op==='download'&&event.response?.downloadState==='complete';
    if(kind==='delete')matches=op==='delete'&&changes.length===1;
    if(matches)pass({type:'verified-operation',command,...event});
  }
  function pass(observed){if(!guide?.active)return;const r=record();r.verdict='PASSED';r.observedGuiInteraction=observed;r.independentlyObservedResult=r.independentlyObservedResult||'Observed the intended GUI state after its interaction.';void save();doc.dispatchEvent(new doc.defaultView.CustomEvent('redown:gui',{detail:{action:'test-it-'+exercises[index].id}}));}
  function snapshot(){return getState();}
  async function observe(action,detail={}){
    if(!guide?.active||checking)return;const step=exercises[index],s=snapshot(),b=baseline||s,k=step.kind;
    // Compute identities before command handling, including context-menu Copy.
    const selected=s.selected.filter(e=>!e.folder),selection=selected.map(e=>e.key);
    if(action==='command'){if(detail.action==='paste'&&command&&['duplicate','copy-to','move-to'].includes(command.action)){command={...command,input:command.input};return;}command={action:detail.action,input:{...lastInput},entries:(detail.action==='paste'?clipboardCommand?.entries:null)||s.selected.map(e=>e.key),location:s.current};if(['copy','cut'].includes(detail.action))clipboardCommand=command;if(['copy-menu','cut-menu'].includes(k)&&lastInput.context!==true)return;
      const isCopy=k==='copy-key'||k==='copy-menu',isCut=k==='cut-key'||k==='cut-menu';
      if((isCopy&&detail.action==='copy'||isCut&&detail.action==='cut')&&s.selected.length&&s.selected.every(e=>!e.folder)){
        if(isCopy&&k==='copy-menu'&&!(selected.length===1&&session.state.originals.some(o=>o.key===selection[0]&&o.source.accountId===s.current?.accountId&&o.source.bucketName===s.current?.bucketName)))return;
        if(isCut&&s.selected.some(e=>!session.owned(s.current,e.key)))return;
        if(k.endsWith('key')&&!(lastInput.ctrl&&lastInput.key?.toLowerCase()===(isCopy?'c':'x')))return;
        if(index===28&&lastCreated&&!s.selected.every(e=>session.owned(s.current,e.key)?.id===lastCreated))return;
        pass({action:detail.action,input:lastInput,selection:s.selected.map(e=>e.key)});
      }return;
    }
    let ok=false;
    if(k==='bucket')ok=action==='bucket-open'&&s.current&&!s.current.prefix;
    if(k==='folder'){ok=action==='folder-open'&&Boolean(s.current?.prefix);if(ok)folder=s.current.prefix;}
    if(k==='parent')ok=action==='folder-open'&&lastInput.target?.startsWith('crumbs')&&b.current?.prefix!==s.current?.prefix&&b.current?.prefix.startsWith(s.current?.prefix||'');
    if(k==='return-folder')ok=action==='folder-open'&&s.current?.prefix===folder;
    if(k==='refresh')ok=action==='refresh'&&s.current?.prefix===b.current?.prefix;
    if(k==='select')ok=action==='select-file'&&selected.length===1;
    if(k==='different')ok=action==='select-file'&&selected.length===1&&selection[0]!==b.selected[0]?.key;
    if(k==='multi')ok=action==='select-file'&&selected.length>=2&&lastInput.ctrl;
    if(k==='range')ok=action==='select-file'&&selected.length>=2&&lastInput.shift;
    if(k==='filter'||k==='find-owned')ok=action==='ui'&&lastInput.target==='filter'&&$('filter').value.trim()&&s.visible.length>0&&s.visible.every(e=>e.displayName.toLocaleLowerCase().includes($('filter').value.toLocaleLowerCase()))&&(k!=='find-owned'||s.visible.some(e=>session.owned(s.current,e.key)&&session.state.objects.some(o=>o.id===session.owned(s.current,e.key)?.id&&o.deleted&&o.key!==e.key)));
    if(k==='sort')ok=action==='ui'&&lastInput.target==='sort'&&$('sort').value==='name'&&s.visible.every((e,i,a)=>i===0||a[i-1].folder&&!e.folder||a[i-1].folder===e.folder&&a[i-1].displayName.localeCompare(e.displayName,undefined,{numeric:true})<=0);
    if(k==='grid'||k==='list')ok=action==='switch-view'&&s.grid===(k==='grid');
    if(k==='image')ok=action==='preview-open'&&s.previewMode==='window'&&Boolean($('preview-content img'));
    if(k==='next-image'||k==='previous-image'){ok=action==='preview-open'&&Boolean($('preview-content img'))&&s.previewKey!==b.previewKey&&lastInput.key===(k==='next-image'?'ArrowRight':'ArrowLeft');if(k==='previous-image')ok=ok&&s.previewKey===previousImage;if(k==='next-image'&&ok)previousImage=b.previewKey;}
    if(k==='lightbox')ok=action==='ui'&&s.lightbox;
    if(k==='exit-lightbox')ok=action==='ui'&&!s.lightbox&&lastInput.key==='Escape';
    if(k==='side')ok=s.previewMode==='side'&&s.sideState==='open'&&Boolean(s.previewKey)&&action==='preview-open';
    if(k==='resize-side'){if(s.previewWidth!==b.previewWidth)sideChecks.resized=true;if(s.sideState==='closed')sideChecks.closed=true;ok=sideChecks.resized&&sideChecks.closed&&s.sideState==='open'&&Boolean(s.previewKey);}
    if(k==='two-owned')ok=action==='select-file'&&selected.length===2&&selected.every(e=>session.owned(s.current,e.key));
    if(k==='source'&&action==='select-file'&&selected.length===1){checking=true;const ticket=generation;try{await session.source(s.current,selection[0]);if(ticket===generation)ok=true;}catch(e){guide?.message(e.message);}finally{checking=false;}}
    if(['original','inventory'].includes(k)&&action==='refresh'){
      if(k==='original'&&!session.state.originals.some(o=>o.source.accountId===s.current?.accountId&&o.source.bucketName===s.current?.bucketName&&o.key.slice(0,o.key.lastIndexOf('/')+1)===s.current?.prefix))return;
      checking=true;const ticket=generation;try{const inventory=await session.reconcile();ok=inventory.originals>0&&(k!=='inventory'||inventory.copies>=2||index===58);record().independentlyObservedResult={inventory,sha256:'All recorded originals and live copies matched their saved SHA-256 and metadata.'};if(ticket!==generation)ok=false;}catch(e){guide?.message(e.message);record().verdict='BLOCKED';await save();}finally{checking=false;}
    }
    if(k==='copy-preview'||k==='document'){
      ok=action==='preview-open'&&Boolean(s.previewKey)&&Boolean(doc.querySelector('#preview-content img, #preview-content pre, #preview-content iframe'));
      if(k==='copy-preview'){const own=session.owned(s.current,s.previewKey);ok=ok&&Boolean(own)&&own.id===(lastCreated||session.state.records[22]?.testOwnedObjectIdentities?.[0]);if(ok){checking=true;try{await session.check(own);}catch{ok=false;guide.message('This copy could not be checked.');}finally{checking=false;}}}else ok=ok&&/\.(pdf|txt|md|json|csv|log|js|mjs|css|html)$/i.test(s.previewKey);
    }
    if(ok)pass({action,input:{...lastInput},location:s.current,selection,previewKey:s.previewKey});
  }
  async function start(){if(initializing||restarting||cleaning)return;if(guide?.active)return;stopTour();doc.querySelector('.tour-invitation')?.remove();session.active=true;generation++;records();index=Math.min(session.state.index,59);
    guide=createGuide({document:doc,steps:exercises.map(e=>({...e,action:'test-it-'+e.id,target:()=>e.kind==='export'?'#test-it-tools-button':e.target})),startIndex:index,allowBack:false,draggable:true,
      onStep:i=>{index=i;session.state.index=i;baseline=snapshot();sideChecks={};multiEvidence=[];record().verdict=record().verdict==='PASSED'?'PASSED':'NOT_TESTED';void save();},
      onSkip:i=>{session.state.records[i].verdict='NOT_TESTED';session.state.records[i].independentlyObservedResult='Participant skipped this exercise. Dependent operations still require verified copies.';void save();},
      onRetry:async()=>{try{const result=await session.reconcile();guide.message(`Checked ${result.originals} original(s) and ${result.copies} practice copy/copies. Try the interaction again.`);}catch(e){guide.message(e.message);}},
      onExit:()=>{generation++;session.active=false;void save();},onFinish:()=>{session.active=false;void save();}});guide.start();guide.message('Your existing files remain protected. Practice changes are limited to verified copies. Use X to exit at any time.');}
  function input(event){if(event.target.closest?.('[data-tour-start]'))guide?.stop();if(!guide?.active||event.target.closest?.('.guide-card'))return;const el=event.target.closest?.('[id]');/* Menu and keyboard handlers forward commands with button.click(). */if(event.type==='click'&&event.detail===0&&['copy','cut','paste'].includes(el?.id)&&(lastInput.context||lastInput.type==='keydown'))return;lastInput={type:event.type,target:el?.id||'',key:event.key,ctrl:Boolean(event.ctrlKey||event.metaKey),shift:Boolean(event.shiftKey),context:event.type==='contextmenu'||Boolean(event.target.closest?.('#context'))};if(event.type==='keydown'&&event.key==='Escape')setTimeout(()=>void observe('ui'),0);else if(['click','input','change','pointerup'].includes(event.type))setTimeout(()=>void observe('ui'),0);}
  for(const type of ['click','contextmenu','keydown','input','change','pointerup','drop'])doc.addEventListener(type,input,true);
  doc.addEventListener('redown:gui',event=>{if(!event.detail?.action?.startsWith('test-it-'))void observe(event.detail.action,{...event.detail,action:event.detail.commandAction||event.detail.action}).catch(()=>guide?.message('Test It could not recognize that interaction. Retry the exercise; Explorer commands remain available.'));});
  async function exportResults(){if(!session||restarting)return;records();if(guide?.active&&exercises[index].kind==='export')pass({action:'export',format:'JSON'});await save();const report=structuredClone(session.state);delete report.pending;report.evidenceBoundary='Recorded participant GUI and provider observations only. NOT_TESTED means no verified completion. Exact approved file paths are included; no auth credentials are exported.';const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download='redown-test-it-'+session.state.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('test-it-restart').onclick=async()=>{
    if(initializing||restarting||cleaning)return;
    if(checking||session.busy){await approve('Restart is waiting','Wait for the current file operation or check to finish, then choose Restart Test It again.');return;}
    restarting=true;
    try{
      if(!await approve('Restart Test It?','Replace the current session results and begin at exercise 1? Cloud files and practice-copy ownership will be preserved. Previously downloaded reports will stay unchanged.'))return;
      if(checking||session.busy)throw Error('Wait for the current file operation before restarting.');
      guide?.stop();generation++;
      await session.restart();
      index=0;baseline=null;lastInput={};command=null;folder=null;previousImage=null;lastMove=null;renameFrom=null;lastCreated=null;sideChecks={};multiEvidence=[];clipboardCommand=null;
      restarting=false;await start();
    }catch(e){await approve('Test It could not restart',e.message+' Your previous results and ownership records have been retained.');}
    finally{restarting=false;}
  };
  $('test-it').onclick=()=>void start();$('test-it-export').onclick=()=>void exportResults();
  $('test-it-cleanup').onclick=async()=>{if(!session||checking||restarting||cleaning||session.busy)return;const copies=session.state.objects.filter(o=>!o.deleted);if(!copies.length)return;cleaning=true;try{await session.reconcile();if(!await approve('Delete these practice copies?',copies.map(o=>o.source.bucketName+'/'+o.key).join('\n')+'\nOriginals and unrelated files will be preserved.'))return;session.active=true;for(const o of copies){const r=await api.run('delete',{source:o.source,entries:[{key:o.key,folder:false}]});if(r.state!=='completed')throw Error(r.error||'Cleanup stopped.');}guide?.message('The listed practice copies were removed.');}catch(e){guide?.message(e.message);}finally{cleaning=false;session.active=Boolean(guide?.active);}};
  $('take-tour').addEventListener('click',()=>guide?.stop());
  void (async()=>{try{const saved=(await storage.get('betaExplorerTestIt'))?.betaExplorerTestIt;session=createPracticeSession({api,storage,saved,approve,onEvidence:evidence});records();api.setPolicy(session);initializing=false;}catch{$('test-it').disabled=true;$('test-it').title='Browser storage is unavailable.';}})();
  return {observe,get lastCommand(){return command?.action;},get session(){return session;}};
}

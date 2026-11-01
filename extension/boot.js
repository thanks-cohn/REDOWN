/* Health coordinator only. Chrome entry-bootstrap and background's menu lane
 * retain ownership. No provider requests, surface opening, or independent log. */
(() => {
  'use strict';
  const workerEpoch=crypto.randomUUID(),startedAt=new Date().toISOString();
  let adapters=null,repairing=null,lastRepair=0,repairAttempts=0;
  const keys=['entryPointEvidence','rightClickMenuStatus','toolbarOpenMode','cloudflareAuth','profiles','rightClickV3','rightClickV3Presentation','rightClickV3LevelScopes','rightClickActivatedBuckets','rightClickV3Inventory'];
  const timed=operation=>boundedEntry(operation,8000);
  const generation=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)?value:null;
  const safeEvent=e=>({schemaVersion:1,at:e.at,component:e.component,operation:e.operation,stage:e.stage,code:e.code,
    status:e.status||'unknown',attemptId:e.attemptId,workerEpoch:e.workerEpoch||null,version:e.version,recovery:e.recovery,
    ...(generation(e.generation)?{generation:e.generation}:{}),...(generation(e.nativeIdHash)?{nativeIdHash:e.nativeIdHash}:{}),
    ...(['CHROME_API_REJECTED','CHROME_ITEM_MISSING','CHROME_DUPLICATE_ID','CHROME_ACK_TIMEOUT','CHROME_OR_LOCAL_STATE'].includes(e.errorCategory)?{errorCategory:e.errorCategory}:{}),
    ...(Number.isFinite(e.durationMs)?{durationMs:e.durationMs}:{})});
  async function status(){
    let s;try{s=await timed(chrome.storage.local.get(keys));}catch{return {schemaVersion:1,bootId:workerEpoch,workerEpoch,extensionVersion:chrome.runtime.getManifest().version,startedAt,observedAt:new Date().toISOString(),overall:'blocked',components:{worker:{state:adapters?'ready':'degraded'},toolbar:{state:'unknown'},shelf:{state:'unknown'},nativeMenu:{state:'unknown',desiredGeneration:null,appliedGeneration:null,lastAcknowledgedAt:null},cloudflare:{state:'unknown'},defaultDestination:{state:'unknown'}},lastFailure:{component:'storage',stage:'snapshot',code:'STORAGE_UNAVAILABLE',at:new Date().toISOString()}};}
    const events=(Array.isArray(s.entryPointEvidence)?s.entryPointEvidence:[]).filter(e=>e.workerEpoch===workerEpoch);
    const menu=s.rightClickMenuStatus||{};
    let desired=null;try{desired=await timed(adapters?.menuKey());}catch{}
    const matched=desired&&desired===menu.appliedGeneration&&menu.state==='registered';
    const configured=events.filter(e=>['toolbar','popup'].includes(e.component)&&['TOOLBAR_CONFIGURED','SHELF_READY','ATTACHED_POPUP_ACCEPTED'].includes(e.code)).at(-1);
    const toolbarFailure=events.filter(e=>e.component==='toolbar'&&/FAILED|BLOCKED|UNAVAILABLE|PENDING|DEGRADED/.test(e.code)).at(-1);
    const toolbarUnhealthy=!!toolbarFailure&&(!configured||events.indexOf(toolbarFailure)>events.indexOf(configured));
    const shelf=events.filter(e=>e.stage==='shelf'&&e.operation==='open').at(-1);
    const auth=s.cloudflareAuth;
    let defaultReady=false;try{defaultReady=!!adapters?.defaultReady(s);}catch{}
    const components={worker:{state:globalThis.RedownWorkerCoreStatus==='failed'?'failed':adapters?'ready':'degraded'},
      toolbar:{state:toolbarUnhealthy?'degraded':configured?'ready':'unknown',evidenceLevel:toolbarFailure||configured?'api-result':'not-verifiable'},
      shelf:{state:shelf?.code==='SHELF_READY'?'ready':shelf?'degraded':'unknown',evidenceLevel:shelf?.code==='SHELF_READY'?'document-handshake':'not-verifiable'},
      nativeMenu:{state:matched?'registered':menu.state==='failed'?'failed':menu.state==='applying'?'repairing':'unknown',desiredGeneration:generation(desired),appliedGeneration:generation(menu.appliedGeneration),lastAcknowledgedAt:menu.lastAcknowledgedAt||null,evidenceLevel:matched?'acknowledged':'not-verifiable',visibleRows:'not-verifiable'},
      cloudflare:{state:!auth?.accessToken?'disconnected':auth.reconnectRequired||auth.expiresAt&&Date.now()>=auth.expiresAt?'expired':'connected',evidenceLevel:'stored-credential-only'},
      defaultDestination:{state:defaultReady?'ready':'needs-setup',evidenceLevel:'local-authorized-route'}};
    // Connected credentials and acknowledged menus are never a render/transfer certificate.
    const failure=events.filter(e=>/FAILED|BLOCKED|UNAVAILABLE|REJECTED/.test(e.code)).at(-1);
    return {schemaVersion:1,bootId:workerEpoch,workerEpoch,extensionVersion:chrome.runtime.getManifest().version,startedAt,observedAt:new Date().toISOString(),overall:globalThis.RedownWorkerCoreStatus==='failed'||!adapters?'blocked':!matched||toolbarUnhealthy?'degraded':components.shelf.state==='ready'?'ready':'unknown',components,
      lastFailure:failure?{component:failure.component,stage:failure.stage,code:failure.code,at:failure.at}:null};
  }
  async function history(input={}){
    if(!input||Object.keys(input).some(k=>k!=='limit')||input.limit!==undefined&&(!Number.isInteger(input.limit)||input.limit<1||input.limit>64))throw Error('Invalid history limit.');
    const s=await timed(chrome.storage.local.get('entryPointEvidence'));
    return {schemaVersion:1,workerEpoch,events:(Array.isArray(s.entryPointEvidence)?s.entryPointEvidence:[]).slice(-(input.limit||64)).map(safeEvent),limit:64,missingIntervals:'unknown'};
  }
  async function audit(){
    const snapshot=await status();
    const evidence=Object.entries(snapshot.components).map(([component,value])=>({component,stage:'audit',code:component==='nativeMenu'&&value.state==='repairing'?'INTERRUPTED_OR_PENDING_REGISTRATION':value.state.toUpperCase().replaceAll('-','_'),source:'local-snapshot',evidenceLevel:value.evidenceLevel||'worker-execution',generation:snapshot.components.nativeMenu.desiredGeneration,at:snapshot.observedAt,recoveryHint:['failed','unknown','repairing','degraded'].includes(value.state)?'Explicit local repair; inspect Chrome service-worker errors if unavailable.':null}));
    try{
      if(chrome.action.getPopup){const popup=await timed(chrome.action.getPopup({}));evidence.push({component:'toolbar',stage:'configuration',code:popup?'POPUP_CONFIGURED':'SHELF_GESTURE_HANDLER',source:'chrome.action.getPopup',evidenceLevel:'api-result',generation:null,at:new Date().toISOString(),recoveryHint:null});}
    }catch{evidence.push({component:'toolbar',stage:'configuration',code:'CONFIGURATION_UNAVAILABLE',source:'chrome.action.getPopup',evidenceLevel:'api-error',generation:null,at:new Date().toISOString(),recoveryHint:'Repair toolbar configuration.'});}
    return {schemaVersion:1,snapshot,evidence};
  }
  function repair(input={}){
    if(!input||Object.keys(input).some(k=>k!=='target')||!['all','toolbar','nativeMenu',undefined].includes(input.target))return Promise.reject(Error('Invalid repair target.'));
    if(repairing)return repairing;
    const target=input.target||'all';
    repairing=(async()=>{
      const before=await status(),attemptId=crypto.randomUUID(),attempted=[],acknowledged=[];
      if(Date.now()-lastRepair<1000*2**Math.max(0,repairAttempts-1)||repairAttempts>=3)return {schemaVersion:1,attemptId,attempted,acknowledged,snapshot:before,manualActionRequired:true,code:'REPAIR_BOUNDED'};
      const menu=input.target==='all'||target==='nativeMenu'||target==='all'&&before.components.nativeMenu.state!=='registered';
      const toolbar=input.target==='all'||target==='toolbar'||target==='all'&&before.components.toolbar.state==='degraded';
      if(menu||toolbar){lastRepair=Date.now();repairAttempts++;}
      for(const [component,needed,operation] of [['toolbar',toolbar,()=>applyToolbarOpenMode()],['nativeMenu',menu,()=>adapters?.repairMenu()]]){
        if(!needed)continue;attempted.push(component);
        try{if(!adapters)throw Error('Worker initialization incomplete');await timed(operation());acknowledged.push(component);entryEvidence(component,'repair','complete','REPAIR_ACKNOWLEDGED','acknowledged',attemptId);}
        catch{entryEvidence(component,'repair','complete','REPAIR_FAILED','failed',attemptId);}
      }
      await timed(entryEvidenceQueue).catch(()=>{});
      const snapshot=await status();
      return {schemaVersion:1,attemptId,attempted,acknowledged,snapshot,manualActionRequired:acknowledged.length!==attempted.length||snapshot.components.nativeMenu.state!=='registered'||snapshot.components.defaultDestination.state!=='ready',code:'REPAIR_COMPLETE'};
    })().finally(()=>{repairing=null;});
    return repairing;
  }
  globalThis.RedownBoot=Object.freeze({workerEpoch,configure:value=>{adapters=value;},status,audit,repair,history,
    query(operation,input){if(!['status','audit','repair','history'].includes(operation))throw Error('Unknown BOOT operation.');if(['status','audit'].includes(operation)&&input!==undefined&&Object.keys(input||{}).length)throw Error('Unexpected BOOT input.');return ({status,audit,repair,history})[operation](input);}});
})();

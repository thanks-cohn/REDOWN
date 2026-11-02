/* Worker glue only: no source bytes, OAuth tokens or native menu writer here. */
(() => {
  'use strict';
  let opening=Promise.resolve();
  function open(action,info={}){
    const operation=opening.catch(()=>{}).then(async()=>{
      const page=chrome.runtime.getURL('google-drive-transfer.html');
      const tabs=await chrome.tabs.query({url:page+'*'});
      const state=await chrome.storage.local.get(['googleDriveTransfer','googleDriveState']);
      if(tabs.length&&(state.googleDriveTransfer?.status==='active'||state.googleDriveState?.phase==='connecting')){await chrome.tabs.update(tabs[0].id,{active:true});return;}
      const id=crypto.randomUUID();
      await chrome.storage.session.set({['googleDriveJob:'+id]:{action,sourceUrl:info.srcUrl||info.linkUrl||info.pageUrl||'',at:Date.now()}});
      if(tabs.length)await chrome.tabs.update(tabs[0].id,{active:true,url:page+'?job='+id+'#'+id});
      else await chrome.tabs.create({url:page+'?job='+id+'#'+id});
    });opening=operation;return operation;
  }
  async function dispatch(info){
    if(info.menuItemId!=='provider:google-drive')return;
    const {googleDriveState:state}=await chrome.storage.local.get('googleDriveState');
    if(state?.phase==='connecting')return;
    return open(state?.phase==='connected'&&/^[\w-]+$/.test(state.folderId||'')?'save':'connect',info);
  }
  let record;
  function install(recorder){
    record=recorder;
    async function recoverClosedPage(){
      if((await chrome.tabs.query({url:chrome.runtime.getURL('google-drive-transfer.html')+'*'})).length)return;
      const s=await chrome.storage.local.get(['googleDriveState','googleDriveTransfer']);
      if(s.googleDriveState?.phase==='connecting')await chrome.storage.local.set({googleDriveState:{phase:'reconnect'}});
      if(s.googleDriveTransfer?.status==='active'){
        await chrome.storage.local.set({googleDriveTransfer:{status:'uncertain'}});
        await record({provider:'Google Drive',profileName:'REDOWN',status:'uncertain',transport:'browser-mediated',error:'Transfer tab closed or interrupted. Check Google Drive before retrying.'});
      }
    }
    chrome.tabs.onRemoved.addListener(()=>{void recoverClosedPage().catch(()=>{});});
    void recoverClosedPage().catch(()=>{});
  }
  const ownsMessage=message=>['googleDriveOpen','googleDriveReceipt'].includes(message?.type);
  async function message(message,sender){
    const allowed=[chrome.runtime.getURL('shelf.html'),chrome.runtime.getURL('google-drive-transfer.html')];
    if(sender.id!==chrome.runtime.id||!allowed.includes(sender.url?.split(/[?#]/)[0]))return {ok:false};
    if(message.type==='googleDriveOpen'){await open('connect');return {ok:true};}
    if(message.type!=='googleDriveReceipt'||sender.url?.split(/[?#]/)[0]!==allowed[1])return {ok:false};
    const r=message.receipt;
    if(!r||!['completed','failed','cancelled','blocked','uncertain'].includes(r.status))return {ok:false};
    const complete=r.status==='completed'&&/^[\w-]+$/.test(r.fileId||'')&&/^[\w-]+$/.test(r.folderId||'')&&Number.isSafeInteger(r.bytes)&&r.bytes>=0;
    if(r.status==='completed'&&!complete)return {ok:false};
    await record({provider:'Google Drive',profileName:'REDOWN',filename:String(r.name||'Web file').slice(0,240),status:r.status,ok:complete?true:r.status==='failed'||r.status==='blocked'?false:undefined,verified:complete,location:complete?'https://drive.google.com/file/d/'+r.fileId+'/view':'',destination:{provider:'google-drive',folderId:r.folderId,fileId:r.fileId},bytes:r.bytes,transport:'browser-mediated',error:complete?undefined:'Google Drive: '+r.status});
    return {ok:true};
  }
  globalThis.RedownGoogleDriveProvider={dispatch,install,ownsMessage,message};
})();

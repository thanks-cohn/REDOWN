/* Fail-closed staging adapter: the request's real-Chrome OAuth gate is blocked.
 * No authentication assumptions, tokens, transfer pages or uploads are enabled.
 * Replace this gate only after recorded real Chrome code redemption and root proof.
 */
(() => {
  'use strict';
  const CODE='ONEDRIVE_OAUTH_NOT_VERIFIED';
  const error='OneDrive is unavailable: Microsoft OAuth token exchange has not been verified in the registered Chrome extension. See the OneDrive implementation report.';
  function create({chrome=globalThis.chrome,diagnostic=globalThis.RedownOneDriveOAuthDiagnostic?.create()}={}){
    const seen=new WeakSet();
    async function blocked(){
      await chrome.storage.local.set({'onedrive:state':{phase:'blocked',code:CODE,error},'onedrive:transfer':{status:'blocked',code:CODE,error}});
      return {ok:false,code:CODE,error};
    }
    async function dispatch(info){
      if(!RedownOneDriveMenu.owns(info?.menuItemId)||seen.has(info))return;
      seen.add(info);
      // Unknown/stale IDs are consumed here, never forwarded to V3 or a provider.
      if(!['provider:onedrive','provider:onedrive:connect'].includes(info.menuItemId)){
        await chrome.storage.local.set({'onedrive:transfer':{status:'blocked',code:'ONEDRIVE_STALE_MENU',error:'This OneDrive action is no longer available. Reopen the menu.'}});return;
      }
      return blocked();
    }
    const ownsMessage=m=>['onedriveConnect','onedriveDisconnect','onedriveStatus','onedriveCancel','onedriveDiagnostic'].includes(m?.type);
    async function message(m,sender){
      if(sender?.id!==chrome.runtime.id||sender.url?.split(/[?#]/)[0]!==chrome.runtime.getURL('shelf.html'))return {ok:false,code:'ONEDRIVE_UNTRUSTED_SENDER'};
      // An explicit Shelf-only test. Never promotes state to connected or enables saves.\n      if(m.type==='onedriveDiagnostic')return diagnostic?.run()||{ok:false,code:'ONEDRIVE_DIAGNOSTIC_UNAVAILABLE'};\n      if(m.type==='onedriveDisconnect'){
        await chrome.storage.local.remove(['onedrive:auth','onedrive:state','onedrive:transfer']);
        await chrome.storage.session?.remove('onedrive:oauth');return {ok:true};
      }
      if(m.type==='onedriveCancel')return {ok:true}; // No queue is enabled.
      if(['onedriveConnect','onedriveStatus'].includes(m.type))return blocked();
      return {ok:false,code:'ONEDRIVE_UNKNOWN_MESSAGE'};
    }
    return {dispatch,ownsMessage,message};
  }
  globalThis.RedownOneDriveProvider={create,CODE,error};
})();

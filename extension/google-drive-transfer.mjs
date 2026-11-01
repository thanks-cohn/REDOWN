import {makeDrive,sourceURL,MAX_BYTES} from './google-drive-api.mjs';
const $=id=>document.getElementById(id),drive=makeDrive({chrome});
let source='',sourceError='',controller=null,busy=false,ready=false,finished=false;
const status=message=>{$('drive-status').textContent=message;};
function paint(){ $('connect').disabled=busy;$('disconnect').hidden=!ready;$('disconnect').disabled=busy;$('save').hidden=!source||!ready||finished;$('save').disabled=busy;$('cancel').hidden=!controller; }
async function connect(interactive){busy=true;paint();status('Connecting to Google Drive…');try{const r=await drive.connect(interactive);ready=true;$('connect').textContent='Reconnect Google Drive';$('folder').href='https://drive.google.com/drive/folders/'+r.folderId;$('folder').hidden=false;status('Google Drive connected. REDOWN folder verified.');}catch(e){ready=false;$('folder').hidden=true;status(e.code||'Google login cancelled or unavailable. Check the OAuth test-user and extension ID configuration, then reconnect.');}finally{busy=false;paint();}}
$('connect').onclick=()=>connect(true);
$('disconnect').onclick=async()=>{await drive.disconnect();ready=false;$('folder').hidden=true;$('connect').textContent='Log in to Google Drive';status('Google Drive disconnected. Saved files remain in Drive.');paint();};
$('cancel').onclick=()=>controller?.abort();
async function save(preauthorized=false){
  // Permission request is directly within the user's click gesture.
  let u;try{u=sourceURL(source);}catch(e){status(e.code);return;}
  const access={origins:[u.origin+'/*']};
  let granted=false;
  try{granted=preauthorized||await chrome.permissions.request(access);}catch{}
  if(!granted){status('Source access was denied or unavailable. No file was saved.');await chrome.runtime.sendMessage({type:'googleDriveReceipt',receipt:{status:'blocked'}}).catch(()=>{});return;}
  controller=new AbortController();const deadline=setTimeout(()=>controller?.abort(),10*60*1000);busy=true;paint();$('progress').hidden=false;
  let receipt;
  try{
    await chrome.storage.local.set({googleDriveTransfer:{status:'active'}});
    receipt=await drive.upload(source,{signal:controller.signal,onProgress:(phase,bytes)=>{$('progress').value=bytes;status(phase+' · '+(bytes/1048576).toFixed(1)+' MiB');}});finished=true;$('result').href='https://drive.google.com/file/d/'+receipt.fileId+'/view';$('result').hidden=false;status('Saved and verified in Google Drive.');}
  catch(e){receipt={status:controller.signal.aborted?'cancelled':e.status||'failed'};status(typeof e.code==='string'?e.code:controller.signal.aborted?'Transfer cancelled. Check Google Drive before retrying.':'Transfer interrupted. Check Google Drive before trying again.');if(e.code==='Reconnect Google Drive.')ready=false;}
  finally{clearTimeout(deadline);controller=null;busy=false;paint();$('progress').hidden=true;}
  try{
    await chrome.storage.local.set({googleDriveTransfer:{status:receipt.status}});
    const r=await chrome.runtime.sendMessage({type:'googleDriveReceipt',receipt});if(!r?.ok)status($('drive-status').textContent+' Transfer history could not be updated.');}catch{status($('drive-status').textContent+' Transfer history could not be updated.');}
};
$('save').onclick=()=>void save();
window.addEventListener('beforeunload',event=>{if(controller){event.preventDefault();event.returnValue='';}});
let interactive=false;
const id=location.hash.slice(1);
if(/^[\w-]+$/.test(id)){
  const key='googleDriveJob:'+id,job=(await chrome.storage.session.get(key))[key];await chrome.storage.session.remove(key);
  interactive=job?.action==='connect'&&Date.now()-job.at<15*60*1000;
  if(job&&Date.now()-job.at<15*60*1000&&job.action==='save'){
    try{const u=sourceURL(job.sourceUrl);source=u.href;$('source').textContent='Source: '+u.hostname+' · limit '+MAX_BYTES/1048576+' MiB';}catch(e){sourceError=e.code;}
  }
}
const prior=(await chrome.storage.local.get('googleDriveTransfer')).googleDriveTransfer;
if(prior?.status==='active'){
  await chrome.storage.local.set({googleDriveTransfer:{status:'uncertain'}});
  await chrome.runtime.sendMessage({type:'googleDriveReceipt',receipt:{status:'uncertain'}}).catch(()=>{});
}
await connect(interactive);
if(sourceError)status(sourceError);
if(prior?.status==='active'||prior?.status==='uncertain')status($('drive-status').textContent+' An earlier transfer was interrupted. Check Google Drive before retrying.');

if(source&&ready&&await chrome.permissions.contains({origins:[sourceURL(source).origin+'/*']}))void save(true);

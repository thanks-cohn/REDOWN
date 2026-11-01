(() => {
  'use strict';
  const $=id=>document.getElementById(id),status=$('directory-backup-status'),password=$('directory-backup-passphrase'),policy=$('directory-history-policy');
  if(!status)return;
  const store=RedownRightClickCurrent.create(),codec=RedownRightClickBackup;
  let busy=false;
  const run=async work=>{if(busy)return;busy=true;try{await work();}catch(e){status.textContent=e?.name==='AbortError'?'Cancelled.':e.message||'Directory backup failed.';}finally{busy=false;password.value='';}};
  const options={types:[{description:'Encrypted REDOWN directory backup',accept:{'application/json':['.json']}}],excludeAcceptAllOption:true};
  void chrome.storage.local.get(['rightClickExternalBackup','rightClickHistoryPolicy']).then(s=>{policy.value=s.rightClickHistoryPolicy||'daily';status.textContent=s.rightClickExternalBackup?.verifiedAt?'External backup last verified '+new Date(s.rightClickExternalBackup.verifiedAt).toLocaleString()+'. Keep that file and its passphrase.':'External backup not configured. Local records alone cannot survive deletion of extension data.';});
  policy.onchange=()=>{void chrome.storage.local.set({rightClickHistoryPolicy:policy.value}).catch(()=>{status.textContent='History preference could not be saved.';});};
  $('directory-backup-export').onclick=()=>run(async()=>{
    const passphrase=password.value;if(passphrase.length<12)throw Error('Use a backup passphrase of at least 12 characters.');
    // Open the native file picker during the user gesture, before crypto awaits.
    const handle=globalThis.showSaveFilePicker?await showSaveFilePicker({...options,suggestedName:'redown-directory-backup.json'}):null;
    const bundle=await store.dump(),text=await codec.encode(bundle,passphrase);
    if(handle){
      const writer=await handle.createWritable();await writer.write(text);await writer.close();
      const readback=await (await handle.getFile()).text();
      const verified=await codec.decode(readback,passphrase);if(JSON.stringify(verified)!==JSON.stringify(bundle))throw Error('External backup read-back did not match. Retry export.');
      const verifiedAt=Date.now();await chrome.storage.local.set({rightClickExternalBackup:{version:1,verifiedAt,method:'user-selected-file-readback'}});
      status.textContent='External encrypted backup verified '+new Date(verifiedAt).toLocaleString()+'. Keep the file and passphrase outside your browser profile.';
    }else{
      const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='redown-directory-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent='Encrypted download requested. External storage and read-back are not verified in this browser. Keep the file and passphrase outside your browser profile.';
    }
  });
  $('directory-backup-import').onclick=()=>run(async()=>{
    const passphrase=password.value;if(passphrase.length<12)throw Error('Enter the backup passphrase.');
    if(!globalThis.showOpenFilePicker)throw Error('Directory restore requires a browser that supports choosing local files.');
    const [handle]=await showOpenFilePicker({...options,multiple:false}),file=await handle.getFile();if(file.size>48*1024*1024)throw Error('Backup file is too large.');
    const bundle=await codec.decode(await file.text(),passphrase);
    const {profiles=[]}=await chrome.storage.local.get('profiles');if(profiles.length)throw Error('Restore in a fresh extension profile before reconnecting providers. Existing cloud authorization cannot be reused by a backup.');
    await store.restore(bundle);
    // Existing background activation reads CURRENT and repairs the UI mirror.
    const applied=await chrome.runtime.sendMessage({type:'rightClickRestoreCommitted'});
    if(!applied?.ok)throw Error('Directory records restored; Chrome menu application is pending. Open Right-click Setup and retry Apply.');
    status.textContent='Directory records restored. Reconnect the exact cloud accounts and review each destination in Right-click Setup. No cloud credentials were restored.';
  });
})();

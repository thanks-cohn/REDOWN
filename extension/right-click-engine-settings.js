/* V3 migration recovery, no runtime engine selection. */
(() => {
  const button=document.getElementById('right-click-recovery'),status=document.getElementById('right-click-recovery-status');
  if(!button)return;
  const load=async()=>{const s=await chrome.storage.local.get('rightClickV3Migration');const count=s.rightClickV3Migration?.recovery?.length||0;status.textContent=count?count+' saved destinations need review. Export recovery to preserve their original paths and labels.':'';};
  void load();
  button.onclick=async()=>{
    try{
      const s=await chrome.storage.local.get(['rightClickV3Migration','rightClickV3Recovery']);
      const original=s.rightClickV3Recovery?.original||{};
      // Export menu data only, never profile tokens or Worker credentials.
      const fields=['id','type','accountId','accountName','bucketName','name','defaultPrefix','simpleBucketName','menuLabel','menuOrder','simplePrimaryEnabled','simplePrimaryOrder','showInContextMenu','simpleOptions','nestedMenu','menuTree','explorerManaged'];
      const recovery={version:1,migration:s.rightClickV3Migration,config:original.rightClickV3,profiles:(original.profiles||[]).map(p=>Object.fromEntries(fields.filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]])))};
      const url=URL.createObjectURL(new Blob([JSON.stringify(recovery,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='redown-destination-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent='Destination recovery exported. Original paths and labels remain saved locally.';
    }catch{status.textContent='Recovery export failed. Retry from Settings.';}
  };
})();

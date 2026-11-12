/* Two additional explicit local exports. Existing diagnostic handlers are untouched. */
(() => {
  let reader;
  for(const [id,mode] of [['forensic-export-raw','RAW'],['forensic-export-secure','SECURE']])document.getElementById(id)?.addEventListener('click',async()=>{
    if(globalThis.top!==globalThis.self)return;
    if(mode==='RAW'&&!window.confirm('PRIVATE RAW DIAGNOSTICS: This ZIP contains complete source/webpage URLs, which may include signed secrets, account and destination identifiers, filenames and original errors. Review it locally before sharing. Export RAW data?'))return;
    const button=document.getElementById(id),output=document.getElementById('forensic-export-status');button.disabled=true;
    try{
      reader ||= RedownForensicDiagnostics.create();
      const snapshot=await reader.snapshot();let legacy=[];
      try{legacy=(await chrome.storage.local.get('redownSaveAttempts')).redownSaveAttempts;}catch{snapshot.completeness.legacyRead='unavailable';}
      const bundle=await RedownForensicDiagnostics.build(snapshot,mode,legacy),files={};
      for(const [name,value] of Object.entries(bundle.files))files[name]=new TextEncoder().encode(value);
      const bytes=fflate.zipSync(files,{level:6}),url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),link=document.createElement('a');
      link.href=url;link.download=bundle.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
      output.textContent=`Saved ${bundle.filename}. ${snapshot.completeness.storedRecords} recorded events; at least ${snapshot.completeness.droppedRecords} dropped/expired; storage failures (at least) ${snapshot.completeness.storageFailureCount}. Evidence is bounded and may be incomplete.`;
    }catch{output.textContent='Forensic storage is unavailable. No complete export was produced; existing diagnostic buttons remain available.';}
    finally{button.disabled=false;}
  });
})();

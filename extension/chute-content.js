/* Adapted from Chute 3f9033b content.js:deliverChuteFile and drop-lifecycle.js.
 * Copyright (c) 2026 Chute contributors. See CHUTE-LICENSE.txt.
 * REDOWN changes: bounded chunk transport, trusted-drop guard, no localhost,
 * no source URLs, no basket/UI interception, no successful-upload claim. */
(() => {
  'use strict';
  if(window.top!==window)return;
  const TYPE='application/x-redown-chute-v1';let delivering=false;
  const valid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
  function idFor(transfer){
    // Never intercept an unrelated text, URL or OS file drag during the relay TTL.
    if(!Array.from(transfer?.types||[]).includes(TYPE))return null;
    let id;try{id=transfer.getData(TYPE);}catch{}// Only the actual drop reference authorizes a claim.
    return valid(id)?id:null;
  }
  function notice(message){
    const n=document.createElement('div');n.setAttribute('role','status');n.textContent=message;
    Object.assign(n.style,{position:'fixed',bottom:'16px',right:'16px',maxWidth:'320px',padding:'12px',background:'#20251c',color:'#fff',borderRadius:'8px',zIndex:'2147483647',pointerEvents:'none'});
    document.documentElement.append(n);setTimeout(()=>n.remove(),6000);
  }
  const send=async m=>{const r=await chrome.runtime.sendMessage(m);if(!r?.ok)throw Error('File handoff unavailable. Drag again in REDOWN.');return r;};
  async function deliver(target,id){
    delivering=true;let state='failed',code='CLAIM_FAILED';
    try{
      const meta=await send({type:'redownChuteV1.claim',id});
      if(!Number.isSafeInteger(meta.size)||meta.size<0||!Number.isSafeInteger(meta.maxBytes)||meta.size>meta.maxBytes)throw Error('File exceeds the browser handoff budget.');
      code='CHUNK_FAILED';const chunks=[];let offset=0;
      while(offset<meta.size){
        const part=await send({type:'redownChuteV1.chunk',id,offset});
        if(!Array.isArray(part.bytes)||!part.bytes.length||part.bytes.length>128*1024||offset+part.bytes.length>meta.size)throw Error('Incomplete file handoff.');
        const chunk=Uint8Array.from(part.bytes);chunks.push(chunk);offset+=chunk.length;
      }
      code='TARGET_REJECTED';if(!target.isConnected)throw Error('Upload target disappeared.');
      const file=new File(chunks,meta.name,{type:meta.mime||'application/octet-stream',lastModified:Date.now()});chunks.length=0;
      const transfer=new DataTransfer();transfer.items.add(file);transfer.effectAllowed='copy';
      const input=target.matches('input[type="file"]')?target:target.closest('label')?.querySelector('input[type="file"]');
      if(input){
        if(input.disabled)throw Error('This upload input is disabled.');
        const accepts=input.accept.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
        if(accepts.length&&!accepts.some(s=>s.startsWith('.')?file.name.toLowerCase().endsWith(s):s.endsWith('/*')?file.type.startsWith(s.slice(0,-1)):s===file.type))throw Error('This upload input does not accept this file type.');
        input.files=transfer.files;
        input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
      }else{
        globalThis.RedownChuteImageTargets?.activate();
        const options={bubbles:true,cancelable:true,dataTransfer:transfer};
        target.dispatchEvent(new DragEvent('dragenter',options));target.dispatchEvent(new DragEvent('dragover',options));target.dispatchEvent(new DragEvent('drop',options));
      }
      state='drop_dispatched';code='NONE';
      notice('REDOWN dispatched the file. Check the destination attachment before continuing. Upload completion is unverified.');
      // Chute overlay cleanup runs after the site's drop handler.
      setTimeout(()=>{
        for(const node of new Set([target,document.body,document.documentElement,document,window])){
          for(const type of ['dragleave','dragend'])try{node.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:transfer}));}catch{}
        }
      },80);
    }catch{notice('REDOWN could not hand off this file. Drag again, or use Download and the destination file picker.');}
    finally{delivering=false;void chrome.runtime.sendMessage({type:'redownChuteV1.finish',id,state,code}).catch(()=>{});}
  }
  document.addEventListener('dragover',event=>{
    // Protected dragover hides getData; arm/reservation can still be in flight.
    // Accept only our private MIME here; the trusted drop must supply a valid,
    // armed one-use reference before any bytes can be claimed.
    if(!event.isTrusted||delivering||!Array.from(event.dataTransfer?.types||[]).includes(TYPE))return;
    event.preventDefault();event.dataTransfer.dropEffect='copy';
  },true);
  document.addEventListener('drop',event=>{
    if(!event.isTrusted||delivering)return;const id=idFor(event.dataTransfer);if(!id||!(event.target instanceof Element))return;
    event.preventDefault();
    // Chute preserves ChatGPT's trusted lifecycle so its overlay can close.
    if(!/(^|\.)chatgpt\.com$/.test(location.hostname))event.stopImmediatePropagation();
    void deliver(event.target,id);
  },true);
})();

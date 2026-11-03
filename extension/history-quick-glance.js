/* Bounded, disposable preview session. Rows and History records belong to History. */
(() => {
  'use strict';
  const BATCH=10,CONCURRENCY=3,WINDOW=30;
  async function decode(blob,signal){
    const bitmap=await createImageBitmap(blob,{resizeWidth:256,resizeQuality:'low'});
    try{
      signal.throwIfAborted();
      if(bitmap.height>1024||!bitmap.height)throw Error('Preview dimensions unavailable');
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      canvas.getContext('2d').drawImage(bitmap,0,0);
      const small=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      signal.throwIfAborted();if(!small)throw Error('Preview unavailable');
      return URL.createObjectURL(small);
    }finally{bitmap.close();}
  }
  function create({root,source=RedownHistoryImageSource.shared(),placeholder=HistoryImagePlaceholder,
    decodeImage=decode,IntersectionObserver=globalThis.IntersectionObserver,revoke=url=>URL.revokeObjectURL(url)}={}){
    const entries=[],near=new Set();let disposed=false,running=0,desired=new Set(),scheduled=false,windowStart=0,windowEnd=WINDOW;
    const visible=()=>!document.hidden&&!root.hidden&&location.hash==='#history';
    const expanded=slot=>{for(let p=slot.parentElement;p&&p!==root;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return false;return true;};
    function release(entry){
      entry.controller?.abort();entry.controller=null;
      if(entry.url){revoke(entry.url);entry.url=null;}
      entry.image?.remove();entry.image=null;
      entry.originDot?.remove();entry.originDot=null;
      if(entry.state!=='failed')entry.state='idle';
      entry.slot.dataset.state=entry.state;
    }
    function windowAt(index){
      const start=Math.max(0,Math.floor(index/BATCH)*BATCH-BATCH),end=start+WINDOW;
      windowStart=start;windowEnd=end;
      for(const entry of entries)if(entry.index<start||entry.index>=end)release(entry);
      desired=new Set([...desired].filter(i=>i>=start&&i<end));
    }
    function admit(index){
      const start=Math.floor(index/BATCH)*BATCH;
      for(let i=start;i<Math.min(entries.length,start+BATCH);i++)if(i>=windowStart&&i<windowEnd)desired.add(i);
    }
    function pump(){
      if(disposed||!visible())return;
      for(const i of desired){
        if(running>=CONCURRENCY)break;
        const entry=entries[i];if(!entry||entry.state!=='idle'||!expanded(entry.slot))continue;
        running++;entry.state='loading';entry.slot.dataset.state='loading';
        const controller=new AbortController();entry.controller=controller;
        const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]);
        void source.resolve(entry.record,signal,blob=>decodeImage(blob,signal)).then(result=>{
          const url=result?.image;
          if(disposed||entry.controller!==controller||controller.signal.aborted||!desired.has(i)||!visible()){
            if(url)revoke(url);return;
          }
          if(!url){entry.state='failed';entry.slot.dataset.state='failed';return;}
          const image=document.createElement('img');image.alt='';image.width=256;image.height=256;
          image.src=url;entry.url=url;entry.image=image;
          // decodeImage has already decoded and resized the bytes. Keep the
          // placeholder until the final small image is ready for presentation.
          return image.decode().then(()=>{
            if(entry.controller!==controller)return;
            if(disposed||controller.signal.aborted||!desired.has(i)||!visible())return release(entry);
            const dot=document.createElement('span');
            dot.className='history-image-origin';
            dot.dataset.origin=result.origin;
            dot.title=result.origin==='cloud'?'Preview from your cloud':'Preview from original source';
            dot.setAttribute('role','img');
            dot.setAttribute('aria-label',dot.title);
            entry.originDot=dot;
            entry.slot.append(image);entry.originContainer.append(dot);entry.state='ready';entry.slot.dataset.state='ready';
          }).catch(()=>{if(entry.controller!==controller)return;release(entry);entry.state='failed';entry.slot.dataset.state='failed';});
        }).catch(()=>{
          if(!controller.signal.aborted){entry.state='failed';entry.slot.dataset.state='failed';}
        }).finally(()=>{
          if(entry.controller===controller){entry.controller=null;if(entry.state==='loading'){entry.state='idle';entry.slot.dataset.state='idle';}}
          running--;pump();
        });
      }
    }
    function attach(body,record,{originContainer=body}={}){
      if(!RedownHistoryImageSource.eligible(record))return;
      const slot=document.createElement('div');slot.className='history-image-slot';
      slot.dataset.state='idle';slot.dataset.visible='false';slot.setAttribute('aria-label','Image preview');
      const loading=placeholder.render(document);loading.classList.add('history-image-placeholder');
      slot.append(loading);body.append(slot);
      if(record.ok===false)slot.classList.add('history-image-recovery');
      const entry={record,slot,originContainer,index:entries.length,state:'idle'};entries.push(entry);
    }
    let observer,animationObserver;
    const reconcile=()=>{
      if(disposed)return;
      for(const entry of entries)if(!expanded(entry.slot)){near.delete(entry.index);release(entry);desired.delete(entry.index);}
      const first=[...near].filter(i=>expanded(entries[i].slot)).sort((a,b)=>a-b)[0];
      if(first!==undefined){windowAt(first);for(const i of near)if(i>=first&&i<first+WINDOW&&expanded(entries[i].slot))admit(i);}
      pump();
    };
    function scan(){
      scheduled=false;if(!visible())return;
      near.clear();
      entries.forEach(entry=>{
        const rect=entry.slot.getBoundingClientRect(),shown=expanded(entry.slot)&&rect.bottom>0&&rect.top<innerHeight;
        entry.slot.dataset.visible=String(shown);
        if(expanded(entry.slot)&&rect.bottom>-500&&rect.top<innerHeight+500)near.add(entry.index);
      });reconcile();
    }
    const onScroll=()=>{if(!IntersectionObserver&&!scheduled){scheduled=true;requestAnimationFrame(scan);}};
    const onToggle=()=>{if(!IntersectionObserver)onScroll();else reconcile();};
    function start(){
      if(disposed)return;
      const first=entries.find(e=>expanded(e.slot));if(first){admit(first.index);pump();}
      if(IntersectionObserver){
        observer=new IntersectionObserver(changes=>{
          for(const change of changes){const i=Number(change.target.dataset.previewIndex);if(change.isIntersecting)near.add(i);else near.delete(i);}reconcile();
        },{rootMargin:'500px 0px'});
        animationObserver=new IntersectionObserver(changes=>{
          for(const change of changes)change.target.dataset.visible=String(change.isIntersecting&&visible());
        });
        entries.forEach(e=>{e.slot.dataset.previewIndex=e.index;observer.observe(e.slot);animationObserver.observe(e.slot);});
      }
      root.addEventListener('toggle',onToggle,true);
      document.addEventListener('scroll',onScroll,true);
    }
    function dispose(){
      if(disposed)return;disposed=true;observer?.disconnect();animationObserver?.disconnect();
      root.removeEventListener('toggle',onToggle,true);document.removeEventListener('scroll',onScroll,true);
      for(const entry of entries){entry.slot.dataset.visible='false';release(entry);}desired.clear();near.clear();
    }
    return {attach,start,dispose};
  }
  globalThis.RedownHistoryQuickGlance={create,BATCH,CONCURRENCY,WINDOW};
})();

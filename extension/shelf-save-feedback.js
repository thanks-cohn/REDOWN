/* Presentation only. Arrival is not a cloud receipt. Hydration never celebrates. */
(() => {
  const root=document.documentElement;
  const cards=new Map([...document.querySelectorAll('#clouds-view [data-provider]')].map(card=>[card.dataset.provider,card]));
  const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const visible=()=>document.visibilityState!=='hidden'&&!document.getElementById('clouds-view')?.hidden;
  const runs=new Map(),seen=new Set();
  let pulseTimer,pendingImpact,impactId,impactAt=0,epoch=0;
  const fresh=at=>Number.isFinite(at)&&Date.now()-at>=0&&Date.now()-at<3000;
  function impact(value){
    const at=typeof value==='number'?value:value?.at,id=value?.id||at;
    if(!fresh(at)||id===impactId||at<impactAt)return;
    if(!visible()){pendingImpact=value;return;}
    impactId=id;impactAt=at;pendingImpact=null;
    root.removeAttribute('data-save-impact');void root.offsetWidth;
    root.dataset.saveImpact='true';clearTimeout(pulseTimer);
    pulseTimer=setTimeout(()=>root.removeAttribute('data-save-impact'),850);
  }
  function cleanup(provider){
    const run=runs.get(provider);if(!run)return;
    run.timers.forEach(clearTimeout);run.node.remove();runs.delete(provider);
  }
  function celebrate(receipt){
    if(!receipt||seen.has(receipt.id)||!cards.has(receipt.provider))return;
    seen.add(receipt.id);
    if(!fresh(receipt.at)||!visible())return;
    const provider=receipt.provider,card=cards.get(provider);
    cleanup(provider);
    const node=document.createElement('span');node.className='provider-save-success';node.setAttribute('aria-hidden','true');
    card.querySelector('.provider-save-readout').append(node);
    const run={node,timers:[]};runs.set(provider,run);
    const schedule=(ms,fn)=>run.timers.push(setTimeout(()=>{fn();fit();},ms));
    const word='SUCCESS!',neon=root.dataset.shelfTheme==='neon';
    card.querySelector('.provider-save-announcement').textContent=`${provider==='google'?'Google Drive':provider}: save verified.`;
    if(reduced()){node.textContent=word;fit();schedule(1600,()=>cleanup(provider));return;}
    if(neon){
      node.textContent=word;
      // Whole word, dual ink on every visible frame; no third held appearance.
      schedule(180,()=>node.style.visibility='hidden');
      schedule(330,()=>node.style.visibility='visible');
      schedule(540,()=>cleanup(provider));
    }else{
      node.textContent='S';
      for(let i=2;i<=word.length;i++)schedule((i-1)*75,()=>node.textContent=word.slice(0,i));
      schedule(750,()=>node.style.visibility='hidden');
      schedule(920,()=>node.style.visibility='visible');
      schedule(1110,()=>node.style.visibility='hidden');
      schedule(1280,()=>node.style.visibility='visible');
      schedule(2200,()=>cleanup(provider));
    }
    fit();
  }
  function fit(){
    for(const card of cards.values()){
      for(const count of card.querySelectorAll('.provider-save-count,.provider-save-success')){
        count.style.fontSize='';
        const parentStyle=getComputedStyle(count.parentElement);
        const available=count.parentElement.clientWidth-parseFloat(parentStyle.paddingLeft)-parseFloat(parentStyle.paddingRight);
        if(available&&count.scrollWidth>available){
          const size=parseFloat(getComputedStyle(count).fontSize);
          count.style.fontSize=Math.max(1,size*available/count.scrollWidth*.96)+'px';
        }
      }
    }
  }
  function paint(state){
    for(const [provider,card] of cards){
      const value=state?.totals?.[provider]||'0';
      if(!/^(0|[1-9]\d*)$/.test(value))continue;
      card.querySelector('.provider-save-count').textContent=value;
      card.querySelector('.provider-save-readout').title=state?.startedAt?
        'Verified saves recorded since '+new Date(state.startedAt).toLocaleDateString()+'. Earlier saves are not included.':
        'Verified saves from this update onward. Earlier saves are not included.';
    }
    fit();
  }
  for(const card of cards.values()){
    const readout=document.createElement('div');readout.className='provider-save-readout';
    const caption=document.createElement('small');caption.className='provider-save-caption';caption.textContent='Verified · from this update';
    const count=document.createElement('span');count.className='provider-save-count';count.textContent='0';
    const announcement=document.createElement('span');announcement.className='provider-save-announcement';announcement.setAttribute('role','status');
    readout.append(count,caption,announcement);card.append(readout);
  }
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.redownShelfImpact)impact(changes.redownShelfImpact.newValue);
    if(changes.providerSaveReceipts){epoch++;const state=changes.providerSaveReceipts.newValue;paint(state);celebrate(state?.latest);}
  });
  const ticket=epoch;
  void chrome.storage.local.get(['providerSaveReceipts','redownShelfImpact']).then(data=>{
    if(ticket===epoch)paint(data.providerSaveReceipts);
    impact(data.redownShelfImpact);
  }).catch(()=>{});
  const reset=()=>{for(const provider of runs.keys())cleanup(provider);clearTimeout(pulseTimer);root.removeAttribute('data-save-impact');};
  document.addEventListener('visibilitychange',()=>{if(!visible())reset();else if(pendingImpact)impact(pendingImpact);});
  window.addEventListener('hashchange',reset);window.addEventListener('pagehide',reset);
  new MutationObserver(()=>{reset();fit();}).observe(root,{attributes:true,attributeFilter:['data-shelf-theme']});
  if(globalThis.ResizeObserver)new ResizeObserver(fit).observe(document.body);
})();

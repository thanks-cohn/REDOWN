/* Presentation only. Arrival is not a cloud receipt. Hydration never celebrates. */
(() => {
  const root=document.documentElement;
  const cards=new Map([...document.querySelectorAll('#clouds-view [data-provider]')].map(card=>[card.dataset.provider,card]));
  const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const visible=()=>document.visibilityState!=='hidden'&&!document.getElementById('clouds-view')?.hidden;
  const runs=new Map(),seen=new Set();
  let dropboxState,dropboxEpoch=0;
  let pulseTimer,pendingImpact,pendingReceipt,impactId,impactAt=0,epoch=0;
  // A verified upload's storage notification may reach an inactive Shelf just
  // before Chrome reveals it again. Allow a brief live-event handoff, NEVER
  // replay a receipt merely because it was read during startup hydration.
  const fresh=at=>Number.isFinite(at)&&Date.now()-at>=0&&Date.now()-at<3000;
  const freshReceipt=at=>Number.isFinite(at)&&Date.now()-at>=0&&Date.now()-at<20000;
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
    if(receipt?.verified!==true||!receipt.id?.startsWith(receipt.provider+':')||seen.has(receipt.id)||!cards.has(receipt.provider))return;
    if(!freshReceipt(receipt.at))return;
    // One worker may commit the proven Dropbox receipt before its connection
    // state change reaches this Shelf. Do not consume the celebration ID until
    // its original account/connection identity is validated.
    if(receipt.provider==='dropbox'&&!(dropboxState?.phase==='connected'&&dropboxState.accountId===receipt.accountId&&dropboxState.connectionId===receipt.connectionId)){
      if(!dropboxState)pendingReceipt=receipt;
      return;
    }
    if(!visible()){pendingReceipt=receipt;return;}
    const provider=receipt.provider,card=cards.get(provider);
    const stage=card.querySelector('.provider-save-readout');
    if(!stage)return;
    seen.add(receipt.id);
    if(pendingReceipt?.id===receipt.id)pendingReceipt=null;
    cleanup(provider);
    const node=document.createElement('span');node.className='provider-save-success';node.setAttribute('aria-hidden','true');
    stage.append(node);
    const run={node,timers:[]};runs.set(provider,run);
    const schedule=(ms,fn)=>run.timers.push(setTimeout(()=>{fn();fit();},ms));
    const word='SUCCESS!',neon=root.dataset.shelfTheme==='neon';
    stage.querySelector('.provider-save-announcement').textContent=`${provider==='google'?'Google Drive':provider}: save verified.`;
    if(reduced()){node.textContent=word;fit();schedule(1600,()=>cleanup(provider));return;}
    if(neon){
      node.textContent=word;
      // Whole word alternates the established ink with bright money green.
      for(let i=1;i<=5;i++)schedule(i*160,()=>node.classList.toggle('money-flash',i%2===1));
      schedule(1040,()=>cleanup(provider));
    }else{
      node.textContent='S';
      for(let i=2;i<=word.length;i++)schedule((i-1)*150,()=>node.textContent=word.slice(0,i));
      schedule(1250,()=>node.style.visibility='hidden');
      schedule(1420,()=>node.style.visibility='visible');
      schedule(1610,()=>node.style.visibility='hidden');
      schedule(1780,()=>node.style.visibility='visible');
      schedule(3000,()=>cleanup(provider));
    }
    fit();
  }
  function fit(){
    for(const card of cards.values()){
      for(const count of card.querySelectorAll('.provider-save-count,.provider-save-success')){
        count.style.fontSize='';
        const parentStyle=getComputedStyle(count.parentElement);
        const style=getComputedStyle(count);
        const isNumber=count.classList.contains('provider-save-count');
        const neonNumber=isNumber&&root.dataset.shelfTheme==='neon';
        // The neon number owns a real square bezel. Measure that BEZEL, not its
        // parent button, then scale the digits as counts grow (1, 10, 100...).
        // Do not make a one-digit number tiny just because a card is narrow.
        const available=neonNumber?
          Math.max(1,count.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-2):
          isNumber?Math.max(1,count.clientWidth||40):
          count.parentElement.clientWidth-parseFloat(parentStyle.paddingLeft)-parseFloat(parentStyle.paddingRight);
        let required=count.scrollWidth;
        if(neonNumber){
          // scrollWidth includes the bezel's hot-pink padding; measure actual
          // digit glyphs so single-digit counts stay BIG, not shrunken at 0.
          const range=document.createRange();
          range.selectNodeContents(count);
          required=typeof range.getBoundingClientRect==='function'?
            range.getBoundingClientRect().width||0:0;
          // Chrome supports Range geometry; constrained DOMs may not. In the
          // latter case avoid shrinking and NEVER stop the receipt painter.
        }
        if(available&&required>available){
          const size=parseFloat(getComputedStyle(count).fontSize);
          count.style.fontSize=Math.max(1,size*available/required*.96)+'px';
        }
      }
    }
  }
  function paint(state){
    for(const [provider,card] of cards){
      const value=state?.totals?.[provider]||'0';
      if(!/^(0|[1-9]\d*)$/.test(value))continue;
      const counter=card.querySelector('.provider-save-count');
      if(!counter)continue; // Provider-specific markup must never block other successes.
      counter.textContent=value;
      card.querySelector('.provider-save-readout').title=state?.startedAt?
        'Verified saves recorded since '+new Date(state.startedAt).toLocaleDateString()+'. Earlier saves are not included.':
        'Verified saves from this update onward. Earlier saves are not included.';
    }
    fit();
  }
  for(const card of cards.values()){
    const readout=document.createElement('div');readout.className='provider-save-readout';
    const count=document.createElement('span');count.className='provider-save-count';count.textContent='0';
    const announcement=document.createElement('span');announcement.className='provider-save-announcement';announcement.setAttribute('role','status');
    readout.append(announcement);card.append(readout);
    // Three small tiles use an inline count after Free GB. Cloudflare uses its
    // existing wide action button, never a detached counter row.
    const counterHost=card.querySelector('.destination-action-copy')||card.querySelector('#cloudflare');
    (counterHost||readout).append(count);
  }
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes['dropbox:state']){
      dropboxEpoch++;const next=changes['dropbox:state'].newValue;
      if(next?.phase!=='connected'||next?.connectionId!==dropboxState?.connectionId)cleanup('dropbox');
      dropboxState=next;
      if(pendingReceipt?.provider==='dropbox')celebrate(pendingReceipt);
    }
    if(changes.redownShelfImpact)impact(changes.redownShelfImpact.newValue);
    if(changes.providerSaveReceipts){
      epoch++;const state=changes.providerSaveReceipts.newValue;
      paint(state);
      celebrate(state?.latest);
    }
  });
  const ticket=epoch,identityTicket=dropboxEpoch;
  void chrome.storage.local.get(['providerSaveReceipts','redownShelfImpact','dropbox:state']).then(data=>{
    if(identityTicket===dropboxEpoch){dropboxState=data['dropbox:state'];if(pendingReceipt?.provider==='dropbox')celebrate(pendingReceipt);}
    if(ticket===epoch)paint(data.providerSaveReceipts);
    impact(data.redownShelfImpact);
  }).catch(()=>{});
  const reset=()=>{for(const provider of runs.keys())cleanup(provider);clearTimeout(pulseTimer);root.removeAttribute('data-save-impact');};
  document.addEventListener('visibilitychange',()=>{
    if(!visible()){reset();return;}
    if(pendingImpact)impact(pendingImpact);
    if(pendingReceipt)celebrate(pendingReceipt);
  });
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change',reset);
  window.addEventListener('hashchange',()=>{
    reset();
    if(pendingReceipt&&visible())celebrate(pendingReceipt);
  });
  window.addEventListener('pagehide',reset);
  new MutationObserver(()=>{reset();fit();}).observe(root,{attributes:true,attributeFilter:['data-shelf-theme']});
  if(globalThis.ResizeObserver)new ResizeObserver(fit).observe(document.body);
})();

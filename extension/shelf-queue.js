/* One canonical Queue client. Rendering never starts, retries or cancels a transfer. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),api=RedownTransferQueue.client(chrome);
  const providers={google:'Google Drive',dropbox:'Dropbox',onedrive:'OneDrive',cloudflare:'Cloudflare R2',unknown:'Unknown provider'};
  const reasons={GOOGLE_AUTH_REQUIRED:'Use Reconnect Google Drive beside GO TO; existing uncertain jobs are not retried.',GOOGLE_AUTH_CANCELLED:'Authorization was cancelled; navigation and previous jobs are preserved.',ONEDRIVE_GRAPH_503:'Microsoft Graph is temporarily unavailable. Wait and refresh authorization; this does not establish revoked credentials.',ONEDRIVE_NETWORK:'A OneDrive or source request was interrupted. Inspect the recorded phase; this alone does not establish revoked authorization.',SOURCE_RETURNED_HTML:'The website returned a page. Choose the actual accessible file or image.',ONEDRIVE_SOURCE_LENGTH_UNKNOWN:'The source has no reliable byte count; acquisition must finish before OneDrive can start.',ONEDRIVE_SOURCE_BUFFER_LIMIT:'Unknown-size content exceeded 16 MiB of temporary memory. Use a fixed-length source or upload the original file.',SOURCE_PERMISSION_DENIED:'Review access to the source site.',AUTH_REQUIRED:'Review this provider’s connection.',AUTH_PENDING:'Finish sign-in or review the interrupted authorization.',QUEUE_FULL:'The provider queue is full. Wait for an active job to finish.',QUEUE_STALLED:'No recent queue progress was observed. The provider may need a worker wake, authorization or source check.',HISTORY_UNAVAILABLE:'History persistence needs attention. Do not repeat a possibly completed save.',UNCONFIRMED:'The outcome is not confirmed. Check the destination before another attempt.'};
  let data=null,debug=false,debugStarted=Date.now(),hydrated=false,refreshTimer=null,version=0,disposed=false;
  const seen=new Map();
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const tone=row=>row.accountingPending?'amber':['uncertain','interrupted','needs-attention'].includes(row.state)?'amber':['blocked','failed'].includes(row.state)?'red':'neutral';
  function cardSignals(){
    for(const [provider,label] of Object.entries(providers)){
      const card=document.querySelector('#clouds-view [data-provider="'+provider+'"]');if(!card)continue;
      let signal=card.querySelector('.queue-card-signal');if(!signal){signal=make('button','','queue-card-signal');signal.type='button';signal.hidden=true;card.append(signal);card.addEventListener('animationend',event=>{if(event.animationName==='queue-failure-pulse')card.classList.remove('queue-failure-flash');});}
      const row=data?.rows.filter(r=>r.provider===provider).sort((a,b)=>(b.outcomeAt??b.lastActivityAt??b.receivedAt??0)-(a.outcomeAt??a.lastActivityAt??a.receivedAt??0))[0];
      if(!debug||!row||row.acknowledged||row.state==='verified'&&!row.accountingPending||row.state==='cancelled'){
        signal.hidden=true;delete card.dataset.queueState;card.classList.remove('queue-failure-flash');continue;
      }
      const key=row.id+':'+row.state+':'+(row.outcomeAt??row.receivedAt),color=tone(row),newEvent=seen.get(provider)!==key;
      card.dataset.queueState=color;if(color!=='red')card.classList.remove('queue-failure-flash');signal.hidden=false;signal.dataset.tone=color;
      signal.textContent=(color==='red'?'! ':color==='amber'?'△ ':'○ ')+row.state.replaceAll('-',' ')+' · '+row.code;
      signal.title=(reasons[row.code]||'Inspect this exact attempt in Queue.')+' Attempt '+(row.attemptId||row.id);
      signal.setAttribute('aria-label',label+' '+row.state+'. '+row.code+'. Open exact Queue attempt.');
      signal.onclick=event=>{event.preventDefault();event.stopPropagation();RedownShelfNavigation.openQueue(row.id);};
      if(hydrated&&newEvent&&color==='red'&&(row.outcomeAt??row.lastActivityAt??0)>=debugStarted&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
        card.classList.remove('queue-failure-flash');void card.offsetWidth;card.classList.add('queue-failure-flash');
      }
      seen.set(provider,key);
    }
  }
  function render(){
    if(!data)return;
    const c=data.counts;$('queue-count').textContent=String(c.pending);$('queue-count').setAttribute('aria-label',c.pending+' pending or attention-needed saves');
    $('nav-queue').setAttribute('aria-label','Queue, '+c.pending+' pending or attention-needed saves');
    $('queue-summary').textContent=`${c.active} active · ${c.attention} need attention`;
    cardSignals();if($('queue-view').hidden)return;
    let selected='';try{selected=decodeURIComponent(location.hash.split('/').slice(1).join('/')||'');}catch{}
    const filter=$('queue-filter').value;
    const accepts=r=>filter==='active'?['received','queued','active','fetching','uploading','verifying'].includes(r.state):filter==='waiting'?['queued','waiting-for-login'].includes(r.state):filter==='attention'?r.accountingPending||['failed','blocked','uncertain','interrupted','needs-attention'].includes(r.state):filter==='completed'?r.state==='verified':true;
    const fragment=document.createDocumentFragment();let index=0,lastProvider=null;
    const group=$('queue-group').value,visible=data.rows.filter(r=>accepts(r)||r.id===selected);
    if(group==='provider')visible.sort((a,b)=>Object.keys(providers).indexOf(a.provider)-Object.keys(providers).indexOf(b.provider)||(b.receivedAt||0)-(a.receivedAt||0));
    for(const row of visible){
      if(group==='provider'&&lastProvider!==row.provider){fragment.append(make('h2',providers[row.provider]||providers.unknown,'queue-provider-heading'));lastProvider=row.provider;}
      const card=make('article',undefined,'queue-row');card.dataset.queueId=row.id;card.dataset.tone=tone(row);card.tabIndex=-1;
      if(row.id===selected){card.dataset.selected='true';card.setAttribute('aria-current','true');}
      const header=make('div',undefined,'queue-row-heading');header.append(make('strong',providers[row.provider]||providers.unknown),make('span',row.state.replaceAll('-',' ').toUpperCase(),'queue-row-state'));card.append(header,make('h2',row.name));
      if(row.accountingPending)card.append(make('small','Remote save verified · local History accounting pending. Do not upload again.'));
      if(row.attemptOnly)card.append(make('small','Attempt only · no admitted job linked'));
      card.append(make('p',row.code+(reasons[row.code]?' · '+reasons[row.code]:''),'queue-row-reason'));
      const detail=make('dl');for(const [label,value] of [['Attempt',row.attemptId||'Not linked'],['Received',row.receivedAt?new Date(row.receivedAt).toLocaleString():'Unavailable'],['Last activity',row.lastActivityAt?new Date(row.lastActivityAt).toLocaleString():'Unavailable'],['Queue position',row.queuePosition],['Destination',row.destination?Object.entries(row.destination).filter(([k])=>k!=='provider').map(([k,v])=>k+': '+v).join(' · '):'Reference unavailable'],['History',row.historyLinked?'Receipt linked':'No local receipt linked']]){
        if(value===null||value===undefined)continue;detail.append(make('dt',label),make('dd',String(value)));
      }card.append(detail);
      if(row.sourceBytes!==undefined&&row.sourceBytes!==null)card.append(make('small',row.sourceBytes+' source bytes acquired before provider upload'));
      if(row.bytes!==null){card.append(make('small',row.total===null?row.bytes+' bytes observed · total unknown':row.bytes+' / '+row.total+' bytes'));if(row.total>0){const progress=make('progress');progress.max=row.total;progress.value=Math.min(row.bytes,row.total);progress.setAttribute('aria-label','Observed bytes');card.append(progress);}}
      if(['uncertain','interrupted'].includes(row.state))card.append(make('p','The file might exist. Check this exact destination before another save. No automatic write retry.','queue-warning'));
      const buttons=make('div',undefined,'queue-row-actions');
      const trace=make('details'),summary=make('summary','Attempt trace');trace.append(summary,make('pre',JSON.stringify(row.evidence||{gap:'Recorder evidence unavailable for this legacy job.'},null,2)));card.append(trace);
      if(row.historyLinked&&row.attemptId){const view=make('button','View History');view.type='button';view.onclick=()=>void RedownShelfNavigation.history(row.attemptId);buttons.append(view);}
      if(row.actions.includes('acknowledge')){const ack=make('button','Mark reviewed');ack.type='button';ack.onclick=async()=>{ack.disabled=true;try{await api.acknowledge(row.id);await refresh();}catch{$('queue-status').textContent='Review could not be saved. Provider state was not changed.';ack.disabled=false;}};buttons.append(ack);}
      if(row.actions.includes('review-connection')){const review=make('button','Review connection');review.type='button';review.onclick=()=>{location.hash='#clouds';document.querySelector('[data-provider="'+row.provider+'"] button')?.focus();};buttons.append(review);}
      card.append(buttons);fragment.append(card);index++;
    }
    if(!index)fragment.append(make('p','No saves in this view. A Queue entry is created only for an observed action or stored job.','queue-empty'));
    // Do not replace a focused row on an unchanged snapshot: keyboard disclosure/action state survives polling.
    const signature=JSON.stringify({filter,group,selected,rows:data.rows,gaps:data.gaps});
    if($('queue-rows').dataset.signature!==signature){const focused=document.activeElement?.closest('[data-queue-id]')?.dataset.queueId;$('queue-rows').replaceChildren(fragment);$('queue-rows').dataset.signature=signature;if(focused)Array.from($('queue-rows').children).find(e=>e.dataset.queueId===focused)?.focus({preventScroll:true});}
    $('queue-status').textContent=data.gaps.length?'Some local state is unavailable. Export includes explicit missing evidence.':data.omitted?data.omitted+' older rows omitted; History remains authoritative.':'';
  }
  async function refresh(){const ticket=++version;try{const response=await api.list();if(disposed||ticket!==version)return;data=response;render();hydrated=true;}catch{if(!disposed&&ticket===version)$('queue-status').textContent='Queue state unavailable. Saving is independent; export a partial diagnostic bundle.';}}
  const schedule=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh(),60);};
  api.subscribe(schedule);
  $('queue-filter').addEventListener('change',render);$('queue-group').addEventListener('change',render);
  window.addEventListener('redown:shelf-route',()=>{render();if(!$('queue-view').hidden)void refresh();});
  chrome.storage.local.get('debugModeEnabled').then(v=>{debug=v.debugModeEnabled===true;cardSignals();}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.debugModeEnabled){debug=changes.debugModeEnabled.newValue===true;debugStarted=Date.now();cardSignals();}});
  const poll=setInterval(()=>{if(!document.hidden&&(data?.counts.pending||!$('queue-view').hidden))void refresh();},10000);
  window.addEventListener('pagehide',()=>{disposed=true;++version;clearInterval(poll);clearTimeout(refreshTimer);});
  globalThis.RedownShelfQueue={refresh};void refresh();
})();

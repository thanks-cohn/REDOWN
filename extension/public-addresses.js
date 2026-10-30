/* Public-address presentation with explicit confirmed enable action. Configuration is never proof of object access. */
(function(root){
  'use strict';
  const refreshers=new WeakMap();
  async function refreshVisible(document,source){
    const entries=[];
    for(const host of document.querySelectorAll('.public-address-host')){
      const entry=refreshers.get(host);
      if(entry&&entry.source.accountId===source.accountId&&entry.source.bucketName===source.bucketName)entries.push(entry);
    }
    if(!entries.length)return;
    // All disclosures need the same bucket configuration, not independent API reads.
    const snapshot=Promise.resolve().then(()=>entries[0].load());
    await Promise.allSettled(entries.map(entry=>entry.refresh(snapshot)));
  }
  function addresses(snapshot,source,key){
    if(!snapshot||snapshot.accountId!==source.accountId||snapshot.bucketName!==source.bucketName)return [];
    return (snapshot.addresses||[]).flatMap(item=>{
      try{
        const base=new URL(item.base);
        if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||['api.cloudflare.com','dash.cloudflare.com'].includes(base.hostname)||/^\/(?:private|object)(?:\/|$)/.test(base.pathname))return [];
        const suffix=key===undefined?'':String(key).split('/').map(part=>encodeURIComponent(part)).join('/');
        // Concatenate, rather than resolving: leading slashes and dot segments belong to the key.
        return [{...item,url:base.href.replace(/\/+$/,'')+'/'+suffix}];
      }catch{return [];}
    });
  }
  function disclosure({document,source,key,load,copy=text=>navigator.clipboard.writeText(text),open=url=>window.open(url,'_blank','noopener')}){
    const host=document.createElement('div');host.className='public-address-host';
    let generation=0,expanded=false;
    async function refresh(sharedSnapshot){
      expanded=host.querySelector('details')?.open??expanded;
      const token=++generation;
      host.setAttribute('aria-busy','true');
      let snapshot;
      try{snapshot=await (sharedSnapshot||load());}catch{snapshot=null;}
      if(token!==generation)return;
      host.removeAttribute('aria-busy');
      const items=addresses(snapshot,source,key);host.replaceChildren();
      if(!items.length)return;
      const details=document.createElement('details');details.className='url-disclosure';details.open=expanded;
      details.addEventListener('toggle',()=>{expanded=details.open;});
      const summary=document.createElement('summary');summary.textContent='URLs';details.append(summary);
      for(const item of items){
        const row=document.createElement('div');row.className='url-address';
        const title=document.createElement('strong');title.textContent=item.label;
        const state=document.createElement('span');state.className='meta';state.textContent=item.state==='restricted'?'Unavailable — public access disabled':item.state==='needs-setup'?'Needs setup — DNS, ownership or SSL pending':item.state==='unknown'?'Unknown — configuration could not be refreshed':'Configured — public file access not verified';
        const text=document.createElement('code');text.textContent=item.url;
        const controls=document.createElement('div');controls.className='url-actions';
        const feedback=document.createElement('span');feedback.setAttribute('role','status');feedback.className='meta';
        for(const [name,action] of [['Copy',()=>copy(item.url)],['Open',()=>open(item.url)]]){
          const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent=name;button.disabled=['restricted','needs-setup','unknown'].includes(item.state);
          button.addEventListener('click',async()=>{try{await action();feedback.textContent=name==='Copy'?'Copied.':'Opened; accessibility is not yet verified.';}catch(error){feedback.textContent=error?.message||'Could not complete this action.';}});controls.append(button);
        }
        row.append(title,state,text,controls,feedback);details.append(row);
      }
      host.append(details);
    }
    refreshers.set(host,{source:{accountId:source.accountId,bucketName:source.bucketName},refresh,load});
    return {host,refresh,cancel(){generation++;refreshers.delete(host);}};
  }
  function classify(item){
    if(item.kind==='worker'||/worker/i.test(item.label||''))return 'worker.assets';
    if(new URL(item.url).hostname.endsWith('.r2.dev'))return 'r2.managed';
    return item.kind==='custom'||/custom/i.test(item.label||'')?'r2.custom':'provider.public';
  }
  function popover({document,load,enable,copy=text=>navigator.clipboard.writeText(text),onState=()=>{},onEvent=()=>{}}){
    const view=document.defaultView;let generation=0,active=null,enabling=false;
    const emit=(context,stage,outcome,details={})=>{try{onEvent(context,stage,outcome,details);}catch{}};
    function close({restoreFocus=false}={}){
      generation++;if(!active)return;
      const old=active;active=null;old.controller.abort();clearTimeout(old.timer);old.panel.remove();
      old.anchor?.setAttribute("aria-expanded","false");
      if(restoreFocus&&old.returnFocus?.isConnected)old.returnFocus.focus({preventScroll:true});
    }
    function place(){
      if(!active)return;
      const {panel,point,anchor}=active,rect=panel.getBoundingClientRect();
      const edge=anchor?.getBoundingClientRect();
      const x=edge?(edge.right+rect.width+4<=view.innerWidth-8?edge.right+4:edge.left-rect.width-4):point.x;
      const y=edge?edge.top:point.y;
      panel.style.left=Math.max(8,Math.min(x,view.innerWidth-rect.width-8))+'px';
      panel.style.top=Math.max(8,Math.min(y,view.innerHeight-rect.height-8))+'px';
    }
    async function show({source,key,name,point={x:24,y:24},returnFocus,anchor,isCurrent=()=>true}){
      close();const token=++generation,context={source:{accountId:source.accountId,bucketName:source.bucketName},key};
      const controller=new view.AbortController(),panel=document.createElement('section');panel.className='url-popover';panel.setAttribute('role',anchor?'menu':'dialog');panel.setAttribute('aria-label','Get URL — '+String(name||'file'));panel.setAttribute('aria-busy','true');
      const head=document.createElement('div');head.className='url-popover-head';
      const title=document.createElement('strong');title.textContent='Get URL — '+String(name||'file');
      const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='url-popover-close';dismiss.textContent='×';dismiss.setAttribute('aria-label','Close Get URL');dismiss.addEventListener('click',()=>close({restoreFocus:true}));head.append(title,dismiss);
      const list=document.createElement('div');list.className='url-popover-list';
      const feedback=document.createElement('div');feedback.className='url-popover-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.textContent='Loading configured addresses…';panel.append(head,list,feedback);
      active={panel,controller,point,returnFocus,anchor,timer:null};anchor?.setAttribute("aria-expanded","true");document.body.append(panel);place();dismiss.focus({preventScroll:true});
      const current=()=>token===generation&&active?.panel===panel&&isCurrent();
      const state=(message,state)=>{if(current()){try{onState(message,state);}catch{}place();}};
      state('Loading configured file URLs…','running');emit(context,'intent','started');
      const options={signal:controller.signal};
      document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target))close();},options);
      document.addEventListener('keydown',event=>{
        if(!current())return;
        if(event.key==='Escape'||anchor&&event.key==='ArrowLeft'){event.preventDefault();event.stopPropagation();close({restoreFocus:true});return;}
        if(!panel.contains(event.target))return;
        // Stop Explorer shortcuts without blocking normal button activation.
        event.stopPropagation();
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();const rows=[...list.querySelectorAll('button:not(:disabled):not([hidden])')];if(!rows.length)return;
          const at=rows.indexOf(document.activeElement),index=event.key==='Home'?0:event.key==='End'?rows.length-1:at<0?(event.key==='ArrowUp'?rows.length-1:0):(at+(event.key==='ArrowUp'?-1:1)+rows.length)%rows.length;rows[index].focus();
        }
      },{...options,capture:true});
      panel.addEventListener('click',event=>event.stopPropagation(),options);
      panel.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();},options);
      panel.addEventListener('focusout',event=>{if(event.relatedTarget&&!panel.contains(event.relatedTarget))close();},options);
      view.addEventListener('resize',place,options);
      document.addEventListener('scroll',event=>{if(!panel.contains(event.target))close();},{...options,capture:true});
      let snapshot;
      try{snapshot=await load(context.source);}catch{if(!current())return;panel.removeAttribute('aria-busy');feedback.textContent='Could not load file URLs. Close and try again.';state(feedback.textContent,'failed');emit(context,'ui.result','failed',{code:'EXPLORER_URL_DISCOVERY_FAILED'});return;}
      if(!current()){if(token===generation)close();return;}
      panel.removeAttribute('aria-busy');
      if(snapshot?.ok===false){feedback.textContent='Could not load file URLs. Close and try again.';state(feedback.textContent,'failed');emit(context,'ui.result','failed',{code:'EXPLORER_URL_DISCOVERY_FAILED'});return;}
      const seen=new Set(),items=addresses(snapshot,context.source,key).filter(item=>{if(seen.has(item.url))return false;seen.add(item.url);return true;});
      let eligible=0;
      for(const item of items){
        const enabled=item.state==='configured';if(enabled)eligible++;
        const endpoint=classify(item);emit(context,'ui.result',enabled?'confirmed':'unknown',{endpoint,loadedCount:1});
        if(!enabled)continue;
        const row=document.createElement('button');row.type='button';row.className='url-popover-row';row.disabled=!enabled;if(anchor)row.setAttribute("role","menuitem");
        const label=document.createElement('strong');label.textContent=String(item.label||'Public address').slice(0,100);
        const address=document.createElement('code');address.textContent=item.url;address.title=item.url;
        const description=document.createElement('span');description.className='url-popover-state';description.textContent=enabled?'Configured public URL · accessibility not verified':item.state==='restricted'?'Unavailable · public access disabled':item.state==='needs-setup'?'Unavailable · DNS, ownership or SSL pending':'Unavailable · configuration not verified';
        const indicator=document.createElement('span');indicator.className='url-popover-copy';indicator.textContent='Copy';indicator.setAttribute('aria-hidden','true');
        row.append(label,address,description,indicator);list.append(row);
        row.addEventListener('click',async()=>{
          if(!current())return;
          const click=++copySequence;state('Copying URL…','running');emit(context,'browser.request','started',{endpoint:'local.clipboard'});
          try{await copy(item.url);if(!current()||click!==copySequence)return;
            feedback.textContent='✓ Copied!';row.dataset.copied='true';indicator.textContent='✓';state('URL copied. Public accessibility has not been verified.','success');emit(context,'browser.result','confirmed',{endpoint:'local.clipboard'});
            clearTimeout(active.timer);active.timer=setTimeout(()=>{if(current()){feedback.textContent='Choose a URL to copy.';panel.querySelectorAll('[data-copied]').forEach(row=>{delete row.dataset.copied;row.querySelector('.url-popover-copy').textContent='Copy';});}},1800);
          }catch{if(!current()||click!==copySequence)return;feedback.textContent='Clipboard access was denied. Try again.';state(feedback.textContent,'failed');emit(context,'browser.result','failed',{endpoint:'local.clipboard',code:'EXPLORER_CLIPBOARD_FAILED'});}
        });
      }
      const canEnable=eligible===0&&enable&&snapshot.accountId===context.source.accountId&&snapshot.bucketName===context.source.bucketName&&snapshot.managedPublicAccess==="disabled";
      if(canEnable){
        const question=document.createElement('div');question.className='url-popover-consent';
        const title=document.createElement('strong');title.textContent='Give Bucket Public URL?';
        const explanation=document.createElement('span');explanation.className='url-popover-state';
        explanation.textContent='Yes enables Cloudflare’s r2.dev address for the entire bucket. Anyone with a file URL may then access that file. No keeps your bucket private.';
        const choices=document.createElement('div');choices.className='url-popover-consent-actions';
        const yes=document.createElement('button');yes.type='button';yes.className='url-popover-consent-yes';yes.textContent='Yes, enable URL';
        const no=document.createElement('button');no.type='button';no.textContent='No, keep private';
        if(anchor){yes.setAttribute('role','menuitem');no.setAttribute('role','menuitem');}
        choices.append(yes,no);question.append(title,explanation,choices);list.append(question);
        no.onclick=()=>{if(current()&&!enabling){state('Bucket remains private.','partial');close({restoreFocus:true});}};
        yes.onclick=async()=>{
          if(!current()||enabling)return;
          enabling=true;yes.disabled=true;no.disabled=true;yes.textContent='Activating…';
          state('Enabling and verifying bucket public access…','running');emit(context,'api.request','started',{endpoint:'api.domains'});
          try{
            const result=await enable(context.source);
            if(!current())return;
            if(!result?.ok){
              const code=['EXPLORER_PERMISSION_DENIED','EXPLORER_AUTH_EXPIRED','EXPLORER_RESULT_UNCONFIRMED'].includes(result?.code)?result.code:'EXPLORER_RESULT_UNCONFIRMED';
              feedback.textContent=code==='EXPLORER_PERMISSION_DENIED'?'Cloudflare denied the change. Check this account’s R2 permissions.':code==='EXPLORER_AUTH_EXPIRED'?'Cloudflare login expired. Reconnect and try again.':'Public access was not verified. Check the bucket in Cloudflare before retrying.';
              state(feedback.textContent,'failed');emit(context,'api.response','failed',{endpoint:'api.domains',code});return;
            }
            emit(context,'api.response','confirmed',{endpoint:'api.domains'});
            enabling=false;
            await show({source:context.source,key,name,point,returnFocus,anchor,isCurrent});
          }catch{
            if(current()){feedback.textContent='Public access was not verified. Check Cloudflare before retrying; the setting may have changed.';state(feedback.textContent,'failed');emit(context,'api.response','failed',{endpoint:'api.domains',code:'EXPLORER_RESULT_UNCONFIRMED'});}
          }finally{enabling=false;if(current()){yes.disabled=false;no.disabled=false;yes.textContent='Yes, enable URL';}}
        };
      }
      let copySequence=0;
      feedback.textContent=eligible?'Choose a URL to copy.':canEnable?'Enable public access to get a shareable URL.':items.length?'No usable public URL. Configured addresses are disabled or need setup.':'No public addresses are configured for this file’s bucket.';
      const incomplete=Boolean(snapshot?.errors?.length)||items.some(item=>item.state!=='configured');
      state(eligible?(incomplete?'File URLs loaded; some addresses are unavailable.':'File URLs loaded. Accessibility has not been verified.'):feedback.textContent,eligible&&!incomplete?'success':'partial');
      emit(context,'ui.result',eligible&&!incomplete?'confirmed':'unknown',{loadedCount:items.length,code:!eligible?'EXPLORER_URL_UNAVAILABLE':undefined});
      place();
      if(anchor&&document.activeElement===dismiss)list.querySelector('button:not(:disabled):not([hidden])')?.focus({preventScroll:true});
    }
    return {show,close,get element(){return active?.panel||null;}};
  }
  root.RedownPublicAddresses={addresses,disclosure,refreshVisible,popover,classify};
})(globalThis);

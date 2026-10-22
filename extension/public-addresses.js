/* Read-only public-address presentation. Configuration is never proof of object access. */
(function(root){
  'use strict';
  function addresses(snapshot,source,key){
    if(!snapshot||snapshot.accountId!==source.accountId||snapshot.bucketName!==source.bucketName)return [];
    return (snapshot.addresses||[]).flatMap(item=>{
      try{
        const base=new URL(item.base);
        if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)return [];
        const suffix=key===undefined?'':String(key).split('/').map(part=>encodeURIComponent(part)).join('/');
        // Concatenate, rather than resolving: leading slashes and dot segments belong to the key.
        return [{...item,url:base.href.replace(/\/+$/,'')+'/'+suffix}];
      }catch{return [];}
    });
  }
  function disclosure({document,source,key,load,copy=text=>navigator.clipboard.writeText(text),open=url=>window.open(url,'_blank','noopener')}){
    const host=document.createElement('div');host.className='public-address-host';
    let generation=0,expanded=false;
    async function refresh(){
      const token=++generation;
      host.setAttribute('aria-busy','true');
      let snapshot;
      try{snapshot=await load();}catch{snapshot=null;}
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
    return {host,refresh,cancel(){generation++;}};
  }
  root.RedownPublicAddresses={addresses,disclosure};
})(globalThis);

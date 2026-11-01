(() => {
  'use strict';
  const id=location.hash.slice(1),search=document.getElementById('search'),list=document.getElementById('destinations'),status=document.getElementById('status');
  let entries=[],saving=false;
  const request=async(type,fields={})=>{const r=await chrome.runtime.sendMessage({type,id,...fields});if(!r?.ok)throw Error(r?.error||'Unable to load this save request.');return r;};
  function draw(){
    list.replaceChildren();
    for(const row of entries.filter(r=>[r.title,r.accountId,r.bucketName,r.prefix].join(' ').toLowerCase().includes(search.value.toLowerCase()))){
      const li=document.createElement('li'),button=document.createElement('button'),path=document.createElement('small');
      button.textContent=row.title;path.textContent=row.accountId+' / '+row.bucketName+(row.prefix?' / '+row.prefix:' /');button.append(path);button.disabled=saving;
      button.onclick=async()=>{if(saving)return;saving=true;draw();status.textContent='Saving…';try{await request('rightClickChooserSave',{destinationId:row.id});status.textContent='Request finished. Check REDOWN History for the verified result.';}catch(e){status.textContent=e.message;} };li.append(button);list.append(li);
    }
  }
  search.oninput=draw;
  void request('rightClickChooserList').then(r=>{entries=r.entries;status.textContent=entries.length+' authorized destinations';draw();}).catch(e=>{status.textContent=e.message;});
})();

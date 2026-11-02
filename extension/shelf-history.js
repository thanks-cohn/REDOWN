/* One minimal History view. Recent days and weeks lead, older dates fold
   into months > numbered weeks > days. Each page is read from the on-device
   archive; legacy transferHistory stays the compatibility source, not a
   second timeline. No provider calls, no unbounded DOM rendering. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const PAGE_SIZE=40,RECENT_WEEKS=3;
  const text=v=>typeof v==='string'?v:'';
  const sortedEntries=records=>(Array.isArray(records)?records:[])
    .filter(r=>r&&typeof r==='object')
    .map((record,index)=>({record,index,ms:Date.parse(record.at||'')}))
    .sort((a,b)=>(Number.isFinite(b.ms)?b.ms:0)-(Number.isFinite(a.ms)?a.ms:0)||a.index-b.index);

  // Legacy API contract retained for consumers and tests.
  function group(records){
    const years=new Map();
    for(const item of sortedEntries(records)){
      const date=Number.isFinite(item.ms)?new Date(item.ms):null;
      const year=date?String(date.getFullYear()):'Unknown date';
      const month=date?String(date.getMonth()):'unknown';
      const day=date?String(date.getDate()):'unknown';
      if(!years.has(year))years.set(year,new Map());
      const months=years.get(year);
      if(!months.has(month))months.set(month,new Map());
      const days=months.get(month);
      if(!days.has(day))days.set(day,[]);
      days.get(day).push({...item,date});
    }
    return years;
  }
  function describe(record){
    const destination=record.destination||{},location=text(record.location);
    let name=text(record.filename)||text(destination.key).split('/').pop();
    if(!name&&location.startsWith('R2: '))name=location.split('/').pop();
    if(!name)try{name=decodeURIComponent(new URL(text(record.sourceUrl)).pathname.split('/').pop());}catch{}
    const providerKind=text(record.providerKind).toLowerCase()||
      text(destination.provider).toLowerCase()||
      text(record.provider).toLowerCase();
    const isCloudflare=providerKind.includes('cloudflare')||
      (!!destination.bucketName&&!['google','onedrive','dropbox'].some(p=>providerKind.includes(p)));
    const provider=isCloudflare?'Cloudflare R2':providerKind.includes('google')?'Google Drive':
      providerKind.includes('onedrive')?'OneDrive':providerKind.includes('dropbox')?'Dropbox':
      text(record.provider)||text(record.profileName)||'Cloud provider';
    const bucket=text(destination.bucketName),key=text(destination.key).split('/').filter(Boolean).join('/');
    const delivered=record.ok===true&&record.verified===true&&record.status==='completed';
    const file=text(destination.name)||text(record.filename);
    const join=(...parts)=>parts.filter(Boolean).map(part=>text(part).split('/').filter(Boolean).join('/')).filter(Boolean).join('/');
    // Only include an actual remote destination, never the original page URL.
    let path='';
    if(delivered&&isCloudflare&&bucket)
      path=join(bucket,key.startsWith(bucket+'/')?key.slice(bucket.length+1):key);
    if(delivered&&provider==='Dropbox')
      path=join(destination.path); // Authenticated Dropbox metadata path_display.
    if(delivered&&provider==='OneDrive'&&destination.root==='/'&&file)
      path=join('OneDrive',file); // The OneDrive API writes to verified root.
    if(delivered&&provider==='Google Drive'&&file){
      const knownPath=text(destination.path)||text(destination.folderPath);
      if(knownPath)path=join(knownPath,file);
      else if(!destination.folderId)path=join('My Drive',file);
      else path=join('Folder ID '+text(destination.folderId),file);
    }
    return {
      name:name||text(record.sourceUrl)||'Transfer',
      status:record.ok===false?(text(record.status)||'Failed'):delivered?'Successful (verified)':record.ok===true?'Accepted · completion unverified':text(record.status)||'Outcome not recorded',
      state:record.ok===false?'failed':delivered?'success':'unknown',
      provider,
      detail:path?provider+' · '+path:provider,
      isCloudflare
    };
  }
  const startDay=date=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const weekStart=date=>{
    const d=startDay(date);d.setDate(d.getDate()-(d.getDay()+6)%7);return d;
  };
  const dateKey=date=>date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
  const ordinalWeek=date=>{
    const first=new Date(date.getFullYear(),date.getMonth(),1);
    return Math.floor((date.getDate()-1+(first.getDay()+6)%7)/7)+1;
  };
  const ordinal=['','First Week','Second Week','Third Week','Fourth Week','Fifth Week','Sixth Week'];
  function organize(records,now=new Date()){
    const years=new Map(),today=startDay(now),monday=weekStart(now);
    const recentCutoff=new Date(monday);
    recentCutoff.setDate(recentCutoff.getDate()-RECENT_WEEKS*7);
    for(const item of sortedEntries(records)){
      const date=Number.isFinite(item.ms)?new Date(item.ms):null;
      const year=date?String(date.getFullYear()):'Unknown date';
      if(!years.has(year))years.set(year,{recent:new Map(),months:new Map()});
      const node=years.get(year);
      const addDay=(days,entry)=>{
        const key=date?dateKey(date):'undated';
        if(!days.has(key))days.set(key,{date,items:[]});
        days.get(key).items.push(entry);
      };
      const entry={...item,date};
      if(date&&date>=recentCutoff&&date<=now){
        const mondayOfDate=weekStart(date);
        const weeks=Math.round((monday.getTime()-mondayOfDate.getTime())/(7*86400000));
        let bucket,label;
        if(date>=today){bucket='today';label='Today · '+date.toLocaleDateString(undefined,{month:'short',day:'numeric'});}
        else if(weeks===0){bucket='this-week';label='Earlier This Week';}
        else if(weeks>=1&&weeks<=RECENT_WEEKS){
          bucket='week-'+weeks;label=['','Last Week','Two Weeks Ago','Three Weeks Ago'][weeks];
        }
        if(bucket){
          if(!node.recent.has(bucket))node.recent.set(bucket,{label,days:new Map()});
          addDay(node.recent.get(bucket).days,entry);
          continue;
        }
      }
      const month=date?date.getMonth():'unknown';
      if(!node.months.has(month))node.months.set(month,{date,weeks:new Map()});
      const monthNode=node.months.get(month);
      const week=date?ordinalWeek(date):0;
      if(!monthNode.weeks.has(week))monthNode.weeks.set(week,new Map());
      addDay(monthNode.weeks.get(week),entry);
    }
    return years;
  }

  globalThis.RedownShelfHistory={group,describe,organize,open};
  if(!$('history-timeline'))return;
  const archive=globalThis.RedownHistoryArchive?.create();
  let pageIndex=0,total=0,loaded=false,dirty=false,requestId=0;
  let legacy=[],pageItems=[],fallback=false,legacyImported=false;
  const openGroups=new Map([['root',null]]);
  const create=(tag,value='',className='')=>{
    const node=document.createElement(tag);
    if(value)node.textContent=value;
    if(className)node.className=className;
    return node;
  };
  function section(kind,title,key,parent,items,makeChildren){
    const details=create('details','', 'history-'+kind);
    details.dataset.group=key;
    const summary=create('summary');
    const label=create('span',title,'history-group-title');
    const chevron=create('span','⌄','history-chevron');
    summary.append(label,chevron);
    details.append(summary);
    details.open=openGroups.get(parent)===key;
    summary.addEventListener('click',event=>{
      event.preventDefault();
      const expand=!details.open;
      openGroups.set(parent,expand?key:null);
      // Only the section currently opened expands. All sibling sections shrink.
      for(const sibling of details.parentElement?.children||[]){
        if(sibling!==details&&sibling.tagName==='DETAILS')sibling.open=false;
      }
      details.open=expand;
    });
    makeChildren(details,items,key);
    return details;
  }
  function safeWebUrl(raw){
    try{
      const value=text(raw),url=new URL(value);
      return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;
    }catch{return null;}
  }
  function addProvenance(parent,record,info){
    const details=create('div','','history-entry-provenance');
    const addLink=(caption,raw)=>{
      const value=text(raw);if(!value)return;
      const line=create('div','','history-entry-url');
      line.append(create('span',caption,'history-entry-url-label'));
      const href=safeWebUrl(value);
      if(href){
        const link=create('a',value,'history-entry-link');
        link.href=href;link.target='_blank';link.rel='noopener noreferrer';
        link.title=value;line.append(link);
      }else line.append(create('span',value,'history-entry-url-text'));
      details.append(line);
    };
    addLink('Source URL',record.sourceUrl);
    // Chrome supplies the page the user actually right-clicked. A direct
    // URL or typed input has no independently known parent; do not infer one.
    if(record.pageUrl&&record.pageUrl!==record.sourceUrl)addLink('Hosting page',record.pageUrl);
    if(record.ok!==false)details.append(create('small',info.status,'history-entry-outcome'));
    if(info.detail){
      const footer=create('small',info.detail,'history-entry-provider');
      // Link only to a verified provider-owned destination, never the original
      // source/page URL. Dropbox has no file URL unless it was explicitly
      // stored and approved by cloudTarget().
      const providerUrl=globalThis.RedownHistoryNavigation?.cloudTarget?.(record);
      const publicR2=info.isCloudflare&&info.state==='success'?safeWebUrl(record.destination?.publicUrl):null;
      const href=providerUrl||(publicR2&&new URL(publicR2).protocol==='https:'?publicR2:null);
      if(href){
        const link=create('a',info.isCloudflare?'File URL':'Open saved file','history-entry-link history-destination-link');
        link.href=href;link.target='_blank';link.rel='noopener noreferrer';
        link.title=href;
        footer.append(' · ',link);
      }else if(!info.isCloudflare&&info.state==='success'){
        footer.append(' · No direct file link available');
      }
      details.append(footer);
    }
    if(record.error){
      const technical=create('details','','history-technical-details');
      const summary=create('summary','Error details');
      technical.append(summary,create('small',text(record.error),'history-error'));
      details.append(technical);
    }
    if(record.providerKind==='dropbox'&&record.destination?.fileId){
      const d=record.destination,receipt=create('details','','history-technical-details');
      receipt.append(create('summary','Dropbox receipt'));
      for(const [label,value] of [['Account',d.accountId],['Namespace',d.namespace],['Root',d.root],['Path',d.path],['File ID',d.fileId],['Revision',d.revision]])if(value)receipt.append(create('div',label+': '+value));
      receipt.append(create('small','The Dropbox website may use a different signed-in account.'));details.append(receipt);
    }
    if(details.childElementCount)parent.append(details);
  }
  function dayRows(container,day){
    const list=create('ol','','history-transfers');
    for(const item of day.items){
      const info=describe(item.record),record=item.record;
      const row=create('li','','history-transfer');row.dataset.state=info.state;
      const dot=create('span','','history-dot');dot.setAttribute('aria-hidden','true');
      const body=create('div','','history-transfer-body');
      const error=record.ok===false;
      const title=error?'Error: '+(text(record.sourceUrl)||'Source unavailable'):info.name;
      const src=text(record.sourceUrl),parentUrl=text(record.pageUrl);
      const isLong=title.length>66||src.length>90||parentUrl.length>90||text(record.error).length>125;
      const header=create('div','','history-entry-head');
      header.append(create('strong',isLong&&title.length>66?title.slice(0,62)+'…':title));
      const time=create('time',day.date?new Date(item.ms).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'');
      if(day.date&&Number.isFinite(item.ms))time.dateTime=new Date(item.ms).toISOString();
      header.append(time);
      if(globalThis.RedownHistoryNavigation?.openable(record)){
        const go=create('button','GO TO','history-go-to');go.type='button';
        go.setAttribute('aria-label','Go to saved file '+info.name);
        go.onclick=event=>{event.preventDefault();event.stopPropagation();globalThis.RedownHistoryNavigation.open(record);};
        header.append(go);
      }
      if(isLong){
        const disclosure=create('details','','history-entry-details');
        const summary=create('summary');
        summary.append(header);
        disclosure.append(summary);
        addProvenance(disclosure,record,info);
        body.append(disclosure);
      }else{
        body.append(header);
        addProvenance(body,record,info);
      }
      row.append(dot,body);list.append(row);
    }
    container.append(list);
  }
  function drawDays(parent,days,parentKey){
    for(const [key,day] of days){
      const name=day.date?day.date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}):'Date unavailable';
      parent.append(section('day',name,parentKey+':'+key,parentKey,day,dayRows));
    }
  }
  function drawWeek(parent,weekKey,week,yearKey){
    const key=yearKey+':'+weekKey;
    parent.append(section('week',week.label,key,yearKey,week.days,drawDays));
  }
  function render(){
    const timeline=$('history-timeline'),years=organize(pageItems),fragment=document.createDocumentFragment();
    const firstYear=years.keys().next().value;
    if(!loaded||(!openGroups.get('root')&&!openGroups.has('root-chosen'))){
      openGroups.set('root',firstYear||null);openGroups.set('root-chosen',true);
    }
    for(const [year,node] of years){
      fragment.append(section('year',year,year,'root',node,(yearEl,data,yearKey)=>{
        // Latest day first, then prior weeks, then months with numbered weeks.
        for(const recent of ['today','this-week','week-1','week-2','week-3']){
          const week=data.recent.get(recent);
          if(!week)continue;
          if(recent==='today'){
            for(const [key,day] of week.days){
              yearEl.append(section('day',week.label,yearKey+':today:'+key,yearKey,day,dayRows));
            }
          }else drawWeek(yearEl,recent,week,yearKey);
        }
        for(const [month,monthNode] of data.months){
          const name=monthNode.date?monthNode.date.toLocaleDateString(undefined,{month:'long'}):'Undated';
          yearEl.append(section('month',name,yearKey+':month-'+month,yearKey,monthNode,(monthEl,monthData,monthKey)=>{
            for(const [number,days] of [...monthData.weeks].sort((a,b)=>a[0]-b[0])){
              const key=monthKey+':week-'+number;
              monthEl.append(section('week',ordinal[number]||'Unknown Week',key,monthKey,days,drawDays));
            }
          }));
        }
      }));
    }
    timeline.replaceChildren(fragment);
    const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
    $('history-status').textContent=fallback?'Recent records only · archive unavailable':
      total?total+' transfers':'No transfers yet';
    $('history-pagination').hidden=pages<=1;
    $('history-page-label').textContent=(pageIndex+1)+' / '+pages;
    $('history-prev').disabled=pageIndex<=0;
    $('history-next').disabled=pageIndex>=pages-1;
    loaded=true;
  }
  async function refresh(){
    const ticket=++requestId;
    $('history-retry').hidden=true;
    if(!loaded)$('history-status').textContent='Opening History…';
    try{
      if(!loaded||dirty){
        const stored=await chrome.storage.local.get('transferHistory');
        if(ticket!==requestId)return;
        legacy=Array.isArray(stored.transferHistory)?stored.transferHistory:[];
      }
      if(archive){
        try{
          if(!legacyImported){
            await archive.importLegacy(legacy);
            if(ticket!==requestId)return;
            legacyImported=true;
          }
          const page=await archive.page(pageIndex*PAGE_SIZE,PAGE_SIZE);
          if(ticket!==requestId)return;
          total=page.total;pageItems=page.items;fallback=false;
          // When the archive shrinks after a reset, recover valid page bounds.
          if(pageIndex>0&&!pageItems.length&&total>0){pageIndex=Math.ceil(total/PAGE_SIZE)-1;return refresh();}
        }catch(error){
          console.warn('REDOWN history archive unavailable:',error?.message||String(error));
          fallback=true;total=legacy.length;pageItems=legacy.slice(pageIndex*PAGE_SIZE,(pageIndex+1)*PAGE_SIZE);
        }
      }else{fallback=true;total=legacy.length;pageItems=legacy.slice(pageIndex*PAGE_SIZE,(pageIndex+1)*PAGE_SIZE);}
      dirty=false;render();
    }catch{
      if(ticket!==requestId)return;
      $('history-status').textContent='History could not be loaded';
      $('history-retry').hidden=false;
    }
  }
  function expandToday(){
    const now=new Date(),year=String(now.getFullYear());
    const bucket=organize(pageItems,now).get(year)?.recent.get('today');
    if(!bucket)return false;
    const day=bucket.days.keys().next().value;
    if(!day)return false;
    openGroups.set('root',year);
    openGroups.set('root-chosen',true);
    openGroups.set(year,year+':today:'+day);
    return true;
  }
  async function open(){
    // Navigation errors belong to an individual GO TO attempt, not to the History archive.
    // Do not leave a stale Explorer-readiness diagnostic underneath the transfer count.
    $('history-navigation-status').replaceChildren();
    // Every time History is opened, expose today's transfers immediately
    // instead of requiring the user to expand Year then Today manually.
    if(!loaded||dirty)await refresh();
    if(loaded&&expandToday())render();
  }
  async function pageTo(next){
    const max=Math.max(0,Math.ceil(total/PAGE_SIZE)-1);
    if(next<0||next>max||next===pageIndex)return;
    pageIndex=next;
    // Reveal the first year represented on the new page, not a stale year
    // selected on a previous page.
    openGroups.delete('root-chosen');
    // Page changes only read one small slice of the local archive.
    await refresh();
    $('history-timeline').scrollIntoView?.({behavior:'auto',block:'start'});
  }
  $('history-prev').addEventListener('click',()=>void pageTo(pageIndex-1));
  $('history-next').addEventListener('click',()=>void pageTo(pageIndex+1));
  $('history-retry').addEventListener('click',()=>void refresh());
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes.transferHistory)return;
    dirty=true;legacyImported=false;pageIndex=0;openGroups.delete('root-chosen');
    if(!$('history-view').hidden)void refresh();
  });
})();

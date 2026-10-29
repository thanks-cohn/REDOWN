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
    const delivered=record.ok===true&&/^(https?:\/\/|R2: )/.test(location);
    return {
      name:name||text(record.sourceUrl)||'Transfer',
      status:record.ok===false?'Failed':delivered?'Successful (recorded)':record.ok===true?'Accepted · completion unverified':text(record.status)||'Outcome not recorded',
      state:record.ok===false?'failed':delivered?'success':'unknown',
      detail:[text(record.provider)||(destination.bucketName||location.startsWith('R2: ')?'Cloudflare R2':''),text(record.profileName),text(destination.bucketName)].filter(Boolean).join(' · ')
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
  function dayRows(container,day){
    const list=create('ol','','history-transfers');
    for(const item of day.items){
      const info=describe(item.record),row=create('li','','history-transfer');
      row.dataset.state=info.state;
      row.title=[info.status,info.detail].filter(Boolean).join(' · ');
      const dot=create('span','','history-dot');dot.setAttribute('aria-hidden','true');
      const body=create('span','','history-transfer-body');
      body.append(create('strong',info.name));
      if(info.detail)body.append(create('small',info.detail));
      const time=create('time',day.date?new Date(item.ms).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'');
      if(day.date)time.dateTime=day.date.toISOString();
      row.append(dot,body,time);
      if(item.record.error)row.append(create('small',text(item.record.error),'history-error'));
      list.append(row);
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
          fallback=true;total=legacy.length;pageIndex=0;pageItems=legacy.slice(0,PAGE_SIZE);
        }
      }else{fallback=true;total=legacy.length;pageIndex=0;pageItems=legacy.slice(0,PAGE_SIZE);}
      dirty=false;render();
    }catch{
      if(ticket!==requestId)return;
      $('history-status').textContent='History could not be loaded';
      $('history-retry').hidden=false;
    }
  }
  async function open(){
    if(loaded&&!dirty)return;
    return refresh();
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

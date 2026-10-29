/* A read-only projection of transferHistory. No second store or provider calls. */
(() => {
  const $=id=>document.getElementById(id);
  const text=value=>typeof value==='string'?value:'';
  function group(records){
    const sorted=(Array.isArray(records)?records:[]).filter(item=>item&&typeof item==='object').map((record,index)=>{
      const time=typeof record.at==='string'?Date.parse(record.at):NaN;
      return {record,index,time};
    }).sort((a,b)=>(Number.isFinite(b.time)?b.time:-Infinity)-(Number.isFinite(a.time)?a.time:-Infinity)||a.index-b.index);
    const years=new Map();
    for(const entry of sorted){
      const date=Number.isFinite(entry.time)?new Date(entry.time):null;
      const year=date?String(date.getFullYear()):'Unknown date';
      const month=date?String(date.getMonth()):'unknown';
      const day=date?String(date.getDate()):'unknown';
      if(!years.has(year))years.set(year,new Map());
      const months=years.get(year);
      if(!months.has(month))months.set(month,new Map());
      const days=months.get(month);
      if(!days.has(day))days.set(day,[]);
      days.get(day).push({...entry,date});
    }
    return years;
  }
  function describe(record){
    const destination=record.destination||{};
    const location=text(record.location);
    let name=text(record.filename)||text(destination.key).split('/').pop();
    if(!name&&location.startsWith('R2: '))name=location.split('/').pop();
    if(!name)try{name=decodeURIComponent(new URL(text(record.sourceUrl)).pathname.split('/').pop());}catch{}
    const delivered=record.ok===true&&/^(https?:\/\/|R2: )/.test(location);
    const status=record.ok===false?'Failed':delivered?'Successful (recorded)':record.ok===true?'Accepted · completion unverified':text(record.status)||'Outcome not recorded';
    // A retained dispatch acknowledgement must never become proof of delivery.
    return {name:name||text(record.sourceUrl)||'Transfer',status,state:record.ok===false?'failed':delivered?'success':'unknown',
      detail:[text(record.provider)||(destination.bucketName||location.startsWith('R2: ')?'Cloudflare R2':''),text(record.profileName),text(destination.bucketName)].filter(Boolean).join(' · ')};
  }
  globalThis.RedownShelfHistory={group,describe,open};
  if(!$('history-timeline'))return;
  let records=[],loaded=false,loading=null,dirty=false,limit=100,epoch=0;
  // A single expanded year and month makes history navigable even in a
  // narrow Shelf. Remember the open group on data refresh or pagination.
  let activeYear=null,yearChosen=false;
  const activeMonthByYear=new Map();
  function element(tag,content,className){const node=document.createElement(tag);if(content)node.textContent=content;if(className)node.className=className;return node;}
  function summary(title,count,unit){
    const node=element('summary');
    const heading=element('span',title,'history-group-title');
    const amount=element('small',count+' '+(count===1?unit:unit+'s'),'history-group-count');
    node.append(heading,amount);
    return node;
  }
  function render(){
    const timeline=$('history-timeline'),groups=group(records);
    const entriesCount=records.filter(item=>item&&typeof item==='object').length;
    const years=[...groups.keys()];
    // The first transfer after an empty history should expand automatically.
    // A deliberate user collapse stays collapsed on ordinary refresh.
    if(!years.length){activeYear=null;yearChosen=false;}
    else if(!yearChosen || (activeYear!==null&&!groups.has(activeYear))){
      activeYear=years[0];yearChosen=true;
    }
    for(const remembered of activeMonthByYear.keys())if(!groups.has(remembered))activeMonthByYear.delete(remembered);
    const fragment=document.createDocumentFragment();
    let rendered=0;
    for(const [year,months] of groups){
      if(rendered>=limit)break;
      const yearNode=element('details',null,'history-year');
      yearNode.dataset.group=year;
      yearNode.open=activeYear===year;
      const yearCount=[...months.values()].reduce((sum,days)=>sum+[...days.values()].reduce((n,items)=>n+items.length,0),0);
      const yearSummary=summary(year,yearCount,'transfer');
      yearSummary.addEventListener('click',event=>{
        event.preventDefault();
        const next=!yearNode.open;
        activeYear=next?year:null;
        // True accordion behavior: the expanded year takes focus, while
        // other years shrink to headers instead of remaining open.
        for(const sibling of timeline.children)if(sibling!==yearNode&&sibling.classList.contains('history-year'))sibling.open=false;
        yearNode.open=next;
      });
      yearNode.append(yearSummary);
      const monthNames=[...months.keys()];
      if(!activeMonthByYear.has(year))activeMonthByYear.set(year,monthNames[0]||null);
      else if(activeMonthByYear.get(year)!==null&&!months.has(activeMonthByYear.get(year))){
        activeMonthByYear.set(year,monthNames[0]||null);
      }
      for(const [month,days] of months){
        if(rendered>=limit)break;
        const monthNode=element('details',null,'history-month');
        monthNode.dataset.group=year+'-'+month;
        monthNode.open=activeMonthByYear.get(year)===month;
        const first=days.values().next().value[0];
        const monthCount=[...days.values()].reduce((n,items)=>n+items.length,0);
        const monthSummary=summary(first.date?first.date.toLocaleDateString(undefined,{month:'long'}):'Undated',monthCount,'transfer');
        monthSummary.addEventListener('click',event=>{
          event.preventDefault();
          const next=!monthNode.open;
          activeMonthByYear.set(year,next?month:null);
          // Opening October folds September inside the same year, etc.
          for(const sibling of yearNode.children)if(sibling!==monthNode&&sibling.classList.contains('history-month'))sibling.open=false;
          monthNode.open=next;
        });
        monthNode.append(monthSummary);
        for(const entries of days.values()){
          if(rendered>=limit)break;
          const section=element('section',null,'history-day');
          section.append(element('h2',entries[0].date?entries[0].date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}):'Timestamp unavailable'));
          const list=element('ol');
          for(const entry of entries){
            if(rendered++>=limit)break;
            const info=describe(entry.record),row=element('li',null,'history-transfer');row.dataset.state=info.state;
            row.append(element('strong',info.name));
            const meta=element('p',null,'history-meta');
            meta.append(element('span',[info.detail,info.status].filter(Boolean).join(' · ')));
            if(entry.date){const time=element('time',entry.date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}));time.dateTime=entry.date.toISOString();meta.append(time);}
            row.append(meta);
            if(text(entry.record.error))row.append(element('p',entry.record.error,'history-error'));
            list.append(row);
          }
          section.append(list);monthNode.append(section);
        }
        yearNode.append(monthNode);
      }
      fragment.append(yearNode);
    }
    timeline.replaceChildren(fragment);
    $('history-status').textContent=entriesCount?`${Math.min(limit,entriesCount)} of ${entriesCount} retained transfers`:'No transfers yet. Your retained activity will appear here.';
    $('history-more').hidden=entriesCount<=limit;
  }
  async function open(){
    if(loaded&&!dirty||loading)return loading;
    const ticket=++epoch;
    $('history-status').textContent='Reading your transfer history…';$('history-retry').hidden=true;
    loading=(async()=>{
      try{
        const data=await chrome.storage.local.get('transferHistory');
        if(ticket!==epoch)return;
        records=Array.isArray(data.transferHistory)?data.transferHistory:[];
        loaded=true;dirty=false;render();
      }catch{
        $('history-status').textContent='Could not read transfer history. Your saved records have not been changed.';
        $('history-retry').hidden=false;
      }finally{loading=null;}
    })();
    return loading;
  }
  $('history-more').addEventListener('click',()=>{limit+=100;render();});
  $('history-retry').addEventListener('click',()=>{void open();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes.transferHistory)return;
    ++epoch;records=Array.isArray(changes.transferHistory.newValue)?changes.transferHistory.newValue:[];loaded=true;
    dirty=$('history-view').hidden;
    if(!dirty)render();
  });
})();

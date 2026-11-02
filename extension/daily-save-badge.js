/* A small local-calendar-day verified-save count on the browser toolbar.
 * Never counts animation arrivals, requests, login attempts or unverified jobs.
 * No additional permissions or data is transmitted to providers. */
(() => {
  'use strict';
  const ALARM='redown-daily-verified-badge-midnight';
  const localDay=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0')].join('-');
  function create({chrome=globalThis.chrome,readDaily,now=()=>new Date()}={}){
    let scheme='porcelain',renderLane=Promise.resolve();
    const preview=record=>{
      const today=localDay(now());
      const total=record?.version===1&&record.day===today&&
        typeof record.total==='string'&&/^(0|[1-9]\d*)$/.test(record.total)?
        BigInt(record.total):0n;
      return total>999n?'999+':String(total);
    };
    const themeColor=()=>scheme==='neon'?'#fa3a9d':scheme==='midnight'?'#526c87':
      scheme==='ocean'?'#157e84':'#6743a2';
    const render=state=>{
      // Serialize cosmetic updates to avoid delayed older badge calls winning.
      renderLane=renderLane.catch(()=>{}).then(async()=>{
        // Always draw the latest durable count. A previous read/change event
        // may complete after a newer remote save; never repaint it backwards.
        const authoritative=await readDaily();
        await chrome.action.setBadgeBackgroundColor({color:themeColor()});
        if(chrome.action.setBadgeTextColor)await chrome.action.setBadgeTextColor({color:'#ffffff'});
        await chrome.action.setBadgeText({text:preview(authoritative)});
      });
      return renderLane;
    };
    async function scheduleMidnight(){
      const at=now(),next=new Date(at.getTime());
      next.setHours(24,0,1,0); // local next day, including DST transitions
      await chrome.alarms.create(ALARM,{when:next.getTime()});
    }
    async function refresh(){
      const daily=await readDaily(); // resets persisted day before repainting
      await render(daily);
      await scheduleMidnight();
    }
    function install(){
      chrome.storage.onChanged.addListener((changes,area)=>{
        if(area!=='local')return;
        if(changes.shelfColorScheme){
          scheme=changes.shelfColorScheme.newValue||'porcelain';
          // Do not manufacture a save when a user switches themes.
          void chrome.storage.local.get('redownDailyVerified').then(r=>render(r.redownDailyVerified)).catch(()=>{});
        }
        if(changes.redownDailyVerified)void render(changes.redownDailyVerified.newValue).catch(()=>{});
      });
      chrome.alarms.onAlarm.addListener(alarm=>{
        if(alarm.name===ALARM)void refresh().catch(()=>{});
      });
      chrome.runtime.onStartup.addListener(()=>void refresh().catch(()=>{}));
      chrome.runtime.onInstalled.addListener(()=>void refresh().catch(()=>{}));
      void chrome.storage.local.get('shelfColorScheme').then(r=>{
        scheme=r.shelfColorScheme||'porcelain';
        return refresh();
      }).catch(()=>void refresh().catch(()=>{}));
    }
    return {install,refresh,render,preview,scheduleMidnight};
  }
  globalThis.RedownDailySaveBadge={create,ALARM};
})();

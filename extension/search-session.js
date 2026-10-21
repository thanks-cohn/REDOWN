/* Resumable pull protocol: one page per target per step, at most two reads. */
(() => {
  function create({listPage,score,now=()=>Date.now(),id=()=>crypto.randomUUID()}) {
    const sessions=new Map();
    function get(sessionId){
      for(const [key,s] of sessions)if(now()-s.updatedAt>300000)sessions.delete(key);
      const s=sessions.get(sessionId);if(!s)throw new Error('SEARCH_INTERRUPTED: Start the search again.');return s;
    }
    const view=s=>({sessionId:s.id,state:s.state,examined:s.examined,completed:s.targets.filter(t=>t.done).length,total:s.targets.length,matches:s.results.length,
      errors:s.targets.filter(t=>t.error).map(t=>({accountId:t.accountId,bucketName:t.bucketName,code:t.error})),results:s.results.slice(),limit:2000});
    function start(targets,query){
      if(!Array.isArray(targets)||targets.length>100||typeof query!=='string'||!query.trim()||query.length>256)throw new Error('INVALID_SEARCH');
      if(sessions.size>=8)sessions.delete(sessions.keys().next().value);
      const unique=new Map();
      for(const t of targets){if(!t||typeof t.accountId!=='string'||typeof t.bucketName!=='string'||t.accountId.length>128||t.bucketName.length>128)throw new Error('INVALID_SEARCH');unique.set(JSON.stringify([t.accountId,t.bucketName]),{accountId:t.accountId,bucketName:t.bucketName,accountName:String(t.accountName||'').slice(0,128),cursor:'',done:false,pages:0});}
      const s={id:id(),query:query.trim(),targets:[...unique.values()],results:[],seen:new Set(),state:unique.size?'scanning':'complete',examined:0,updatedAt:now(),startedAt:now(),busy:false};sessions.set(s.id,s);return view(s);
    }
    async function step(sessionId){
      const s=get(sessionId);if(s.busy)throw new Error('SEARCH_BUSY');if(s.state!=='scanning')return view(s);
      s.busy=true;s.updatedAt=now();
      try{
        const batch=s.targets.filter(t=>!t.done).slice(0,2);
        // allSettled preserves target order, independent of response arrival.
        const pages=await Promise.allSettled(batch.map(t=>listPage(t.accountId,t.bucketName,'',t.cursor)));
        if(s.state==='cancelled')return view(s);
        for(let i=0;i<batch.length;i++){
          const t=batch[i],r=pages[i];
          if(r.status==='rejected'){t.done=true;t.error='LIST_FAILED';continue;}
          const page=r.value;t.pages++;
          for(const object of page.objects){
            s.examined++;const key=String(object.key||object.name||'');if(!key)continue;
            const parts=key.split('/').filter(Boolean),candidates=[];
            if(parts.at(-1)!=='.redown')candidates.push({key,folder:false,object});
            for(let depth=1;depth<parts.length;depth++)candidates.push({key:parts.slice(0,depth).join('/')+'/',folder:true});
            for(const entry of candidates){
              if(score(s.query,entry.key)<0)continue;
              const identity=JSON.stringify([t.accountId,t.bucketName,entry.key,entry.folder]);if(s.seen.has(identity))continue;
              if(s.results.length>=2000){s.state='limited';break;}
              s.seen.add(identity);s.results.push({...entry,accountId:t.accountId,bucketName:t.bucketName,accountName:t.accountName});
            }
            if(s.state==='limited')break;
          }
          if(page.truncated&&!page.cursor){t.error='MISSING_CURSOR';t.done=true;}
          else if(page.cursor&&page.cursor===t.cursor){t.error='REPEATED_CURSOR';t.done=true;}
          else {t.cursor=page.cursor||'';t.done=!t.cursor;}
          if(t.pages>=1000&&!t.done){t.error='PAGE_LIMIT';t.done=true;}
        }
        if(s.state==='scanning'&&s.targets.every(t=>t.done))s.state=s.targets.some(t=>t.error)?'partial':'complete';
        if(s.state==='scanning'&&(s.examined>=100000||now()-s.startedAt>=300000))s.state='limited';
        return view(s);
      } finally{s.busy=false;s.updatedAt=now();}
    }
    return {start,step,cancelAll(){for(const s of sessions.values())s.state="cancelled";},snapshot:id=>view(get(id)),cancel(id){const s=get(id);s.state='cancelled';return view(s);},retry(id){const s=get(id);if(s.busy)throw new Error('SEARCH_BUSY');for(const t of s.targets)if(t.error){t.done=false;delete t.error;}s.state=s.targets.some(t=>!t.done)?'scanning':s.state;return view(s);}};
  }
  globalThis.RedownSearchSessions={create};
})();

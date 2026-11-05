// Presentation state only. Every remote read goes through the supplied File API.
export const identity=source=>JSON.stringify([source.accountId,source.bucketName,source.prefix||'']);
export function windowRange(length,scrollTop,height,rowHeight=48){
  const start=Math.max(0,Math.floor(scrollTop/rowHeight)-6);
  return {start,end:Math.min(length,start+Math.ceil(height/rowHeight)+12),top:start*rowHeight,total:length*rowHeight};
}
export function createExplorerModel({api,onChange=()=>{},now=Date.now}={}){
  let epoch=0,cacheEpoch=0,abort=null;const cache=new Map(),inflight=new Map();let active=0;const waiting=[];
  const state={source:null,entries:[],cursor:'',phase:'idle',error:'',selected:new Set(),history:[],index:-1};
  async function request(operation,input={},options={}){
    const result=await api.run(operation,input,options);
    if(result.state!=='completed')throw Error(result.error||'This operation did not complete. Refresh before retrying.');
    return result.data;
  }
  async function queue(fn){
    if(active>=3)await new Promise(resolve=>waiting.push(resolve));active++;
    try{return await fn();}finally{active--;waiting.shift()?.();}
  }
  async function children(source,{cursor='',signal,fresh=false}={}){
    const key=identity(source)+'|'+cursor,cached=cache.get(key);
    if(!fresh&&cached&&now()-cached.at<30000)return cached.data;
    // Content owns its own cancellable request. Rail shares only rail requests.
    if(!signal&&inflight.has(key))return inflight.get(key);
    const generation=cacheEpoch;
    const load=async()=>{
      signal?.throwIfAborted();const data=await request('list',{source:{...source},cursor},{signal});
      signal?.throwIfAborted();
      if(generation===cacheEpoch){cache.delete(key);cache.set(key,{at:now(),data});while(cache.size>64)cache.delete(cache.keys().next().value);}
      return data;
    };
    const task=signal?load():queue(load);
    if(!signal)inflight.set(key,task);
    try{return await task;}finally{if(!signal)inflight.delete(key);}
  }
  async function navigate(source,{append=false,record=true,fresh=false}={}){
    const ticket=++epoch;abort?.abort();const controller=new AbortController();abort=controller;
    const old=state.source,previousCursor=append?state.cursor:'';
    if(!append){state.source={...source};state.entries=[];state.cursor='';state.selected.clear();}
    state.phase='loading';state.error='';onChange(state);
    try{
      const data=await children(source,{cursor:previousCursor,signal:controller.signal,fresh});
      if(ticket!==epoch)return;
      state.entries=[...new Map([...(append?state.entries:[]),...data.entries].map(e=>[e.key,e])).values()];state.cursor=data.cursor||'';state.phase='ready';
      if(record&&!append&&(!old||identity(old)!==identity(source))){state.history=state.history.slice(0,state.index+1);state.history.push({...source});if(state.history.length>50)state.history.shift();state.index=state.history.length-1;}
    }catch(error){if(ticket!==epoch)return;state.phase='error';state.error=error.message;}
    if(ticket===epoch)onChange(state);
  }
  return {state,request,children,navigate,
    async travel(delta){const index=state.index+delta;if(index<0||index>=state.history.length)return;state.index=index;await navigate(state.history[index],{record:false});},
    invalidate(){cacheEpoch++;cache.clear();inflight.clear();},
    reset(){epoch++;cacheEpoch++;abort?.abort();cache.clear();inflight.clear();state.source=null;state.entries=[];state.selected.clear();state.cursor='';state.phase='idle';state.error='';state.history=[];state.index=-1;onChange(state);}
  };
}

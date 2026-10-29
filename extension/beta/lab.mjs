import {createFileApi,key,location} from './file-api.mjs';
import {createR2Adapter} from './r2-adapter.mjs';
const BRIDGE_OPERATIONS=['connectionStatus','list','listRaw','stat','upload','readStream','mkdir','copy','move','rename','delete'];
export async function executeCommand(command,{api,request}){
  const {command_id,operation,input={},scope}=command;
  const receipt={schema_version:'1.0',command_id,operation};
  let spoolDirectory,spoolName;
  try{
    if(command.schema_version!=='1.0')throw Error('Unsupported protocol version');
    if(operation==='capabilities')return {...receipt,state:'completed',data:{api_version:api.version,operations:api.capabilities.filter(op=>BRIDGE_OPERATIONS.includes(op)),upload_max_bytes:globalThis.navigator?.storage?.getDirectory?300000000:16777216}};
    if(!BRIDGE_OPERATIONS.includes(operation))return {...receipt,state:'failed',code:'UNSUPPORTED_OPERATION'};
    const s=location(scope);if(!/^redown-test-lab\/[a-zA-Z0-9-]+\/$/.test(s.prefix))throw Error('Run-owned redown-test-lab/<run-id>/ prefix required');
    const scoped=k=>{key(k);if(!k.startsWith(s.prefix)||k===s.prefix)throw Error('Object outside run prefix');};
    for(const l of [input.source,input.destination].filter(Boolean)){const v=location(l);if(v.accountId!==s.accountId||v.bucketName!==s.bucketName||!v.prefix.startsWith(s.prefix))throw Error('Location outside approved scope');}
    if(!input.source)input.source=s;
    if(input.key)scoped(input.key);for(const e of input.entries||[]){scoped(e.key);if(e.destinationKey)scoped(e.destinationKey);}if(input.entry)scoped(input.entry.key);
    if(input.conflict&&input.conflict!=='skip')throw Error('Bridge permits skip conflicts only');
    if(operation==='upload'){
      const response=await request('/file?id='+command_id);if(!response.ok)throw Error('Local fixture unavailable or exceeds provider upload limit');
      const size=Number(response.headers.get('content-length'));
      if(!Number.isSafeInteger(size)||size<0||size>300000000)throw Error('SIZE_LIMIT_EXCEEDED');
      // OPFS provides a disk-backed File accepted by the existing adapter's
      // fetch/verification path. No cloud credentials enter the local bridge.
      if(globalThis.navigator?.storage?.getDirectory){
        spoolDirectory=await navigator.storage.getDirectory();spoolName='redown-lab-'+command_id;
        const handle=await spoolDirectory.getFileHandle(spoolName,{create:true});
        const sink=await handle.createWritable();
        try{await response.body.pipeTo(sink);}catch(error){await sink.abort().catch(()=>{});throw error;}
        input.file=await handle.getFile();
      }else{
        if(size>16777216){await response.body.cancel();throw Error('SIZE_LIMIT_EXCEEDED: disk-backed browser storage unavailable; fallback limit 16 MiB');}
        const reader=response.body.getReader(),chunks=[];let received=0;
        try{while(true){const part=await reader.read();if(part.done)break;received+=part.value.length;if(received>16777216)throw Error('SIZE_LIMIT_EXCEEDED');chunks.push(part.value);}}finally{await reader.cancel();}
        input.file=new File(chunks,input.key.split('/').pop());
      }
      if(input.file.size!==size)throw Error('Local fixture stream ended early');
      input.stagingPrefix=s.prefix+'_staging/';delete input.local_path;
    }
    let sequence=0;
    const options={signal:AbortSignal.timeout(170000)};
    if(operation==='readStream')options.onChunk=async chunk=>{if(!chunk.length){const r=await request('/sink?id='+command_id+'&sequence='+sequence++,{method:'POST',body:chunk});if(!r.ok)throw Error('Empty sink rejected');}for(let offset=0;offset<chunk.length;offset+=1048576){const r=await request('/sink?id='+command_id+'&sequence='+sequence++,{method:'POST',body:chunk.subarray(offset,offset+1048576)});if(!r.ok)throw Error('Local download sink rejected bytes');}};
    const result=await api.run(operation,input,options);
    return {...receipt,...result};
  }catch(error){return {...receipt,state:'failed',code:error.name==='TimeoutError'?'TIMEOUT':'INVALID_REQUEST',error:error.message};}
  finally{if(spoolDirectory&&spoolName)await spoolDirectory.removeEntry(spoolName).catch(()=>{});}
}
if(typeof document!=='undefined'){
  let active=false,running=false;const status=document.getElementById('status');
  document.getElementById('stop').onclick=()=>{active=false;status.textContent='Stopping; inspect in-flight writes before retry.';};
  document.getElementById('connect').onclick=async()=>{
    if(running)return;const token=document.getElementById('token').value,port=Number(document.getElementById('port').value);if(!token||port<1024||port>65535)return;
    const request=(url,options={})=>fetch('http://127.0.0.1:'+port+url,{...options,headers:{...options.headers,authorization:'Bearer '+token},signal:AbortSignal.timeout(180000)});
    const api=createFileApi(createR2Adapter());active=true;running=true;
    while(active){try{const response=await request('/next');if(!response.ok)throw Error('Bridge authentication failed');const {command}=await response.json();if(command){status.textContent=command.operation+' '+command.command_id;const result=await executeCommand(command,{api,request});await request('/result',{method:'POST',body:JSON.stringify(result)});status.textContent=result.state;}else await new Promise(r=>setTimeout(r,300));}catch(error){status.textContent=error.message;active=false;}}
    running=false;
  };
}

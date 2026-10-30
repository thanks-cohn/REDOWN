// Local provider emulation around production Worker and background operation handlers.
// This is not live R2 evidence.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {createFileApi} from '../../extension/beta/file-api.mjs';
import {createR2Adapter} from '../../extension/beta/r2-adapter.mjs';
const background=await readFile(new URL('../../extension/background.js',import.meta.url),'utf8');
const source={accountId:'fixture-account',bucketName:'disposable-fixture',prefix:''};
export async function fixture(){
  const embedded=background.match(/const WORKER_SOURCE = `([\s\S]*?)`;\r?\n\r?\nfunction/);
  const code=Function(`return \`${embedded[1]}\``)().replace('__REDOWN_SHARED_SECRET__','fixture-secret');
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
  const stored=new Map(),messages=[],requests=[];let cancelled=false;
  function object(k,bytes,options={}){const md5=createHash('md5').update(bytes).digest();return {key:k,bytes,size:bytes.length,etag:md5.toString('hex'),version:randomUUID(),uploaded:new Date().toISOString(),checksums:{md5:md5.buffer.slice(md5.byteOffset,md5.byteOffset+md5.byteLength)},httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{},body:new Blob([bytes]).stream()};}
  const bucket={
    async head(k){return stored.get(k)||null;},async get(k,options={}){const o=stored.get(k);if(!o)return null;const bytes=options.range?o.bytes.slice(options.range.offset,options.range.offset+options.range.length):o.bytes;return {...o,body:new Blob([bytes]).stream(),arrayBuffer:async()=>Uint8Array.from(bytes).buffer};},
    async put(k,value,options={}){const old=stored.get(k);if(options.onlyIf instanceof Headers&&options.onlyIf.get('if-none-match')==='*'&&old)return null;if(options.onlyIf?.etagMatches&&old?.etag!==options.onlyIf.etagMatches)return null;const bytes=Buffer.from(await new Response(value).arrayBuffer());if(options.md5)assert.equal(createHash('md5').update(bytes).digest('hex'),options.md5);const o=object(k,bytes,options);stored.set(k,o);return o;},
    async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])stored.delete(k);}
  };
  const manage=async(profile,body)=>{const response=await worker.fetch(new Request('https://fixture.workers.dev',{method:'POST',headers:{authorization:'Bearer fixture-secret','content-type':'application/json'},body:JSON.stringify(body)}),{STORAGE:bucket});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error);return result;};
  const profile={workerUrl:'https://fixture.workers.dev',token:'fixture-secret'};
  const context=vm.createContext({TextEncoder,crypto,cleanExplorerName:n=>{const clean=n.trim();if(!clean||clean.includes('/'))throw Error('Invalid name');return clean;},preparedProfile:async()=>profile,callBucketWorker:manage,transferCounter:{add:async()=>{}},assertExplorerTransferSettings:async()=>{}});
  const extract=(start,end)=>background.slice(background.indexOf(start),background.indexOf(end,background.indexOf(start)));
  vm.runInContext(extract('function cleanExplorerPrefix(','async function workerAcceptsProfile('),context);
  vm.runInContext(extract('async function listAllObjects(','function explorerSearchScore('),context);
  vm.runInContext(extract('async function expandExplorerEntries(','// Explicit Debug action.'),context);
  vm.runInContext(extract('async function explorerDirectoryExists(','function objectKeyFromLocation('),context);
  context.listObjectsPage=async(a,b,p='',cursor='')=>({objects:[...stored.values()].filter(o=>o.key.startsWith(p)).map(({key,size,etag,httpMetadata})=>({key,size,etag,httpMetadata})),cursor:'',truncated:false});
  const send=async m=>{messages.push(m);try{switch(m.type){
    case 'profiles':return {ok:true,profiles:[{id:'fixture-profile',type:'cloudflare-r2',name:'Saved fixture',...source,defaultPrefix:'Photos/',token:profile.token,workerUrl:profile.workerUrl,workerVersion:6}]};
    case 'transferHistory':return {ok:true,transferHistory:[{ok:true,location:'fixture.txt'}]};
    case 'cfPublicAddresses':return {ok:true,accountId:source.accountId,bucketName:source.bucketName,addresses:[{label:'R2 domain',base:'https://fixture.r2.dev',state:'configured'}]};
    case 'cfCreateBucket':return {ok:true,bucket:{name:m.name}};
    case 'cfProvision':return {ok:true,verification:{workerReachable:true},profile:{token:'must-not-leak'}};
    case 'cfAccounts':return {ok:true,accounts:[{id:source.accountId,name:'Fixture'}]};
    case 'cfBuckets':return {ok:true,buckets:[{name:source.bucketName}]};
    case 'cfArchiveEntries':return {ok:true,...await manage(profile,{action:'listArchive',key:m.key})};
    case 'cfArchiveEntryUrl':return {ok:true,url:'https://fixture.workers.dev/archive-preview?entry='+encodeURIComponent(m.entry)};
    case 'cfExtractArchive':return {ok:true,...await manage(profile,{action:'extractArchiveEntries',key:m.key,entries:m.entries,destinationPrefix:m.destinationPrefix})};
    case 'cfTransferObjects':return {ok:true,...await context.transferExplorerObjects(m)};
    case 'cfRenameEntry':return {ok:true,...await context.renameExplorerEntry(m)};
    case 'cfDeleteObjects':return {ok:true,...await context.deleteExplorerObjects(m)};
    case 'cfCreateFolder':return {ok:true,...await context.createExplorerFolder(m)};
    case 'ingest':return {ok:true,location:'https://fixture.invalid/remote-result'};
    default:throw Error('Unexpected message '+m.type);
  }}catch(e){return {ok:false,error:e.message};}};
  const http={async boundedFetch(url,options){assert.equal(url,profile.workerUrl);assert.equal(JSON.parse(options.body).action,'capabilities');return worker.fetch(new Request(url,options),{STORAGE:bucket});},async request(path,options={}){requests.push({path,options});if(options.method==='PUT'){if(cancelled)throw Error('Disconnected');const k=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/');await bucket.put(k,options.body,{httpMetadata:{contentType:options.headers['content-type']}});return Response.json({success:true,result:{key:k}});}
    if(path.includes('/objects/')){const k=path.split('/objects/')[1].split('/').map(decodeURIComponent).join('/'),o=stored.get(k);return o?new Response(new Blob([o.bytes]).stream()):new Response(null,{status:404});}
    const u=new URL('https://fixture.invalid'+path),p=u.searchParams.get('prefix')||'',delimiter=u.searchParams.get('delimiter'),delimited=new Set(),objects=[];
    for(const o of stored.values()){if(!o.key.startsWith(p))continue;const relative=o.key.slice(p.length),slash=relative.indexOf('/');if(delimiter&&slash>=0)delimited.add(p+relative.slice(0,slash+1));else objects.push({key:o.key,size:o.size,etag:o.etag,version:o.version,uploaded:o.uploaded});}
    return Response.json({success:true,result:{objects,delimited:[...delimited]}});
  },async download(s,k,n,onState){assert.ok(stored.has(k));onState({state:'complete'});return 123;}};
  const adapter=createR2Adapter({send,http});return {api:createFileApi(adapter),adapter,http,stored,messages,requests,bucket,context,disconnect(){cancelled=true;}};
}

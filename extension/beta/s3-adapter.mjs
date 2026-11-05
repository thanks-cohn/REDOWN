import {AwsClient} from '../vendor/aws4fetch/aws4fetch.mjs';
import {key,prefix,name} from './file-api.mjs';
import {previewType} from './r2-adapter.mjs';
import {providerDefaults,validatePreferences,resolveOptions} from './configuration.mjs';

export const MEGA_MAX_BYTES=32*1024*1024;
const fail=(code,uncertain=false)=>Object.assign(Error('MEGA S4: '+code+'.'),{code,uncertain});
const encode=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export function megaEndpoint(value){
 const u=new URL(value.includes('://')?value:'https://'+value);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname)||u.port||!/^s3\.[a-z0-9-]+\.megas4\.com$/i.test(u.hostname))throw fail('INVALID_MEGA_ENDPOINT');
 return u.origin;
}
// Credentials exist only in the trusted extension page's closure. No storage,
// diagnostic export, environment injection, content-script or message interface.
export function createS3Adapter({fetch:transport=globalThis.fetch,parseXML=text=>new DOMParser().parseFromString(text,'application/xml'),clock=()=>new Date()}={}){
 let session=null,connecting=0;const history=[];
 const parse=text=>{const d=parseXML(text);if(d.querySelector('parsererror'))throw fail('INVALID_XML');return d;};
 const text=(node,tag)=>node.getElementsByTagName(tag)[0]?.textContent||'';
 async function request(s,method,bucket='',object='',query={},body,options={}){
  options.signal?.throwIfAborted();
  const url=new URL(s.endpoint+'/'+(bucket?encode(bucket)+'/':'')+object.split('/').map(encode).join('/'));
  for(const [k,v]of Object.entries(query))if(v!==undefined&&v!=='')url.searchParams.set(k,String(v));
  const writing=!['GET','HEAD'].includes(method);let dispatched=false;
  try{
   const signal=AbortSignal.any([AbortSignal.timeout(options.requestTimeoutMs??30000),...(options.signal?[options.signal]:[])]);
   const headers={'x-amz-date':clock().toISOString().replace(/[:-]|\.\d{3}/g,'')};
   if(method==='PUT')headers['if-none-match']='*';
   const signed=await s.client.sign(url,{method,headers,body,signal,redirect:'error',aws:{signQuery:false}});
   if(session!==s&&!options.preflight)throw fail('CONNECTION_CHANGED');
   dispatched=true;const response=await transport(signed);
   if(!response.ok){
    if(method==='HEAD'&&response.status===404)return null;
    await response.body?.cancel();throw fail('HTTP_'+response.status,writing&&response.status>=500);
   }
   return response;
  }catch(error){if(error.code)throw error;throw fail(options.signal?.aborted?'CANCELLED':'NETWORK_OR_TIMEOUT',writing&&dispatched);}
 }
 const getSession=source=>{if(!session)throw fail('CONNECT_FIRST');if(source&&(source.accountId!==session.id||source.provider&&source.provider!=='mega-s4'||source.connectionId&&source.connectionId!==session.id||!session.buckets.includes(source.bucketName)))throw fail('WRONG_CONNECTION');return session;};
 async function bounded(response,limit=MEGA_MAX_BYTES){
  if(!response?.body)throw fail('READ_UNAVAILABLE');
  if(Number(response.headers.get('content-length'))>limit){await response.body.cancel();throw fail('MEMORY_LIMIT_32_MIB');}
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw fail('MEMORY_LIMIT_32_MIB');chunks.push(value);}}finally{await reader.cancel();}
  const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;
 }
 async function stat({source,key:k},o={}){const s=getSession(source),r=await request(s,'HEAD',source.bucketName,key(k),{},undefined,o);return {object:r?{key:k,size:Number(r.headers.get('content-length')),etag:r.headers.get('etag'),uploaded:r.headers.get('last-modified')}:null};}
 async function page({source,cursor=''},o={},raw=false){
  const s=getSession(source),r=await request(s,'GET',source.bucketName,'',{'list-type':2,'max-keys':1000,prefix:prefix(source.prefix||''),delimiter:raw?'':'/','continuation-token':cursor},undefined,o);
  const d=parse(new TextDecoder().decode(await bounded(r,8*1024*1024))),entries=[];
  for(const n of d.getElementsByTagName('CommonPrefixes')){const k=text(n,'Prefix');entries.push({key:k,folder:true,displayName:k.slice((source.prefix||'').length).replace(/\/$/,'')});}
  for(const n of d.getElementsByTagName('Contents')){const k=text(n,'Key');if(k===source.prefix)continue;entries.push({key:k,folder:k.endsWith('/'),displayName:k.slice((source.prefix||'').length).replace(/\/$/,''),size:Number(text(n,'Size')),uploaded:text(n,'LastModified')});}
  const next=text(d,'NextContinuationToken');if(text(d,'IsTruncated')==='true'&&!next||next&&next===cursor)throw fail('INVALID_PAGINATION');
  return {entries,cursor:next,folderExists:!(source.prefix)||entries.length>0||d.getElementsByTagName('Contents').length>0};
 }
 async function upload({source,key:k,file,conflict='keep'},o={}){
  const s=getSession(source);key(k);if(file.size>MEGA_MAX_BYTES)throw fail('MEMORY_LIMIT_32_MIB');
  if(!['keep','skip'].includes(conflict))throw fail('OVERWRITE_NOT_SUPPORTED');
  const original=k;let count=0;
  while((await stat({source,key:k},o)).object){if(conflict==='skip')return {conflicts:[{destinationKey:k}]};if(++count>100)throw fail('CONFLICT_LIMIT');const i=original.lastIndexOf('.'),slash=original.lastIndexOf('/');k=i>slash?original.slice(0,i)+' ('+count+')'+original.slice(i):original+' ('+count+')';}
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(session!==s)throw fail('CONNECTION_CHANGED');
  await request(s,'PUT',source.bucketName,k,{},bytes,o);
  try{
   const read=await request(s,'GET',source.bucketName,k,{},undefined,o),actual=await bounded(read);
   if(actual.length!==bytes.length||actual.some((v,i)=>v!==bytes[i]))throw fail('READBACK_MISMATCH');
   if(session!==s)throw fail('CONNECTION_CHANGED');
   const receipt={provider:'mega-s4',connectionId:s.id,accountId:s.id,bucketName:source.bucketName,key:k,size:bytes.length,verified:true,verification:'independent-byte-readback'};
   history.unshift(receipt);history.length=Math.min(history.length,50);return receipt;
  }catch{throw fail('WRITE_READBACK_UNCONFIRMED',true);}
 }
 const api={
  configuration:{defaults:providerDefaults,validate:validatePreferences,resolve:resolveOptions},
  capabilityProfile:Object.freeze({provider:'mega-s4',maxBytes:MEGA_MAX_BYTES,remoteTransport:'browser-bounded-memory',workerDirect:'NOT_VERIFIED',multipart:false,copy:false,move:false}),
  async connect({endpoint,accessKeyId,secretAccessKey,region='ca-west-1'},options={}){
   const ticket=++connecting;
   if(!accessKeyId||!secretAccessKey||!/^[a-z0-9-]+$/.test(region))throw fail('INVALID_CREDENTIAL_SYNTAX');
   const s={endpoint:megaEndpoint(endpoint),id:'mega-s4:'+crypto.randomUUID(),buckets:[],client:new AwsClient({accessKeyId,secretAccessKey,service:'s3',region,retries:0})};
   const r=await request(s,'GET','','',{},undefined,{...options,preflight:true}),d=parse(new TextDecoder().decode(await bounded(r,8*1024*1024)));
   s.buckets=[...d.getElementsByTagName('Bucket')].map(n=>text(n,'Name'));if(!s.buckets.length)throw fail('NO_AUTHORIZED_BUCKETS');
   options.signal?.throwIfAborted();if(ticket!==connecting)throw fail('CONNECTION_CHANGED');session=s;history.length=0;return {ready:true};
  },
  async disconnect(){connecting++;session=null;history.length=0;return {ready:false};},
  async accounts(){return {accounts:session?[{id:session.id,name:'MEGA S4'}]:[]};},
  async buckets({accountId}){const s=getSession();if(accountId!==s.id)throw fail('WRONG_CONNECTION');return {buckets:s.buckets.map(name=>({name}))};},
  async connectionStatus({source}={}){getSession(source);return {ready:true};},
  list:page,listRaw:(i,o)=>page(i,o,true),stat,upload,
  async mkdir({source,name:n},o){return upload({source,key:prefix(source.prefix||'')+name(n)+'/',file:new Blob([]),conflict:'skip'},o);},
  async delete({source,entries},o){const s=getSession(source);if(entries.some(e=>e.folder))throw fail('RECURSIVE_DELETE_NOT_SUPPORTED');for(const e of entries)await request(s,'DELETE',source.bucketName,key(e.key),{},undefined,o);return {completed:entries.length};},
  async readStream({source,key:k},o={}){const r=await request(getSession(source),'GET',source.bucketName,key(k),{},undefined,o),reader=r.body.getReader();let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;await o.onChunk?.(value);}}finally{await reader.cancel();}return {size,status:r.status};},
  async preview({source,entry:e},o={}){const r=await request(getSession(source),'GET',source.bucketName,key(e.key),{},undefined,o),bytes=await bounded(r,Math.min(o.previewMaxBytes??MEGA_MAX_BYTES,MEGA_MAX_BYTES)),type=previewType(e.key)||'application/octet-stream';return {url:URL.createObjectURL(new Blob([bytes],{type})),type,size:bytes.length};},
  async download(i,o){const result=await api.preview(i,o),a=document.createElement('a');a.href=result.url;a.download=i.entry.displayName||i.entry.key.split('/').pop();a.click();setTimeout(()=>URL.revokeObjectURL(result.url),60000);return {state:'started',downloadState:'started'};},
  async remoteIngest({destination,url,filename},o={}){
   const s=getSession(destination),u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname))throw fail('SOURCE_URL_DENIED');
   let r;try{r=await transport(u,{redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.any([AbortSignal.timeout(30000),...(o.signal?[o.signal]:[])])});}catch{throw fail('SOURCE_FETCH_FAILED');}
   if(!r.ok){await r.body?.cancel();throw fail('SOURCE_HTTP_'+r.status);}
   const bytes=await bounded(r);if(session!==s)throw fail('CONNECTION_CHANGED');
   return upload({source:destination,key:prefix(destination.prefix||'')+name(filename||'download'),file:new Blob([bytes]),conflict:'keep'},o);
  },
  async profiles(){return {profiles:[]};},async transferHistory(){return {history:[...history]};}
 };
 return Object.freeze(api);
}

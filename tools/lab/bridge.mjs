import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';

export const VERSION='1.0';
const MAX=300000000;
export function createBridge({root,token,extensionId,timeoutMs=180000}) {
  root=fs.realpathSync(root);const queue=[],pending=new Map();let connected=0;
  const downloads=path.join(root,'work','bridge-downloads');fs.mkdirSync(downloads,{recursive:true});
  const safeFile=p=>{const full=fs.realpathSync(p);if(!full.startsWith(root+path.sep)||!fs.statSync(full).isFile())throw Error('File outside approved root');return full;};
  async function json(req,limit=65536){let raw='',size=0;for await(const c of req){size+=c.length;if(size>limit)throw Error('Control message too large');raw+=c;}return JSON.parse(raw||'{}');}
  const server=http.createServer({requestTimeout:190000,headersTimeout:10000},async(req,res)=>{
    const origin=req.headers.origin;const allowed='chrome-extension://'+extensionId;
    const reply=(code,data)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
    if(origin&&origin!==allowed)return reply(403,{code:'ORIGIN_DENIED'});
    if(origin){res.setHeader('access-control-allow-origin',allowed);res.setHeader('access-control-allow-headers','authorization,content-type');res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');}
    if(req.method==='OPTIONS')return reply(204,{});
    if(req.headers.authorization!=='Bearer '+token)return reply(401,{code:'AUTH_REQUIRED'});
    try {
      const url=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&url.pathname==='/health')return reply(200,{schema_version:VERSION,connected:Date.now()-connected<5000,upload_max_bytes:MAX,approved_root:root,pending:pending.size});
      if(req.method==='GET'&&url.pathname==='/next'){
        if(origin!==allowed)return reply(403,{code:'EXTENSION_REQUIRED'});connected=Date.now();
        let command;while(queue.length&&!command){const q=queue.shift();if(pending.has(q.command_id))command=q;}
        return reply(200,{command:command||null});
      }
      if(req.method==='POST'&&url.pathname==='/command'){
        const c=await json(req);
        if(pending.size>=32)return reply(429,{code:'BRIDGE_BUSY'});
        if(c.schema_version!==VERSION||!/^[-a-zA-Z0-9]{1,100}$/.test(c.command_id)||pending.has(c.command_id)||typeof c.operation!=='string')return reply(400,{code:'INVALID_REQUEST'});
        if(Date.now()-connected>=5000)return reply(503,{code:'BRIDGE_DISCONNECTED'});
        const timer=setTimeout(()=>{const expired=pending.get(c.command_id);pending.delete(c.command_id);reply(504,{bytes_received:expired?.bytes||0,download_path:expired?.sequence?path.join(downloads,c.command_id+'.bin'):undefined,schema_version:VERSION,command_id:c.command_id,state:'uncertain',code:'TIMEOUT',error:'Deadline elapsed; reconcile before retry. The dispatched operation may still finish.'});},timeoutMs);
        pending.set(c.command_id,{reply,timer,command:c,bytes:0,sequence:0});queue.push(c);return;
      }
      if(req.method==='POST'&&url.pathname==='/result'){
        if(origin!==allowed)return reply(403,{code:'EXTENSION_REQUIRED'});
        connected=Date.now();
        const r=await json(req,2*1024*1024),p=pending.get(r.command_id);
        if(!p)return reply(409,{code:'EXPIRED_COMMAND'});
        clearTimeout(p.timer);pending.delete(r.command_id);
        p.reply(200,{...r,schema_version:VERSION,download_path:p.bytes||r.data?.size===0?path.join(downloads,r.command_id+'.bin'):undefined,bytes_received:p.bytes});return reply(200,{ok:true});
      }
      const id=url.searchParams.get('id'),p=pending.get(id);
      if(!p)return reply(409,{code:'EXPIRED_COMMAND'});
      if(req.method==='GET'&&url.pathname==='/file'&&p.command.operation==='upload'){
        if(origin!==allowed)return reply(403,{code:'EXTENSION_REQUIRED'});
        const f=safeFile(p.command.input.local_path),size=fs.statSync(f).size;
        if(size>MAX)return reply(413,{code:'SIZE_LIMIT_EXCEEDED'});
        res.writeHead(200,{'content-length':size,'content-type':'application/octet-stream'});await pipeline(fs.createReadStream(f),res);return;
      }
      if(req.method==='POST'&&url.pathname==='/sink'&&p.command.operation==='readStream'){
        if(origin!==allowed)return reply(403,{code:'EXTENSION_REQUIRED'});
        if(Number(url.searchParams.get('sequence'))!==p.sequence)return reply(409,{code:'CHUNK_SEQUENCE'});
        let n=0;const chunks=[];for await(const chunk of req){n+=chunk.length;if(n>1024*1024)throw Error('Chunk too large');chunks.push(chunk);}
        fs.writeFileSync(path.join(downloads,id+'.bin'),Buffer.concat(chunks),{flag:p.sequence?'a':'w'});p.bytes+=n;p.sequence++;return reply(200,{ok:true});
      }
      reply(404,{code:'NOT_FOUND'});
    }catch(error){if(!res.headersSent)reply(400,{code:'INVALID_REQUEST',error:error.message});else res.destroy();}
  });
  server.on('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);}});
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=Object.fromEntries(process.argv.slice(2).map((v,i,a)=>v.startsWith('--')?[v.slice(2),a[i+1]]:null).filter(Boolean));
  if(!/^[a-p]{32}$/.test(args['extension-id']||''))throw Error('--extension-id must be the installed Chrome extension ID');
  const token=process.env.REDOWN_LAB_TOKEN;if(!token||token.length<32)throw Error('Set REDOWN_LAB_TOKEN to a random secret of at least 32 characters');
  const server=createBridge({root:args.root||process.cwd(),token,extensionId:args['extension-id']});
  server.listen(Number(args.port||8766),'127.0.0.1',()=>console.log('REDOWN lab bridge listening on 127.0.0.1:'+server.address().port+'; open extension beta/lab.html and connect explicitly.'));
}

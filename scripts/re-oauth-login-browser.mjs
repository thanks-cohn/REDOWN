/* Focused production Shelf HTML/CSS + three UI scripts. Chrome APIs mocked;
 * localhost Linux Chromium fixture, NOT installed-extension/provider acceptance. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const output=resolve(process.argv[2]||'work/re-oauth-login-browser.json');
const profile=await mkdtemp(join(tmpdir(),'redown-auth-ui-'));
const results={scope:'SIMULATED Chrome APIs; real Linux Chromium layout only; no installed OAuth or remote saves',state:'failed',cases:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser,ws,server;
try{
  let html=(await readFile('extension/shelf.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const bootstrap=`globalThis.fixture={messages:[],tabs:[]};globalThis.chrome={runtime:{sendMessage:async m=>{fixture.messages.push(m.type);return {ok:true,authorization:'verified'};}},tabs:{create:async v=>fixture.tabs.push(v)},storage:{local:{get:async()=>({googleDriveState:{phase:'connected'},'dropbox:state':{phase:'connected',rootReady:true,checkedAt:Date.now()},'onedrive:state':{phase:'connected',rootReady:true}})},onChanged:{addListener:()=>{}}}};`;
  html=html.replace('</body>',`<script>${bootstrap}</script><script src="shelf-google-drive.js"></script><script src="shelf-dropbox.js"></script><script src="shelf-onedrive.js"></script></body>`);
  server=createServer(async(req,res)=>{
    try{
      const path=new URL(req.url,'http://localhost').pathname;
      if(path==='/'||path==='/shelf.html'){res.setHeader('Content-Type','text/html');res.end(html);return;}
      if(!/^\/[\w./-]+$/.test(path)||path.includes('..')){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream');
      res.end(await readFile(join('extension',path)));
    }catch{res.writeHead(404).end();}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=spawn(process.env.CHROME_BIN||'/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','ignore']});
  let port;for(let i=0;i<100;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await pause(100);}}
  assert.ok(port,'Chrome debugging port');
  const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();results.browser=version.Browser;
  ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  const pending=new Map();let sequence=0;
  ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},10000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await call('Target.createTarget',{url:`http://127.0.0.1:${server.address().port}/shelf.html`});
  const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  for(let i=0;i<100;i++){if(await evaluate('!!globalThis.fixture && document.getElementById("shelf-google-label")?.textContent === "GO TO"'))break;await pause(50);}
  for(const width of [320,400,480,640])for(const theme of ['porcelain','midnight'])for(const reduced of [false,true]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false},sessionId);
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},sessionId);
    const rows=await evaluate(`(async()=>{
      document.documentElement.dataset.shelfTheme=${JSON.stringify(theme)};
      await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const out=[];
      for(const key of ['google','dropbox','onedrive']){
        const reauth=document.getElementById('shelf-'+key+'-reauth'),login=document.getElementById('shelf-'+key+'-login'),card=reauth.closest('.destination-tile'),result=document.getElementById('shelf-'+key+'-auth-result');
        const b=card.getBoundingClientRect();
        const fits=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>=28&&r.left>=b.left&&r.right<=b.right+.5;};
        const before=card.getBoundingClientRect().height;
        result.textContent='Provider network unavailable. This does not establish revoked authorization. Try Re-O\\'Auth later.';
        const after=card.getBoundingClientRect().height;
        fixture.messages=[];fixture.tabs=[];login.focus();login.click();await Promise.resolve();
        const website=fixture.tabs.length===1&&fixture.messages.length===0;
        fixture.messages=[];fixture.tabs=[];reauth.focus();reauth.click();await new Promise(r=>setTimeout(r,0));
        out.push({key,reauth:reauth.textContent,login:login.textContent,fits:fits(reauth)&&fits(login),stable:Math.abs(before-after)<1,website,oauth:fixture.messages.length===1&&fixture.tabs.length===0,focus:document.activeElement===reauth,restored:!reauth.disabled});
      }return out;
    })()`);
    for(const row of rows){assert.equal(row.reauth,"Re-O'Auth");assert.equal(row.login,'LOGIN');for(const key of ['fits','stable','website','oauth','focus','restored'])assert.equal(row[key],true,JSON.stringify({width,theme,reduced,row,key}));}
    results.cases.push({width,theme,reduced,providers:rows});
  }
  results.state='passed';
}catch(e){results.error=e.message;process.exitCode=1;}
finally{
  ws?.close();if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([new Promise(r=>browser.once('exit',r)),pause(2000)]);if(browser.exitCode===null)browser.kill('SIGKILL');}
  server?.closeAllConnections();await new Promise(r=>server?server.close(r):r());await rm(profile,{recursive:true,force:true,maxRetries:3});
  await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({state:results.state,cases:results.cases.length,output,error:results.error}));
}

const $=id=>document.getElementById(id);
let connectionBusy=false,loginTimer=null,loginDeadline=0,connectionEpoch=0,countEpoch=0,lastTotal=null,connectionState="checking",displayedText=null;
function setStatus(text){$('status').textContent=text||'';}
function paintConnection(state,label){
  const button=$('connection');button.dataset.state=state;button.title=label;button.setAttribute('aria-label',label);button.disabled=connectionBusy;
  connectionState=state;renderCount(lastTotal);
}
async function request(message){
  let timer;
  try{return await Promise.race([chrome.runtime.sendMessage(message),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Request timed out. Please try again.')),12000);})]);}
  finally{clearTimeout(timer);}
}
async function checkConnection(){
  const epoch=++connectionEpoch;
  if(connectionBusy)return;
  paintConnection('checking','Checking Cloudflare connection');
  try{
    const stored=await chrome.storage.local.get('cloudflareAuth');
    if(epoch!==connectionEpoch||connectionBusy)return;
    if(!stored.cloudflareAuth?.accessToken)throw Error('Not connected');
    const response=await request({type:'cfAccounts'});
    if(epoch!==connectionEpoch||connectionBusy)return;
    if(!response?.ok||!Array.isArray(response.accounts))throw Error('Account access unavailable');
    paintConnection('connected','Cloudflare connected — click to check again');
  }catch{if(epoch===connectionEpoch&&!connectionBusy)paintConnection('disconnected','Open Cloudflare login');}
}
async function followLogin(){
  try{
    const result=await request({type:'cfLoginStatus'});
    if(!result?.ok)throw Error('Connection status unavailable. Tap LOGIN to retry.');
    if(['opening','authorizing','verifying'].includes(result.phase)){
      if(Date.now()>loginDeadline)throw Error('Sign-in is taking longer than expected. Tap LOGIN to retry.');
      loginTimer=setTimeout(followLogin,1000);return;
    }
    if(result.phase!=='connected')throw Error(result.error||'Sign-in was not completed. Tap LOGIN to try again.');
    connectionBusy=false;setStatus('');await checkConnection();
  }catch(error){connectionBusy=false;paintConnection('disconnected','Open Cloudflare login');setStatus(error.message);}
}
$('connection').addEventListener('click',async()=>{
  if(connectionBusy)return;
  if($('connection').dataset.state==='connected'){void checkConnection();return;}
  connectionEpoch++;connectionBusy=true;paintConnection('checking','Connecting to Cloudflare');setStatus('A quick hello to Cloudflare. Finish sign-in in the window that opens.');
  try{
    const result=await request({type:'cfConnect'});
    if(!result?.ok)throw Error(result?.error||'Could not open sign-in. Tap LOGIN to retry.');
    loginDeadline=Date.now()+5*60*1000;await followLogin();
  }catch(error){connectionBusy=false;paintConnection('disconnected','Open Cloudflare login');setStatus(error.message);}
});
$('dashboard').addEventListener('click',()=>Promise.resolve(chrome.runtime.openOptionsPage()).catch(()=>setStatus('Dashboard could not open. Please try again.')));
function renderCount(total){
  if(total!==null&&(typeof total!=='string'||!/^(0|[1-9]\d*)$/.test(total)))throw Error('Invalid delivery count');
  const host=$('odometer'),login=connectionState==='disconnected',working=connectionState==='checking',ready=total==='0';
  const text=login?'LOGIN!':working?'WAIT..':total===null?'------':ready?'READY!':total.padStart(6,'0'),numeric=/^\d+$/.test(text);
  host.disabled=!login;host.toggleAttribute('data-login',login);
  host.setAttribute('aria-label',login?'LOGIN — open Cloudflare sign-in':working?'Connecting to Cloudflare':total===null?'Delivery count unavailable':ready?'Ready for your first delivery':total+' files delivered');host.style.setProperty('--digits',text.length);
  if(host.children.length!==text.length||!numeric||!/^\d+$/.test(displayedText||'')){
    host.replaceChildren(...[...text].map(char=>{
      const wheel=document.createElement('span');wheel.className='wheel';wheel.setAttribute('aria-hidden','true');
      if(!numeric){wheel.textContent=char;return wheel;}
      const reel=document.createElement('span');reel.className='reel';
      for(let i=0;i<10;i++){const digit=document.createElement('span');digit.textContent=String(i);reel.append(digit);}
      reel.style.setProperty('--digit',char);wheel.append(reel);return wheel;
    }));
  }else [...host.children].forEach((wheel,index)=>wheel.firstChild.style.setProperty('--digit',text[index]));
  $('counter-note').textContent=login?'Tap LOGIN. Let’s get you connected ✦':working?'A quick hello to Cloudflare…':total===null?'Counter is resting. Reopen REDOWN to retry.':ready?'First adventure? Ready when you are ✦':'Every delivery, a little further ✦';
  host.title=login?'Open Cloudflare login':'Completed cloud saves, uploads, copies and moves. Includes retained history from earlier versions; older discarded history cannot be recovered. This device only.';
  lastTotal=total;displayedText=text;
}
$('odometer').addEventListener('click',()=>{if(connectionState==='disconnected')$('connection').click();});
async function refreshCount(){
  const epoch=++countEpoch;
  try{const result=await request({type:'deliveryCount'});if(epoch!==countEpoch)return;if(!result?.ok)throw Error();renderCount(result.counter?.total);}
  catch{if(epoch===countEpoch){renderCount(null);}}
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes.cloudflareAuth)void checkConnection();
  if(changes.transferCounter?.newValue){countEpoch++;try{renderCount(changes.transferCounter.newValue.total);}catch{void refreshCount();}}
});
globalThis.addEventListener?.('pagehide',()=>clearTimeout(loginTimer));
void checkConnection();void refreshCount();
if(chrome.storage.session?.get)chrome.storage.session.get('cloudflareLogin').then(stored=>{
  if(['opening','authorizing','verifying'].includes(stored.cloudflareLogin?.phase)){
    connectionEpoch++;connectionBusy=true;paintConnection('checking','Connecting to Cloudflare');loginDeadline=Date.now()+5*60*1000;void followLogin();
  }
}).catch(()=>{});

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
function paintCount(total){
  if(total!==null&&(typeof total!=='string'||!/^(0|[1-9]\d*)$/.test(total)))throw Error('Invalid delivery count');
  const host=$('odometer'),login=connectionState==='disconnected',working=connectionState==='checking'||(!preferencesReady&&!login),ready=total==='0'&&!host.hasAttribute('data-rolling');
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
  displayedText=text;
}
let preferencesReady=false,seenTotal=null,shownTotal=null,activeTarget=null,soundEnabled=true,audio=null,preferenceQueue=Promise.resolve();
const motionQuery=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const reducedMotion=()=>motionQuery?.matches===true;
function savePreferences(){
  const value={version:1,lastSeenTotal:seenTotal,soundEnabled};
  preferenceQueue=preferenceQueue.catch(()=>{}).then(()=>chrome.storage.local.set({popupOdometer:value})).catch(()=>{
    if(connectionState==='connected')$('counter-note').textContent='Display preferences could not be saved. Your delivery total is safe.';
  });
}
function paintSound(){
  const button=$('counter-sound');button.disabled=!preferencesReady;button.textContent=soundEnabled?(audio?.state==='suspended'?'Enable sound ♪':'Sound on ♪'):'Sound off';button.setAttribute('aria-pressed',String(soundEnabled));button.title=soundEnabled?(audio?.state==='suspended'?'Enable counter sound — Chrome requires a click':'Mute counter sound'):'Enable counter sound';
}
async function prepareAudio(){
  if(!soundEnabled||reducedMotion())return;
  try{
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    audio||=new Audio();paintSound();if(audio.state==='suspended')await audio.resume();paintSound();
  }catch{/* Browser audio policy must never block the counter. */}
}
function playClick(){
  if(!soundEnabled||reducedMotion()||audio?.state!=='running')return;
  try{
    const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.018),audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**4;
    const source=audio.createBufferSource(),gain=audio.createGain();gain.gain.value=.09;source.buffer=buffer;source.connect(gain);gain.connect(audio.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
  }catch{/* Optional feedback never changes transfer or login behavior. */}
}
const roller=RedownOdometer.create({
  paint:value=>{shownTotal=value;paintCount(value);},
  settled:value=>{$('odometer').removeAttribute('data-rolling');$('odometer').removeAttribute('aria-busy');seenTotal=value;savePreferences();},
  click:playClick,reduced:reducedMotion
});
function renderCount(total){
  if(total!==null&&(typeof total!=='string'||!/^(0|[1-9]\d*)$/.test(total)))throw Error('Invalid delivery count');
  lastTotal=total;
  if(connectionState!=='connected'||total===null||!preferencesReady){
    roller.cancel();activeTarget=null;$('odometer').removeAttribute('data-rolling');$('odometer').removeAttribute('aria-busy');paintCount(total);return;
  }
  if(activeTarget===total)return;
  const previous=shownTotal??seenTotal??total,from=BigInt(previous)>BigInt(total)?total:previous;
  activeTarget=total;
  const rolling=from!==total&&!reducedMotion();$('odometer').toggleAttribute('data-rolling',rolling);if(rolling)$('odometer').setAttribute('aria-busy','true');
  roller.roll(from,total);
}
$('counter-sound').addEventListener('click',async()=>{
  if(soundEnabled&&audio?.state==='suspended'){await prepareAudio();playClick();return;}
  soundEnabled=!soundEnabled;paintSound();savePreferences();
  if(soundEnabled){await prepareAudio();playClick();}
});
async function loadPreferences(){
  try{
    const {popupOdometer:prefs}=await chrome.storage.local.get('popupOdometer');
    if(prefs?.version===1){if(typeof prefs.lastSeenTotal==='string'&&/^(0|[1-9]\d*)$/.test(prefs.lastSeenTotal))seenTotal=prefs.lastSeenTotal;soundEnabled=prefs.soundEnabled!==false;}
  }catch{/* With no trustworthy prior reading, start at the real current total. */}
  preferencesReady=true;paintSound();void prepareAudio();renderCount(lastTotal);
}
motionQuery?.addEventListener?.('change',()=>{activeTarget=null;renderCount(lastTotal);});
void loadPreferences();
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
globalThis.addEventListener?.('pagehide',()=>{clearTimeout(loginTimer);roller.cancel();if(shownTotal!==null&&preferencesReady){seenTotal=shownTotal;savePreferences();}try{void audio?.close();}catch{}});
void checkConnection();void refreshCount();
if(chrome.storage.session?.get)chrome.storage.session.get('cloudflareLogin').then(stored=>{
  if(['opening','authorizing','verifying'].includes(stored.cloudflareLogin?.phase)){
    connectionEpoch++;connectionBusy=true;paintConnection('checking','Connecting to Cloudflare');loginDeadline=Date.now()+5*60*1000;void followLogin();
  }
}).catch(()=>{});

$("beta-explorer")?.addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("beta/explorer.html")}));

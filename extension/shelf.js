const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message || ''; };
const modes = [...document.querySelectorAll('[name="toolbar-mode"]')];
function updateConnectionSummary(){
  const state=$('cf-state')?.dataset.state;
  $('connection-summary').textContent=state==='connected'
    ? 'Download Direct2Cloud! Nothing Downloads Directly!'
    : state==='checking'
      ? 'Checking Cloudflare connection…'
      : state==='error'
        ? '' // Keep verification issues on the Cloudflare card, not in the Shelf welcome copy.
        : 'Connect Cloudflare to make R2 your cloud home.';
}
document.addEventListener('redown:provider-connection',updateConnectionSummary);
let filesEntrance='normal',entranceAnimations=[];
const entranceReady=chrome.storage.local.get('shelfFilesEntranceV1').then(data=>{
  filesEntrance=data.shelfFilesEntranceV1==='slide-up'?'slide-up':'normal';
  const control=$('files-entrance');if(control)control.value=filesEntrance;
}).catch(()=>{});
function settleEntrance(){for(const animation of entranceAnimations)animation.cancel();entranceAnimations=[];}
// Only an explicit FILES click animates. Startup, History GO TO and hash routes
// remain synchronous. Measure the real tabs before/after the existing layout.
$('nav-explorer').addEventListener('click',async event=>{
  event.preventDefault();await entranceReady;
  if(!$('explorer-view').hidden)return;
  settleEntrance();
  const nav=document.querySelector('nav[aria-label="Shelf"]'),before=nav.getBoundingClientRect();
  location.hash='#explorer';route();
  if(filesEntrance!=='slide-up'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!nav.animate)return;
  const after=nav.getBoundingClientRect(),explorer=$('explorer-view');
  const distance=Math.max(0,window.innerHeight-explorer.getBoundingClientRect().top);
  const timing={duration:240,easing:'cubic-bezier(.2,.7,.2,1)'};
  entranceAnimations=[nav.animate([{transform:`translateY(${before.top-after.top}px)`},{transform:'translateY(0)'}],timing),explorer.animate([{transform:`translateY(${distance}px)`},{transform:'translateY(0)'}],timing)];
});
$('files-entrance')?.addEventListener('change',async event=>{
  const value=event.target.value==='slide-up'?'slide-up':'normal';
  try{await chrome.storage.local.set({shelfFilesEntranceV1:value});filesEntrance=value;status('Files entrance saved.');}
  catch{event.target.value=filesEntrance;status('Could not save Files entrance.');}
});
function route() {
  const view=['settings','history','explorer'].includes(location.hash.slice(1))?location.hash.slice(1):'clouds';
  for (const name of ['clouds','explorer','history','settings']) {
    $(name+'-view').hidden=name!==view;
    if(name===view)$('nav-'+name).setAttribute('aria-current','page');
    else $('nav-'+name).removeAttribute('aria-current');
  }
  window.dispatchEvent(new Event('redown:shelf-route'));
  if(location.hash)void chrome.storage.local.set?.({shelfLastViewV1:view})?.catch(()=>{});
  const reviewStart=Date.now();
  if(view==='history')void Promise.resolve(globalThis.RedownShelfHistory?.open()).then(async()=>{
    // Opening the actual History view acknowledges previously signaled failures.
    // A newer failure arriving during the read must retain its indicator.
    const {redownFailureDot}=await chrome.storage.local.get('redownFailureDot');
    if(!redownFailureDot?.pending || !Number.isFinite(redownFailureDot.at))return;
    if(location.hash.slice(1)==='history'&&redownFailureDot.at<=reviewStart)
      await chrome.storage.local.remove('redownFailureDot');
  }).catch(()=>{});
}
window.addEventListener('hashchange',()=>{if(location.hash!=='#explorer')settleEntrance();route();}); route();
window.addEventListener('resize',settleEntrance);
// REMOTES is the default Shelf opening view regardless of the visual tab order.
// Opt-in "last" mode restores a validated route only when no explicit hash/deep link
// was requested. This read never blocks the visible Shelf shell.
if(!location.hash)void chrome.storage.local.get(['shelfStartViewMode','shelfLastViewV1']).then(data=>{
  if(!location.hash&&data.shelfStartViewMode==='last'&&
     ['clouds','explorer','history','settings'].includes(data.shelfLastViewV1)){
    location.hash='#'+data.shelfLastViewV1;
  }
}).catch(()=>{});
// One-time History/Settings navigation, scoped to the requesting browser window.
let consumedShelfIntent=null,shelfIntentEpoch=0;
async function useShelfOpenIntent(intent){
  if(!['settings','history'].includes(intent?.view)||typeof intent.token!=='string'||
     !Number.isInteger(intent.windowId)||!Number.isFinite(intent.issuedAt)||
     Date.now()-intent.issuedAt>15000||intent.issuedAt>Date.now()+1000||
     consumedShelfIntent===intent.token)return;
  const ticket=++shelfIntentEpoch;
  const win=await chrome.windows.getCurrent();
  if(ticket!==shelfIntentEpoch||win?.id!==intent.windowId)return;
  consumedShelfIntent=intent.token;
  location.hash='#'+intent.view;
  route();
  const current=await chrome.storage.session.get('shelfOpenIntent');
  if(current?.shelfOpenIntent?.token===intent.token)void chrome.storage.session.remove('shelfOpenIntent').catch(()=>{});
}
void chrome.storage.session?.get('shelfOpenIntent')
  .then(data=>useShelfOpenIntent(data?.shelfOpenIntent))
  .catch(()=>{});
const openPage = path => chrome.tabs.create({url:chrome.runtime.getURL(path)}).catch(error=>status('Could not open page: '+error.message));
$('dashboard').addEventListener('click',()=>openPage('beta/explorer.html'));
$('cloudflare').addEventListener('click',async()=>{
  const state=$('cf-state').dataset.state;
  if(state==='connected'){void openPage('beta/explorer.html');return;}
  if(state==='checking')return;
  $('cloudflare').disabled=true;
  status('Opening Cloudflare sign-in…');
  try {
    const result=await chrome.runtime.sendMessage({type:'cfConnect'});
    if(!result?.ok)throw Error(result?.error||'Could not start Cloudflare sign-in.');
    status('Finish Cloudflare sign-in in the window that opens.');
    void refreshConnection().catch(()=>{});
  } catch(error) { status(error?.message||'Cloudflare sign-in could not start.'); }
  finally { $('cloudflare').disabled=false; }
});
async function refreshPreference() {
  const {toolbarOpenMode} = await chrome.storage.local.get('toolbarOpenMode');
  for (const input of modes) input.checked = input.value === (toolbarOpenMode === 'popup' ? 'popup' : 'shelf');
}
for (const input of modes) input.addEventListener('change',async()=>{
  for (const item of modes) item.disabled = true;
  try {
    await chrome.storage.local.set({toolbarOpenMode:input.value});
    status('Preference saved. Future toolbar clicks open the '+(input.value==='popup'?'Popup.':'Shelf.'));
  } catch { status('Could not save your opening preference. Please try again.'); }
  finally { await refreshPreference().catch(()=>{}); for (const item of modes) item.disabled=false; }
});
// Starting view is separate from the extension icon's Shelf-vs-Popup preference.
// Changing it applies on the next Shelf opening; it never ejects the active view.
const startViewModes=[...document.querySelectorAll('input[name="shelf-start-view-mode"]')];
async function refreshStartViewMode(){
  const {shelfStartViewMode}=await chrome.storage.local.get('shelfStartViewMode');
  const selected=shelfStartViewMode==='last'?'last':'remotes';
  for(const input of startViewModes)input.checked=input.value===selected;
}
for(const input of startViewModes)input.addEventListener('change',async()=>{
  for(const item of startViewModes)item.disabled=true;
  try{
    await chrome.storage.local.set({shelfStartViewMode:input.value==='last'?'last':'remotes'});
    status(input.value==='last'?'Next time, the Shelf will resume where you left off.':'Next time, the Shelf will open REMOTES.');
  }catch{status('Could not save your Shelf starting view. Please try again.');}
  finally{await refreshStartViewMode().catch(()=>{});for(const item of startViewModes)item.disabled=false;}
});
// Temporary local control. History owns the feature gate used by a future entitlement.
const membershipModes=[...document.querySelectorAll('input[name="shelf-membership"]')];
let membershipRevision=0;
function paintMembership(enabled) {
  for (const input of membershipModes) input.checked=input.value===(enabled===true?'premium':'free');
}
async function refreshMembership() {
  const revision=++membershipRevision;
  const {quickGlancePremiumEnabled}=await chrome.storage.local.get('quickGlancePremiumEnabled');
  if(revision===membershipRevision)paintMembership(quickGlancePremiumEnabled);
}
for (const input of membershipModes) input.addEventListener('change',async()=>{
  for (const mode of membershipModes) mode.disabled=true;
  try {
    await chrome.storage.local.set({quickGlancePremiumEnabled:input.value==='premium'});
  } catch {
    status('Could not save your membership preference.');
  } finally {
    await refreshMembership().catch(()=>status('Membership preference unavailable.'));
    for (const mode of membershipModes) mode.disabled=false;
  }
});
if(membershipModes.length)void refreshMembership().then(()=>{
  for (const mode of membershipModes) mode.disabled=false;
}).catch(()=>status('Membership preference unavailable.'));
let connectionEpoch=0;
async function refreshConnection() {
  const epoch=++connectionEpoch;
  const {cloudflareAuth} = await chrome.storage.local.get('cloudflareAuth');
  const paint=(state,label)=>{
    if(epoch!==connectionEpoch)return;
    $('cf-state').dataset.state=state; $('cf-state').textContent=label;
    updateConnectionSummary();
    $('cloudflare').disabled=state==='checking';
    $('cloudflare').dataset.connected=String(state==='connected');
    $('cloudflare').setAttribute('aria-label',state==='connected'?'Manage Cloudflare':'Log in to Cloudflare');
    $('cloudflare-label').textContent=state==='connected'?'Manage':'LOGIN!';
  };
  if(!cloudflareAuth?.accessToken){paint('disconnected','Not connected','Connect Cloudflare to bring TRUE REMOTE to your Shelf.');return;}
  paint('checking','Checking','Saved sign-in found. Checking account access…');
  let timer;
  try {
    const response=await Promise.race([chrome.runtime.sendMessage({type:'cfAccounts'}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),12000);})]);
    if(!response?.ok||!Array.isArray(response.accounts))throw Error('unavailable');
    paint('connected','Connected','Account access verified. Manage your connection and destinations in Dashboard.');
  } catch {paint('error','Check sign-in','Saved sign-in could not be verified. Reconnect Cloudflare or check your account access.');}
  finally {clearTimeout(timer);}
}
// Keep the tiny failure laser fixed at the Shelf's bottom-left edge.
// Stored failure receipts remain authoritative until History is reviewed.
const failureLaser=$('shelf-failure-laser');
let failureLaserRevision=0,lastFailureLaserAt=null;
function paintShelfFailureLaser(state,animate=false){
  if(!failureLaser)return;
  const pending=state?.pending===true;
  const at=Number.isFinite(state?.at)?state.at:null;
  failureLaser.hidden=!pending;
  if(!pending){
    failureLaser.classList.remove('pulse');
    lastFailureLaserAt=null;
    return;
  }
  if(animate&&at!==lastFailureLaserAt){
    failureLaser.classList.remove('pulse');
    void failureLaser.offsetWidth; // Restart two brief pulses after each new failed save.
    failureLaser.classList.add('pulse');
  }
  lastFailureLaserAt=at;
}
const initialFailureLaserRevision=failureLaserRevision;
void chrome.storage.local.get('redownFailureDot').then(data=>{
  if(failureLaserRevision===initialFailureLaserRevision)
    paintShelfFailureLaser(data.redownFailureDot);
}).catch(()=>{});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='session'&&changes.shelfOpenIntent){
    void useShelfOpenIntent(changes.shelfOpenIntent.newValue).catch(()=>{});
    return;
  }
  if(area!=='local')return;
  if(changes.shelfFilesEntranceV1){filesEntrance=changes.shelfFilesEntranceV1.newValue==='slide-up'?'slide-up':'normal';if($('files-entrance'))$('files-entrance').value=filesEntrance;}
  if(changes.redownFailureDot){
    ++failureLaserRevision;
    paintShelfFailureLaser(changes.redownFailureDot.newValue,true);
  }
  if(changes.quickGlancePremiumEnabled){
    ++membershipRevision;
    paintMembership(changes.quickGlancePremiumEnabled.newValue);
  }
  if(changes.shelfStartViewMode)void refreshStartViewMode().catch(()=>{});
  if(changes.toolbarOpenMode)void refreshPreference().catch(()=>status('Opening preference unavailable.'));
  if(changes.cloudflareAuth)void refreshConnection().catch(()=>status('Connection state unavailable.'));
});
void refreshStartViewMode().catch(()=>{for(const input of startViewModes)input.checked=input.value==='remotes';});
void refreshPreference().catch(()=>{for(const input of modes)input.disabled=true;status('Opening preference unavailable. Reopen Settings to retry.');});
void refreshConnection().catch(()=>status('Connection state unavailable. Reopen Shelf to retry.'));

// Registered only after the local navigation and controls initialize.
chrome.runtime.onMessage?.addListener((message,sender,respond)=>{
  if(sender.id===chrome.runtime.id&&message.type==='redownShelfReady'){
    // Other windows must not win Chrome's first-response race with a false acknowledgement.
    chrome.windows.getCurrent().then(win=>{if(win.id===message.windowId)respond({ready:true});}).catch(()=>{});
    return true;
  }
});

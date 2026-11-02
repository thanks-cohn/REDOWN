const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message || ''; };
const modes = [...document.querySelectorAll('[name="toolbar-mode"]')];
function updateConnectionSummary(){
  const state=$('cf-state')?.dataset.state;
  $('connection-summary').textContent=state==='connected'
    ? 'Download Direct-2-Cloud! Nothing Downloads Directly!'
    : state==='checking'
      ? 'Checking Cloudflare connection…'
      : state==='error'
        ? '' // Keep verification issues on the Cloudflare card, not in the Shelf welcome copy.
        : 'Connect Cloudflare to make R2 your cloud home.';
}
document.addEventListener('redown:provider-connection',updateConnectionSummary);
function route() {
  const view=['settings','history'].includes(location.hash.slice(1))?location.hash.slice(1):'clouds';
  for (const name of ['clouds','history','settings']) {
    $(name+'-view').hidden=name!==view;
    if(name===view)$('nav-'+name).setAttribute('aria-current','page');
    else $('nav-'+name).removeAttribute('aria-current');
  }
  if(view==='history')void globalThis.RedownShelfHistory?.open();
}
window.addEventListener('hashchange',route); route();
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
let connectionEpoch=0;
async function refreshConnection() {
  const epoch=++connectionEpoch;
  const {cloudflareAuth} = await chrome.storage.local.get('cloudflareAuth');
  const paint=(state,label)=>{
    if(epoch!==connectionEpoch)return;
    $('cf-state').dataset.state=state; $('cf-state').textContent=label;
    updateConnectionSummary();
    $('cloudflare').disabled=state==='checking';
    $('cloudflare-label').textContent=state==='connected'?'Manage Cloudflare ↗':'LOGIN!';
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
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='session'&&changes.shelfOpenIntent){
    void useShelfOpenIntent(changes.shelfOpenIntent.newValue).catch(()=>{});
    return;
  }
  if(area!=='local')return;
  if(changes.toolbarOpenMode)void refreshPreference().catch(()=>status('Opening preference unavailable.'));
  if(changes.cloudflareAuth)void refreshConnection().catch(()=>status('Connection state unavailable.'));
});
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

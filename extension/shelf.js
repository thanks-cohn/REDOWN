const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message || ''; };
const modes = [...document.querySelectorAll('[name="toolbar-mode"]')];
function updateConnectionSummary(){
  const ids=['cf-state','google-state'];
  const connected=ids.filter(id=>$(id)?.dataset.state==='connected').length;
  const checking=ids.some(id=>$(id)?.dataset.state==='checking');
  $('connection-summary').textContent=checking?'Checking connections…':connected+' connected · '+(4-connected)+' integrations';
}
document.addEventListener('redown:provider-connection',updateConnectionSummary);
function route() {
  const settings = location.hash === '#settings';
  $('clouds-view').hidden = settings; $('settings-view').hidden = !settings;
  for (const name of ['clouds','settings']) {
    const active = (name === 'settings') === settings;
    if (active) $('nav-'+name).setAttribute('aria-current','page');
    else $('nav-'+name).removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange',route); route();
// One-time request to navigate the existing Shelf to Settings, scoped to the
// Popup's browser window. No new settings page or tab is needed.
let consumedShelfIntent=null;
async function useShelfOpenIntent(intent){
  if(intent?.view!=='settings'||typeof intent.token!=='string'||
     !Number.isInteger(intent.windowId)||!Number.isFinite(intent.issuedAt)||
     Date.now()-intent.issuedAt>15000||intent.issuedAt>Date.now()+1000||
     consumedShelfIntent===intent.token)return;
  const win=await chrome.windows.getCurrent();
  if(win?.id!==intent.windowId)return;
  consumedShelfIntent=intent.token;
  location.hash='#settings';
  route();
  void chrome.storage.session.remove('shelfOpenIntent').catch(()=>{});
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
    $('cloudflare').textContent=state==='connected'?'Manage Cloudflare ↗':'LOGIN!';
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

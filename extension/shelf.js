const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message || ''; };
const modes = [...document.querySelectorAll('[name="toolbar-mode"]')];
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
  const paint=(state,label,detail)=>{
    if(epoch!==connectionEpoch)return;
    $('cf-state').dataset.state=state; $('cf-state').textContent=label;
    $('cf-detail').textContent=detail;
    $('connection-summary').textContent=state==='connected'?'1 connected · 3 integrations on the horizon':state==='checking'?'Checking Cloudflare account access…':'0 verified connections · 4 clouds to explore';
    $('cloudflare').disabled=state==='checking';
    $('cloudflare').textContent=state==='connected'?'Manage Cloudflare ↗':state==='checking'?'Checking connection…':'Open Cloudflare sign-in ↗';
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
async function refreshDestinations() {
  const {profiles=[]}=await chrome.storage.local.get('profiles');
  const destinations=$('destinations');
  destinations.replaceChildren();
  const count=(Array.isArray(profiles)?profiles:[]).filter(profile=>profile?.type==='cloudflare-r2').length;
  if(count){
    const label=document.createElement('p');
    label.textContent=count+' saved R2 destination'+(count===1?'':'s')+'.';
    destinations.append(label);
  }
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes.toolbarOpenMode)void refreshPreference().catch(()=>status('Opening preference unavailable.'));
  if(changes.cloudflareAuth)void refreshConnection().catch(()=>status('Connection state unavailable.'));
  if(changes.profiles)void refreshDestinations().catch(()=>status('Saved destinations unavailable.'));
});
void refreshPreference().catch(()=>{for(const input of modes)input.disabled=true;status('Opening preference unavailable. Reopen Settings to retry.');});
void refreshConnection().catch(()=>status('Connection state unavailable. Reopen Shelf to retry.'));
void refreshDestinations().catch(()=>status('Saved destinations unavailable.'));

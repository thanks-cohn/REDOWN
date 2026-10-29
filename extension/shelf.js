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
$('cloudflare').addEventListener('click',()=>openPage('beta/explorer.html'));
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
  } catch {paint('error','Check sign-in','Saved sign-in could not be verified. Open Cloudflare settings to reconnect or check access.');}
  finally {clearTimeout(timer);}
}
async function refreshActivity() {
  const {transferHistory=[],profiles=[]} = await chrome.storage.local.get(['transferHistory','profiles']);
  const list=$('recent-transfers');list.replaceChildren();
  const items=(Array.isArray(transferHistory)?transferHistory:[]).filter(item=>item&&typeof item==='object').slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,3);
  if(!items.length){const li=document.createElement('li');li.className='empty';li.textContent='Your next save starts with a right click. Recent transfers will appear here.';list.append(li);}
  for(const item of items){
    const li=document.createElement('li'),meta=document.createElement('small');
    li.textContent=(item.ok===true?'Completed':item.ok===false?'Failed':'Recorded')+' · '+(item.profileName||'Cloud transfer');
    const date=new Date(item.at);meta.textContent=Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    li.append(meta);list.append(li);
  }
  const destinations=$('destinations');destinations.replaceChildren();
  const saved=(Array.isArray(profiles)?profiles:[]).filter(p=>p?.type==='cloudflare-r2');
  if(saved.length){const p=document.createElement('p');p.textContent=saved.length+' saved R2 destination'+(saved.length===1?'':'s')+'. ';const a=document.createElement('a');a.href='beta/explorer.html';a.target='_blank';a.textContent='Choose in Dashboard ↗';p.append(a);destinations.append(p);}
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes.toolbarOpenMode)void refreshPreference().catch(()=>status('Opening preference unavailable.'));
  if(changes.cloudflareAuth)void refreshConnection().catch(()=>status('Connection state unavailable.'));
  if(changes.transferHistory||changes.profiles)void refreshActivity().catch(()=>status('Saved activity unavailable.'));
});
void refreshPreference().catch(()=>{for(const input of modes)input.disabled=true;status('Opening preference unavailable. Reopen Settings to retry.');});
void refreshConnection().catch(()=>status('Connection state unavailable. Reopen Shelf to retry.'));
void refreshActivity().catch(()=>{$('recent-transfers').textContent='Saved activity unavailable.';});

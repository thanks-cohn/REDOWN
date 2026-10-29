const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message || ''; };
async function refresh() {
  const {toolbarOpenMode='shelf',cloudflareAuth} = await chrome.storage.local.get(['toolbarOpenMode','cloudflareAuth']);
  $('toolbar-mode').value = toolbarOpenMode === 'popup' ? 'popup' : 'shelf';
  const connected = Boolean(cloudflareAuth?.accessToken);
  $('cf-state').textContent = connected ? 'Connected locally · check account in Dashboard' : 'TRUE REMOTE · Sign in';
  $('cloudflare').textContent = connected ? 'Dashboard' : 'Connect';
}
$('toolbar-mode').addEventListener('change', async () => {
  try { await chrome.storage.local.set({toolbarOpenMode:$('toolbar-mode').value}); status('Preference saved.'); }
  catch(error) { status('Could not save preference: '+error.message); }
});
$('dashboard').addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('beta/explorer.html')}));
$('cloudflare').addEventListener('click', async () => {
  try { await chrome.tabs.create({url:chrome.runtime.getURL('options.html')}); }
  catch(error) { status('Could not open Cloudflare login: '+error.message); }
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&(changes.toolbarOpenMode||changes.cloudflareAuth))void refresh();
});
void refresh().catch(error=>status('Shelf setup unavailable: '+error.message));

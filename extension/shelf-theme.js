/* Shelf appearance is a presentation preference, independent of cloud adapters. */
(() => {
  const choices=[...document.querySelectorAll('input[name="shelf-theme"]')];
  const themes=new Set(['midnight','noir','velvet','porcelain']);
  const status=document.getElementById('status');
  const normalize=value=>themes.has(value)?value:'midnight';
  const apply=value=>{
    const selected=normalize(value);
    document.documentElement.dataset.shelfTheme=selected;
    for(const input of choices)input.checked=input.value===selected;
  };
  apply('midnight');
  for(const input of choices)input.addEventListener('change',async()=>{
    if(!input.checked)return;
    const before=document.documentElement.dataset.shelfTheme;
    apply(input.value);
    try{await chrome.storage.local.set({shelfColorScheme:input.value});}
    catch{apply(before);if(status)status.textContent='Could not save your color scheme.';}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.shelfColorScheme)apply(changes.shelfColorScheme.newValue);
  });
  void chrome.storage.local.get('shelfColorScheme')
    .then(({shelfColorScheme})=>apply(shelfColorScheme))
    .catch(()=>{if(status)status.textContent='Color preference unavailable. Showing Midnight.';});
})();

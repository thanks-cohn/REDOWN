// Native preference controls retain ownership, IDs and change contracts.
(() => {
 const root=document.getElementById('settings-view');if(!root)return;
 const painters=new WeakMap(),valueDescriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
 Object.defineProperty(HTMLSelectElement.prototype,'value',{...valueDescriptor,set(value){valueDescriptor.set.call(this,value);painters.get(this)?.();}});
 const groups=[['Appearance',/Color scheme|icon background|Explorer appearance/i],['File Explorer',/Files entrance|When the Shelf|extension icon/i],['Preview & Navigation',/Preview & Navigation/i],['Click2Cloud',/Click2Cloud|Right-click destinations/i],['History',/History navigation/i],['Storage & Recovery',/Drag-and-drop|Prepared files|Directory records/i],['Account & Developer',/Membership|Developer/i]];
 const fields=[...root.querySelectorAll(':scope > fieldset')];
 const anchor=root.querySelector('.settings-note');
 for(const [title,pattern] of groups){
  const section=document.createElement('section');section.className='settings-collection';const h=document.createElement('h2');h.textContent=title;section.append(h);
  const grid=document.createElement('div');grid.className='settings-card-grid';section.append(grid);
  for(const node of fields)if(pattern.test(node.querySelector('legend')?.textContent||''))grid.append(node);
  if(grid.children.length)root.insertBefore(section,anchor);
 }
 for(const select of root.querySelectorAll('select')){
  if(select.options.length>4)continue;
  const surface=document.createElement('div');surface.className='settings-choice-surface';surface.setAttribute('role','group');surface.setAttribute('aria-label',select.getAttribute('aria-label')||select.labels?.[0]?.textContent||select.closest('fieldset')?.querySelector('legend')?.textContent||'Preference');
  const controls=[...select.options].map(option=>{const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));paint();};surface.append(button);return [button,option];});
  function paint(){for(const [button,option] of controls){button.setAttribute('aria-pressed',String(select.value===option.value));button.disabled=select.disabled;}}
  select.insertAdjacentElement('afterend',surface);select.classList.add('settings-native-choice');select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.addEventListener('change',paint);
  // Existing owners assign .value after asynchronous storage reads.
  painters.set(select,paint);
  new MutationObserver(paint).observe(select,{attributes:true,attributeFilter:['disabled']});paint();
 }
})();

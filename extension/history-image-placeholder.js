/* Replace only this renderer to substitute the REDOWN logo. No network/state. */
(() => {
  'use strict';
  function render(document){
    const node=document.createElement('span');node.className='history-image-placeholder';
    node.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++){const curve=document.createElement('i');curve.style.setProperty('--curve',i);node.append(curve);}
    return node;
  }
  globalThis.HistoryImagePlaceholder={render};
})();

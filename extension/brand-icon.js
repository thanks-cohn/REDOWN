/* One REDOWN R, one palette map, shared by Shelf, Explorer and toolbar.
   SVG and OffscreenCanvas use identical geometry and gradients. */
(() => {
  'use strict';
  const path='M31 99V28h35c23 0 36 11 36 29 0 13-8 23-21 27l24 15H81L59 84H49v15H31Zm18-31h17c11 0 17-4 17-11 0-7-6-11-17-11H49v22Z';
  const detail='M62 84h21l22 15H81L59 84h3Z';
  const themes={
    porcelain:{background:'#efe5ed',a:'#9d274b',b:'#e0628d',c:'#f5aac8',d:'#75203b',e:'#d34a7c'},
    midnight:{background:'#070609',a:'#b51828',b:'#e1283e',c:'#ff5866',d:'#790c19',e:'#db1a31'},
    ocean:{background:'#072a3a',a:'#37b3bd',b:'#77e2d6',c:'#d6f8e8',d:'#126a87',e:'#45c8db'},
    neon:{background:'#140b29',a:'#ff5cbb',b:'#ff9ce9',c:'#8bf9f1',d:'#9d2be8',e:'#65e7f2'}
  };
  const normalize=theme=>themes[theme]?theme:theme==='velvet'?'neon':theme==='noir'?'ocean':'porcelain';
  function colors(theme,mode='theme'){
    const name=normalize(theme),palette=themes[name];
    return {...palette,background:name==='midnight'||mode==='original'?'#070609':palette.background};
  }
  function svg(theme='porcelain',mode='theme'){
    const p=colors(theme,mode);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true" focusable="false">'+
      '<defs>'+
      '<linearGradient id="redown-shared-gradient" x1="12" y1="108" x2="112" y2="20" gradientUnits="userSpaceOnUse">'+
      '<stop stop-color="'+p.a+'"/><stop offset=".48" stop-color="'+p.b+'"/><stop offset="1" stop-color="'+p.c+'"/></linearGradient>'+
      '<linearGradient id="redown-shared-detail" x1="42" y1="92" x2="95" y2="42" gradientUnits="userSpaceOnUse">'+
      '<stop stop-color="'+p.d+'"/><stop offset="1" stop-color="'+p.e+'"/></linearGradient></defs>'+
      '<rect width="128" height="128" rx="30" fill="'+p.background+'"/>'+
      '<path d="'+path+'" fill="url(#redown-shared-gradient)"/>'+
      '<path d="'+detail+'" fill="url(#redown-shared-detail)" opacity=".92"/>'+
      '</svg>';
  }
  function paint(scope,theme,mode='theme'){
    const element=scope?.querySelector?.('[data-redown-icon]');
    if(!element)return;
    const name=normalize(theme),variant=name==='midnight'?'theme':mode==='original'?'original':'theme';
    if(element.dataset.brandPalette===name&&element.dataset.brandMode===variant)return;
    element.innerHTML=svg(name,variant);
    element.dataset.brandPalette=name;element.dataset.brandMode=variant;
  }
  // The toolbar must use ImageData in an MV3 service worker. Draw the SAME
  // SVG paths on OffscreenCanvas with no network fetch and no external PNGs.
  function imageData(theme='porcelain',mode='theme',sizes=[16,32,48]){
    if(typeof OffscreenCanvas!=='function'||typeof Path2D!=='function')
      throw Error('Canvas icon rendering is unavailable.');
    const p=colors(theme,mode),result={};
    for(const size of sizes){
      const canvas=new OffscreenCanvas(size,size),ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Could not initialize REDOWN icon canvas.');
      ctx.scale(size/128,size/128);
      ctx.fillStyle=p.background;
      ctx.beginPath();ctx.roundRect(0,0,128,128,30);ctx.fill();
      const main=ctx.createLinearGradient(12,108,112,20);
      main.addColorStop(0,p.a);main.addColorStop(.48,p.b);main.addColorStop(1,p.c);
      ctx.fillStyle=main;ctx.fill(new Path2D(path));
      const secondary=ctx.createLinearGradient(42,92,95,42);
      secondary.addColorStop(0,p.d);secondary.addColorStop(1,p.e);
      ctx.globalAlpha=.92;ctx.fillStyle=secondary;ctx.fill(new Path2D(detail));
      ctx.globalAlpha=1;result[size]=ctx.getImageData(0,0,size,size);
    }
    return result;
  }
  globalThis.RedownBrandIcon={colors,normalize,svg,paint,imageData};
})();

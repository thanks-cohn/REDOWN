/* Record only the latest local pointer origin. No messaging, storage or polling. */
(() => {
  if(globalThis.RedownClickOriginInstalled)return;
  globalThis.RedownClickOriginInstalled=true;
  document.addEventListener('contextmenu',event=>{
    globalThis.RedownClickOrigin={x:event.clientX,y:event.clientY,at:Date.now()};
  },{capture:true,passive:true});
  window.addEventListener('pagehide',()=>{delete globalThis.RedownClickOrigin;});
})();

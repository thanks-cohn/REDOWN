/* Only authenticated destination sessions can launch decorative save orbs.
 * This is an ATTEMPT animation, not a verified upload receipt.
 * No OAuth, permissions, network requests, or source history are created here. */
(() => {
  'use strict';
  function providerFor(menuItemId){
    if(menuItemId==='provider:google-drive')return 'google';
    if(menuItemId==='provider:dropbox')return 'dropbox';
    if(menuItemId==='provider:onedrive')return 'onedrive';
    // launchSaveDroplet is called only after resolving a Cloudflare save menu.
    return 'cloudflare';
  }
  function permitted(menuItemId,data,now=Date.now()){
    const provider=providerFor(menuItemId);
    if(provider==='cloudflare'){
      const auth=data?.cloudflareAuth;
      return typeof auth?.accessToken==='string'&&auth.accessToken.length>0&&
        auth.reconnectRequired!==true&&
        (!Number.isFinite(auth.expiresAt)||auth.expiresAt>now);
    }
    if(provider==='google'){
      const state=data?.googleDriveState;
      return state?.phase==='connected'&&typeof state.accountId==='string'&&!!state.accountId;
    }
    if(provider==='dropbox'){
      const state=data?.['dropbox:state'],auth=data?.['dropbox:auth'];
      return state?.phase==='connected'&&state.rootReady===true&&
        typeof state.accountId==='string'&&!!state.accountId&&
        typeof state.connectionId==='string'&&!!state.connectionId&&
        typeof auth?.refreshToken==='string'&&!!auth.refreshToken&&
        auth.accountId===state.accountId&&auth.connectionId===state.connectionId;
    }
    const state=data?.['onedrive:state'],auth=data?.['onedrive:auth'];
    return state?.phase==='connected'&&state.rootReady===true&&
      typeof state.accountId==='string'&&!!state.accountId&&
      typeof state.driveId==='string'&&!!state.driveId&&
      typeof auth?.refreshToken==='string'&&!!auth.refreshToken&&
      auth.accountId===state.accountId&&auth.connectionId===state.connectionId&&
      auth.driveId===state.driveId;
  }
  globalThis.RedownSaveDropletGate={permitted,providerFor};
})();

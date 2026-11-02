/* Right-click SAVE energy only for an authenticated destination.
 * Presentation eligibility, not an upload receipt or success guarantee.
 * Pure checks here do not initiate OAuth, refresh tokens or mutate storage. */
(() => {
  'use strict';
  const FIELDS={
    cloudflare:['cloudflareAuth'],
    google:['googleDriveState'],
    dropbox:['dropbox:state','dropbox:auth'],
    onedrive:['onedrive:state','onedrive:auth']
  };
  const nonempty=value=>typeof value==='string'&&value.length>0;
  function connected(provider,values={},now=Date.now()){
    if(provider==='cloudflare'){
      const a=values.cloudflareAuth;
      return !!(a&&nonempty(a.accessToken)&&a.reconnectRequired!==true&&
        (a.expiresAt==null||(Number.isFinite(a.expiresAt)&&a.expiresAt>now)));
    }
    if(provider==='google'){
      const s=values.googleDriveState;
      return !!(s?.phase==='connected'&&nonempty(s.accountId));
    }
    if(provider==='dropbox'||provider==='onedrive'){
      const s=values[provider+':state'],a=values[provider+':auth'];
      return !!(s?.phase==='connected'&&s.rootReady===true&&
        nonempty(s.accountId)&&nonempty(s.connectionId)&&
        nonempty(a?.refreshToken)&&a.accountId===s.accountId&&
        a.connectionId===s.connectionId&&
        (provider!=='onedrive'||(nonempty(s.driveId)&&s.driveId===a.driveId)));
    }
    return false; // Unknown providers never fire balls by accident.
  }
  const keys=provider=>FIELDS[provider]||[];
  globalThis.RedownSaveDropletAuth={connected,keys};
})();
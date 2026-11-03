/* Product policy, independent of Quick Glance's performance batch size.
   Change this one default to ship a different Free allowance. Never read it
   from client storage: only a settled product configuration may override it. */
(() => {
  'use strict';
  const FREE_GALLERY_ENTRY_LIMIT=10;
  function resolveHistoryGalleryPolicy({premiumEnabled=false,freeGalleryEntryLimit}={}){
    const limit=Number.isInteger(freeGalleryEntryLimit)&&freeGalleryEntryLimit>=0&&freeGalleryEntryLimit<=1000
      ?freeGalleryEntryLimit:FREE_GALLERY_ENTRY_LIMIT;
    return {premium:premiumEnabled===true,freeGalleryEntryLimit:limit};
  }
  function select(records,policy,now=new Date()){
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
    // Stable input order breaks timestamp ties, as in the existing History renderer.
    const today=records.map((record,index)=>({record,index,ms:Date.parse(record.at)}))
      .filter(item=>item.ms>=start&&item.ms<end)
      .sort((a,b)=>b.ms-a.ms||a.index-b.index);
    return new Set(policy.premium?records:today.slice(0,policy.freeGalleryEntryLimit).map(item=>item.record));
  }
  globalThis.RedownHistoryGalleryPolicy={FREE_GALLERY_ENTRY_LIMIT,resolveHistoryGalleryPolicy,select};
})();

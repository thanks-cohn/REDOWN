// Pure, no-provider helpers for REDOWN bucket discovery and activation choices.
// This module does not deploy Workers, change public access, or read secrets.
export const bucketIdentity=target=>JSON.stringify([target?.accountId||'',target?.bucketName||'']);
export const matchesBucket=(a,b)=>Boolean(a&&b&&a.accountId===b.accountId&&a.bucketName===b.bucketName);
export function accessibleBuckets(accounts,cache){
  const found=new Map();
  for(const account of accounts||[]){
    if(!account?.id)continue;
    for(const bucket of cache.get(account.id)||[]){
      if(typeof bucket?.name!=='string'||!bucket.name)continue;
      const target={accountId:account.id,accountName:account.name||account.id,bucketName:bucket.name,prefix:''};
      found.set(bucketIdentity(target),target);
    }
  }
  return [...found.values()];
}
export function firstAvailableBucket(all,preferred,lastLocation){
  const find=target=>all.find(item=>matchesBucket(item,target));
  return find(preferred)||find(lastLocation)||all[0]||null;
}
export function activationOrder(all,preferred){
  return [...all].sort((a,b)=>Number(matchesBucket(b,preferred))-Number(matchesBucket(a,preferred)));
}
export function activationAppearance(all,profiles,states=new Map(),loaded=true){
  if(!loaded)return {state:'loading',pending:0,message:'Discovering bucket setup…'};
  if(!all.length)return {state:'empty',pending:0,message:'No accessible buckets. Use Refresh to discover storage.'};
  let pending=0,failed=0,verified=0;
  for(const target of all){
    const state=states.get(bucketIdentity(target));
    const saved=(profiles||[]).some(p=>matchesBucket(p,target));
    if(state==='failed')failed++;
    else if(state==='ready')verified++;
    else if(state==='needs-activation'||!saved)pending++;
  }
  if(failed)return {state:'error',pending,failed,message:failed+' bucket(s) need a repair or another attempt'};
  if(pending)return {state:'attention',pending,failed:0,message:pending+' bucket(s) need setup'};
  if(verified===all.length)return {state:'ready',pending:0,message:'All accessible buckets verified for REDOWN'};
  return {state:'configured',pending:0,message:'Bucket profiles saved; click to verify readiness'};
}

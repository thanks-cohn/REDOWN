import test from 'node:test';
import assert from 'node:assert/strict';
import {accessibleBuckets,activationAppearance,activationOrder,bucketIdentity,firstAvailableBucket,matchesBucket} from '../extension/beta/bucket-activation.mjs';

const accounts=[{id:'acct-1',name:'Personal'},{id:'acct-2',name:'Work'}];
const cache=new Map([['acct-1',[{name:'images'},{name:'docs'}]],['acct-2',[{name:'media'}]]]);
const all=accessibleBuckets(accounts,cache);
test('discovers every accessible account/bucket and does not conflate same-name buckets',()=>{
 assert.equal(all.length,3);
 assert.deepEqual(all.map(x=>x.accountId+'/'+x.bucketName),['acct-1/images','acct-1/docs','acct-2/media']);
 assert.notEqual(bucketIdentity({accountId:'acct-1',bucketName:'images'}),bucketIdentity({accountId:'acct-2',bucketName:'images'}));
 assert.equal(accessibleBuckets(accounts,new Map()).length,0);
});
test('preferred startup bucket wins over remembered location but cannot select an inaccessible bucket',()=>{
 const preferred={accountId:'acct-2',bucketName:'media'};
 assert.equal(firstAvailableBucket(all,preferred,{accountId:'acct-1',bucketName:'docs'}).bucketName,'media');
 assert.equal(firstAvailableBucket(all,{accountId:'other',bucketName:'private'},{accountId:'acct-1',bucketName:'docs'}).bucketName,'docs');
 assert.equal(firstAvailableBucket(all,null,null).bucketName,'images');
 assert.equal(firstAvailableBucket([],preferred,null),null);
 assert.deepEqual(activationOrder(all,preferred).map(x=>x.bucketName),['media','images','docs']);
});
test('setup attention and success are separate from a configured but unverified profile',()=>{
 const profiles=[{accountId:'acct-1',bucketName:'images'}];
 assert.equal(activationAppearance(all,profiles).state,'attention');
 assert.equal(activationAppearance(all,profiles).pending,2);
 const saved=all.map(x=>({...x}));
 assert.equal(activationAppearance(all,saved).state,'configured');
 assert.equal(activationAppearance(all,[...saved.map(p=>({...p,ownerBucketName:p.bucketName,bucketName:'preferred-destination'}))]).state,'configured','worker-owning bucket remains configured even if a profile defaults elsewhere');
 const verified=new Map(all.map(x=>[bucketIdentity(x),'ready']));
 assert.equal(activationAppearance(all,saved,verified).state,'ready');
 verified.set(bucketIdentity(all[1]),'failed');
 assert.equal(activationAppearance(all,saved,verified).state,'error');
 assert.equal(activationAppearance(all,saved,verified,false).state,'loading');
 assert.equal(activationAppearance([],[],new Map(),true).state,'empty');
});
test('initial-bucket identity remains account-scoped',()=>{
 assert.ok(matchesBucket(all[0],{accountId:'acct-1',bucketName:'images'}));
 assert.equal(matchesBucket(all[0],{accountId:'acct-2',bucketName:'images'}),false);
});

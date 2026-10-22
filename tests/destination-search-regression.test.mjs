import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const options=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
test('explicit nested folder is sent intact and receipt uses actual target bucket and key',async()=>{
 let request;
 const ctx=vm.createContext({cleanExplorerPrefix:x=>String(x).replace(/\/$/,'')+'/',preparedProfile:async(a,b)=>({workerUrl:'https://worker.invalid',accountId:a,bucketName:b,token:'test'}),fetch:async(url,r)=>{request=JSON.parse(r.body);return {ok:true,text:async()=>JSON.stringify({ok:true,key:'meme/not yet edited/photo.jpg',publicUrl:'https://worker.invalid/assets/meme/not%20yet%20edited/photo.jpg'})};}});
 vm.runInContext(background.slice(background.indexOf('async function ingestCloudflareAtPrefix('),background.indexOf('\nasync function ingestCloudflare(',background.indexOf('async function ingestCloudflareAtPrefix('))),ctx);
 const receipt={};await ctx.ingestCloudflareAtPrefix({accountId:'account',bucketName:'selected-bucket'},'https://source.invalid/photo.jpg','meme/not yet edited','photo.jpg',receipt);
 assert.equal(request.folder,'meme/not yet edited');assert.equal(receipt.destination.bucketName,'selected-bucket');assert.equal(receipt.destination.key,'meme/not yet edited/photo.jpg');
 ctx.fetch=async()=>({ok:true,text:async()=>JSON.stringify({ok:true,key:'assets/photo.jpg'})});
 await assert.rejects(ctx.ingestCloudflareAtPrefix({accountId:'account',bucketName:'selected-bucket'},'https://source.invalid/photo.jpg','meme/not yet edited','photo.jpg'),/Destination verification failed/);
});
test('history uses explicit bucket/key rather than mistaking public assets route for storage folder',()=>{
 const ctx=vm.createContext({profiles:[{id:'preset',type:'cloudflare-r2',accountId:'a',bucketName:'old-bucket',workerUrl:'https://old.invalid'}],transferKey:()=>''});
 vm.runInContext(options.slice(options.indexOf('function transferDisplayParts('),options.indexOf('\nfunction compactFilename',options.indexOf('function transferDisplayParts('))),ctx);
 const result=ctx.transferDisplayParts({profileId:'preset',location:'https://worker.invalid/assets/meme/not%20yet%20edited/photo.jpg',destination:{accountId:'a',bucketName:'selected-bucket',key:'meme/not yet edited/photo.jpg'}});
 assert.equal(result.parent,'/meme/not yet edited/');assert.equal(result.profile.bucketName,'selected-bucket');
});
test('search previews retain result set and use each result account/bucket and exact key',async()=>{
 const calls=[],rows=[];let selected;
 const items=[{id:'one',name:'one.jpg',key:'meme/one.jpg',object:{},searchResult:true,accountId:'a',bucketName:'first'},{id:'two',name:'two.jpg',key:'deep/two.jpg',object:{},searchResult:true,accountId:'b',bucketName:'second'}];
 const ctx=vm.createContext({explorerUrlPopover:null,document:{activeElement:null},workspacePreviewExpanded:false,explorerSelected:new Set(['one']),explorerAnchor:0,explorerPage:0,explorerPageSize:1,sortedVisibleItems:()=>items,selectedExplorerItems:()=>items.filter(i=>ctx.explorerSelected.has(i.id)),rootRow:()=>({focus:()=>rows.push('focus'),scrollIntoView:()=>{}}),renderFileItems:()=>{},showWorkspacePreview:async(...args)=>calls.push(args)});
 vm.runInContext(options.slice(options.indexOf('function previewableExplorerItems('),options.indexOf('\nfunction selectExplorerItem(',options.indexOf('function previewableExplorerItems('))),ctx);
 await ctx.selectSingleExplorerItem(items[0],{focus:true});await ctx.navigatePreview(1);
 assert.equal(calls[0][0].key,'meme/one.jpg');assert.equal(calls[1][3].bucketName,'second');assert.equal(calls[1][3].accountId,'b');assert.equal(ctx.explorerPage,1);assert.equal(items.length,2);assert.equal(rows.length,1);
 const click=options.slice(options.indexOf('  row.onclick = (e) => {'),options.indexOf('  row.ondblclick =',options.indexOf('  row.onclick = (e) => {')));
 assert.doesNotMatch(click,/goToSearchResult/);assert.match(click,/selectSingleExplorerItem\(item,\{focus:true\}\)/);
});
test('history location opens exact folder and preview without scroll or focus jump',async()=>{
 const calls=[];let selected;const target={id:'file:deep/file.jpg',key:'deep/file.jpg',folder:false};
 const title={};const ctx=vm.createContext({explorerItems:[target],explorerNextCursor:'',explorerPage:0,explorerPageSize:50,goLocation:async(...a)=>calls.push(a),sortedVisibleItems:()=>[target],selectSingleExplorerItem:async(item,settings)=>{selected={item,settings};},setWorkspacePreviewExpanded:enabled=>calls.push(enabled),finishOperation:()=>{}});
 vm.runInContext(options.slice(options.indexOf('async function openTransferLocation('),options.indexOf('\nasync function beginRename(',options.indexOf('async function openTransferLocation('))),ctx);
 await ctx.openTransferLocation({}, {profile:{type:'cloudflare-r2',accountId:'actual-account',bucketName:'actual-bucket'},key:'deep/file.jpg'});
 assert.deepEqual([...calls[0]],['actual-account','actual-bucket','deep']);assert.equal(selected.item,target);assert.equal(selected.settings.scroll,false);assert.equal(selected.settings.focus,false);assert.equal(calls[1],false);
});

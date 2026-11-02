import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const [html,history,nav]=await Promise.all([
 readFile('extension/shelf.html','utf8'),
 readFile('extension/shelf-history.js','utf8'),
 readFile('extension/history-navigation.js','utf8')
]);
const day=new Date().toISOString();
const base={ok:true,verified:true,status:'completed',at:day,sourceUrl:'https://example.invalid/source.jpg'};
function fixture(records){
 const dom=new JSDOM(html,{url:'https://extension.invalid/shelf.html#history',runScripts:'outside-only'});
 const w=dom.window;
 w.RedownHistoryArchive={create:()=>({
   importLegacy:async()=>{},
   page:async()=>({items:records,total:records.length})
 })};
 w.chrome={storage:{
   local:{get:async keys=>keys==='transferHistory'?{transferHistory:records}:{}},
   onChanged:{addListener:()=>{}}
 }};
 w.eval(history);
 return {dom,w};
}
test('history footer displays provider plus actual saved path, no duplicate bucket or source URL',async()=>{
 const records=[
  {...base,id:'r2',providerKind:'cloudflare',filename:'img.jpg',
   location:'https://r2.example.invalid/hp-mini/memes/img.jpg',
   destination:{accountId:'a',bucketName:'hp-mini',key:'hp-mini/memes/img.jpg',
    publicUrl:'https://r2.example.invalid/hp-mini/memes/img.jpg'}},
  {...base,id:'db',providerKind:'dropbox',filename:'pic.png',location:'',
   destination:{provider:'dropbox',path:'/art/pic.png',name:'pic.png'}},
  {...base,id:'onedrive',providerKind:'onedrive',filename:'file.docx',
   location:'https://tenant-my.sharepoint.com/personal/file.docx',
   destination:{provider:'onedrive',accountId:'a',driveId:'d',rootId:'r',root:'/',itemId:'item'}},
  {...base,id:'google',providerKind:'google',filename:'image.webp',
   location:'https://drive.google.com/file/d/aBC_12/view',
   destination:{provider:'google-drive',fileId:'aBC_12',name:'image.webp'}},
  {...base,id:'folder-google',providerKind:'google',filename:'found.jpg',
   location:'https://drive.google.com/file/d/qw-7/view',
   destination:{provider:'google-drive',fileId:'qw-7',folderId:'abc_123',name:'found.jpg'}}
 ];
 const h=fixture(records);await h.w.RedownShelfHistory.open();
 const footers=[...h.w.document.querySelectorAll('.history-entry-provider')].map(el=>el.textContent);
 assert.equal(footers.length,5);
 assert.ok(footers.some(s=>s.includes('Cloudflare R2 · hp-mini/memes/img.jpg')));
 assert.ok(footers.some(s=>s.includes('Dropbox · art/pic.png')));
 assert.ok(footers.some(s=>s.includes('OneDrive · /file.docx')));
 assert.ok(footers.some(s=>s.includes('Google Drive · My Drive/image.webp')));
 assert.ok(footers.some(s=>s.includes('Google Drive · Folder ID abc_123/found.jpg')));
 assert.ok(footers.every(s=>!s.includes('hp-mini · hp-mini')&&!s.includes('example.invalid/source')));
 const links=[...h.w.document.querySelectorAll('.history-entry-provider a')].map(a=>a.href);
 assert.ok(links.includes(records[0].destination.publicUrl));
 assert.ok(!links.some(s=>s.includes('example.invalid/source')));
 assert.ok(!links.some(s=>s.includes('dropbox.com')));
 h.dom.window.close();
});
test('History never fabricates a public R2 URL or a destination path for unverified items',async()=>{
 const records=[
  {...base,id:'private',providerKind:'cloudflare',filename:'private.jpg',
   location:'https://unconfirmed.example.invalid/assets/private.jpg',
   destination:{accountId:'a',bucketName:'hp-mini',key:'private.jpg'}},
  {...base,id:'failed',ok:false,verified:false,status:'failed',providerKind:'dropbox',
   filename:'not-saved.jpg',destination:{provider:'dropbox',path:'/fake/not-saved.jpg'}},
  {...base,id:'unnamed',providerKind:'google',filename:'file.jpg',location:'',
   destination:{provider:'google-drive',fileId:'id-1',folderId:'unknown-id'}}
 ];
 const h=fixture(records);await h.w.RedownShelfHistory.open();
 const footers=[...h.w.document.querySelectorAll('.history-entry-provider')];
 assert.equal(footers.length,3);
 assert.ok(footers.some(el=>el.textContent==='Cloudflare R2 · hp-mini/private.jpg'));
 assert.ok(footers.some(el=>el.textContent==='Dropbox'));
 assert.ok(footers.some(el=>el.textContent.includes('Google Drive · Folder ID unknown-id/file.jpg')));
 assert.equal(h.w.document.querySelectorAll('.history-entry-provider a').length,0);
 h.dom.window.close();
});

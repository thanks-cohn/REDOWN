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
 // The destination stays visible, but all URL data stays text-only inside
 // the separate disclosure below it. GO TO is the exclusive navigation action.
 assert.equal(h.w.document.querySelectorAll('.history-entry-provider a, .history-url-disclosure a').length,0);
 const sections=[...h.w.document.querySelectorAll('.history-url-disclosure')];
 assert.equal(sections.length,5);
 assert.ok(sections.every(node=>node.open===false),'full URLs start neatly collapsed');
 const data=[...h.w.document.querySelectorAll('.history-entry-url-text')].map(node=>node.textContent);
 assert.ok(data.includes(records[0].destination.publicUrl));
 assert.ok(data.includes('https://example.invalid/source.jpg'));
 assert.ok(data.includes(records[2].location));
 assert.ok(data.includes(records[3].location));
 assert.ok(sections.every(node=>node.querySelector('.history-url-summary')));
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


test('History URL drawer preserves full source, page, src, frame and link URLs as text, not hyperlinks',async()=>{
 const record={...base,id:'complete-provenance',providerKind:'cloudflare',
  filename:'very-long-'+('name'.repeat(25))+'.webp',
  location:'https://worker.example.invalid/assets/folder/image.webp',
  destination:{accountId:'owner',bucketName:'bucket',key:'folder/image.webp',
   publicUrl:'https://public.example.invalid/folder/image.webp'},
  pageUrl:'https://hosting.example.invalid/page?alpha=1&beta=2',
  srcUrl:'https://media.example.invalid/image.webp',
  frameUrl:'https://frame.example.invalid/embed',
  linkUrl:'https://outbound.example.invalid/file'};
 const h=fixture([record]);await h.w.RedownShelfHistory.open();
 const row=h.w.document.querySelector('.history-transfer');
 const detail=row.querySelector('.history-entry-provider');
 const disclosure=row.querySelector('.history-url-disclosure');
 assert.ok(detail);
 assert.equal(detail.textContent,'Cloudflare R2 · bucket/folder/image.webp');
 assert.equal(disclosure.open,false);
 assert.equal(row.querySelectorAll('.history-url-disclosure a').length,0);
 const labels=[...disclosure.querySelectorAll('.history-entry-url-label')].map(n=>n.textContent);
 assert.deepEqual(labels,['Public file URL','Recorded location (availability unverified)',
  'Source URL','Hosting page','Media URL','Frame URL','Link URL']);
 const values=[...disclosure.querySelectorAll('.history-entry-url-text')].map(n=>n.textContent);
 assert.ok(values.includes(record.destination.publicUrl));
 assert.ok(values.includes(record.location));
 assert.ok(values.includes(record.sourceUrl));
 assert.ok(values.includes(record.pageUrl));
 assert.ok(values.includes(record.srcUrl));
 assert.ok(values.includes(record.frameUrl));
 assert.ok(values.includes(record.linkUrl));
 assert.equal(values.length,new Set(values).size,'URL values should not be needlessly duplicated');
 assert.equal(row.querySelector('.history-entry-details')?.open,false,'long filename may remain folded');
 assert.ok(row.querySelector('.history-url-disclosure'),'URL disclosure stays separate and available');
 disclosure.open=true;
 assert.equal(disclosure.querySelector('.history-entry-url-text')?.textContent,record.destination.publicUrl);
 h.dom.window.close();
});

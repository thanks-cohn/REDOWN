import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchiveEntries,archiveFolder,archiveParent,archiveCrumbs,archiveAdjacent} from '../extension/beta/archive-browser.mjs';

test('Legacy-style archive index becomes browsable virtual folders without extracting',()=>{
 const original=[
  {name:'Book/Chapter 2/010.webp',size:10},
  {name:'Book/Chapter 2/002.webp',size:2},
  {name:'Book/Chapter 1/001.webp',size:1},
  {name:'notes.txt',size:15},
  {name:'Book/Chapter 2/',directory:true}
 ];
 const files=normalizeArchiveEntries(original);
 const root=archiveFolder(files);
 assert.deepEqual(root.folders.map(x=>x.name),['Book']);
 assert.deepEqual(root.files.map(x=>x.name),['notes.txt']);
 const book=archiveFolder(files,'Book/');
 assert.deepEqual(book.folders.map(x=>x.name),['Chapter 1','Chapter 2']);
 const pages=archiveFolder(files,'Book/Chapter 2/').files;
 assert.deepEqual(pages.map(x=>x.name),['002.webp','010.webp']);
 assert.equal(archiveAdjacent(pages,pages[0].key,1)?.key,'Book/Chapter 2/010.webp');
 assert.equal(archiveAdjacent(pages,pages[1].key,1),null);
 assert.equal(archiveAdjacent(pages,pages[0].key,-1),null);
 assert.equal(archiveParent('Book/Chapter 2/'),'Book/');
 assert.equal(archiveParent('Book/'),'');
 assert.deepEqual(archiveCrumbs('Book/Chapter 2/').map(x=>x.prefix),['','Book/','Book/Chapter 2/']);
 assert.equal(original.length,5,'reading the index cannot mutate the original archive');
});
test('archive virtual paths reject traversal and ignore directory records',()=>{
 const files=normalizeArchiveEntries([
  {name:'../escape.png'},{name:'/absolute.png'},{name:'root/./bad.png'},
  {name:'root/good.png',size:123},{name:'root/good.png',size:456},
  {name:'folder/',directory:true},{name:'nested/safe.txt'}
 ]);
 assert.deepEqual(files.map(x=>x.name),['root/good.png','nested/safe.txt']);
 assert.throws(()=>archiveFolder(files,'../'),/Invalid/);
 assert.equal(archiveFolder(files,'root/').files[0].size,123);
});
test('previewed pages are selected within their containing folder only',()=>{
 const entries=normalizeArchiveEntries([{name:'01/1.jpg'},{name:'01/2.jpg'},{name:'02/1.jpg'}]);
 const a=archiveFolder(entries,'01/'),b=archiveFolder(entries,'02/');
 assert.equal(archiveAdjacent(a.files,'01/2.jpg',1),null);
 assert.equal(b.files.length,1);
});

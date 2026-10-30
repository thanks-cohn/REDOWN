import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script=await readFile(new URL('../extension/history-export.js',import.meta.url),'utf8');
const options=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
const legacy=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
const betaHtml=await readFile(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
const beta=await readFile(new URL('../extension/beta/explorer.mjs',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(script,context);
const api=context.RedownHistoryExport;
const unwrap=value=>JSON.parse(JSON.stringify(value));

test('versioned JSON export preserves all URL provenance, status and future fields',()=>{
  const records=[
    {id:'one',at:'2026-10-30T12:00:00Z',ok:true,pageUrl:'https://gallery.invalid/page',srcUrl:'https://cdn.invalid/image.webp',frameUrl:'https://embed.invalid',linkUrl:'https://publisher.invalid',sourceUrl:'https://cdn.invalid/image.webp',destination:{accountId:'a',bucketName:'images',key:'a.webp'},custom:{tags:['photo']}},
    {id:'two',ok:false,error:'403 Forbidden',sourceUrl:'https://unreachable.invalid/item'}
  ];
  const doc=api.build(records,{exportedAt:'2026-10-30T13:00:00.000Z'});
  assert.equal(doc.schemaVersion,1);assert.equal(doc.format,'redown.history');assert.equal(doc.count,2);
  assert.deepEqual(unwrap(doc.records),records);
  assert.deepEqual(unwrap(api.read(JSON.stringify(doc)).records),records);
  assert.ok(JSON.stringify(doc,null,2).includes('\\n  "schemaVersion": 1'));
});
test('reader rejects invalid or unsupported formats without guessing',()=>{
  assert.throws(()=>api.read('{}'),/Not a REDOWN/);
  assert.throws(()=>api.read(JSON.stringify({format:'redown.history',schemaVersion:2,records:[],count:0})),/newer/);
  assert.throws(()=>api.read(JSON.stringify({format:'redown.history',schemaVersion:1,records:[],count:999})),/count mismatch/);
  assert.throws(()=>api.read(JSON.stringify({format:'redown.history',schemaVersion:1,records:['oops'],count:1})),/invalid records/);
});
test('both History pages offer a bottom JSON export using the same format',()=>{
  assert.match(options,/id="export-history"/);assert.match(options,/history-export\.js/);
  assert.match(betaHtml,/id="beta-export-history"/);assert.match(betaHtml,/history-export\.js/);
  assert.match(legacy,/RedownHistoryExport\.download\(result\.transferHistory/);
  assert.match(beta,/RedownHistoryExport\.download\(result\.data\.history/);
});

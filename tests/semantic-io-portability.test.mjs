import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {readScoped} from '../agent/semantic/io.mjs';

test('scoped semantic reads accept native nested paths while retaining containment and exclusions',()=>{
 const root=mkdtempSync(join(tmpdir(),'redown reader ')),outside=mkdtempSync(join(tmpdir(),'redown outside '));
 try{
  mkdirSync(join(root,'nested'));writeFileSync(join(root,'nested','source.json'),'{}');
  assert.equal(readScoped(root,'nested/source.json').toString(),'{}');
  for(const path of ['../source.json','nested/../../source.json','nested\\source.json','.aws/config'])assert.throws(()=>readScoped(root,path),/unsafe-path/);
  writeFileSync(join(outside,'source.json'),'outside');
  symlinkSync(outside,join(root,'alias'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>readScoped(root,'alias/source.json'),/unsafe-path/);
  mkdirSync(join(root,'.aws'));writeFileSync(join(root,'.aws','source.json'),'excluded');
  symlinkSync(join(root,'.aws'),join(root,'public'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>readScoped(root,'public/source.json'),/unsafe-path/);
 }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});

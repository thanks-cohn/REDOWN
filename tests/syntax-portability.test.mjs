import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkSyntax} from '../scripts/check-syntax.mjs';
test('syntax checks parse files under paths with spaces without executing their code or requiring npm.cmd',()=>{
 const root=mkdtempSync(join(tmpdir(),'redown syntax test '));
 try{writeFileSync(join(root,'valid file.mjs'),'throw new Error("must not execute");\n');writeFileSync(join(root,'invalid.mjs'),'const = broken;');
  assert.equal(checkSyntax({root,files:['valid file.mjs']}).state,'passed');const bad=checkSyntax({root,files:['valid file.mjs','invalid.mjs']});assert.equal(bad.state,'failed');assert.equal(bad.results[1].file,'invalid.mjs');assert.doesNotMatch(JSON.stringify(bad),/const = broken/);assert.equal(checkSyntax({root,files:['../outside.mjs']}).code,'INVALID_SYNTAX_TARGET');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('syntax command refuses caller-selected targets',()=>{
 const run=spawnSync(process.execPath,['scripts/check-syntax.mjs','--command','echo'],{encoding:'utf8'});assert.equal(run.status,2);
});

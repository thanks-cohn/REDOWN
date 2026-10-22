import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
const scope={};vm.runInNewContext(source.slice(source.indexOf('function isVerifiedWorkerHealth('),source.indexOf('async function provisionCloudflareProfile(')),scope);
test('Worker verification requires the actual REDOWN service, secret and storage binding',()=>{
 const valid={ok:true,service:'REDOWN',secretConfigured:true,storageBound:true};
 assert.equal(scope.isVerifiedWorkerHealth(valid),true);
 for(const bad of [null,{},true,{ok:true},'<!doctype html>',{...valid,ok:'true'},{...valid,service:'other'},{...valid,secretConfigured:false},{...valid,storageBound:false}])assert.equal(scope.isVerifiedWorkerHealth(bad),false);
});

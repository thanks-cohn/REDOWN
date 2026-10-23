// Negative/unknown evidence drills against the actual upstream evaluator.
import assert from 'node:assert/strict';
import {loadModel,Model,createForeverApiFromModel} from '../upstream/forever-works/src/index.js';
const model=await loadModel(new URL('../../forever',import.meta.url).pathname);
const api=createForeverApiFromModel(model);
assert.equal(api.validateModel().valid,true);
const dependency='redown.dependency.r2-worker',candidate='redown.implementation.dependency.r2-worker';
assert.equal(api.evaluateReplacement(dependency,candidate).result,'partial');
const records=structuredClone(model.records);
records.find(r=>r.id===candidate).claims=[{requirement:'redown.invariant.explorer.copy',status:'fail',reason:'Deliberate negative control: destination read-back absent.'}];
assert.equal(createForeverApiFromModel(new Model(model.manifest,records)).evaluateReplacement(dependency,candidate).result,'fail');
const unknown=structuredClone(model.records);unknown[0].extensions['org.redown'].futureField={opaque:true};
assert.deepEqual(createForeverApiFromModel(new Model(model.manifest,unknown)).getEntity(unknown[0].id).extensions['org.redown'].futureField,{opaque:true});
const broken=structuredClone(model.records);broken.find(r=>r.kind==='capability').relatedInvariants.push('redown.missing');
assert.equal(createForeverApiFromModel(new Model(model.manifest,broken)).validateModel().valid,false);
console.log(JSON.stringify({valid:true,checks:['actual reference validation','missing replacement proof remains partial','failed protected obligation fails','unknown fields retained','broken canonical reference rejected'],scope:'documentation evaluator only; no transfer or migration performed'},null,2));

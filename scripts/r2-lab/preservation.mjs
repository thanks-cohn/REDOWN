import {createForeverApi} from '../../FOREVER_WORKS/upstream/forever-works/src/index.js';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../../FOREVER_WORKS/P2-R2-API/',import.meta.url).pathname;
const api=await createForeverApi(root),result=api.validateModel();
if(!result.valid)throw Error(JSON.stringify(result));
const manifest=JSON.parse(await readFile(root+'manifest.json'));
let checked=0;for(const paths of Object.values(manifest.records))for(const path of paths){const record=JSON.parse(await readFile(root+path));for(const ref of record.extensions?.['org.redown']?.sourceRefs||[]){const bytes=await readFile(new URL('../../'+ref.path,import.meta.url));if(createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw Error('SOURCE_DRIFT: '+ref.path);checked++;}}
console.log(JSON.stringify({valid:true,checkedSourceReferences:checked,scope:'actual pinned Forever Works reference API and source hashes; no migration or readiness approval'}));

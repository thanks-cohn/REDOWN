import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {build} from 'esbuild';
import standaloneCode from 'ajv/dist/standalone/index.js';
import {readFileSync,writeFileSync} from 'node:fs';
const ajv=new Ajv({strict:false,code:{source:true,esm:true}});addFormats(ajv);
for(const [schema,target,definition] of [['provider.schema.json','provider-validator.mjs',''],['schema-0.3.json','request-03-validator.mjs','#/$defs/request']]){
 const path=new URL('../../extension/file-engine/'+schema,import.meta.url),source=JSON.parse(readFileSync(path));ajv.addSchema(source);const validate=ajv.getSchema(source.$id+definition),generated=standaloneCode(ajv,validate),out=new URL('../../extension/file-engine/'+target,import.meta.url);
 const bundled=await build({stdin:{contents:generated,resolveDir:process.cwd(),sourcefile:'generated-contract.mjs'},bundle:true,write:false,format:'esm',platform:'browser',minify:true});const code=bundled.outputFiles[0].text;
 if(process.argv.includes('--check')){if(readFileSync(out,'utf8')!==code)throw Error('GENERATED_CONTRACT_DRIFT');}else writeFileSync(out,code);
}

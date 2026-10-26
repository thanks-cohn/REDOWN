import Ajv from 'ajv/dist/2020.js';import addFormats from 'ajv-formats';import standalone from 'ajv/dist/standalone/index.js';import {build} from 'esbuild';import {readFileSync,writeFileSync} from 'node:fs';
const ajv=new Ajv({strict:false,code:{source:true,esm:true}});addFormats(ajv);
const schema=JSON.parse(readFileSync('extension/file-engine/diagnostic.schema.json'));
const validate=ajv.compile(schema);const result=await build({stdin:{contents:standalone(ajv,validate),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',minify:true});
const target='extension/file-engine/diagnostic-validator.mjs',code=result.outputFiles[0].text;
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==code)throw Error('DIAGNOSTIC_SCHEMA_DRIFT');}else writeFileSync(target,code);

const codes='export default '+JSON.stringify(schema.properties.code.enum)+';\n';const codePath='extension/file-engine/diagnostic-codes.mjs';if(process.argv.includes('--check')){if(readFileSync(codePath,'utf8')!==codes)throw Error('DIAGNOSTIC_CODE_DRIFT');}else writeFileSync(codePath,codes);

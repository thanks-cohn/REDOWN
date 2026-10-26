import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standalone from 'ajv/dist/standalone/index.js';
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const repository=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// One canonical schema owns all language/distribution artifacts. No hand copies.
export async function compileDiagnosticSchema({check=false,root=repository}={}){
 const source=readFileSync(resolve(root,'extension/file-engine/diagnostic.schema.json'),'utf8');
 const schema=JSON.parse(source),ajv=new Ajv({strict:false,code:{source:true,esm:true}});addFormats(ajv);
 const validate=ajv.compile(schema);
 const result=await build({stdin:{contents:standalone(ajv,validate),resolveDir:repository},bundle:true,write:false,format:'esm',platform:'browser',minify:true});
 const doctor=ajv.compile(JSON.parse(readFileSync(resolve(root,'extension/file-engine/doctor.schema.json'),'utf8')));
 const doctorResult=await build({stdin:{contents:standalone(ajv,doctor),resolveDir:repository},bundle:true,write:false,format:'esm',platform:'browser',minify:true});
 const artifacts={
  'extension/file-engine/doctor-validator.mjs':doctorResult.outputFiles[0].text,
  'extension/file-engine/diagnostic-validator.mjs':result.outputFiles[0].text,
  'extension/file-engine/diagnostic-codes.mjs':'export default '+JSON.stringify(schema.properties.code.enum)+';\n',
  'clients/python/redown/diagnostic.schema.json':source
 };
 for(const [path,contents] of Object.entries(artifacts)){
  if(check){if(readFileSync(resolve(root,path),'utf8')!==contents)throw Error('DIAGNOSTIC_ARTIFACT_DRIFT: '+path);}
  else writeFileSync(resolve(root,path),contents);
 }
 return Object.keys(artifacts);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await compileDiagnosticSchema({check:process.argv.includes('--check')});

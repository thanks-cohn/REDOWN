import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
const result=await build({stdin:{contents:'export {sha256} from "@noble/hashes/sha2.js";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',legalComments:'inline'});
const path='extension/file-engine/vendor/sha256.mjs',code=result.outputFiles[0].text;
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==code)throw Error('STREAM_HASH_DRIFT');}else writeFileSync(path,code);

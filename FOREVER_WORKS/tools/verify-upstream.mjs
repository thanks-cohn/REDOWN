// Compare the new unmodified reference snapshot to an optional actual upstream checkout.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=new URL('../upstream/forever-works/',import.meta.url);
const pin=JSON.parse(await readFile(new URL('UPSTREAM.json',root),'utf8'));
const checkout=process.argv[2];if(!checkout)throw Error('Supply the inspected forever-works checkout path');
const results=[];
for(const [path,hash] of Object.entries(pin.files)){
 const source=path.startsWith('schemas/')?'spec/'+path:path.startsWith('src/')?'packages/javascript/'+path:path;
 const actual=createHash('sha256').update(await readFile(resolve(checkout,source))).digest('hex');results.push({path,match:hash===actual});
}
console.log(JSON.stringify({upstreamCommit:pin.commit,valid:results.every(x=>x.match),files:results},null,2));
process.exitCode=results.every(x=>x.match)?0:1;

import {readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import vm from 'node:vm';
// Classic MV3 worker imports must exist and parse as classic scripts. Node's
// --check alone can accept ESM syntax that Chrome's classic worker rejects.
export function validateStartupPackage(root){
 const base=resolve(root,'extension'),seen=new Set(),pending=[];
 try{
  const manifest=JSON.parse(readFileSync(resolve(base,'manifest.json'),'utf8'));
  pending.push(resolve(base,manifest.background.service_worker));
  for(const document of [manifest.side_panel.default_path,manifest.options_page,'popup.html'])readFileSync(resolve(base,document));
  while(pending.length){
   const file=pending.pop();if(seen.has(file))continue;
   if(relative(base,file).startsWith('..'))throw Error('outside package');
   seen.add(file);const source=readFileSync(file,'utf8');new vm.Script(source,{filename:relative(base,file)});
   for(const match of source.matchAll(/\bimportScripts\(([^)]*)\)/g)){
    for(const item of match[1].matchAll(/["']([^"']+)["']/g))pending.push(resolve(dirname(file),item[1]));
   }
  }
  return {state:'passed',files:[...seen].map(p=>relative(base,p)).sort()};
 }catch{return {state:'failed',code:'STARTUP_PACKAGE_INVALID',files:[...seen].map(p=>relative(base,p)).sort()};}
}

/* Virtual archive directory projection based on Legacy Explorer's
 * renderArchiveFolder(prefix) logic. No extraction or R2 mutations.
 */
const isSafePath=value=>typeof value==='string'&&value.length>0&&!value.startsWith('/')&&!value.includes('\\')&&!value.includes('\0')&&!value.split('/').some(part=>part==='.'||part==='..');
export function normalizeArchiveEntries(entries){
  if(!Array.isArray(entries))throw Error('The archive returned an invalid index.');
  const seen=new Set(),files=[];
  for(const entry of entries){
    if(!entry||!isSafePath(entry.name)||entry.directory===true||entry.name.endsWith('/'))continue;
    if(seen.has(entry.name))continue;
    seen.add(entry.name);files.push({...entry,name:entry.name,size:Number(entry.size)||0});
  }
  return files;
}
export function archiveFolder(entries,prefix=''){
  if(prefix&&(!isSafePath(prefix)||!prefix.endsWith('/')))throw Error('Invalid archive folder.');
  const folders=new Map(),files=[];
  for(const entry of entries){
    if(!entry.name.startsWith(prefix)||entry.name===prefix)continue;
    const rest=entry.name.slice(prefix.length),slash=rest.indexOf('/');
    if(slash>=0){
      const folderName=rest.slice(0,slash);if(!folderName)continue;
      if(!folders.has(folderName))folders.set(folderName,{name:folderName,key:prefix+folderName+'/',folder:true});
    }else if(rest)files.push({name:rest,key:entry.name,size:entry.size,folder:false,entry});
  }
  const byName=(a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
  return {prefix,folders:[...folders.values()].sort(byName),files:files.sort(byName)};
}
export function archiveParent(prefix=''){
  if(!prefix)return '';
  const parts=prefix.replace(/\/$/,'').split('/');
  parts.pop();return parts.length?parts.join('/')+'/':'';
}
export function archiveCrumbs(prefix=''){
  const crumbs=[{name:'Archive',prefix:''}];
  let path='';
  for(const name of prefix.split('/').filter(Boolean)){path+=name+'/';crumbs.push({name,prefix:path});}
  return crumbs;
}
export function archiveAdjacent(files,key,offset){
  const i=files.findIndex(file=>file.key===key);
  return i<0?null:files[i+offset]||null;
}

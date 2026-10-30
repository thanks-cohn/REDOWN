/* REDOWN history export v1. No network calls, no credential introspection.
 * The JSON envelope is deliberately stable, inspectable, and round-trippable.
 */
(function(root){
  'use strict';
  const FORMAT='redown.history',VERSION=1;
  function build(records,{exportedAt=new Date().toISOString()}={}){
    if(!Array.isArray(records))throw Error('History records must be an array.');
    if(records.some(record=>!record||typeof record!=='object'||Array.isArray(record)))throw Error('History contains an invalid record.');
    return {
      format:FORMAT,
      schemaVersion:VERSION,
      exportedAt,
      application:'REDOWN',
      description:'Locally recorded REDOWN saves, failed attempts and related URLs. URL accessibility and transfer outcomes are historical, not live checks.',
      count:records.length,
      urlFields:{
        pageUrl:'Webpage where the user requested the save',
        srcUrl:'Direct image/audio/video URL if Chrome provided one',
        frameUrl:'Containing frame URL, if provided',
        linkUrl:'Right-clicked hyperlink target, if provided',
        sourceUrl:'Actual source REDOWN attempted to ingest'
      },
      records:records.map(record=>({...record}))
    };
  }
  function read(json){
    const parsed=typeof json==='string'?JSON.parse(json):json;
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||parsed.format!==FORMAT)
      throw Error('Not a REDOWN history export.');
    if(parsed.schemaVersion!==VERSION)
      throw Error(parsed.schemaVersion>VERSION?'This History export was made by a newer REDOWN format. Update REDOWN to read it.':'Unsupported REDOWN history export version.');
    if(!Array.isArray(parsed.records)||parsed.records.some(item=>!item||typeof item!=='object'||Array.isArray(item)))
      throw Error('REDOWN history export has invalid records.');
    if(parsed.count!==parsed.records.length)throw Error('REDOWN history export count mismatch.');
    return parsed;
  }
  function download(records,{document,urlApi=URL,BlobClass=Blob,now=new Date()}={}){
    if(!document?.createElement||!urlApi?.createObjectURL||!BlobClass)throw Error('History file saving is unavailable here.');
    const value=build(records,{exportedAt:now.toISOString()});
    // Newlines and indentation make it readable in text editors; properties
    // remain machine-addressable for future group-by-page and bookmark views.
    const json=JSON.stringify(value,null,2)+'\n';
    const blob=new BlobClass([json],{type:'application/json;charset=utf-8'});
    const href=urlApi.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=href;anchor.download='redown-history-v1-'+now.toISOString().slice(0,10)+'.json';
    anchor.hidden=true;document.body.append(anchor);
    try{anchor.click();}
    finally{
      anchor.remove();
      // Give Chrome time to acquire the blob before disposing the URL.
      const schedule=typeof setTimeout==='function'?setTimeout:(fn)=>fn();
      schedule(()=>urlApi.revokeObjectURL(href),60000);
    }
    return {fileName:anchor.download,count:value.count};
  }
  root.RedownHistoryExport=Object.freeze({format:FORMAT,version:VERSION,build,read,download});
})(globalThis);

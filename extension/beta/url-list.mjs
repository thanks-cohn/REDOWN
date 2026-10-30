/* Reusable UTF-8 text parser. Provider security validation still applies downstream. */
export function parseUrlList(text){
  const entries=[],duplicates=[],invalid=[],seen=new Set();let total=0;
  for(const [index,raw] of String(text).replace(/^\uFEFF/,'').split(/\r?\n/).entries()){
    const value=raw.trim(),line=index+1;if(!value||value.startsWith('#'))continue;total++;
    try{if(!/^https?:\/\//i.test(value)||/\s/.test(value))throw Error();const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();
      const entry={line,url:url.href};if(seen.has(url.href))duplicates.push(entry);else{seen.add(url.href);entries.push(entry);}
    }catch{invalid.push({line,error:'Enter an HTTP/HTTPS URL without credentials or spaces.'});}
  }
  return {total,entries,duplicates,invalid};
}

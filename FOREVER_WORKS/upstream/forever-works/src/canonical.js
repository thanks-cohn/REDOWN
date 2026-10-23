/** Unicode scalar ordering, independent of locale and JavaScript property enumeration. */
export function compare(a,b) {
  const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));
  for(let i=0;i<Math.min(x.length,y.length);i++) if(x[i]!==y[i]) return x[i]-y[i];
  return x.length-y.length;
}
export function canonical(value) {
  function emit(v,depth) {
    if(depth>64) throw new TypeError('resource-limit: JSON nesting exceeds 64');
    if(v===null||typeof v==='boolean') return String(v);
    if(typeof v==='string') {
      for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const next=v.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))throw new TypeError('invalid-unicode');}else if(c>=0xdc00&&c<=0xdfff)throw new TypeError('invalid-unicode');}
      return JSON.stringify(v);
    }
    if(typeof v==='number') {
      if(!Number.isFinite(v)) throw new TypeError('unsupported-number');
      return JSON.stringify(v);
    }
    if(!v||typeof v!=='object') throw new TypeError('invalid-json-value');
    const array=Array.isArray(v),keys=array?Array.from({length:v.length},(_,i)=>i):Object.keys(v).sort(compare);
    if(!keys.length)return array?'[]':'{}';
    const pad='  '.repeat(depth+1),close='  '.repeat(depth);
    return (array?'[':'{')+'\n'+keys.map(k=>pad+(array?'':emit(k,depth+1)+': ')+emit(v[k],depth+1)).join(',\n')+'\n'+close+(array?']':'}');
  }
  return emit(value,0)+'\n';
}

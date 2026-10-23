/** Validate duplicate members/depth before using the native JSON value parser. */
export function parseInput(bytes) {
  if(bytes.length>1048576) throw new Error('resource-limit: file exceeds 1048576 bytes');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  // JSON.parse establishes syntax. The scanner then detects duplicate decoded keys.
  const value=JSON.parse(text);let i=0;
  const whitespace=()=>{while(/\s/.test(text[i]??'')&&i<text.length)i++;};
  function string(){const start=i++;while(i<text.length){if(text[i++]==='"')return JSON.parse(text.slice(start,i));if(text[i-1]==='\\')i++;}throw new Error('invalid-json');}
  function scan(depth){
    if(depth>64)throw new Error('resource-limit: nesting exceeds 64');whitespace();
    if(text[i]==='"'){string();return;}
    if(text[i]==='{'){i++;whitespace();const keys=new Set();if(text[i]==='}'){i++;return;}while(true){whitespace();const key=string();if(keys.has(key))throw new Error('duplicate-member');keys.add(key);whitespace();i++;scan(depth+1);whitespace();if(text[i++]==='}')return;}}
    else if(text[i]==='['){i++;whitespace();if(text[i]===']'){i++;return;}while(true){scan(depth+1);whitespace();if(text[i++]===']')return;}}
    else {while(i<text.length&&!/[\s,}\]]/.test(text[i]))i++;}
  }
  scan(0);
  function scalar(v) {
    if(typeof v==='string') {
      for(let n=0;n<v.length;n++){const c=v.charCodeAt(n);if(c>=0xd800&&c<=0xdbff){const next=v.charCodeAt(++n);if(!(next>=0xdc00&&next<=0xdfff))throw new Error('invalid-unicode');}else if(c>=0xdc00&&c<=0xdfff)throw new Error('invalid-unicode');}
    }else if(typeof v==='number'&&!Number.isFinite(v))throw new Error('unsupported-number');
    else if(v&&typeof v==='object'){for(const [key,item] of Object.entries(v)){scalar(key);scalar(item);}}
  }
  scalar(value);return value;
}

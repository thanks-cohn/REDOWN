import {compare} from './canonical.js';
const syntax=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
function parts(token) {
  if(typeof token!=='string')throw new Error('invalid-number');
  if(token.length>4096)throw new Error('resource-limit: numeric token exceeds 4096 bytes');
  if(!syntax.test(token))throw new Error('invalid-number');
  const [mantissa,rawExponent='0']=token.toLowerCase().split('e');
  const exponent=Number(rawExponent);
  if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>1000000)throw new Error('resource-limit: exponent magnitude exceeds 1000000');
  const negative=mantissa.startsWith('-'),unsigned=negative?mantissa.slice(1):mantissa;
  const fraction=unsigned.split('.')[1]??'';
  let digits=unsigned.replace('.','').replace(/^0+/,'');
  if(!digits)return {negative:false,digits:'0',exponent:0};
  const trimmed=digits.replace(/0+$/,'');
  const adjusted=exponent-fraction.length+digits.length-trimmed.length;
  if(trimmed.length>4000||Math.abs(adjusted+trimmed.length-1)>1000000)throw new Error('resource-limit: decimal precision or adjusted exponent');
  return {negative,digits:trimmed,exponent:adjusted};
}
export class JsonNumber {
  constructor(token){parts(token);this.token=token;Object.freeze(this);}
  canonical(){const p=parts(this.token);if(p.digits==='0')return '0';const e=p.exponent+p.digits.length-1;let text;
    if(e>=-6&&e<=20){const point=p.digits.length+p.exponent;text=point<=0?'0.'+'0'.repeat(-point)+p.digits:point>=p.digits.length?p.digits+'0'.repeat(point-p.digits.length):p.digits.slice(0,point)+'.'+p.digits.slice(point);}
    else text=p.digits[0]+(p.digits.length>1?'.'+p.digits.slice(1):'')+'e'+e;
    return (p.negative?'-':'')+text;
  }
  toJSON(){throw new TypeError('lossless-writer-required');}
  valueOf(){throw new TypeError('explicit-number-projection-required');}
}
export const isJsonNumber=value=>value instanceof JsonNumber;
export function compareNumbers(a,b){
  const x=parts(isJsonNumber(a)?a.token:String(a)),y=parts(isJsonNumber(b)?b.token:String(b));
  if(x.negative!==y.negative)return x.negative?-1:1;
  const xe=x.digits==='0'?-Infinity:x.exponent+x.digits.length,ye=y.digits==='0'?-Infinity:y.exponent+y.digits.length;
  let result=xe<ye?-1:xe>ye?1:0;
  if(!result){const n=Math.max(x.digits.length,y.digits.length),left=x.digits.padEnd(n,'0'),right=y.digits.padEnd(n,'0');result=left<right?-1:left>right?1:0;}
  return x.negative?-result:result;
}
function scalar(text){for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const next=text.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))throw new Error('invalid-unicode');}else if(c>=0xdc00&&c<=0xdfff)throw new Error('invalid-unicode');}return text;}
export function canonicalLossless(value){
  function emit(v,depth){
    if(depth>64)throw new Error('resource-limit: nesting exceeds 64');
    if(isJsonNumber(v))return v.canonical();
    if(typeof v==='number'){if(!Number.isSafeInteger(v))throw new Error('unsafe-host-number: supply an explicit JsonNumber token');return String(v);}
    if(v===null||typeof v==='boolean')return String(v);
    if(typeof v==='string')return JSON.stringify(scalar(v));
    if(!v||typeof v!=='object'||(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null))throw new Error('invalid-json-value');
    const array=Array.isArray(v),keys=array?Array.from({length:v.length},(_,i)=>i):Object.keys(v).sort(compare);
    if(!keys.length)return array?'[]':'{}';
    return (array?'[':'{')+'\n'+keys.map(key=>'  '.repeat(depth+1)+(array?'':JSON.stringify(scalar(key))+': ')+emit(v[key],depth+1)).join(',\n')+'\n'+'  '.repeat(depth)+(array?']':'}');
  }
  return emit(value,0)+'\n';
}
export function parseLossless(input){
  let text;
  if(typeof input==='string'){if(input.length>1048576)throw new Error('resource-limit: document bytes');scalar(input);if(new TextEncoder().encode(input).length>1048576)throw new Error('resource-limit: document bytes');text=input;}
  else {if(!(input instanceof Uint8Array))throw new TypeError('expected UTF-8 text or bytes');if(input.length>1048576)throw new Error('resource-limit: document bytes');text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(input);}
  let i=0;
  const ws=()=>{while(i<text.length&&' \r\n\t'.includes(text[i]))i++;};
  function string(){if(text[i]!=='"')throw new Error('invalid-json');const start=i++;while(i<text.length){const c=text[i++];if(c==='"')return scalar(JSON.parse(text.slice(start,i)));if(c==='\\')i++;}throw new Error('invalid-json');}
  function value(depth){
    if(depth>64)throw new Error('resource-limit: nesting exceeds 64');ws();const c=text[i];
    if(c==='"')return string();
    if(c==='{'){i++;ws();const out={};if(text[i]==='}'){i++;return Object.freeze(out);}while(true){ws();const key=string();if(Object.hasOwn(out,key))throw new Error('duplicate-member');ws();if(text[i++]!==':')throw new Error('invalid-json');Object.defineProperty(out,key,{value:value(depth+1),enumerable:true});ws();const next=text[i++];if(next==='}')return Object.freeze(out);if(next!==',')throw new Error('invalid-json');}}
    if(c==='['){i++;ws();const out=[];if(text[i]===']'){i++;return Object.freeze(out);}while(true){out.push(value(depth+1));ws();const next=text[i++];if(next===']')return Object.freeze(out);if(next!==',')throw new Error('invalid-json');}}
    for(const [literal,v] of [['true',true],['false',false],['null',null]])if(text.startsWith(literal,i)){i+=literal.length;return v;}
    const match=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(i));
    if(!match)throw new Error('invalid-json');i+=match[0].length;return new JsonNumber(match[0]);
  }
  const parsed=value(0);ws();if(i!==text.length)throw new Error('invalid-json');
  return Object.freeze({value:parsed,source:()=>text,canonical:()=>canonicalLossless(parsed),toHost:({allowLoss=false}={})=>{
    function project(v){if(isJsonNumber(v)){const number=Number(v.token);if(!Number.isFinite(number))throw new Error('unsupported-host-number');if(!allowLoss&&compareNumbers(v,new JsonNumber(JSON.stringify(number)))!==0)throw new Error('lossy-number-projection');return number;}if(Array.isArray(v))return v.map(project);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,project(item)]));return v;}
    return project(parsed);
  }});
}

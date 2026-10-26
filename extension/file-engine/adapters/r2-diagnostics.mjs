// R2/Cloudflare owns native HTTP body + correlation decoding. Core only maps HTTP status.
import {responseDiagnostic} from '../diagnostics.mjs';
export async function r2ResponseDiagnostic(response,details={}){
 let nativeCode=null;const reader=response.body?.getReader();let bytes=0;const chunks=[];
 if(reader)try{
  while(bytes<8192){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192)break;chunks.push(value);}
  if(bytes<=8192){const data=new Uint8Array(bytes);let n=0;for(const c of chunks){data.set(c,n);n+=c.length;}
   try{nativeCode=JSON.parse(new TextDecoder().decode(data)).errors?.[0]?.code;}catch{}
  }
 }finally{await reader.cancel().catch(()=>{});}
 return responseDiagnostic(response,{...details,provider:'extension-r2',nativeCode,requestId:response.headers?.get('cf-ray')});
}

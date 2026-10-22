// Stable machine events only; do not serialize arbitrary exception bodies or fixture values.
import {relative} from 'node:path';
export default async function* reporter(events){
 for await(const {type,data} of events){
  if(type==='test:pass'||type==='test:fail'){
   const cause=data.details?.error?.cause||data.details?.error;
   yield JSON.stringify({type:type==='test:pass'?'pass':'fail',file:data.file?relative(process.cwd(),data.file).replaceAll('\\','/'):null,name:data.name,nesting:data.nesting,skipped:Boolean(data.skip),todo:Boolean(data.todo),error:type==='test:fail'?{name:cause?.name||'Error',code:cause?.code||'UNKNOWN',operator:cause?.operator||null}:undefined})+'\n';
  }
 }
}

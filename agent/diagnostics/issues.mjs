// Read-only projection of existing issue sources plus explicit, hash-bound review notes.
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const safe=value=>String(value||'').replace(/https?:\/\/\S+/g,'[URL omitted]').replace(/(?:Bearer\s+\S+|(?:token|password|secret)\s*[=:]\s*\S+)/gi,'[secret omitted]').slice(0,400);
export function readIssueSource(path,root=ROOT){
 if(typeof path!=='string'||! /^(?:bugs|docs|agent|extension|scripts|tests)\/[A-Za-z0-9._/-]+$/.test(path)||path.split('/').some(p=>p==='..'||p==='.'||p.startsWith('.'))||/(?:secret|credential|private-key|node_modules)/i.test(path))throw Error('UNSAFE_ISSUE_SOURCE');
 const base=realpathSync(root),target=realpathSync(resolve(base,path)),rel=relative(base,target);if(rel.startsWith('..')||isAbsolute(rel)||statSync(target).size>1024*1024)throw Error('UNSAFE_ISSUE_SOURCE');
 return readFileSync(target,'utf8');
}
export function markdownIssues(text){
 const headers=[...text.matchAll(/^## (.+)$/gm)];
 return headers.map((header,index)=>{
  const section=text.slice(header.index,headers[index+1]?.index||text.length),number=/^BUG-(\d{3})\b/.exec(header[1]);
  const id=number?'BUG-'+number[1]:'REPORT-'+hash(header[1]).slice(0,12);
  return {id,title:safe(header[1]),sourceKind:'bug-report',state:'unknown',severity:/Priority: P1|Priority: P0|\*\*Priority: P1/i.test(section)?'high':'unknown',recordedStatus:safe(/\*\*Status:\*\*\s*([^\n]+)/.exec(section)?.[1]||'Unclassified report or follow-up'),assessment:{status:'needs-triage',confidence:'recorded-only',summary:'Historical wording is not a current reproduction or acceptance result.'},source:{path:'bugs/README.md',heading:header[1],line:text.slice(0,header.index).split('\n').length,sha256:hash(section)},nextAction:'Review linked source/tests and obtain the missing browser/provider evidence before closing.'};
 });
}
export function applyAssessments(items,catalog,read=readIssueSource){
 const findings=[],byId=new Map(items.map(item=>[item.id,item]));
 if(catalog.version!=='1.0.0'||!Array.isArray(catalog.assessments))throw Error('INVALID_ISSUE_ASSESSMENTS');
 const ids=new Set();
 for(const note of catalog.assessments){
  if(typeof note.id!=='string'||!['partially-addressed','source-implemented','source-risk'].includes(note.status)||!Array.isArray(note.evidence)||!note.evidence.length||note.evidence.some(ref=>typeof ref.path!=='string'||typeof ref.symbol!=='string'||!ref.symbol||! /^[a-f0-9]{64}$/.test(ref.sha256))){findings.push({code:'INVALID_ASSESSMENT'});continue;}

  if(ids.has(note.id)){findings.push({code:'DUPLICATE_ASSESSMENT',id:note.id});continue;}ids.add(note.id);
  let item=byId.get(note.id);
  if(!item&&note.newIssue){item={id:note.id,title:note.title,sourceKind:'code-review',state:'open',severity:note.severity,recordedStatus:'Source review; not a live failure',source:{path:'agent/diagnostics/issue-assessments.json'},assessment:{status:'needs-triage'}};items.push(item);byId.set(item.id,item);}
  if(!item){findings.push({code:'UNKNOWN_ISSUE',id:note.id});continue;}
  let stale=Boolean(note.reportSha256&&note.reportSha256!==item.source.sha256);
  for(const ref of note.evidence||[])try{const source=read(ref.path);if(hash(source)!==ref.sha256)stale=true;if(!source.includes(ref.symbol))stale=true;}catch{stale=true;}
  item.state=stale?'unknown':'open';
  item.assessment={status:stale?'needs-revalidation':note.status,confidence:stale?'stale-review':'source-reviewed',summary:safe(note.summary),reviewedOn:note.reviewedOn,freshness:stale?'stale':'current',evidence:note.evidence.map(ref=>({path:ref.path,symbol:safe(ref.symbol),sha256:ref.sha256}))};
  item.severity=note.severity||item.severity;item.nextAction=safe(note.nextAction);item.related=note.related||[];
  if(stale)findings.push({code:'STALE_ASSESSMENT',id:note.id});
 }
 return {items,findings};
}
export function createIssueInventory({debugQuery,read=readIssueSource}={}){
 try{
  const markdown=read('bugs/README.md'),catalog=JSON.parse(read('agent/diagnostics/issue-assessments.json'));
  const items=markdownIssues(markdown);if(!items.length)throw Error('EMPTY_BUG_INVENTORY');const gates=JSON.parse(read('docs/runtime/release-gates.json'));
  for(const gate of gates.requirements)items.push({id:'GATE-'+gate.id,title:gate.id,sourceKind:'release-gate',state:'unknown',severity:gate.severity,recordedStatus:gate.state,assessment:{status:'recorded-only',confidence:'historical',summary:safe(gate.evidence)},source:{path:'docs/runtime/release-gates.json',sha256:hash(JSON.stringify(gate))},nextAction:'Revalidate the recorded release requirement; a recorded pass is not current live proof.'});
  const copy=JSON.parse(read('docs/explorer/COPY_404_CASE.json'));
  items.push({id:copy.id,title:'Cross-bucket Copy/Move/Paste returns HTTP 404',sourceKind:'explorer-incident',state:copy.state,severity:'high',recordedStatus:copy.state,assessment:{status:'reported',confidence:'user-report',summary:'Root cause and installed/deployed versions remain unverified.'},source:{path:'docs/explorer/COPY_404_CASE.json',sha256:hash(JSON.stringify(copy))},nextAction:'Capture same-operation source/destination evidence using disposable authorized files; do not infer missing data from HTTP404 alone.'});
  const failures=JSON.parse(read('agent/diagnostics/regression-baseline.json'));
  for(const failure of failures.failures)items.push({id:'TEST-'+hash(failure.file+'\n'+failure.name).slice(0,12),title:failure.name,sourceKind:'regression-debt',state:'unknown',severity:'medium',recordedStatus:'Known baseline failure',assessment:{status:'recorded-only',confidence:'historical',summary:failure.reason},source:{path:'agent/diagnostics/regression-baseline.json'},nextAction:'Inspect current test results and resolve the maintenance decision without weakening assertions or rewriting frozen history.'});
  const findings=[];
  if(debugQuery){const debug=debugQuery('listIncidents');if(!debug.error&&Array.isArray(debug.data))for(const entry of debug.data)items.push({id:entry.incident.caseId,title:safe(entry.incident.summary),sourceKind:'historical-incident',state:'unknown',severity:entry.incident.severity,recordedStatus:entry.lifecycle,assessment:{status:'recorded-only',confidence:'historical',summary:'Original DBG lifecycle is preserved; inspect newer evidence separately.',freshness:debug.freshness?.status||'unknown'},source:{path:'debug/cases/'+entry.incident.caseId+'.json'},nextAction:'Read the native debug record and linked current reports before deciding whether this remains reproducible.'});else findings.push({code:'DEBUG_INVENTORY_UNAVAILABLE'});}
  const reviewed=applyAssessments(items,catalog,read);findings.push(...reviewed.findings);
  const ids=new Set();for(const item of items){if(ids.has(item.id))findings.push({code:'DUPLICATE_ISSUE',id:item.id});ids.add(item.id);}
  const weights={critical:0,high:1,medium:2,low:3,unknown:4};items.sort((a,b)=>(weights[a.severity]??4)-(weights[b.severity]??4)||a.id.localeCompare(b.id));
  return {items,findings,coverage:{markdownSections:markdownIssues(markdown).length,releaseRequirements:gates.requirements.length,scope:'All top-level bugs README sections, recorded release gates, baseline test debt, historical DBG records and the Explorer404 case; not live issue detection'},authority:'Read-only source projection. Source-implemented is not browser/provider-verified. Original reports and records remain unchanged.'};
 }catch{return {items:[],findings:[{code:'ISSUE_SOURCE_UNAVAILABLE'}],coverage:{scope:'Inventory unavailable; do not interpret this as zero issues'},authority:'No completeness or health claim'};}
}

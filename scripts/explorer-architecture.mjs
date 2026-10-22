// Refresh only this new, current-source Explorer navigation model. Never touches frozen catalogs.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const path='agent/explorer/model.json',model=JSON.parse(await readFile(path,'utf8'));
const replacements={'async function connect(':'async function connectCloudflare(',loadNextExplorerPage:'const goPage=async',connectCloudflareDirect:'async function loginRequest('};
const findings=[];
for(const op of model.operations){
 for(const ref of op.sourceRefs){
  if(replacements[ref.symbol])ref.symbol=replacements[ref.symbol];
  if(ref.symbol.includes('runtimeSearchV1'))ref.symbol='message?.type==="cfSearchStart"';
  if(ref.symbol==='RedownCloudflareAuth'){ref.path='extension/cloudflare-auth.js';ref.symbol='async function connect(';}
  if(ref.symbol==='RedownSearchSessions'){ref.path='extension/search-session.js';ref.symbol='function create(';}
 }
 if(op.name==='public.urls'){
  op.entryPoint='copyItemUrl → RedownPublicAddresses.popover';
  op.message='cfPublicAddresses/cfEnablePublicAccess';
  op.pathway='read-only address discovery; separately confirmed bucket-wide r2.dev enable with read-back';
  for(const [path,symbol] of [['extension/public-addresses.js','function popover('],['extension/options.js','function urlPopover('],['extension/explorer-status.js','function paint('],['extension/background.js','async function enableBucketPublicAccess(']])if(!op.sourceRefs.some(ref=>ref.path===path&&ref.symbol===symbol))op.sourceRefs.push({path,symbol});
 }
 if(op.name==='clipboard'&&!op.sourceRefs.some(ref=>ref.symbol==='function urlPopover('))op.sourceRefs.push({path:'extension/options.js',symbol:'function urlPopover('});
 if(op.name==='pagination')op.entryPoint='goPage (renderFileItems closure)';
 if(op.name==='auth')op.entryPoint='loginRequest';
 if(op.name==='search')op.message='cfSearchStart/cfSearchStep/cfSearchCancel/cfSearchRetry';
}
delete model.messages.runtimeSearchV1;
model.messages.cfEnablePublicAccess={required:['accountId','bucketName','confirmed:true'],authorization:'exact options.html sender; explicit bucket-wide confirmation',reply:'verified managed setting or redacted structured failure; never object-access verification'};
model.messages.cfSearchStart={required:['targets','query'],reply:'existing bounded search-session result plus optional diagnostic observation'};
model.messageSchemas={
 cfEnablePublicAccess:{accountId:'selected account string',bucketName:'selected bucket string',confirmed:'literal true after explicit bucket-wide UI confirmation',authorization:'sender exactly options.html'},
 cfObjects:{accountId:'string',bucketName:'string',prefix:'optional exact folder prefix',cursor:'optional opaque cursor'},
 cfTransferObjects:{operation:['copy','move'],source:{accountId:'string',bucketName:'string'},destination:{accountId:'string',bucketName:'string',prefix:'exact folder prefix'},entries:[{key:'exact object key',folder:'boolean',destinationKey:'optional explicit conflict-retry key'}],conflict:['skip','keep','replace'],explorerTrace:'optional protocol1 operation ID/parent; private seed supplied only by gated background bridge'},
 cfRenameEntry:{source:'account/bucket',entry:'exact key/folder/display name',newName:'explicit requested filename'},cfDeleteObjects:{source:'account/bucket',entries:'explicit confirmed selection'},cfCreateFolder:{accountId:'string',bucketName:'string',prefix:'exact prefix',name:'requested folder name'},cfObjectProperties:{accountId:'string',bucketName:'string',key:'exact object key'},explorerDiagnosticsV1:{operation:['runReadOnlyProbe','getOperationTrace','getRecentFailures','diagnoseOperation','getObjectIdentityTrace','getWorkerCompatibility','getExplorerState','exportDiagnosticBundle','ingest','clear'],authorization:'Debug stored true AND sender exactly options.html; internal sessionContext is not exported or an offline agent operation'}
};
model.stateTransitions=[
 {owner:'workspaceTarget/workspacePrefix',transition:'goLocation captures account/bucket/prefix before browsing; request generation rejects stale results',ref:{path:'extension/options.js',symbol:'async function goLocation('}},
 {owner:'explorerSelected',transition:'selection Set records item IDs; menu captures selected items/source',ref:{path:'extension/options.js',symbol:'function selectExplorerItem('}},
 {owner:'workspacePreviewRequestId',transition:'increment and AbortController; older response cannot replace newer media',ref:{path:'extension/options.js',symbol:'async function showWorkspacePreview('}},
 {owner:'explorerClipboard',transition:'REDOWN session clipboard; source deletion only on verified move',ref:{path:'extension/options.js',symbol:'async function setExplorerClipboard('}},
 {owner:'diagnostic records',transition:'Debug only; incomplete restored operations become unknown; clear rotates fingerprint scope',ref:{path:'extension/explorer-diagnostics-bridge.js',symbol:'function install('}}
];
const significant=[['context-menu','extension/options.js','function showExplorerMenu('],['destination-menu','extension/explorer-destination-menu.js','function create('],['key-validation','extension/background.js','function cleanExplorerKey('],['worker-key-validation','extension/background.js','function exactObjectKey('],['worker-transfer','extension/background.js','async function copyVerifiedObject('],['worker-verify','extension/background.js','async function verifiedObjectPut('],['worker-binding','extension/background.js','name: "STORAGE", bucket_name: bucketName'],['worker-transport','extension/background.js','async function callBucketWorker('],['oauth-api','extension/cloudflare-api.js','async function request('],['oauth-refresh','extension/cloudflare-api.js','async function auth('],['private-preview','extension/cloudflare-api.js','async function preview('],['chrome-download','extension/cloudflare-api.js','async function download('],['public-addresses','extension/public-addresses.js','function disclosure('],['url-popover','extension/public-addresses.js','function popover('],['operation-status','extension/explorer-status.js','function paint('],['collector','extension/explorer-diagnostics.js','function create('],['bridge','extension/explorer-diagnostics-bridge.js','function install(']];
model.components=significant.map(([id,path,symbol])=>({id,ref:{path,symbol},evidence:'source-anchor; not runtime proof'}));
model.edges=model.operations.flatMap(op=>[{from:'operation:'+op.name,to:op.entryPoint,evidence:'source-anchor',sourceRefs:op.sourceRefs},...(['copy','move','rename'].includes(op.name)?['context-menu','destination-menu','key-validation','worker-transport','worker-transfer','worker-verify','worker-binding'].map(to=>({from:'operation:'+op.name,to,evidence:'source-confirmed control-flow; actual invocation requires trace'})):[])]);
model.coveragePolicy={fullyCorrelated:'One message root through retained Background/Worker protocol1 stages and its UI reply; descendants returned if retained',partial:'UI gesture wrappers do not invent async parentage across await; direct OAuth and Chrome boundaries have separate correlated operations',opaque:['Provider-level R2 binding settings','Uninstrumented deployed Worker5 internal steps','Native Chrome download internals','OAuth refresh cross-context span causality','Real upload server write progress','Live cloud content hashes'],architectureAuthority:'implementation observation; no Forever authority'};
const refs=[...model.operations.flatMap(op=>op.sourceRefs),...model.dom.map(v=>v.ref),...model.stateOwners.map(v=>v.ref),...model.stateTransitions.map(v=>v.ref),...model.components.map(v=>v.ref)];
for(const ref of refs){if(!/^extension\/[a-z0-9.-]+$/.test(ref.path))throw Error('UNSAFE_MODEL_REFERENCE');const source=await readFile(ref.path,'utf8'),index=source.indexOf(ref.symbol);ref.line=index<0?null:source.slice(0,index).split('\n').length;ref.sha256=createHash('sha256').update(source).digest('hex');ref.evidence=index<0?'unresolved-symbol':'source-anchor';if(index<0)findings.push({path:ref.path,symbol:ref.symbol});}
model.sourceRevision='per-file SHA256 current snapshot; historical source baseline d7953fd; no installed/deployed equivalence asserted';
if(process.argv.includes('--write'))await writeFile(path,JSON.stringify(model,null,2)+'\n');console.log(JSON.stringify({model:path,unresolved:findings,written:process.argv.includes('--write')}));

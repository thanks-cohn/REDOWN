"""Rebuild current-state preservation records. Does not edit production or historical maps."""
import json, hashlib, re, subprocess, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FW=ROOT/'FOREVER_WORKS'
BASE='424f29e5a4216085fa24ffd1a48b79f4123d6f8f'
UP='f76056aa59942935cad5ab53f26a78cefedff77d'
def read(p):return json.loads((ROOT/p).read_text())
def put(p,v):
 p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
def digest(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def sid(x):return re.sub('[^a-z0-9._-]+','-',x.lower()).strip('-')
def ref(p,symbol=None):
 d={'path':p,'revision':BASE,'sha256':digest(p)}
 if symbol:
  text=(ROOT/p).read_text();at=text.find(symbol);d.update(symbol=symbol,anchorState='present' if at>=0 else 'missing',line=text[:at].count('\n')+1 if at>=0 else None)
 return d
records=[]
def add(kind,id,fields,ext=None,refs=None,source='inferred'):
 r={'foreverVersion':'0.1','id':id,'kind':kind,'provenance':{'sourceType':source,'sourceReference':'REDOWN@'+BASE,'reviewStatus':'unreviewed','confidence':0},**fields,'extensions':{'org.redown':{'sourceRefs':refs or [],'evidenceScope':'offline source/local fixtures; installed Chrome and live provider unverified','confidenceMeaning':'0 is a conservative required-field value, not measured probability',**(ext or {})}}}
 records.append(r);return r
baseline=read('FOREVER_WORKS/verification/baseline-reliability.json')
events=[json.loads(x) for x in (FW/'verification/test-events.jsonl').read_text().splitlines() if x]
testfiles={}
for e in events:
 p=e.get('file')
 if p:testfiles.setdefault(p,[]).append(e)
for p,es in sorted(testfiles.items()):
 add('evidence','redown.evidence.test.'+sid(Path(p).stem),{'type':'local-test-execution','source':'FOREVER_WORKS/verification/test-events.jsonl','statementSupported':'Only the named local fixtures in '+p+' executed with the outcomes retained below; not a provider/browser pass.','confidence':0,'immutableReference':digest('FOREVER_WORKS/verification/test-events.jsonl'),'timestampVersion':baseline['startedAt']},{'outcomes':es,'passed':sum(e['type']=='pass' for e in es),'failed':sum(e['type']=='fail' for e in es)},[ref(p)],'explicit')
# Explicit authored observation policy; current-state ingestion does not invent future capabilities.
add('intent','redown.intent.preservation',{'name':'Preserve current REDOWN behavior and known defects','statement':'Capture what currently works and what does not, grounded in source and local tests.','purpose':['Allow an unfamiliar maintainer to locate current behavior, preserve working features and investigate known bugs.'],'priorities':['Current source and executable evidence','Honest failure and uncertainty records','Preserve user experience and data boundaries'],'nonGoals':['Treating future proposals as implemented capabilities','Production redesign or cloud mutation'],'status':'current-state-observation'},source='explicit')
features=[
('authentication','Cloudflare login and session recovery','PKCE login, shared token lock and error-specific renewal; refresh-token issuance remains provider/client dependent.',['extension/cloudflare-auth.js','extension/cloudflare-api.js'],['startCloudflareLogin','request'],['cloudflare-login','cloudflare-session','cloudflare-reconnect'],['docs/SESSION_AND_DRAG_RECOVERY_REPORT.md'],['No perpetual-session guarantee; offline_access was rejected by registered client.']),
('destinations','Simple and Nested right-click routing','Build native Chrome menus from saved per-bucket destinations without changing cloud data during menu editing.',['extension/background.js','extension/nested-locations.js','extension/nested-menu-editor.js'],['buildMenus','destinations','render'],['simple-menu-flat','simple-location-rows','nested-locations','menu-reorder'],['docs/SIMPLE_MENU_CANONICAL_SPEC_AND_STATUS.md'],['Removed drag-handle expectation fails; missing destination report remains unclosed.']),
('remote-ingest','Remote URL to R2','Send selected HTTPS sources to the configured per-bucket Worker and validate the returned destination folder.',['extension/background.js'],['ingestCloudflareAtPrefix'],['download-collisions','popup-destinations'],['bugs/fixes/BUG-020-popup-exact-folder-attempt-01.md'],['Unknown-length source buffering and ambiguous network completion must not be described as durable resume.']),
('local-upload','Upload local files','Preflight exact keys, skip existing objects, reject unknown preflight, PUT through OAuth management API and check response size when supplied.',['extension/options.js','extension/cloudflare-api.js'],['uploadLocalFiles','request'],['upload-location-builder','upload-request-context','cloudflare-files'],['docs/debug/DBG-004_LOCAL_UPLOAD_FETCH_FAILURE.md'],['Non-atomic absent-check/PUT race; File references and queue die with settings page.']),
('worker-provision','Per-bucket Worker provisioning','Deploy embedded WORKER_SOURCE with STORAGE and retain profile credentials; preparation can mutate remote configuration.',['extension/background.js'],['deployCloudflareProfile'],['storage-worker-health','options-debug-display'],['docs/R2_GUIDED_SETUP_VERIFICATION.md'],['Do not invoke preparation as a diagnostic read.']),
('gallery','Gallery capture and remote transfer','Capture supported site URLs in browser and route through existing gallery transfer paths.',['extension/hitomi-capture.js','extension/background.js'],['',''],[],['docs/HITOMI_CAPTURE_ACCEPTANCE.md','docs/debug/DBG-005_HITOMI_CONTEXT_CAPTURE_REGRESSION.md'],['No fresh site/browser acceptance; saved HTML and failing Remote-to-Remote are historical reported cases.']),
('rfis','Opt-in file observations','Record IndexedDB file/event observations and export a partial index; locator is not durable content identity.',['extension/rfis-index.js'],['observe'],[],['docs/proposals/RFIS_PERSISTENT_FILE_IDENTITY_HISTORY.md'],['Proposal is context only; no import, complete archive or cross-move identity is claimed.']),
('github-dispatch','Experimental GitHub workflow dispatch','Ensure workflow and dispatch Actions for configured GitHub profiles; accepted dispatch is not delivered-file proof.',['extension/background.js','github/remote-ingest.yml'],['ingestGitHub',''],['beta-popup'],['docs/STORAGE_SIGNALS_BETA_REPORT.md'],['Beta gates setup choices; no fresh executed Actions proof.']),
('local-bridge','Local forwarding helper','Loopback HTTP POST /ingest forwards to configured remote ingest URL using helper credential.',['local/bridge.mjs'],['http.createServer'],[],['windows/README.md'],['Origin prefix check is not extension-ID pairing; current popup bypasses bridge; missing Windows native source.']),
('sample-worker','Separate ASSETS Worker sample','GET /health and authenticated POST /ingest write to ASSETS; separate from extension runtime.',['worker/src/index.js','wrangler.toml'],['async fetch',''],[],[],['Sample health is not extension readiness; local runtime compatibility requires separate verification.']),
('diagnostics','Unified offline diagnostic inspection','Route registered qualified read operations across existing project/debug/semantic/runtime/explorer knowledge owners.',['agent/diagnostics/api.mjs','agent/diagnostics/registry.json'],['createDiagnosticAPI',''],['agent-gateway','diagnostic-foundation','issue-inventory'],['docs/reliability/UNIFIED_AGENT_API.md'],['Stale evidence and imported bundles cannot certify live health.']),
('runtime-observation','Passive runtime observation','Bound and redact Debug traces and expose imported offline runtime records.',['extension/runtime-diagnostics.js','agent/runtime/api.mjs'],['',''],['runtime-reliability'],['docs/runtime/READINESS.md'],['No complete durable job journal or cross-context live observer.']),
('toolbar-feedback','Temporary success/failure icon effect','Tint current silhouette with palette hits and fading tail then restore original icon/title; notifications off by default.',['extension/background.js'],[''],['toolbar-feedback','notification-preference'],['docs/NOTIFICATIONS_AND_TOOLBAR_STATUS.md'],['Installed Chrome color/animation acceptance remains unknown.']),
('delivery-counter','Delivery counter and dashboard launcher','Persist qualifying delivery counts, display mechanical odometer and land dashboard navigation at intended Explorer position.',['extension/transfer-counter.js','extension/odometer.js','extension/popup.js'],['','',''],['transfer-counter','odometer','popup-destinations'],['docs/popup/DASHBOARD_LAUNCHER.md'],['Count semantics are scoped to instrumented completion; no global independent file integrity proof.']),
('storage-ui','Storage signals, Debug and Beta','Maintain independent mode gates, contained bucket expansion, keyboard access and reduced-motion handling; simulation is Debug-only.',['extension/storage-signals.js','extension/options.js'],['','applyBetaMode'],['storage-signals','options-debug-display','beta-popup'],['docs/STORAGE_SIGNALS_BETA_REPORT.md','docs/STORAGE_POPOUT_PERFORMANCE_REPORT.md'],['Use latest source over superseded animation/visibility reports; mock layout is not installed layout.']),
('packaging','Check and package extension','Use explicit syntax targets, regression policy and package allowlist to audit shipped extension.',['scripts/package_chrome_store.py','scripts/reliability-check.mjs','.github/workflows/ci.yml'],['','',''],['syntax-portability'],['docs/runtime/READINESS.md'],['License mismatch blocks normal release; current baseline fails reliability; Windows/native/live acceptance not established.'])]
ops=read('agent/explorer/model.json')['operations']
for op in ops:
 refs=op['sourceRefs'];paths=list(dict.fromkeys(x['path'] for x in refs));symbols=[next(x.get('symbol','') for x in refs if x['path']==p) for p in paths]
 features.append(('explorer.'+op['name'],'Explorer '+op['name'],op.get('pathway') or 'Existing Explorer '+op['name']+' operation.',paths,symbols,[Path(p).name.replace('.test.mjs','') for p in op.get('tests',[])],['docs/explorer/HANDOFF.md','docs/explorer/GET_URL_AND_STATUS.md'],['Original Explorer map may be stale; current anchors are recomputed here without rewriting it.']))
capids=[];statusrows=[]
for key,name,purpose,paths,symbols,tests,docs,limits in features:
 cap='redown.capability.'+key;imp='redown.implementation.'+key;inv='redown.invariant.'+key;capids.append(cap)
 refs=[ref(p,s if i<len(symbols) else None) for i,(p,s) in enumerate(zip(paths,symbols))]
 testpaths=sorted(set('tests/'+t+'.test.mjs' for t in tests if (ROOT/('tests/'+t+'.test.mjs')).exists()))
 evidence=['redown.evidence.test.'+sid(Path(p).stem) for p in testpaths if p in testfiles]
 failed=[e for p in testpaths for e in testfiles.get(p,[]) if e['type']=='fail']
 passed=sum(e['type']=='pass' for p in testpaths for e in testfiles.get(p,[]))
 state='local-tests-with-failures' if failed else 'local-fixtures-pass' if evidence else 'source-present-unverified'
 ext={'implementationState':'source-present','verificationState':state,'installedBrowser':'unknown','liveProvider':'unknown','testEvidence':evidence,'knownLimits':limits,'relatedTestFiles':testpaths,'documentation':docs,'purposeAuthority':'inferred from existing behavior; not owner acceptance of a new feature'}
 add('capability',cap,{'name':name,'statement':purpose,'status':'implemented-with-unverified-boundaries','relatedImplementations':[imp],'relatedInvariants':[inv],'verification':[{'type':'unit-test','expected':'Named local fixtures pass; no installed/provider claim.','evidence':evidence}] if evidence else []},ext,refs)
 add('implementation',imp,{'type':'existing-source-component','technology':'JavaScript/MV3/Node/Workers as located; replaceable implementation evidence','satisfiesCapabilities':[cap],'constrainedByInvariants':[inv],'sourceLocations':[p for p in paths],'replaceability':'Only after equivalent scoped boundary proof; current policy inferred, unreviewed.'},{'dependsOn':[],'boundaryNotes':limits},refs)
 add('invariant',inv,{'name':name+' preservation boundary','statement':purpose+' Preserve its existing external behavior while addressing defects; known limits remain explicit.','severity':'high','scope':[imp],'relatedCapabilities':[cap],'verification':[{'type':'unit-test','expected':'Retain applicable fixture behavior and explicitly add missing acceptance evidence.','evidence':evidence}] if evidence else []},{'knownLimits':limits,'authority':'Behavior-derived preservation candidate, not a claim of flawless operation.'},refs)
 statusrows.append({'id':cap,'name':name,'state':state,'localPassingEvents':passed,'localFailingEvents':len(failed),'tests':testpaths,'source':refs,'limits':limits,'evidence':evidence})
obligations={
'authentication':'Keep PKCE/state/exact callback and shared credential lock; distinguish permission denial, missing refresh token, invalid_grant and retryable renewal failure without discarding saved profiles.',
'local-upload':'Never write after unknown preflight, skip existing keys, retain uncertain-write reporting and page-lifetime queue limits; absent-check/PUT remains non-atomic.',
'remote-ingest':'Preserve the exact selected account/bucket/prefix; refuse unsupported exact-path Workers before writing; do not equate a returned URL with independently hashed object integrity.',
'explorer.copy':'Preserve exact keys, conditional destination conflict handling and read-back before copy completion; unknown cross-Worker outcome is not a successful copy.',
'explorer.move':'Retain originals when copy verification fails; check source and destination identity before deletion; partial delete results remain partial, not success.',
'explorer.public.urls':'Read-only discovery must not change visibility; whole-bucket enable action needs explicit confirmation and settings read-back; constructed addresses remain access-unverified.',
'destinations':'Preserve Simple/Nested configuration independently, explicit label precedence, exact destination and menu removal without remote deletion; do not silently erase user drafts.',
'diagnostics':'Preserve namespace/error/proof scopes, privacy and offline read-only behavior; unknown or stale evidence cannot be converted into healthy product state.',
'toolbar-feedback':'Notifications require opt-in; newer effects cancel older timers, tint fades back to exact original art/title and cosmetic failures cannot change transfer outcome.',
'delivery-counter':'Only instrumented qualifying completion increments delivery count; queued GitHub dispatch does not; sound remains opt-in and navigation arrival must remain controlled.',
'storage-ui':'Debug and Beta remain independent; practice never invokes real repair; preserve keyboard, focus, contained expansion and reduced-motion handling.'}
for key,statement in obligations.items():next(r for r in records if r['id']=='redown.invariant.'+key)['statement']=statement
records[ next(i for i,r in enumerate(records) if r['kind']=='intent')]['relatedCapabilities']=capids
# Existing dependency mechanisms and inferred replacement policy. No future providers are capabilities.
deps=[('chrome','Chrome extension APIs','platform','destinations','extension/manifest.json','SEMANTIC','contextMenus/storage/identity/webNavigation/alarms/downloads/scripting/notifications/action'),('cloudflare','Cloudflare OAuth and management API','service','authentication','extension/cloudflare-api.js','SEMANTIC','OAuth auth/token; client/v4 account, R2, Workers and domain operations'),('r2-worker','R2 Workers binding','service','explorer.copy','extension/background.js','CAPABILITY','STORAGE get/head/put/delete/list with exact-key and verified transfer semantics'),('github','GitHub Contents and Actions','service','github-dispatch','github/remote-ingest.yml','SEMANTIC','Contents installation and workflow dispatch; dispatch is not completion'),('node','Node.js offline helper and inspection','runtime','diagnostics','package.json','CAPABILITY','Local HTTP helper and read-only diagnostic tooling'),('jsdom','JSDOM test harness','library','packaging','package-lock.json','CAPABILITY','Local DOM simulation only'),('wrangler','Wrangler development tooling','tool','sample-worker','package-lock.json','CAPABILITY','Configured standalone Worker deployment; not called during ingestion'),('model-viewer','Bundled model-viewer','library','explorer.preview','extension/model-viewer.min.js','SEMANTIC','3D preview implementation; third-party internal bundle unaudited')]
for key,name,typ,feature,p,classification,boundary in deps:
 cap='redown.capability.'+feature;inv='redown.invariant.'+feature;imp='redown.implementation.dependency.'+key;did='redown.dependency.'+key
 add('implementation',imp,{'type':typ,'technology':name,'satisfiesCapabilities':[cap],'sourceLocations':[p]},refs=[ref(p)])
 add('dependency',did,{'dependencyName':name,'dependencyType':typ,'purpose':boundary,'reasonSelected':'Original selection rationale is not established; current use is observed in the cited source.','currentImplementation':imp,'requiredCapabilities':[cap],'protectedInvariants':[inv],'replacementClassification':classification,'historicalContext':'No original rationale invented. Classification is an unreviewed inference for evaluation, not accepted dependency policy.','replacementRequirements':['preserve-existing-boundary-'+key]},{'classificationAuthority':'inferred/unreviewed','alternativesStatus':'Not ingested as current dependencies; investigate only when replacement is requested.'},[ref(p)])
 next(r for r in records if r['id']=='redown.implementation.'+feature)['extensions']['org.redown']['dependsOn'].append(did)
# Add boundary contracts observed in existing execution paths, not future architecture proposals.
contracts=[
('worker-transfer','protocol','Embedded Worker safe-transfer protocol','Worker 5 safeTransfers and Worker 6 diagnostic protocol 1',['Exact account/bucket/key ownership','Conditional destination write and destination read-back','Source retained on failed or uncertain verification','Pre-delete source/destination identity checks; no claim of atomic multi-object move'],'explorer.copy'),
('diagnostic-gateway','API','Offline diagnostic gateway','1.2.0',['Qualified operations retain native namespace versions and evidence status','Read queries do not deploy, repair, clear records or mutate cloud','Imported runtime and Explorer bundles remain separate'],'diagnostics'),
('destination-state','save-format','Saved destination/profile state','baseline-specific chrome.storage.local',['Preserve configured Simple and Nested modes independently','Menu removal never deletes cloud objects','Account/bucket/prefix changes invalidate stale async continuations'],'destinations'),
('public-address','API','Configured public URL disclosure','baseline-specific',['Discovery does not enable public access','Enable managed URL requires exact sender and confirmed whole-bucket action','Configured URL does not establish object accessibility'],'explorer.public.urls')]
for key,typ,boundary,version,obligations,feature in contracts:
 cid='redown.compatibility.'+key
 add('compatibility',cid,{'contractType':typ,'boundary':boundary,'version':version,'mustPreserve':obligations,'mayChange':['Internal representation and implementation after scoped evidence of equivalent behavior.'],'migrationPolicy':'Non-destructive; retain old format/read contracts or document explicit migration and rollback.','validationReferences':next(r for r in records if r['id']=='redown.capability.'+feature)['extensions']['org.redown']['testEvidence']},{'authority':'inferred current boundary; not an accepted new architecture'})
 for r in records:
  if r['id'] in ['redown.implementation.'+feature,'redown.dependency.r2-worker' if key=='worker-transfer' else '']:
   r.setdefault('compatibilityContracts' if r['kind']=='implementation' else 'compatibilityObligations',[]).append(cid)
# Broaden the actual executor dependency to every mapped existing executor surface.
executor_features=['remote-ingest','explorer.copy','explorer.move','explorer.rename','explorer.delete','explorer.folder.create','explorer.archive']
dep=next(r for r in records if r['id']=='redown.dependency.r2-worker')
dep['requiredCapabilities']=['redown.capability.'+f for f in executor_features]
dep['protectedInvariants']=['redown.invariant.'+f for f in executor_features]
dep['replacementRequirements']=['r2.exact-destination','r2.verified-copy-before-delete','r2.conflicts-and-directory-identity','r2.truthful-partial-and-uncertain-outcomes','r2.protocol-compatibility-and-private-diagnostics']
dep['extensions']['org.redown']['replacementCriteria']={
'r2.exact-destination':'Preserve exact account, bucket and object keys for remote ingest and Explorer; unsupported exact-path Workers refuse before writing.',
'r2.verified-copy-before-delete':'Conditional write plus read-back precedes copy completion; source/destination checks precede deletion; no deletion on failed verification.',
'r2.conflicts-and-directory-identity':'Retain skip/Keep both and directory sibling identity without merging original destination content; honor documented conflict retries.',
'r2.truthful-partial-and-uncertain-outcomes':'Per-item receipts, partial moves, timeouts and uncertain writes must not be aggregated into false success or automatically replayed.',
'r2.protocol-compatibility-and-private-diagnostics':'Preserve existing message/protocol compatibility and bounded redacted observations; optional protocol1 is not permission to deploy.'}
dep['extensions']['org.redown']['sourceRefs']=[ref('extension/background.js','const WORKER_SOURCE ='),ref('extension/background.js','async function transferExplorerObjects(')]
for r in records:
 if r['id']=='redown.implementation.dependency.r2-worker':r['satisfiesCapabilities']=dep['requiredCapabilities'];r['constrainedByInvariants']=dep['protectedInvariants'];r['compatibilityContracts']=['redown.compatibility.worker-transfer']
 if r['kind']=='compatibility':
  feature=next(x[5] for x in contracts if r['id']=='redown.compatibility.'+x[0])
  r['extensions']['org.redown']['sourceRefs']=next(x for x in records if x['id']=='redown.capability.'+feature)['extensions']['org.redown']['sourceRefs']
# Issue relationships are triage leads, never a claim of shared cause.
issue_links={'BUG-018':['explorer.copy','explorer.move','explorer.clipboard'],'BUG-019':['explorer.copy','explorer.move'],'BUG-020':['remote-ingest'],'BUG-021':['remote-ingest','delivery-counter'],'DBG-001':['destinations'],'DBG-002':['destinations'],'DBG-003':['local-upload'],'CODE-UPLOAD-CONCURRENT-CREATE':['local-upload'],'EXPLORER-COPY-404-2026-10':['explorer.copy','explorer.move']}
# Current issue projection: existing gateway remains the source of lifecycle/assessment truth.
issues=read('FOREVER_WORKS/verification/issues.json')['data']['issues']
for issue in issues:
 p=issue.get('source',{}).get('path');refs=[ref(p)] if p and (ROOT/p).is_file() else []
 issue_record=add('evidence','redown.evidence.issue.'+sid(issue['id']),{'type':'current-gateway-issue-snapshot','source':p or 'FOREVER_WORKS/verification/issues.json','statementSupported':issue['title']+'; recorded status and current assessment are separate; no live closure asserted.','confidence':0,'timestampVersion':BASE,'immutableReference':digest('FOREVER_WORKS/verification/issues.json')},{'issueId':issue['id'],'issue':issue,'observationState':'recorded-issue-not-automatically-active-defect','affectedCapabilities':['redown.capability.'+x for x in issue_links.get(issue['id'],[])],'relationshipMeaning':'investigation lead; not established shared cause'},refs,'imported')
 for cap in issue_record['extensions']['org.redown']['affectedCapabilities']:
  target=next(r for r in records if r['id']==cap)
  target['extensions']['org.redown'].setdefault('relatedIssues',[]).append(issue_record['id'])
# Direct source API census uses regex observations, not an invented full parser.
api=[]
for p in ['extension/background.js','extension/options.js','extension/cloudflare-auth.js','extension/cloudflare-api.js','local/bridge.mjs','worker/src/index.js']:
 text=(ROOT/p).read_text()
 patterns=[('message-handler',r'message\?\.type\s*===\s*[\"\']([^\"\']+)[\"\']'),('worker-action',r'body\.action\s*===\s*[\"\']([^\"\']+)[\"\']'),('storage-access',r'chrome\.storage\.(local|session)\.(get|set|remove)'),('http-route',r'(?:requestUrl|url)\.pathname\s*===\s*[\"\']([^\"\']+)[\"\']')]
 for typ,pattern in patterns:
  for m in re.finditer(pattern,text):api.append({'type':typ,'value':m.group(1),'source':ref(p,m.group(0)),'coverage':'literal observation only; caller/auth/side effects require traced review'})
put('FOREVER_WORKS/api-census.json',{'scope':'Literal message/action/route/storage-call inventory, not a complete parser or API contract','items':api,'explorerOperations':ops})
put('FOREVER_WORKS/current-state.json',{'baseline':BASE,'policy':'Current source and fresh fixture outcomes; no proposal establishes implementation or passing behavior.','features':statusrows,'issuesSnapshot':'verification/issues.json','regression':baseline['regression'],'stages':[{k:x[k] for k in ['id','state','exitCode']} for x in baseline['stages']]})
# Census every tracked artifact by hash and evidence role. Does not export secrets/private stores.
files=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines()
inv=[]
for p in files:
 if p=='.env' or p.startswith('.env.') or any(x in p.lower() for x in ['credential','secret']):continue
 role='source'
 if p.startswith(('docs/proposals/','docs/PROPOSALS/','COMP/')) or 'REQUEST' in p or 'PROPOSAL' in p:role='background-not-implementation-proof'
 elif p.startswith(('tests/','schemas/','contracts/')):role='test-or-contract'
 elif p.startswith(('docs/','bugs/','debug/')):role='recorded-document-or-evidence'
 inv.append({'path':p,'sha256':hashlib.sha256(subprocess.check_output(['git','show',BASE+':'+p],cwd=ROOT)).hexdigest(),'role':role,'behaviorReviewed':any(p==r['path'] for s in statusrows for r in s['source'])})
put('FOREVER_WORKS/inventory.json',{'revision':BASE,'exclusions':['.env and templates','paths containing credential or secret','untracked/ignored files and runtime stores'],'files':inv,'meaning':'Hashed inventory is addressability, not behavioral completeness.'})
next(r for r in records if r['id']=='redown.intent.preservation')['provenance']['sourceReference']='FOREVER_WORKS/POLICY.md: owner current-state instruction, 23 October 2026'
# Canonical schema and record inventory.
categories={'intent':'intent','capability':'capabilities','invariant':'invariants','dependency':'dependencies','implementation':'implementations','evidence':'evidence','decision':'decisions','compatibility':'compatibility','constraint':'constraints','migration':'migrations'}
manifest={'foreverVersion':'0.1','projectId':'redown','records':{},'extensions':{'org.redown':{'baseline':BASE,'upstream':UP,'statePolicy':'observations of currently implemented behavior and known bugs; no accepted inferred purpose','domainIndex':'FOREVER_WORKS/current-state.json'}}}
for r in records:
 path=categories[r['kind']]+'/'+r['id']+'.json';manifest['records'].setdefault(categories[r['kind']],[]).append(path);put('forever/'+path,r)
for paths in manifest['records'].values():paths.sort()
put('forever/manifest.json',manifest)
up=FW/'upstream/forever-works'
put('FOREVER_WORKS/upstream/forever-works/UPSTREAM.json',{'repository':'thanks-cohn/forever-works','commit':UP,'license':'MIT','files':{str(p.relative_to(up)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(up.rglob('*')) if p.is_file() and p.name!='UPSTREAM.json'},'relationToLegacy':'New isolated reference snapshot. agent/semantic/vendor remains unchanged.'})
print(json.dumps({'records':len(records),'features':len(features),'issues':len(issues),'literalInterfaces':len(api),'inventory':len(inv)}))

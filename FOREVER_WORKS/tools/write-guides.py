"""Render navigation from observed records; never changes runtime or frozen evidence."""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[2];D=R/'FOREVER_WORKS'
s=json.loads((D/'current-state.json').read_text());issues=json.loads((D/'verification/issues.json').read_text())['data']['issues']
def write(name,text):(D/name).write_text(text.rstrip()+'\n')
write('POLICY.md','''# Current-state preservation policy

Owner instruction, 23 October 2026: “capture what is currently workign and bugs, dont really depend on proposals , we capture what works and what doesnt”.

This corpus captures existing source and fresh local fixture evidence at checkpoint 424f29e5a4216085fa24ffd1a48b79f4123d6f8f. Future proposals are background only. A schema-valid capability describes located implementation, not proof that every real user journey succeeds. Inferred purposes and replacement policies remain unreviewed; this is distinct from claiming a future feature is proposed.

Working locally means the named fixtures passed. Source-present means code exists but was not exercised here. Reported/fixed historically and currently reproduced are separate states. Unknown browser/cloud behavior remains unknown. Do not erase known failures, refresh frozen historical hashes or infer live incident closure.
''')
write('README.md','''# REDOWN current-state Forever Works corpus

Start with [CURRENT_STATE.md](CURRENT_STATE.md), [FAILURE_ATLAS.md](FAILURE_ATLAS.md) and [COLD_AGENT_START_HERE.md](COLD_AGENT_START_HERE.md). This is the first current-state ingestion, not a release certificate or complete call graph.

The historical checkpoint is `checkpoint/2026-10-23-forever-works-ingestion-foundation`, annotated tag object `f75107b6082842c56d1e2f9362399734a28b3dc1`, peeled commit `424f29e5a4216085fa24ffd1a48b79f4123d6f8f`. Its tag and production files are unchanged. The extension is 0.5.26. The canonical model is [../forever/manifest.json](../forever/manifest.json).

Model/schema 0.1 and Public API 0.1 are pinned to Forever Works `f76056aa59942935cad5ab53f26a78cefedff77d`. Unmodified MIT reference sources/schemas and exact hashes are in [upstream/forever-works/UPSTREAM.json](upstream/forever-works/UPSTREAM.json). REDOWN's old vendored pin under agent/semantic remains unchanged; its historical schema blocker is retained. The new corpus validates against the corrected current schemas independently.

From repository root, no credentials or npm install are needed for the model reader:

```sh
node FOREVER_WORKS/tools/query.mjs help
node FOREVER_WORKS/tools/query.mjs describe
node FOREVER_WORKS/tools/query.mjs validateModel
node FOREVER_WORKS/tools/query.mjs currentState
node FOREVER_WORKS/tools/query.mjs issues
node FOREVER_WORKS/tools/query.mjs getEntity redown.capability.explorer.copy
node FOREVER_WORKS/tools/query.mjs traceEntity redown.capability.explorer.copy
node FOREVER_WORKS/tools/query.mjs explainDependency redown.dependency.r2-worker
node FOREVER_WORKS/tools/query.mjs evaluateReplacement redown.dependency.r2-worker redown.implementation.dependency.r2-worker
node FOREVER_WORKS/tools/check-preservation.mjs
```

Run `help` to discover both the canonical operations and separately named documentation conveniences. The adapter delegates advertised public operations to the actual upstream implementation. `currentState` and `issues` are REDOWN documentation conveniences and are not advertised as Forever API operations. Canonical trace traverses normative references; domain issue/dependency links under extensions.org.redown are returned by getEntity and independently validated, not silently claimed to be native trace semantics.

Run independent published-schema/source checks using Python with `FOREVER_WORKS/tools/requirements.txt` installed:

```sh
python3 FOREVER_WORKS/tools/validate.py
```

[POLICY.md](POLICY.md) records the owner's current-state instruction. [TRACEABILITY.md](TRACEABILITY.md) explains authority and link semantics. [GAPS_AND_MIGRATION.md](GAPS_AND_MIGRATION.md) lists coverage limits. [RECONSTRUCTION.md](RECONSTRUCTION.md) records what can and cannot be recovered.
''')
rows=['# Current behavior and local verification','','Baseline: `'+s['baseline']+'`. Tests run Linux / Node 24.19.0. No installed extension or live provider tests were performed.','','**Fresh full regression: 365 pass, 10 fail, 0 skipped.** Seven match recorded historical debt; three additional baseline failures are listed in FAILURE_ATLAS.md. Syntax, gateway registry and issue inventory stages pass; Explorer architecture freshness fails. All existed before ingestion.','','State labels describe only referenced local fixtures; tests can cover only part of a feature. The same test file can support multiple features, so do not sum rows. “Source present” alone is not working proof.','','| Existing surface | Local fixture result | Source | Remaining boundary |','|---|---|---|---|']
for f in s['features']:
 src=', '.join('['+Path(x['path']).name+'](../'+x['path']+')' for x in f['source'])
 rows.append('| '+f['name']+' | '+f['state']+f" ({f['localPassingEvents']} pass / {f['localFailingEvents']} fail events) | "+src+' | '+' '.join(f['limits']).replace('|','/')+' |')
rows+=['','Exact events: [verification/test-events.jsonl](verification/test-events.jsonl). Reliability stages and baseline fingerprints: [verification/baseline-reliability.json](verification/baseline-reliability.json). Raw local scope is retained. The baseline source hash from that report does not include new preservation files.']
write('CURRENT_STATE.md','\n'.join(rows))
rows=['# Failure atlas','','This is a projection and navigation aid. The existing gateway remains the issue lifecycle authority. Its 66 records include historical reports, release gates and baseline assertions; they are not 66 independently reproduced active bugs. Preserve recordedStatus versus current assessment and stale-review findings.','','## Fresh baseline failures','','Three failures outside the seven recorded names were observed before ingestion:','']
for f in s['regression']['newFailures']:rows.append('- `'+f['file']+'` — '+f['name']+' (`'+f['error']['name']+'`).')
rows+=['','Details: [verification/baseline-failure-details.log](verification/baseline-failure-details.log). The first failure reports stale current Explorer source anchors; the issue-inventory failure concerns a stale assessment, and provisioning fixture failure needs its own harness/source investigation. These are failure observations, not three verified customer defects or established causal fixes.','','Seven recorded failures remain under agent/diagnostics/regression-baseline.json. Full retained results: verification/baseline-reliability.json. Explorer smoke also fails at the architecture assertion; see explorer-smoke.log. Do not call the smoke suite green.','','## Investigation routes','','| Symptom | Start and next distinction | Proof still needed |','|---|---|---|','| Preview/Download work, Copy/Move/Paste HTTP404 | docs/explorer/HANDOFF.md; options.js pasteExplorer → background.js transferExplorerObjects → destination Worker transferBatch → source /object; compare exact-key/account/bucket/Worker identities | Installed/deployed version and authorized provider binding; one successful path does not prove another |','| Both menus say Files, destination missing | buildMenus and saved profiles → label precedence, inclusion flags, sanitized IDs, serialized rebuild; inspect BUG-002/DBG-002 and current issue assessment separately | Current installed menu reproduction; label fix does not close omitted item |','| Login then 403 | cloudflare-api.js authenticationRejected/auth/request; cloudflare-auth.js current allowed scopes | Ordinary permission denial versus explicit token rejection; actual client refresh grant; do not add rejected offline_access |','| Local file upload fails or may overwrite concurrently | options.js inspectLocalUploadObject/uploadLocalFiles | Absent-check/PUT atomicity; uncertain write versus safe retry; fixture size check is not content hash |','| Keep both directory merges | BUG-019 and bugs/fixes/BUG-019-directory-keep-both-attempt-01.md; folderTargets and conflict identity | Existing destination hashes and installed acceptance; preserve source and sibling directory identity |','| Public URL shown but unreachable | public-addresses.js; cfPublicAddresses versus confirmed cfEnablePublicAccess | Configured versus enabled versus independently accessible object; no automatic public-access mutation |','','## Existing issue snapshot','','| ID | Recorded status | Current evidence/assessment |','|---|---|---|']
for i in issues:
 a=i.get('assessment',{});rows.append('| '+i['id']+' | '+str(i.get('recordedStatus','unknown')).replace('|','/')+' | '+i.get('state','unknown')+' / '+str(a.get('status','unreviewed'))+' |')
rows+=['','Full original fields and next actions: [verification/issues.json](verification/issues.json). Source issue JSON is also preserved in canonical evidence records; do not edit it there to close an incident. Re-query the gateway and intentionally rebuild the snapshot after source review.']
write('FAILURE_ATLAS.md','\n'.join(rows))
write('ARCHITECTURE.md','''# Existing execution boundaries

- MV3 manifest loads background.js as service worker, popup.html/js as launcher and options.html/js as settings/Explorer. Inspect actual HTML script order and manifest permissions.
- Native context menus use saved profiles, Simple/Nested modes and background.buildMenus. Editor removal removes local configuration, not cloud data.
- cloudflare-auth.js owns PKCE login/callback/token storage. cloudflare-api.js owns shared OAuth request timeout/refresh and session lock. Credential expiry comes from provider expires_in; actual refresh issuance is unknown for the client.
- **Primary per-bucket Worker is WORKER_SOURCE embedded in extension/background.js**, deployed by deployCloudflareProfile, R2 binding STORAGE. It handles remote ingest, object reads and transfer/verification operations. Worker 6 includes optional protocol 1 diagnostics; safe Worker 5 remains a supported boundary. Deployed equivalence is unknown.
- **worker/src/index.js is a separate ASSETS sample** with /health and /ingest, configured by wrangler.toml. Sample health does not establish extension readiness.
- Local uploads run in options.js and use OAuth management object PUTs through cloudflare-api.js. The queue contains page-lifetime File references. Absent preflight and PUT are not atomic.
- Preview/download use direct authenticated object API and explicitly guarded public fallback. Cross-bucket copy uses destination Worker → source Worker /object, so OAuth-read success cannot clear Copy404.
- GitHub path installs/dispatches workflow through Contents/Actions; queued is not file committed. Beta hides experimental setup choices, not all historical runtime profiles.
- local/bridge.mjs is optional localhost HTTP forwarding; it is not the current popup's execution route or a shipping native companion. windows/src/main.c is absent despite CMake reference.
- Offline project/debug/semantic/runtime/explorer namespaces are coordinated by agent/diagnostics/registry.json. This corpus is a canonical preservation projection, not another runtime collector or issue owner.

Detailed source/digests: current-state.json. Literal interface inventory: api-census.json. The old Explorer model is retained with stale findings; new refs here were freshly located without changing it. No complete dynamic call graph is claimed.
''')
write('API_CENSUS.md','''# Existing API census

api-census.json contains 128 literal message/action/route/storage-call observations plus the existing 24 Explorer operation contracts. Every observed location has baseline revision, SHA-256 and symbol/line. This is a lexical inventory, not a complete parser: dynamic paths, caller identity, arguments, idempotency and side effects require the linked source review. Missing details stay unknown rather than invented API guarantees.

| Boundary | Actual mechanism | Important distinction |
|---|---|---|
| Cloudflare auth | dash.cloudflare.com/oauth2/auth and /oauth2/token, PKCE/state, shared lock | Successful grant does not guarantee refresh-token issuance |
| Management | api.cloudflare.com/client/v4 through cloudflare-api.request | Permission 403 differs from token rejection; exact per-segment object keys |
| Worker | Embedded source POST action dispatcher, /object, /private/object, /private/archive-entry, /assets/ | Worker protocol and R2 binding are separate from OAuth object reads |
| Sample | worker/src/index.js GET /health, POST /ingest | ASSETS rather than STORAGE |
| Helper | 127.0.0.1, LOCAL_PORT or 8765, POST /ingest | Origin-prefix check, not extension-ID pairing; credentials remain helper-side |
| GitHub | Contents workflow installation, Actions workflow dispatch | Queue acknowledgement, not completed delivery |
| Native Chrome | Manifest permissions plus action icon API | UI/API mock success is not installed permission/clipboard/download acceptance |
| Offline inspection | agent/diagnostics/cli.mjs qualified namespaces | No cloud connection or mutation authority |

Use docs/agent/MESSAGE_INVENTORY.md and agent/explorer/model.json as historical/current navigators, then verify source anchors. Do not invoke cfPrepareBucket/Repair for an apparent read. cfPublicAddresses is discovery; cfEnablePublicAccess is a distinct confirmed mutation. Explicit read-only probes still require their actual caller/scope rules and are not executed by offline CLI.
''')
write('PURPOSES_AND_OBLIGATIONS.md','''# Current behavior preservation obligations

Each capability maps to an implementation, inferred preservation invariant, applicable local test evidence and fresh source refs. These observations do not depend on future proposals. Inferred obligations remain unreviewed because inferring purpose from code is different from explicit owner acceptance.

Preserve: exact selected destination; explicit uncertainty and partial completion; source retention when copy verification fails; conditional conflict handling and destination read-back; no automatic replay of ambiguous writes; saved mode/draft/focus behavior; private bounded diagnostics and native code scopes; quiet defaults; temporary toolbar effect restoring original art; delivery count tied to qualifying completions; current aesthetic states, keyboard and reduced motion; separate Debug/Beta gates.

Current implementation is evidence, not the permanent architecture. A replacement can differ internally, but cannot pass solely by being newer or by matching a manifest. Existing tests are partial proof; the current protected boundary, compatibility records, runtime limits and historical failure evidence must be checked. No bounded-memory, durable-resume, global deduplication or general multi-cloud guarantee is invented.

Canonical invariants are behavior-derived candidates. They do not claim the implementation already meets every obligation in all environments. No new feature entitlement or accepted dependency classification is established.
''')
write('TRACEABILITY.md','''# Source-to-purpose relationships

Canonical graph: intent.relatedCapabilities → capability.relatedImplementations / relatedInvariants → implementation.satisfiesCapabilities / constrainedByInvariants → invariant.verification.evidence. Dependencies name currentImplementation, requiredCapabilities, protectedInvariants and compatibilityObligations. Upstream trace computes both directions from those normative references.

Source locations are replaceable evidence, not entity identity. extensions.org.redown.sourceRefs stores path, exact baseline, SHA-256, symbol and recomputed line. Test evidence stores named local execution events and source hash, not an inferred feature-wide pass. Current-state.json is a feature index generated from the same build inputs.

Domain links testEvidence/dependsOn/relatedIssues/affectedCapabilities are exact record IDs under extensions.org.redown and checked by tools/validate.py. relatedIssues/affectedCapabilities are investigation leads, not established causal edges. They are not included automatically by the upstream normative trace operation. getEntity exposes them; follow explicit IDs. Source-adjacent failures and tests can overlap without proving common cause.

The original semantic graph and diagnostic catalog remain unchanged and may report stale hashes. Their unreviewed entities were not blindly promoted. New canonical IDs use redown.capability.*, redown.implementation.*, redown.invariant.*, redown.dependency.* and redown.evidence.*; old semantic entity meanings are not silently redirected.

To rebuild intentionally: rerun the documented observations/test-events first, review source purpose/limits in tools/build.py, run python3 FOREVER_WORKS/tools/build.py, then tools/write-guides.py and both validators. Build reads saved local test evidence; it never runs or fabricates fresh tests. Never rebuild solely to clear a stale historical assertion. New results need a new observation boundary; baseline constants must be reviewed, not silently advanced.
''')
write('STATES_AND_EVENTS.md','''# Existing states and recovery boundaries

| Context | Actual distinctions | Persistence/recovery limit |
|---|---|---|
| OAuth | opening/verifying, completed, expired attempt, reconnectRequired, transient renewal failure | Attempt expiry differs from access-token expiry; shared lock/session guards; actual refresh grant unknown |
| Local upload | preflight yes/no/unknown, skipped, queued retry, PUT attempted, response checked, failed/uncertain | File queue lives in settings page; no restart recovery; cannot claim absent-check/PUT atomicity |
| Worker copy/move | source read, destination conflict/write, read-back, source/destination pre-delete checks, delete result, partial move | Pre-delete checks are not atomic multi-object transactions; timeout may mean write completed |
| Explorer status | pending/running neutral, completion green, failed red, mixed/partial amber, idle/cancel neutral | Ticket/generation guards prevent stale completions painting newer work |
| Download | request accepted, Chrome complete, interrupted, cancelled | Starting a download is not green completion; archive paths without terminal observer remain unconfirmed |
| Public URL | configured/disabled/pending/unknown; confirmed enable and settings read-back | Constructed/configured URL remains object-access-unverified |
| Diagnostics | available/partial/unavailable plus native namespace codes | Imported snapshots and HMAC identities cannot be joined across independent scopes by string equality |
| RFIS/history | capped transfer history and opt-in observations/export | No complete transactional transfer journal, durable content identity or complete archive guarantee |

Use extension/explorer-status.js, runtime-diagnostics.js, explorer-diagnostics.js, background.js and options.js at the cited revision for exact handlers. This is documentation of existing contexts, not a new universal job schema or state engine.
''')
write('PROVIDERS.md','''# Current dependencies and replacement limits

The canonical dependency list covers Chrome extension APIs, Cloudflare OAuth/management, R2 Worker binding, GitHub Contents/Actions, Node inspection/helper runtime, JSDOM tests, Wrangler and bundled model-viewer. classifications are explicitly inferred/unreviewed evaluation inputs; original selection rationale is unknown unless a source establishes it. Required capabilities, invariants and compatibility prevent a candidate from passing merely by satisfying a technology name.

No new provider or competitor API is ingested as working software. Multi-cloud, Google Drive/GCS, OneDrive, Dropbox, MEGA/S4 and rclone remain background leads, not current production adapters. The current ingestion does not depend on those proposals.

For any future replacement, inspect official current API docs and verify auth/scopes/renewal, exact-key behavior, conditional writes, pagination, retry/idempotency, data format, execution location, customer cost and UX. None of those external guarantees is certified by this snapshot. A bucket is storage, not an executable transfer service. Google Drive is not GCS. Source-observed size limits are application assumptions until independently validated against the actual provider.

Cloudflare account OAuth, Worker Bearer secret, private signed read and GitHub token are distinct boundaries. Never export credentials. Worker binding declarations are not independently read provider truth. The helper's extension-origin prefix does not establish a particular paired extension identity.
''')
write('INVENTORY.md','''# Inventory and coverage

inventory.json hashes 497 baseline artifacts after explicit credential/environment exclusions. Roles distinguish source, tests/contracts, historical reports and background proposals. Addressability is not behavioral review. current-state.json maps 40 existing feature surfaces; 24 derive from current Explorer operation locations rechecked against source, and 16 cover core integration/UI/tooling surfaces. api-census.json contains 128 literal observations. The canonical model contains 253 records, including 66 issue evidence snapshots.

Runtime data, browser profiles/stores, credentials, environment templates and ignored output are not exported. Bundled assets and third-party minified model-viewer are inventoried, not fully internally audited. All production code remains at the baseline. Newly added documentation/tools and optional root onboarding pointer are separately tracked in the ingestion commit.

Source freshness of the new corpus is checked independently. Original source-map/hash drift stays visible. Full dynamic call graph, all DOM paths, every Worker action contract, full package policy review and live execution are incomplete. No percentage of “fully preserved behavior” is assigned.
''')
write('GAPS_AND_MIGRATION.md','''# Remaining gaps and follow-up

Completed: baseline pin, fresh local regression/registry/issue observations, 40 current surfaces, 66 issue records, canonical model, unmodified pinned current schema/reference snapshot, source hashes/anchors, local evidence links and negative preservation checks. Current schema validation and reference validation pass; no accepted purpose or live behavior follows from this.

Remaining: three additional baseline failures plus seven historical ones; stale original Explorer/issue/semantic evidence; complete dynamic caller and API contracts; installed Chrome/clipboard/download/visual acceptance; real registered-client refresh grant/soak; deployed Worker/R2 binding and byte-integrity tests; Copy404 live closure; direct-upload concurrency safety; durable job recovery; Windows native source/build; license reconciliation/release. Gallery, RFIS and helper have source locations but no fresh dedicated end-to-end fixture proof here.

No migrations were executed. The old vendored schema blocker is historical, and old conformance script must retain its expected failure check; current model uses a separate corrected upstream snapshot. The first schema attempt was blocked by missing jsonschema, then rerun with the pinned dependency; both logs are retained.

Do not close failures by refreshing frozen hashes, weakening expectations, changing production, or equating a new record with owner acceptance. Follow-up fixes need their own scoped implementation and verification. An independent cold-agent drill is recorded separately when executed; source-independent full reconstruction is not claimed.
''')
write('RECONSTRUCTION.md','''# Reconstruction boundary and recovery recipe

Preserve the complete repository including forever/, FOREVER_WORKS/, existing tests/contracts, package-lock, LICENSE and third-party notices. Git history/checkpoint and source remain the strongest recovery evidence. The new pinned MIT schema/reference copy supports offline model queries without the original framework checkout; Python schema validation needs the separately specified jsonschema dependency.

For source-present maintenance: read COLD_AGENT_START_HERE.md, validate schema/anchors, query current-state/issues, locate implementation refs and test events, reproduce only locally, propose minimal change against current invariants, then run affected tests and reliability checks. Diagnose live problems only with explicitly authorized redacted evidence. Do not invoke prepare/repair as inspection.

If original production implementation disappears: capability/invariant/compatibility records plus original tests/contracts and fixture data can guide a replacement for a scoped boundary. Reimplement destination selection, exact-key routing, receipt/status and privacy rules before cloud mutations. Evaluate replacements against all obligations; absent proof returns partial. Reconstructible credentials are not supplied; obtain new authorized credentials separately.

This corpus is not sufficient to reproduce the full pixel/animation product or all cloud behaviors from records alone. Current feature narratives, source-independent protocol fixtures, visual baselines and live acceptance are incomplete. Preserve existing assets, HTML/CSS/JS and verification screenshots rather than claiming they can be regenerated from a capability statement. Full source-independent reconstruction has not been demonstrated.
''')
write('COLD_AGENT_START_HERE.md','''# Cold-agent entry

Use repository root. Read CURRENT_STATE.md and FAILURE_ATLAS.md. Query canonical model via `node FOREVER_WORKS/tools/query.mjs describe`, then `listCapabilities`, `getEntity <exact-id>` and `traceEntity <exact-id>`. Follow sourceRefs and exact test evidence. Domain issue links are under extensions.org.redown; they are triage leads, not cause proof. For richer native diagnostics use `node agent/diagnostics/cli.mjs getStartGuide`, `listIssues` and qualified namespace operations. Those tools do not authorize runtime mutation.

Fresh result: 365 pass / 10 fail. Explorer freshness fails; old seven-failure policy does not account for three baseline failures. Never label current product all-working. Passing fixtures establish only their named local behavior. Unknown installed/provider truth remains unknown.

Run `node FOREVER_WORKS/tools/query.mjs validateModel`, `node FOREVER_WORKS/tools/check-preservation.mjs`, and `python3 FOREVER_WORKS/tools/validate.py` with requirements installed. Source refs are pinned to checkpoint 424f29e5...; test events record Linux Node24 local mocks. New source changes require reinspection. No cloud credentials are required or read by this documentation adapter.

Blind maintenance acceptance tasks are in COLD_AGENT_ACCEPTANCE.md. A passing inheritance drill is distinct from passing local tests, release readiness and source-independent reconstruction.
''')
write('COLD_AGENT_ACCEPTANCE.md','''# Independent current-state acceptance drill

Give a fresh agent only this repository, ordinary read-only/local-test tools and these questions. No chat context, original plan or answer paths. Record commands, exact record/source/test citations, unsupported assumptions, mistakes and missing knowledge. Do not mutate production/cloud. Score 0 incorrect, 1 partial with honest gaps, 2 correct/traceable. No unsupported runtime success claim is permitted.

1. What actually passes and fails at this checkpoint? Explain why older reports saying seven failures are insufficient. Name the three additional failures without calling them three confirmed customer defects.
2. Preview/download work but cross-bucket Copy/Move/Paste gives source404. Find the differing execution boundaries, likely starting locations and missing evidence; do not invent a root cause.
3. A session later returns403. Explain renewal versus permission denial, actual grant uncertainty and why adding offline_access is not justified.
4. Could concurrent local uploads still overwrite a newly created object after a successful absent preflight? Find the code and evidence; avoid claiming an unverified conditional-write guarantee.
5. Replace the embedded transfer executor. List purposes, exact destination/source-safety, completion, compatibility and evidence obligations. Run missing-proof and failed-obligation evaluations; they must be partial and fail respectively.
6. Locate temporary icon restoration, quiet defaults, odometer completion and independent Debug/Beta rules. Do passing mocks prove installed animation or live cloud delivery?
7. Find a known bug's current assessment versus recorded history and source-freshness status; follow an issue lead without claiming a proven causal relation.
8. Explain which feature surfaces have source-only evidence, how helpers/Worker samples differ, and what the corpus cannot reconstruct if implementation disappears.

Require score2 for auth, data safety, completion truth and evidence boundaries. Report documentation defects and revise, retaining the first transcript. Full source-independent reconstruction is a separate unexecuted experiment, not inferred from this maintenance drill.
''')
print('Guides written')

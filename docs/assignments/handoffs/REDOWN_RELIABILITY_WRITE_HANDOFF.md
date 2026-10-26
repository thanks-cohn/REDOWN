# Mandatory REDOWN reliability/write handoff

## Timebox and repository state

- Execution started: **2026-10-26 01:58:55 UTC**.
- Handoff prepared: **2026-10-26T02:24:10.249791+00:00**; elapsed **25.25 minutes**;
  remaining **4.75 minutes**.
- Mandatory push due: **02:23:55 UTC**. Absolute stop: **02:28:55 UTC**.
- Branch: `fix/evidence-first-write-diagnostics`. **Do not merge automatically.**
- Latest implementation HEAD at preparation: `70a30646e9214f74b6876032f14a63469f8feb78`; pushed to the feature branch.
- Connection-lifecycle branch `7321381031e901d3e843182bfd283fc9c48bf10c` is preserved
  through merge `ce71cc2`. Base main `785a55546c09ecc45752cae32d3276c19c8fddd5`.
- Worktree at preparation: the tested AAC scenario remained unstaged after the source
  commit; it is included in THIS handoff commit. This handoff and scenario will be
  committed/pushed immediately. Ignored `work/reliability-write` contains scratch,
  original logs and fetched official references; durable selected logs are under
  `verification/reliability-write`. No other unpushed source work is intentionally left.
- Source commit `70a3064` includes the core repair, Doctor, incident, standard,
  runbook, schemas, Python package 0.5.2, tests, CI and verification records.
  Obtain this handoff's containing SHA with `git log -1 --format=%H -- docs/assignments/handoffs/REDOWN_RELIABILITY_WRITE_HANDOFF.md`.

## Original owner evidence and exact causal status

The full original owner evidence is preserved verbatim in
`FOREVER_WORKS/bugs/FW-REDOWN-LIVE-R2-WRITE-PROVIDER-ERROR-20261025.md` and the assignment.
Owner Windows 11 / Python 3.14.7: connection repair 0.5.1 paired, list PASS,
8-byte upload and mkdir FAIL PROVIDER_ERROR, three dispatched operations, zero
verified bytes/files. Upload ID f1447436-1a64-4798-a134-e86e61b0aa8c; mkdir ID
876c6026-8bce-4786-abf7-74935cbca860. Provider spans ~142.5/139.9 ms. Existing
hello bucket.txt must never be altered. No original raw HTTP response survived.

**Original live root cause: UNPROVEN.** Source-backed findings:

1. Both mutations first invoke destination.stat in the canonical coordinator,
   before laboratoryCreate or Worker write. It used OAuth object HEAD.
2. Current retrieved Cloudflare OpenAPI lists GET/PUT/DELETE and no HEAD on that
   route. The undocumented metadata method is a proven API-contract defect;
   injected HTTP 400/405 reproduces a shared pre-write failure. This is not proof
   the owner's historical HTTP response had that exact status.
3. The adapter discarded response status/body and replaced most errors with
   PROVIDER_ERROR. Journal/evidence/SDK carried only a code. This is a proven
   information-loss mechanism. Coincident latency is not evidence of an old Worker.
4. New stat uses documented GET prefix-list metadata with exact key equality,
   bounded page size, cursor ambiguity refusal, normalized ETags and no object body.
   Atomic conditional creation stays in the existing Worker; no overwrite/delete
   safety was weakened. A prefix race still cannot overwrite an existing object.
5. Separate READ-ONLY Cloudflare connector inspection observed HTTP 200 Worker
   settings, STORAGE=test-1-new, global_fetch_strictly_public, last modified
   2026-10-25T02:08:52.446651Z. This is NOT the owner's Chrome OAuth session.
   Object-list query probes returned HTTP 200/empty results for queried prefixes;
   this establishes neither owner fixture state nor write permission.
   Separate unauthenticated Worker-root GET was unobservable (HTTPError).
   The original extension HEAD response and authenticated capability response
   remain inaccessible. No secret bindings were printed, no deployment performed.

**Single decisive inaccessible observation:** run the new Doctor in the owner's
existing approved extension session and obtain the safe status/native code for
legacy HEAD, documented metadata GET, Worker settings/subdomain/binding/capability.
Then, only with separate write approval, run fresh smoke and independent dashboard
readback. Do not declare the cloud repaired from these local fixtures.

## Implemented changes and tested evidence

- Provider-neutral redown.diagnostic.v1 schema, generated browser validator/code
  allowlist, matching packaged Python contract and defensive SDK validation.
- HTTP/native numeric codes, safe request IDs, stage, operation ID, mutation phase
  and retry safety survive coordinator job, evidence, scoped/native framing and
  Python JSON/Markdown. Invalid or lost diagnostics are DIAGNOSTICS_LOST.
- No raw provider messages, URLs, object keys, tokens, headers or file contents in
  diagnostic envelopes. Three bounded flattened causes, 16 KiB max, strict fields.
- Preflight errors remain NOT_SUBMITTED. Rejected writes and lost acknowledgements
  differ. No hidden replay. Existing revocation and read-only fallback remain.
- Extension-authenticated Doctor is read-only by default, with 4-second per-probe
  target bounds. Native relay method allowlist explicitly includes Doctor.
  Optional --smoke requires explicit CLI flag AND separate extension write approval.
- Doctor checks current saved profile/host/account/binding/jurisdiction, old HEAD
  comparison, documented metadata route, authenticated deployed capabilities.
  Old HEAD is informational after the source repair and does not block good metadata.
- Local OTLP JSON interoperability adapter and W3C traceparent on capability/create
  requests; local stage latency/traffic/errors/provider-denials and saturation UNKNOWN.
  **Not full OTel SDK compliance or complete distributed instrumentation.**
- Resource Atlas correlation uses existing operation IDs/error spans and canonical
  diagnostic evidence, without silently altering the published Atlas trace schema.
- AAC diagnostic-evidence-completeness scenario, CI diagnostics:test gate, additive
  Forever Works incident/standard obligation; no frozen histories refreshed.
- Connection repair's listener-before-ready, pairing timer, new error/dispatched
  accounting, and scrollable GUI are preserved through ancestry and tests.

Actual results before this handoff:

- `npm run diagnostics:test`: **24 pass / 0 fail**.
- `node --test tests/diagnostic-evidence.test.mjs tests/extension-native-e2e.test.mjs`:
  **25 pass / 0 fail** after final boundary changes. Real Python/native processes,
  injected provider, code 10021/status 400, NOT_SUBMITTED, no write callback,
  JSON/Markdown redaction and Doctor all exercised. NOT live R2.
- `npm run lab:test`: **39 pass / 0 fail**, independent architecture report schema
  checks pass (run before final small Doctor timeout/metric corrections; subsequent
  25 boundary tests pass those changes).
- Python: **40 total, 39 pass, 1 skipped** (no desktop display) before the final
  explicit-smoke-phase test; focused Doctor tests now **4 pass** including that case.
  Re-run full Python once in the final five minutes to obtain final count.
- `npm run providers:test`: **15 pass / 0 fail**.
- `npm run resources:test`: **7 pass / 0 fail**.
- `npm run aac:test`: **18 pass / 0 fail**, with new completeness scenario inside
  its existing scenario test. The AAC scenario file is included with this handoff.
- `npm run reliability:check`: **489 pass / 9 inherited fail**; syntax, current
  Explorer architecture, API registry and issue inventory stages PASS. No new Node
  regression failures. Full source tests preceded final small Doctor-only corrections.
- `node FOREVER_WORKS/tools/check-preservation.mjs`: PASS.
- `python FOREVER_WORKS/tools/validate.py`: FAIL historical frozen source freshness;
  do not refresh hashes. Connection branch retains the earlier failing baseline.
- Package installation 0.5.2 succeeded; unavailable-extension Doctor writes actionable
  JSON/Markdown with BLOCKED, no GUI/provider required.
- Initial native Doctor tests found missing INVALID_INPUT schema registration, then
  missing Doctor in native host method allowlist. Both repaired and passing logs
  retained. No assertions weakened.

Inherited Node failures (retained):
- tests/agent-api.test.mjs: offline discovery advertises only implemented operations and distinct versions
- tests/agent-api.test.mjs: catalog IDs, evidence labels, source hashes and references are internally consistent
- tests/debug-api.test.mjs: real discovery, case, history, filters and validation are deterministic and honest
- tests/debug-api.test.mjs: original case and proposal Markdown bytes are retained from pinned upstream
- tests/nested-locations.test.mjs: Nested drag-handle keyboard move saves sibling order with descendants and paths intact
- tests/semantic-api.test.mjs: real vertical contract resolves intent, three upload invariants, handlers, current source and regression
- tests/semantic-api.test.mjs: full finite public coverage inventory resolves strata and all canonical case links
- tests/issue-inventory.test.mjs: explicit labels are recorded as partly addressed while the omitted-item report stays open
- tests/options-debug-display.test.mjs: successful provisioning refreshes destination editors and inventory before reporting ready

Changed paths relative to main (this includes preserved connection work):

```text
.github/workflows/ci.yml
AGENTS.md
FOREVER_WORKS/README.md
FOREVER_WORKS/bugs/FW-REDOWN-LIVE-R2-WRITE-PROVIDER-ERROR-20261025.md
FOREVER_WORKS/bugs/FW-REDOWN-PYTHON-LAB-DISCONNECT-20261025.md
agent/aac/scenarios.mjs
clients/python/pyproject.toml
clients/python/redown/adaptive.py
clients/python/redown/client.py
clients/python/redown/diagnostic.schema.json
clients/python/redown/diagnostics.py
clients/python/redown/doctor.py
clients/python/redown/extension.py
clients/python/redown/gui_layout.py
clients/python/redown/lab.py
clients/python/redown/native_host.py
clients/python/tests/test_connection_lifecycle.py
clients/python/tests/test_doctor.py
clients/python/tests/test_gui_layout.py
docs/architecture/REDOWN_DIAGNOSTIC_STANDARD.md
docs/phase28/CONNECTION_RECOVERY.md
docs/phase28/DOCTOR_RUNBOOK.md
docs/phase28/README.md
extension/file-engine/adapters/extension-r2.mjs
extension/file-engine/diagnostic-codes.mjs
extension/file-engine/diagnostic-validator.mjs
extension/file-engine/diagnostic.schema.json
extension/file-engine/diagnostics.mjs
extension/file-engine/doctor.schema.json
extension/file-engine/engine.mjs
extension/file-engine/schema-0.2.json
extension/file-engine/schema-0.3.json
extension/file-engine/scoped-session.mjs
extension/lab-session.mjs
extension/lab-worker.mjs
extension/laboratory.mjs
package.json
scripts/compile-diagnostic-schema.mjs
scripts/syntax-targets.json
tests/diagnostic-evidence.test.mjs
tests/extension-lab-ui.test.mjs
tests/extension-native-e2e.test.mjs
tests/phase28-laboratory.test.mjs
verification/lab-disconnect/aac.log
verification/lab-disconnect/baseline-file-preservation.log
verification/lab-disconnect/baseline-forever-validate.log
verification/lab-disconnect/baseline-node.log
verification/lab-disconnect/baseline-python.log
verification/lab-disconnect/file-verify.log
verification/lab-disconnect/final-lab.log
verification/lab-disconnect/final-node.log
verification/lab-disconnect/forever-describe.log
verification/lab-disconnect/forever-validate.log
verification/lab-disconnect/intermediate-python.log
verification/lab-disconnect/issues.log
verification/lab-disconnect/preservation.log
verification/lab-disconnect/providers.log
verification/lab-disconnect/readiness.log
verification/lab-disconnect/registry.log
verification/lab-disconnect/reliability.log
verification/lab-disconnect/repair-lab.log
verification/lab-disconnect/repair-python.log
verification/lab-disconnect/resources.log
verification/lab-disconnect/start-guide.log
verification/lab-disconnect/summary.json
verification/lab-disconnect/verified-python.log
verification/reliability-write/aac.log
verification/reliability-write/boundary-final.log
verification/reliability-write/current-map.log
verification/reliability-write/diagnostic-contract-final.log
verification/reliability-write/diagnostic-native.log
verification/reliability-write/diagnostic-tests.log
verification/reliability-write/diagnostics-final.log
verification/reliability-write/diagnostics-gate.log
verification/reliability-write/diagnostics-reviewed.log
verification/reliability-write/doctor-final.log
verification/reliability-write/forever.log
verification/reliability-write/initial-tests.log
verification/reliability-write/install.log
verification/reliability-write/issues.log
verification/reliability-write/lab-final.log
verification/reliability-write/lab.log
verification/reliability-write/native-debug.log
verification/reliability-write/native-fault-final.log
verification/reliability-write/native-fault-tests.log
verification/reliability-write/native-final.log
verification/reliability-write/preservation.log
verification/reliability-write/providers.log
verification/reliability-write/python-doctor-tests.log
verification/reliability-write/python-final.log
verification/reliability-write/python-initial.log
verification/reliability-write/python-schema.log
verification/reliability-write/readiness.log
verification/reliability-write/registry.log
verification/reliability-write/reliability-final.log
verification/reliability-write/reliability.json
verification/reliability-write/reliability.log
verification/reliability-write/remote-health.json
verification/reliability-write/resources.log
verification/reliability-write/source-hashes.json
verification/reliability-write/start-guide.log
verification/reliability-write/stat-fix-tests.log
verification/reliability-write/timebox.json
verification/reliability-write/unavailable-doctor.log
verification/reliability-write/worker-refactor-tests.log
```

## Status by task / blockers

- COMPLETE: preserve connection branch; forensic source trace; repair undocumented
  HEAD dependency and known information-loss defect; read-only Doctor; native/Python
  error propagation; generic diagnostic schema/privacy gate; owner runbook.
- PARTIAL: OTel interoperability, distributed clock/parent spans, metrics/retention,
  provider-independent Doctor registry, full native error taxonomy, AAC/FW integration.
  Generic drive/local/S3 fixture diagnostics pass; real providers are NOT implemented.
- BLOCKED: historical original cloud causality, actual Chrome OAuth HEAD/capabilities,
  live write acceptance and unchanged hello bucket.txt bytes. Needs OWNER session.
- NOT_TESTED: installed Windows Chrome/native launch, desktop GUI (no DISPLAY), live
  R2 smoke/readback, full external OTLP receiver interoperability.
- NOT_STARTED: complete fleet OTel SDK instrumentation/exporter configuration,
  Worker-side child spans, saturation/SLO instrumentation and automatic report rotation.
- No infrastructure modification, Worker deployment/repair, bucket policy change,
  deletion, cloud write, release or merge was performed.

## Exact safe successor sequence

1. Read this handoff, incident, `docs/architecture/REDOWN_DIAGNOSTIC_STANDARD.md`,
   `docs/phase28/DOCTOR_RUNBOOK.md` and current git log/status. Do NOT redo connection
   repairs, rewrite the original evidence, merge main, or expand transfers to 2 MiB.
2. Read any appended final delta below before rerunning work. Source hashes and logs
   live in verification/reliability-write. Preserve failures and baseline debt.
3. If needed, run locally:

```sh
git fetch origin
git switch fix/evidence-first-write-diagnostics
python -m pip install --upgrade ./clients/python
npm run diagnostics:test
npm run lab:test
npm run python:test
npm run providers:test
npm run resources:test
npm run aac:test
npm run reliability:check
```

4. OWNER Windows PowerShell, from checkout, close old GUI first:

```powershell
git fetch origin
git switch fix/evidence-first-write-diagnostics
git pull --ff-only
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -m redown.install_host --extension-id mkadkgpekmkknfbniacdlmgikihjjepf
```

Reload the unpacked extension from THIS checkout, reopen its Python Laboratory,
select authorized test-1-new and start local connection; keep the page open.
Then approve the matching code for each new CLI connection:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --report .\redown-doctor.json
```

No cloud mutation. Preserve the report. DO NOT Repair/deploy a missing capability
without a separately explicit scoped owner authorization. For owner-authorized
fresh eight-byte testing, approve a NEW pairing with separate write checkbox and:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --smoke --report .\redown-doctor-smoke.json
```

This uses a fresh namespace and never targets hello bucket.txt. Dashboard-download
`<smoke.destinationRoot.key><smoke.runId>/uploads/hello.bin`; compare Get-FileHash to
`smoke.inventory.selected[0].sha256`. Confirm pre-existing hello bucket.txt separately.
No deletes, no ambiguous write replay. Exit codes 0 PASS, 1 FAIL, 2 BLOCKED,
3 INDETERMINATE, 4 UNSUPPORTED. Update incident only with actual new evidence.

## Ready-to-use successor Codex starter prompt

> Read docs/assignments/handoffs/REDOWN_RELIABILITY_WRITE_HANDOFF.md including its
> final delta, the incident and Doctor runbook. Continue on
> fix/evidence-first-write-diagnostics without repeating completed connection,
> contract or native propagation work. First inspect the owner's new Doctor JSON;
> determine the actual first failing deployed boundary and repair only a proven
> defect. Preserve original evidence, conditional-write safety and the nine inherited
> failures. Do not merge, deploy, alter infrastructure/policies or replay uncertain
> writes without separate authorization. Complete remaining OTel/diagnostic gaps
> under fault tests and keep all unverified live claims explicit.


## Final delta — 2026-10-26T02:28:27.885377+00:00

**Timebox failure recorded explicitly:** handoff 5f659a31443f98eaae2f2af0a4f0bad500551598
was committed at 02:24:10 UTC (15 seconds past the required 02:23:55 deadline),
and its remote push was confirmed by 02:24:15 (20 seconds late). The prepared
timestamp above is accurate. This does NOT satisfy the strict minute-25 requirement;
no timestamp was backdated. The owner was informed immediately.

Minutes 25–30 were used only for verification and the final Doctor schema guard.
No further runtime changes followed implementation commit 70a3064. A permanent
Doctor schema positive/secret-extra-field negative test was added to
`tests/diagnostic-evidence.test.mjs`, covering the previously inline schema check.

Final actual results: diagnostics 25/25 PASS; extension/native lab 40/40 PASS;
Python 40 PASS, 1 desktop-display SKIP, 0 FAIL; full Node **490 PASS / same 9 FAIL**.
Provider contracts 15/15, Atlas 7/7, resource schema 3/3, AAC 18/18 and AAC schema
PASS. Existing Forever Works preservation passes; frozen source freshness still
FAILS and was not hidden or refreshed. Package 0.5.2 installs with the packaged
schema. Unavailable Doctor produces BLOCKED/EXTENSION_UNAVAILABLE JSON/Markdown.
Source hash verification and connection-repair ancestry checks pass. Final exact
logs and machine summary: `verification/reliability-write/final-summary.json` and
`final-*.log`. The complete original failure remains in the incident.

The actual live root cause remains UNPROVEN; actual Windows/Chrome smoke and
pre-existing hello bucket.txt byte preservation remain NOT_TESTED. OTLP export is an
incremental local interoperability adapter, not complete OTel instrumentation.
No cloud deployment/repair/policy mutation/write/delete, release or main merge was
performed. Main remains 785a55546c09ecc45752cae32d3276c19c8fddd5. No asynchronous
continuation is scheduled. The successor must start from owner Doctor evidence.

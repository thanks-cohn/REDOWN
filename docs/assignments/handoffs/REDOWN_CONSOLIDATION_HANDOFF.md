# REDOWN consolidation handoff — initial checkpoint

Start: 2026-10-26 02:48:09 UTC. Handoff deadline 03:13:09 UTC; absolute stop
03:18:09 UTC. Branch `fix/foundation-consolidation`, from latest main `6767bfb`.
PR #38 merge `359185d` and connection fix `7321381` are ancestors. No remerge.

Initial checkpoint is being committed/pushed before implementation so the mandatory
handoff cannot be sacrificed. Implementation and final test deltas will follow here.

Completed: read assignment, inspected merged source/contracts/history, created the
required pre-code incident and responsibility/coupling audit. Source-confirmed
collisions C1 schema copy generation, C2 Cloudflare parsing in shared diagnostics,
C3 duplicate Doctor routing are in the audit. No code changed/test claims yet.

Remaining: reproduce and repair bounded collisions, verify existing diagnostics and
connection behavior, add provider-neutral/local filesystem tests, measure overhead,
record inherited nine Node failures and Forever drift, owner Windows runbook.

No cloud mutations/deployments/repairs, releases or automatic merge. Original live
R2 cause remains UNPROVEN. Decisive missing evidence is the owner's authenticated
read-only Doctor followed by separately approved fresh eight-byte smoke and independent
readback, not source inspection or these local tests.

Successor prompt: Read this handoff's latest delta, the consolidation assignment,
`docs/architecture/REDOWN_FOUNDATION_CONSOLIDATION_AUDIT.md` and the consolidation
incident. Continue on the latest feature branch without remerging PR #38 or repeating
completed checks. Preserve scopes, provider boundaries, original live evidence,
read-only tag and inherited failure debt. Implement only confirmed necessary fixes;
no cloud changes or automatic merge. Keep this handoff current and push tested work.


## Tested implementation handoff — 2026-10-26T03:12:13.080035+00:00

Elapsed 24.07 minutes; remaining 5.93 minutes. The initial handoff
was committed as b882ee44c2060e534304dae3a607b3c24d097ab9 at 02:54:21 UTC and push
confirmed 02:54:28 UTC, well BEFORE the 03:13:09 mandatory deadline. The source
implementation is pushed as `f44cdc408744a17848d7a66bde24ab241434327a`. This documentation/CI/verification update is
being committed/pushed now. No unpushed runtime source remains intentionally.
Ignored work/consolidation holds scratch/original logs; durable evidence is in
verification/consolidation. Obtain this update's exact containing SHA with:
`git log -1 --format=%H -- docs/assignments/handoffs/REDOWN_CONSOLIDATION_HANDOFF.md`.

### Completed, confirmed findings and changes

- C1 fixed: one canonical diagnostic event, shallow causes reference it instead of
  duplicating properties/codebook. ASCII [0-9] prevents JS/Python Unicode digit
  disagreement. The existing generator owns JS validator/codebook, Doctor validator
  and packaged Python copy; every generated artifact's corruption is rejected.
- C2 fixed: Cloudflare body/cf-ray parsing moved into adapters/r2-diagnostics.mjs.
  Shared HTTP diagnostics default to unknown provider and consume no native body.
  R2 still retains safe numeric native codes/status/request ID and existing redaction.
- C3 fixed: Doctor routing, selector validation, scope/budget and output consistency
  now belong to createScopedSession. Owner composition injects read-only provider
  probes; generic facade checks coordinator authorization before AND after probing.
  Contradictory PASS, unknown roots/inputs and missing callbacks fail safely.
- Real local-reference and neutral fake provider exercise the same hook. The existing
  Python SDK over real stdio obtains local Doctor output without Chrome/Cloudflare,
  no new provider framework or production registration. Separate write approval is
  still mandatory for smoke; no read grant permits upload. Existing R2-only
  unsupported-operation policy remains behind R2 support.
- Connection fixes, Universal API operation bodies, Atlas storage/correlation, AAC,
  Forever obligations, idempotency and conditional-write semantics are preserved.
  The shared runtime schemas' versions remain compatible; Doctor is additive only
  when an owner provides a probe. Python package is 0.5.3, dependency-free at runtime.
- CI explicitly installs independent JSON Schema test dependencies in jobs running
  cross-language checks. No mandatory runtime telemetry or cloud service added.
- Distinct permanent bugs have reproduction and corrective commit links:
  FW-REDOWN-DIAGNOSTIC-SCHEMA-OWNERSHIP-20261025.md,
  FW-REDOWN-DIAGNOSTIC-PROVIDER-BOUNDARY-20261025.md,
  FW-REDOWN-DOCTOR-SCOPED-OWNERSHIP-20261025.md. Consolidation incident and existing
  write/connection incidents are updated append-only. Full audit includes before/
  after matrix, collision register, Cloudflare extraction inventory and coexistence.

### Actual tests and evidence

- npm run diagnostics:test: 31 PASS / 0 FAIL (includes 6 consolidation contracts).
- npm run lab:test: 40 PASS / 0 FAIL; real native/Python framing and schema controls.
- npm run python:test: 42 total, 41 PASS / 1 no-display GUI SKIP / 0 FAIL.
- npm run providers:test: 15 PASS; includes existing real local filesystem baseline.
- npm run resources:test: 7 PASS; resources:schema: 3 PASS; AAC: 18 PASS; AAC schema PASS.
- npm run reliability:check: 496 PASS / same 9 inherited FAIL; syntax, current
  architecture, registry and issue stages PASS. Exact failures in summary.json.
- Forever preservation evaluator PASS; frozen source-freshness validation FAIL,
  preserved without refreshing historical hashes or weakening assertions.
- Package 0.5.3 installs; unavailable-extension Doctor emits useful BLOCKED JSON/MD.
- Benchmark: actual filesystem 64-failure operations x3, Atlas on/off, and 10k
  validations. Before medians 63.85/228.01/38.50 ms; isolated after 65.83/220.51/
  40.37 ms. A loaded slower run is retained. Not isolated diagnostic attribution,
  not a significant speedup or cross-machine budget. Reproduce with
  `node scripts/benchmark-diagnostic-boundaries.mjs`.

### Remaining work, blocked observations and safe continuation

COMPLETE: bounded C1/C2/C3 consolidation and contract/independent filesystem tests.
PARTIAL/DEFERRED: legacy 0.2/0.3 operation-body unification, old production Explorer
orchestration, numeric-only native-code schema/legacy taxonomy migration, full OTel
parent/clock/Worker spans, fleet retention, broader provider production connectors.
These are explicit KEEP_DISTINCT/DEFER dispositions, not unexplained duplicate owners.

BLOCKED/NOT_TESTED: original Windows R2 write root cause, authenticated owner Doctor,
actual Windows/Chrome launch and GUI, pre-existing hello bucket.txt bytes, live
small-file write/dashboard hash. No consolidation test is live acceptance.
No cloud reads/writes/deployments/repairs/policy changes, releases or merge occurred.
Main remains the owner-merged baseline; this feature branch is NOT auto-merged.

Exact successor commands from clean checkout:

```sh
git fetch origin
git switch fix/foundation-consolidation
python -m pip install --upgrade ./clients/python
npm run diagnostics:test
npm run python:test
npm run lab:test
npm run providers:test
npm run resources:test
npm run aac:test
npm run reliability:check
```

For owner Windows setup/reload/registration, use
`docs/phase28/CONSOLIDATED_OWNER_ACCEPTANCE.md`. One-command read-only Doctor:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --report .\redown-doctor.json
```

Approve its matching code in the existing extension after reloading this checkout.
No raw console or tokens. Only after required checks pass and a NEW pairing with
SEPARATE write approval, optionally execute:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --smoke --report .\redown-doctor-smoke.json
```

Dashboard-download `<smoke.destinationRoot.key><smoke.runId>/uploads/hello.bin` and
compare Get-FileHash to smoke.inventory.selected[0].sha256; confirm hello bucket.txt
unchanged separately. Do not deploy/repair infrastructure without explicit scoped
permission; do not delete or replay ambiguous writes. Larger-file work remains deferred.

### Successor starter prompt

Read this handoff's latest delta, REDOWN_FOUNDATION_CONSOLIDATION_AND_PROVIDER_NEUTRALITY.md,
the completed consolidation audit and permanent bug records. Continue on the latest
fix/foundation-consolidation feature branch from merged main, without remerging PR #38
or repeating completed C1/C2/C3 work. Review exact verification/summary and owner Doctor
output first. Preserve generated-schema ownership, neutral scoped Doctor, R2 adapter
boundaries, connection fixes and nine inherited Node failures. Resolve only proven
remaining defects; don't introduce another registry/engine or rewrite frozen proof.
No automatic merge, cloud infrastructure changes or ambiguous write replays. Live R2
causality remains UNPROVEN until owner-session evidence and independent bytes arrive.

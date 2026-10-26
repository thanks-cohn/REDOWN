# Foundation consolidation — initial investigation, not live acceptance

Base: latest origin/main `6767bfb` after merged PR #38 (`359185d`). Branch:
`fix/foundation-consolidation`. Execution start 2026-10-26 02:48:09 UTC;
handoff due 03:13:09; stop 03:18:09. Connection repair `7321381` and diagnostics
`ad5134f` are ancestors; do not merge them again. Read-only tag is retained.

Before changing implementation, the responsibility/coupling map is recorded in
[the architecture audit](../../docs/architecture/REDOWN_FOUNDATION_CONSOLIDATION_AUDIT.md).
The previous original live R2 failure remains UNPROVEN. No infrastructure changes,
cloud writes, Worker repair or live certification are authorized.

Initial source-confirmed observations:

- `diagnostics.mjs:responseDiagnostic` is shared core but defaults to extension-r2,
  decodes Cloudflare `errors[0].code`, and extracts `cf-ray`. This is real provider
  coupling, not merely a provider name in an optional legacy error enum.
- The diagnostic compiler generates JS validator/codebook but does not generate or
  check the packaged Python schema. Python parity is checked later by a Python test,
  but ownership of updates is manual. Nested cause properties/codebook are duplicated
  inside the canonical JSON schema. Differential/parity tests are needed before repair.
- Doctor routing/input validation is implemented again in R2 `lab-session.mjs`
  instead of the existing shared scoped facade. A non-R2 owner session currently
  cannot advertise the same Doctor hook. Provider probes themselves correctly belong
  behind provider ownership; moving them into generic core would worsen coupling.
- API 0.2 and 0.3 operation bodies intentionally coexist under one journal/lifecycle;
  no evidence currently justifies a risky merge of their identity semantics.
- Resource Atlas observations, Doctor active health snapshots, AAC assessments and
  Forever Works obligations are distinct evidence classes. Their coexistence is
  required; no new telemetry store or registry is proposed.

Planned bounded repairs: move R2 HTTP decoding behind an R2 support boundary;
mechanically synchronize schema distributions; consolidate optional read-only Doctor
routing at the existing scoped session. These are proposals until tests confirm them.
Separate confirmed-defect records will track tests, corrective commits and risks.

## Confirmed disposition after implementation

Source repair `f44cdc408744a17848d7a66bde24ab241434327a` consolidates C1/C2/C3 without a new engine/registry/store.
Distinct permanent defects and their reproduction/commit links:

- [Schema ownership and cross-language constraints](FW-REDOWN-DIAGNOSTIC-SCHEMA-OWNERSHIP-20261025.md)
- [Provider-native parsing in shared core](FW-REDOWN-DIAGNOSTIC-PROVIDER-BOUNDARY-20261025.md)
- [Duplicated Doctor routing](FW-REDOWN-DOCTOR-SCOPED-OWNERSHIP-20261025.md)

The duplicate cause schema is reduced to a reference. ASCII native-code digits avoid
JS/Python Unicode-regex disagreement. Every generated copy is checked. Doctor uses
the existing scoped session and neutral owner probe hook; its own health snapshot is
not a second transfer journal. A non-R2 local adapter is exercised through the real
Python SDK; unsupported/false-success/revoked probes fail safely. R2 unsupported
operation handling remains inside R2 support. No Universal request fields, operation
body semantics, Atlas store, AAC registry or Forever Works intent were replaced.

Baseline debt: nine Node failures remain frozen-source catalog/debug/semantic drift,
removed drag-handle expectations, issue-triage disposition and provisioning mock
sequencing. Frozen Forever Works source freshness also fails; preservation evaluator
passes. No assertions or historical hashes are weakened. New tests pass independently.
See verification/consolidation for final counts, benchmark and remaining gaps.

No live cause/cure is asserted. The next decisive probe remains the owner's existing
extension read-only Doctor, then separately approved fresh eight-byte write and
independent byte hash. Source changes and offline proof alone cannot close that gate.

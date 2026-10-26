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

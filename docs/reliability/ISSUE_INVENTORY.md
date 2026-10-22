# Dependability follow-up: portable checks and current issue triage

Baseline main: `5fe1f278219ba1463089f5ab9dd403b9f1a4d115`. Engineering preference: **standardized, proven and dependable first**. This change uses Node's existing syntax checker, Git attributes, JSON, JSON Schema2020-12 and the existing gateway/test runner. No new runtime dependency, execution framework, cloud adapter or ordinary UI flow is introduced.

## Windows-safe checking

`npm run check` and the reliability runner now use `scripts/check-syntax.mjs`. It invokes the current Node executable with an argument array and --check for every entry in `scripts/syntax-targets.json`. That list replaces the long shell command as the single syntax target inventory. No npm.cmd, command shell, command interpolation or caller-selected CLI target is involved. Syntax checking parses files without executing them. Errors record the target/status without serializing source code or raw child exception bodies. A focused regression covers invalid syntax, paths containing spaces and rejected arbitrary targets.

The root .gitattributes establishes LF for text and explicit binary handling; .bat retains CRLF. This keeps source evidence consistent on fresh checkouts. Existing checkouts can still contain converted text; a hash mismatch is reported as stale evidence, never silently treated as verified. The Windows CI job runs the syntax and issue-inventory contracts. Until that job runs successfully, local Linux tests do not establish native Windows success. The existing full regression jobs remain on Linux Node22/24.

## One current inventory through the existing gateway

Gateway1.2.0 / registry1.1.0 adds three read-only operations. Native namespace versions and existing aliases are preserved.

```sh
npm run diagnostics -- listIssues
npm run diagnostics -- listIssues --input '{"severity":"critical","limit":20}'
npm run diagnostics -- listIssues --input '{"sourceKind":"bug-report","assessment":"needs-triage","limit":100}'
npm run diagnostics -- getIssue --input '{"id":"CODE-UPLOAD-CONCURRENT-CREATE"}'
npm run diagnostics -- getIssue --input '{"id":"EXPLORER-COPY-404-2026-10"}'
npm run diagnostics -- validateIssues
```

The projection reads existing sources rather than copying their histories into another database: every top-level ## section in bugs/README.md, recorded release requirements, the Explorer404 case, regression baseline and the native debug API's historical incident summaries. It also includes explicit code-review findings. Currently this yields62 source records, **not62 distinct active defects**: follow-ups, historical records and release requirements can describe related work. IDs and source kinds keep those roles explicit; related links do not merge evidence or lifecycle states. Additional Markdown headings within a section remain part of that section's source evidence. This is a repository-specific index, not a general Markdown parser or a live failure detector.

List results are priority-sorted, paginated, bounded to100 records and filterable. Unknown IDs, filters, unavailable sources and invalid assessments produce explicit errors; an unreadable inventory cannot masquerade as zero bugs. JSON Schema validates the new assessment notes and existing gateway envelopes in CI. Registry drift and issue-inventory structure are required reliability stages.

## Recorded status versus current assessment

Every entry retains recordedStatus and source provenance. Current state is **unknown** for unreviewed historical material, even if an old report says open, fixed or passed. Reviewed issues remain open until their stated acceptance boundary is met. The Explorer404 incident remains open. Nothing in this milestone closes it.

`issue-assessments.json` contains the small set of explicitly reviewed current notes, next actions and SHA-256 evidence references. A changed report section, source digest or missing anchor changes that review to needs-revalidation and current state unknown. Validation surfaces stale reviews as findings; they cannot retain their prior source-implemented claim. Stale review metadata is visible triage debt rather than a fabricated product regression. Duplicate or malformed entries and missing required sources invalidate the inventory. Original bug text, DBG histories, frozen source hashes and baseline assertions remain unchanged.

Assessment states mean:

| Assessment | Meaning |
|---|---|
| needs-triage | Historical material has not received a current review |
| recorded-only / reported | A source reports something; not current runtime proof |
| partially-addressed | Some source changes exist; another part remains unresolved |
| source-implemented | Relevant code and local checks exist; required browser/platform acceptance remains pending |
| source-risk | Current source contains an identified safety or reliability gap |
| needs-revalidation | The evidence bound to a previous assessment changed |

The reviewed menu entry explicitly separates fixed Simple label precedence from the unresolved missing-item report. The public-URL entry remains browser/native-clipboard pending. The Windows checker records its source repair without claiming native acceptance. The concurrent local-upload preflight/PUT race remains a critical source risk; no speculative provider mutation or unverified conditional-write fix is applied.

## What remains

Installed Chrome and native clipboard/download workflows, the Copy/Move404 incident, concurrent upload safety, durable restart/timeout recovery, historical regression debt and license reconciliation remain release work. No store submission, live bucket visibility change, customer object operation or accepted Forever Works handoff was performed for this milestone. The UX can stay small and welcoming while these underlying checks become dependable; no new technical setup steps are added to normal users' flows.


## Verification — 22 October 2026

Local Linux / Node24.19.0: **323 tests /316 pass /7 retained historical failures /0 new failures /0 skipped**. All four stages pass: syntax, Explorer architecture, API registry and issue inventory. The24 focused foundation/gateway/inventory/portability tests pass. Gateway/registry schemas accept59 routed/error fixtures; issue assessments pass their JSON Schema and reject unsupported success claims. Explorer/runtime schema regressions pass. Workflow YAML parses.

The inventory exposes62 source records across28 top-level bug-report sections,21 recorded release requirements, three DBG histories, seven baseline failures, one Explorer404 case and two explicit code-review findings. It has no invalid or stale assessment findings on this tested source. The combined report fingerprints181 tracked source files. See [local report](verification/dependability/local.json), [focused tests](verification/dependability/focused.log) and [inventory validation](verification/dependability/issues.json). These are local results; the new native Windows CI job, installed Chrome, live provider safety and release acceptance remain pending. No new product-health or revenue guarantee is claimed.


CI follow-up: the first remote run exposed a schema-job setup defect: Explorer and runtime validators require generated fixtures, but the isolated CI job did not generate them. Local generated files had masked that dependency. The workflow now explicitly runs each existing fixture generator before its validator. The first remote Linux Node22/24 regression jobs passed; the schema rerun and Windows result must be checked separately.

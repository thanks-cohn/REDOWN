# Ranked AAC remediation — initial audit snapshot

This plan is tied to `verification/aac/baseline.json`. Fresh `latest.json` and per-check outcomes determine whether each issue remains open; the plan is not closure evidence.

| Priority | Finding | Affected profile | Required change and proof |
| --- | --- | --- | --- |
| 1 / critical | AAC-SEC-001: privileged engine handle exposes journal mutation through Resource Atlas | Any caller incorrectly given a whole engine as a restricted API | Keep stores/collectors private; return narrow read-only or capability-scoped facades. `privileged-handle-escape` must pass without weakening its no-mutation assertion. Keep gateway denial tests passing. |
| 2 / high | AAC-SCHEMA-001: runtime importer accepts evidence missing a schema-required field | Diagnostic consumers and external evidence producers | Align runtime validation with the authoritative evidence schema. Preserve valid imports and reject missing fields, wrong types and unknown data. `resource-runtime-schema-drift` must pass. |
| 3 / high | AAC-EXT-001: external execution transport not established | External integration | Specify supported transport and scoped authentication. An optional MCP adapter must delegate to the canonical engine. Run a contract-only agent trial without repository/internal-handle shortcuts. |
| 4 / high | AAC-UI-001: sparse directly tested UI/API and per-action test relationships | Cold, hot and maintenance | Add concrete per-control parity and outcome checks, including conditional and failure states. Source-map references remain inferred until exercised. Repeat a blind context-menu task without manual implementation search. |
| 5 / high | AAC-OBS-001: incomplete trace interoperability and attribution | Diagnosis/maintenance | Add supported trace context/export and explicit unavailable measurements. Verify actual spans, privacy, interruption, overhead and controlled failures. No fabricated CPU/worker/layout data. |
| 6 / medium | AAC-DISC-001 and AAC-WCAG-001: runtime discovery and human accessibility boundaries | All profiles | Broaden conditional runtime registration capture, real focus/keyboard and assistive-technology checks. Preserve a per-standard criterion ledger and mark untested states. |
| 7 / medium | AAC-SCALE-001: synthetic pagination is not operational scale certification | Bulk integration | Keep bounded summaries and conventional bulk processing. Expand streaming/manifest/queue tests before raising adapter/journal limits. |
| 8 / medium | AAC-DOC-001: branch-placement wording stale after owner merge | Cold/maintenance | Update present-tense delivery wording while preserving dated failed acceptance evidence and historical snapshots. |

The fresh live R2 subset passed 21 checks and cleanup. It does not close older ingestion failures, unsupported R2 destructive operations, full provider parity or installed-extension acceptance. Keep those boundaries visible while extending the test matrix.

Recheck with `npm run aac:audit`, `npm run aac:schema`, `npm run aac:test`, and `npm run aac:certify`. Compare `baseline` and `latest` through `aac.compareReports`. An increased percentage can result from a changed denominator; inspect individual check IDs, source digests and safety results before claiming improvement.

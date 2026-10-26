# REDOWN current-state Forever Works corpus

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

## Consumer presentation — first capture

[Current UX/UI capture](CONSUMER_PRESENTATION_CAPTURE.md) and
[project preservation obligations](CONSUMER_PRESENTATION_PRESERVATION.md) record
the source-declared presentation, typography, spacing, animation, generated sound,
visibility gates, aesthetic comparisons and remaining installed-browser evidence.
This draft is separate from accepted canonical intent; it does not certify runtime
appearance or close existing incidents.

## Creators Notes

[Interface as Operating System, Interface as Product](CREATORS_NOTES.md) records
the owner-directed proposal: the highest aesthetics with easy entry, the
one-click shtick, and useful, satisfying game-like feedback. Intended philosophy
and future gamification remain distinct from demonstrated current behavior.

## Phase 2 Beta successor — separate current-source supplement

[PHASE_2_BETA.md](PHASE_2_BETA.md) records the owner-mandated Beta-first release boundary, the isolated simulation foundation, actual source/test paths, recovery policy and requirements for retiring legacy. The checkpoint corpus and its recorded behavior remain historical evidence; no live provider or promotion claim follows from the supplement.

## Evidence-first write diagnostics supplement

The additive [live-write incident](bugs/FW-REDOWN-LIVE-R2-WRITE-PROVIDER-ERROR-20261025.md)
preserves the owner's original failing evidence and records source-level repairs,
unproven live causality and the [diagnostic contract](../docs/architecture/REDOWN_DIAGNOSTIC_STANDARD.md).
It is an engineering preservation obligation, not accepted canonical intent or live
closure. AAC's diagnostic-evidence-completeness scenario and native fault tests guard
cause preservation. Do not rewrite frozen source hashes to make freshness pass.

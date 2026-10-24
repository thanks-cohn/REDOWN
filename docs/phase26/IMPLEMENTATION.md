# Phase 2.6 implementation — verified foundation, acceptance incomplete

Owner continuation resumed the paused checkpoint on 24 October 2026. The original assignment and mandatory architectural addendum remain authoritative and byte-preserved. The implementation branch `feat/phase26-universal-agents` is preserved. The owner subsequently authorized merging this incomplete snapshot to `main` for inspection, overriding the earlier promotion hold. This is not full architectural acceptance or release certification.

## Delivered behavior

- Installable Python package and JSON CLI over the existing authorized stdio session. No Python provider authentication or transfers. Actual subprocess tests exercise simulation, native IDs, local reference storage and the independently added immutable collection. Timeout closes the session; writes are never automatically replayed.
- Additive file API 0.3 schemas for adapter-owned locators; existing 0.2 exact-key requests and 0.1 simulation compatibility remain. Generated schema validators are browser-safe and checked for drift. Provider contract 1.0.0 declares semantics, supported primitives, limits and unsupported operations.
- Owner bootstrap composes adapters, exact location/operation scopes, expiration, secret environment references and optional durable journal. A current leased R2 Worker can be configured without putting credentials or provider code in Python. This is not the full requested credential lifecycle/bootstrap system.
- Native reference adapter has native folders, stable IDs, duplicate names, case-insensitive matching, stale-page detection and isolated account/container data. Name aliases that match multiple objects fail explicitly. Rename remains unsupported because copy/delete would change stable identity.
- Independent local reference adapter uses an owner-exclusive Linux sandbox, atomic exclusive file creation and bounded reads; it rejects symlinks and unsafe deletion. It is not a general adversarial local filesystem mount.
- A final independent immutable collection adapter has opaque IDs and duplicate names containing `/`. It inherits the same baseline, SDK, lifecycle and Atlas diagnostics, with writes explicitly unsupported.
- Beta accepts owner-supplied bindings, opaque selections and adapter-built destinations; tests exercise duplicate names, folder navigation, reads, copies and root-scope refusal. Existing default simulation UI remains compatible. No installed extension or fresh ordinary Chromium visual acceptance was established.
- AAC discovers provider registrations generically. Its current audit inventories 504 capabilities with 540 passed checks, zero failed checks and three not-tested checks, while full certification remains `NOT_CERTIFIED`. Discovery does not award execution credit.
- Portable experimental AOB runner has no REDOWN/provider imports, requires independent verification and cleanup, and assigns no score/rank. A supplemental graph connects session execution, provider, result, verification, Atlas, source/test references and preservation. Reference clients are not cold-agent trials.
- Additive `FOREVER_WORKS/PHASE26/` model validates through the pinned upstream API. Historical models/evidence are retained unchanged.

## Adapter-only exercise and core changes

The initial checkpoint did **not** already establish portability. Foundational changes were necessary in the coordinator, bridge, schemas, registry, Beta and AAC: opaque locator validation/containment; per-child scope enforcement; account/container routing; compatible version discovery; adapter-built navigation; and replacement of AAC's fixed provider list with a registry. These were missing universal abstractions. A Beta binding-root authorization omission and an AOB missing-cleanup success condition were implementation defects found during review.

Earlier freeze/review discrepancies remain in `verification/phase26/extension-first-review.json`, `extension-before-aob-fix.json` and the earlier freeze files. They are not erased or presented as successful unchanged-core additions.

After completing those corrections, the final snapshot was captured **before implementing** `immutable-reference.mjs` and its owner registration. The final exercise added the adapter, registration/discovery entry and tests. The extension first matched all 17 selected file hashes. The subsequent full regression caught a legacy error-code compatibility defect in multi-account routing. Its narrowly scoped coordinator correction is recorded by the final comparison: **16 of 17 selected files remain unchanged**, with `engine.mjs` changed to preserve the original single-adapter rejection. This is an implementation defect, not an adapter-specific execution path. The strict unchanged-file gate remains nonzero; a new post-correction freeze/extension trial is still required before architectural acceptance. See `extension-freeze.json` and `adapter-extension.json`. This is a bounded extension demonstration, not proof that every future provider feature requires no additive contract extension.

Reproduce:

```sh
npm ci --ignore-scripts --no-audit --no-fund
python -m pip install 'jsonschema[format]==4.26.0' ./clients/python
npm run providers:test
npm run python:test
python scripts/phase26/extension-evidence.py
node scripts/phase26/provider-evidence.mjs
```

The shared baseline is `tests/providers/baseline.mjs`. Read-only providers receive meaningful listing, pagination, metadata, byte-integrity, unsupported-operation and Atlas checks instead of being forced to implement writes. Provider-specific suites extend the baseline. CI includes provider and Python tests. The real R2 adapter/Worker handler inherits the baseline through an offline binding fixture; its result is separate from live acceptance.

## Live R2 evidence

The Python SDK used the real owner bootstrap, canonical coordinator and R2 HTTP adapter in the four authorized buckets under one exclusive run prefix. **28 upload/copy cases passed**, including all 16 directed bucket pairs; an unsafe move correctly returned `UNSUPPORTED_ATOMIC_DELETE`. A fresh Worker-binding read outside the coordinator/adapter verified actual bytes and source preservation. Atlas and durable job data were retrieved.

The initial attempt's Python oracle received HTTP 403 / Cloudflare error 1010 with urllib's default user agent, after REDOWN created the first empty fixture. The failed report is preserved. A separately checked cleanup removed that fixture; the repeat oracle used the accepted `node` user agent. The earlier successful repeat recorded zero failed cases and zero cleanup failures. A further final-code rerun used an independent native-fetch oracle process (no engine/adapter/SDK imports) and recorded 17 selected runtime source hashes matching current files. Its first write received a non-JSON HTTP 404 and was conservatively uncertain; the separate oracle confirmed absence. That failed experiment is retained in `live-final-attempt-1.json`. A distinct fixture cohort then passed all 28 cases and the unsafe-move guard with zero cleanup failures. This does not erase the transient failure or establish automatic recovery safety. Earlier reports are retained separately.

Separate Cloudflare management API inspection confirmed every run prefix empty and public access unchanged (`true,false,false,true`). Both the earlier Worker `redown-p2-lab-6598b905` and the final source-bound rerun Worker `redown-p2-lab-00ffc921` are subject to separate management cleanup/absence records; consult `cloud-cleanup.json` for the final observation. See `live-attempt-1.json`, `live-python.json` and `cloud-cleanup.json`. No existing Worker, bucket policy or unrelated fixture was modified.

Both byte oracle implementations share the transport Worker/R2 binding. It is independent of engine success and adapter readback, **not** an independent S3 implementation. The run used empty, binary and Unicode fixtures up to 8 KiB; it is not the requested exhaustive corpus, large-transfer proof, full failure matrix or competitive benchmark.

## Remaining acceptance blockers

| Requirement | Current boundary / executable follow-up |
| --- | --- |
| General credential profiles and two-credential bootstrap | Owner-selected adapter profiles and leased bearer references work. Cloudflare token provisioning/discovery, conventional S3 credentials, OAuth renewal/revocation and insufficient-permission cold bootstrap remain unfinished. Add scoped credential lifecycle/negative-leak tests before claiming completion. |
| Transfer scalability and recovery | Current 2 MiB ceiling remains. No streamed/multipart scheduling, global queue ownership, automatic safe retries, cross-session job delegation, general resume or full directory synchronization. Existing 0.2/0.3 operation-body duplication still needs consolidation under compatibility tests. |
| Full provider semantics | Native stable-ID rename and directory move/delete unsupported. Local fixture Linux-only. Provider features such as trash/restore, links, notifications, quotas and rate-limit handling are explicit gaps, not implementations. |
| Universal laboratory | Shared baseline and focused faults work. Thousands-of-objects corpus, full media corpus, exhaustive interruption/concurrency/auth matrix and independently implemented S3 byte oracle remain incomplete. |
| rclone comparison | A checksum-verified isolated rclone v1.75.2 installation completed three local trials for each candidate. All resulting bytes matched independent SHA-256 expectations; median end-to-end times were about 382 ms REDOWN and 42 ms rclone. These small local trials are not R2, streaming or competitive parity proof. Actual equivalent R2 comparison remains open without conventional S3 credentials. |
| Cold agents and platform/UI acceptance | No new independent cold-agent trial, Windows/macOS execution, installed extension, or current Chromium acceptance. Existing trials remain historical. |
| Certification and preservation | Full AAC is `NOT_CERTIFIED`. `file:verify` unit/schema portions pass, but historical P2-R2-API source freshness fails on the intentionally changed coordinator. The new additive preservation model does not conceal that unresolved migration gate. |
| Full regression | Existing historical catalog/debug/semantic, removed drag-handle and two previously recorded failure categories remain. See the exact delivery regression report; do not call the full suite green. |

Current execution reports and command logs are in `verification/phase26/`. `status.json` distinguishes implemented, tested, live-verified and blocked scope. Existing `extension/file-engine/readiness.json` is not silently replaced with a success declaration.

## Continue safely

Read `ORIGINAL_PROMPT.md`, `ADAPTER_ONLY_REQUIREMENT.md`, `CONTRACTS.md`, `status.json` and the final diff. Preserve legacy caller compatibility and the new frozen-extension evidence. Address the universal credential lifecycle, streaming/coordinator consolidation and preservation migration before scaling the lab or claiming full acceptance. Future preservation updates must archive previous bindings and explain actual source transitions; do not regenerate historical hashes to make checks green.

For a future authorized live run, create a new leased Worker/prefix using the existing R2 preparation workflow, then explicitly run `REDOWN_ALLOW_LIVE_R2=1 python scripts/phase26/python-r2.py`. Read the fixture manifest and independently confirm cleanup before removing only that new Worker. Never reuse this deleted endpoint or replay the previous run prefix.

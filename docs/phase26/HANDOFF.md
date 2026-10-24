# Phase 2.6 continuation handoff — paused, incomplete draft

## Owner instruction and authoritative assignment

The owner stopped implementation and then requested a handoff and preservation of the original prompt for later access and continuation. This checkpoint preserves work; it does not resume the implementation assignment or certify the draft.

Read both owner documents completely:

1. [Original Phase 2.6 assignment](ORIGINAL_PROMPT.md): exact bytes of `Pasted text(20261024-192431).txt`, including its original line endings.
2. [Mandatory adapter-only architectural requirement](ADAPTER_ONLY_REQUIREMENT.md): the owner's accompanying message, preserved separately. It applies to the entire assignment.

The architecture must ordinarily accept future providers by implementing and registering adapters, without rewriting the Universal API, Python SDK, coordinator, journal, Resource Atlas, AAC, AOB, or Beta Explorer. This must be demonstrated against non-object-storage semantics, not inferred from documentation or two similar fake object stores.

## Repository and checkpoint

- Repository: `thanks-cohn/REDOWN`.
- Inspected starting main: `fc5fe3019fe52316b51a1b0fee4d58779f588548`.
- Work branch: `feat/phase26-universal-agents`.
- Draft code is preserved on that branch only. Main receives this documentation, not the unfinished runtime changes.
- Checkpoint commit: see the repository handoff commit message and branch ref. The published main copy of this handoff identifies its immutable code checkpoint below when available.
- Phase 2.5 was previously promoted to main by explicit owner instruction; its remaining gaps and historical results remain valid evidence. Do not carry forward the earlier assumption that main is still `291858d`.

Use the existing isolated checkout. Do not create a worktree unless requested. Follow `AGENTS.md`; do not refresh frozen historical hashes or change licensing/visibility.

## What actually happened before the stop

The attached assignment and AOB founding documents were read, current main was cloned, the working branch was created, locked Node dependencies were installed with scripts disabled, and the existing engine/session/adapters/Resource Atlas paths were inspected.

Inspection found concrete R2/path assumptions in core identity validation, folder detection, transfer-tree mapping, session scopes and Beta navigation. A draft versioned locator model and reference adapter were started inside the existing engine lifecycle.

No Phase 2.6 Cloudflare operation, Worker deployment, credential provisioning, live fixture mutation, benchmark, independent cold-agent trial, Python SDK implementation, or main runtime change was performed. This phase created no cloud resource requiring cleanup. Earlier Phase 2.5 cloud evidence is historical and must not be reported as Phase 2.6 acceptance.

## Preserved draft files

| File | Draft purpose | Verification boundary |
| --- | --- | --- |
| `extension/file-engine/provider-contract.mjs` | Provider contract version 1.0.0, opaque locator validation, legacy path model, declarative features, registry and containment hook | Draft only; no dedicated contract/schema/security suite exists yet |
| `extension/file-engine/adapters/native-reference.mjs` | Independent reference filesystem with stable IDs, native folders, duplicate filenames and case-insensitive matching; seeded duplicate fixtures | Not registered in the bridge or Beta; no native-adapter acceptance run performed |
| `extension/file-engine/universal-operations.mjs` | Proposed 0.3 operation primitives sharing the canonical coordinator's job/journal/authorization/instrumentation lifecycle | No 0.3 acceptance suite; review duplication and every safety boundary before retaining |
| `extension/file-engine/engine.mjs` | Imports draft model/executor; accepts proposed 0.3 requests, exposes provider descriptions and delegates 0.3 operation bodies | Legacy focused tests passed; no complete 0.3 schema or compatibility migration |
| `extension/file-engine/resources.mjs` | Instruments `createDirectory` through the existing provider span path | No new directory-instrumentation test performed |

The `clients/python/redown`, `docs/phase26`, and `verification/phase26` directories were created. Before this handoff, the Python directory had no SDK implementation. Empty directories are not Git artifacts and do not establish a deliverable.

## Actual verification

Executed after the draft edits:

```sh
node --check extension/file-engine/engine.mjs
node --test tests/universal-file-engine.test.mjs tests/file-engine-authority.test.mjs
```

Observed result: **19 passed, 0 failed, 0 cancelled, 0 skipped**. The captured log shows the focused test process completed with zero cancellations. No additional implementation continued after the stop, and no new tests were run for this handoff. Exact captured output is on the checkpoint branch at `verification/phase26/paused-legacy-regression.log`.

These are existing legacy coordinator/security tests. They do not prove the new reference adapter, API 0.3, portability, Python, full AAC, browser behavior, live R2, or rclone parity. No fresh full reliability/AAC/schema/browser suite was completed in Phase 2.6. Read the baseline reports for earlier failures; reproduce rather than assume they are resolved.

`verification/phase26/paused-checkpoint.json` on the draft branch records file hashes, prompt provenance and scope. The original upload hash is also recorded below, so its preserved copy can be checked independently.

## Immediate review required before extending the draft

Do not treat the draft names, versions, manifests or unsupported-feature labels as final accepted contracts. Review or replace the draft implementation while preserving the owner's purposes.

1. `engine.mjs` advertises/accepts proposed 0.3 requests, but there is no `schema-0.3.json`. Job/evidence envelopes still use the existing version in places. `agent/files/api.mjs` and `session.schema.json` remain 0.2-oriented and will reject the new locator form. Implement consistent version negotiation, validation and backward-compatibility tests before advertising it to external clients.
2. Session location scopes and Beta identity/navigation still assume paths and fixed providers. Neither consumes the new registry. Implement adapter-owned containment and provider-neutral navigation/selection without leaking an owner adapter, collector or store.
3. Capability descriptions are partially inferred from legacy adapters. Audit each advertised feature, consistency guarantee, checksum and auth method. A boolean/declaration is not implementation or proof. Native reference folder move/delete and streaming remain deliberately unsupported in the draft executor.
4. Review whether the 0.3 operation-body module duplicates legacy orchestration. Preserve one canonical planner, execution lifecycle, journal, scheduler, cancellation/recovery path and policy enforcement. An incremental migration is permitted; a permanent second filesystem engine is not.
5. Review source/destination identity equality, alias/case handling, duplicate-name ambiguity, root authority, subtree/cycle protection, path-adapter child construction and destination normalization. Native IDs must remain stable, and ambiguous names must fail explicitly rather than select an arbitrary object.
6. Review per-child authorization, malformed list/read metadata, revision checks, readback verification, checkpoints, partial directory creation, source preservation, cancellation and error-state classification. No native/provider directory support is established by the 19 legacy tests.
7. Add mandatory provider conformance tests and a concrete extension exercise. Freeze/reference-hash the established core, SDK and Beta files before adding the independent adapter, then demonstrate what truly remains unchanged. Do not retrospectively claim adapter-only expansion from this unfinished refactoring.
8. New code still buffers bounded whole objects under the existing 2 MiB ceiling. No streaming/multipart improvement or larger-file support was implemented. Keep limits and unsupported declarations until resource verification justifies changes.
9. The draft adds ES-module imports to the existing coordinator, so verify cycles, browser packaging, generated schemas, source anchors and current preservation bindings. Preserve historical audit results and document intentional current-source transitions; do not silently bless drift.

## Continuation sequence

When the owner resumes the assignment:

1. Fetch current main and the checkpoint branch, inspect divergence and `AGENTS.md`, and preserve any concurrent changes. Read the two owner documents in full. Review the draft before building on it.
2. Establish a fresh local baseline and a machine-readable acceptance matrix distinguishing architectural support, implementation, testing, real-provider verification and production readiness.
3. Finish versioned provider/identity/capability/session contracts, safe registry integration and the independent native reference adapter. Keep valid 0.1/0.2 callers working. Complete provider-conformance and negative authority tests before exposing new behavior.
4. Build the installable, typed Python package and CLI over the authorized REDOWN bridge. No provider transfers or provider-specific auth implementation belongs in Python. Demonstrate identical SDK scenarios against the real R2 path, existing simulation and native reference adapter.
5. Implement provider-oriented credential profiles and safe discovery/expiration/revocation. Distinguish Cloudflare API tokens, actual S3 credentials, temporary grants, connected-app access and private process authorization. Never extract connector/browser credentials. Follow current official provider documentation for token mapping or provisioning.
6. Add trusted owner bootstrap and durable journal/session ownership. Test real operation IDs, restart/reconciliation, ambiguity and cooperative cancellation. No automatic ambiguous write replay or unsafe deletion.
7. Implement the deterministic corpus, generic operation/fault matrix, independent integrity oracle and run-owned cleanup. Use only `test-1-new` through `test-4-new`, preserving access policies. A fresh unique leased Worker may be used only under the original test authorization, after confirming it absent; independently confirm cleanup and removal.
8. Build equivalent rclone/REDOWN workloads and record actual versions, conditions, measurements, dispersion, verification and limits. Preserve unfavorable results and blocked comparisons. Do not claim competitive superiority from feature declarations.
9. Implement the portable AOB runner/task evidence foundation, AAC command-to-engine/provider/result/trace/source/test graph and Forever Works records. No industry rank or unmeasured model-token count.
10. Run the required independent cold-agent and insufficient-permission experiments using only the documented entry point and supported credentials. Record interventions and extra requirements honestly.
11. Run all applicable Python, provider-contract, authorization/credential-leak, engine, AAC, Resource Atlas, schema, browser and reliability checks. Review the diff and cleanup evidence. Promote implementation only under the assignment's acceptance/security requirements and any subsequent explicit owner instruction; otherwise preserve a branch and report exact blockers.

Core existing commands to re-evaluate include `npm run aac:test`, `aac:audit`, `aac:schema`, `aac:certify`, `file:verify`, `resources:test`, `resources:schema`, and `reliability:check`. New Python/provider/lab commands do not exist yet; implement and document them rather than presenting illustrative commands as working.

## Suggested continuation request

> Continue REDOWN Phase 2.6 from `docs/phase26/HANDOFF.md`. Read `ORIGINAL_PROMPT.md` and `ADAPTER_ONLY_REQUIREMENT.md` completely. Inspect current main and the paused `feat/phase26-universal-agents` checkpoint, review its unverified draft, and complete the assignment with adapter-only expansion as a mandatory acceptance gate. Preserve the canonical engine, historical evidence, security boundaries, real-provider restrictions and Purpose-Preserving Reconstitution obligations. Do not stop at the Python simulation client or assume that the draft proves portability. Report actual tests, remaining blockers and the final delivery state.

## Original upload provenance

SHA-256: `8a4a07c802b21bb47de80f4439045434e2fe2a25d71c88e184c177b07bcd8d77`

Size: 32747 bytes. The repository copy retains the original upload bytes and line endings.

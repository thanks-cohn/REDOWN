# V3 mechanical reconstruction and V3+1 gap dossier

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## What the current engine actually does

V3 is a Cloudflare-specific menu engine running inside a larger multi-provider background worker. It supports **Simple**, or **Nested with Narrow/Depth**. Simple lists configured save aliases flat; Narrow builds real shared path ancestry and makes only approved exact records save actions; Depth discovers bounded folder hierarchy from separately selected participating buckets. Simple/Narrow share their destination labels, order and enabled flags today. They do not have independent configurations.

The first-open Browse defect is real in the controlled current UI: bucket arrows never fetch the first folder page. Browse seeds that page; discovered folder arrows then lazy-load. Duplicate same-path aliases generally retain distinct action IDs and one exact route per click, but Simple suppresses explicitly named aliases to the selected default root. Natural Narrow ancestry merges even when the user tries to create two whole named branches. These are source/fixture facts, not design assumptions.

CURRENT durability, transactional journals, period backups and encrypted user-file backup support really exist at this HEAD. They are logical IndexedDB structures, not perpetually written filesystem JSON files. Daily/weekly rollover occurs on use; no perpetual midnight execution is promised. Some direct local writers bypass the durable commit lane, so universal CURRENT authority remains a concrete repair risk.

The primary Cloudflare default becomes a clickable leaf when no extras exist; with extras it uses siblings, separator, **Home last**. Home saves the chosen lowercase redown root. REDOWN Go Home is separate dashboard navigation. Ordinary V3 URL saves check the returned exact folder and HEAD key/size/etag/source metadata before verified completion. No live provider write was performed to validate this pathway.

## Status at a glance

| Status | Meaning here |
|---|---|
| CURRENTLY WORKING, locally scoped | actual domain alias/trie/route fixtures, first-open trace, remembered depth5→3→5, CURRENT transaction tests, original toolbar fallback observations |
| BROKEN / deficient | extra Browse prerequisite; independent mode editing missing; same-name ambiguity warnings missing; alternate full branches absent; current test suites and architecture freshness not green |
| SOURCE-CONFIRMED risk | mirror-only writes compete with durable restore; global V3 plan/boot/composition couples providers; native structural reorder recreates destination rows |
| UNVERIFIED | installed Chrome visibility/gesture/policy, live provider authorization/write/readback, real MV3 interruption and multiwindow races |
| PROPOSED | generic S3 adapters/index evolution, independent per-mode aliases, opt-in branch instances, lazy picker contract, bounded retention/replay and optional S3 Explorer |

## Exact baseline and verification

Audited code: `1f85185f87c52b13e01c7c9069464668c2ad47d0`, branch `codex/v3-parity-first-reconstruction`, extension0.5.27, Linux/Node24.19.0. Full source hashes: [census](evidence/source-census.json), [reliability source inventory](evidence/reliability-report.json). Only this new audit folder is changed/committed. No engine/UI/manifest/test/canonical model/historical evidence/tag changes, native operations, deployments, credential retrieval or live account access were performed.

- Full suite: **1001 tests, 904 pass, 97 fail, zero skipped/canceled**.
- Focused existing suite: **125 tests, 109 pass, 16 fail**.
- Reliability: syntax/API registry/issue inventory pass; architecture fails. Regression runner marks incomplete: six registered failures,91 other current failure events, one missing historical baseline test name. “Unregistered” is relative to its old baseline file, not “introduced by this audit.”
- Separate actual-source observations:15 alias/path inputs; bucket disclosure request counts0→0→1→2; six known nodes retained at depth5→3→5; early/late core import faults preserve one toolbar listener and BOOT failed-core status.
- [Failure names](evidence/FAILURES.md), [summary](evidence/verification-summary.json), [command ledger](evidence/COMMANDS.md). No failures or frozen hashes were rewritten. Some current test failures are stale sliced-VM/global assumptions; others remain unresolved product/harness expectations. None is silently waived.

## Reading map

1. [Source census, writer ownership and failure dependencies](01_SOURCE_CENSUS_AND_BOUNDARIES.md)
2. [Mechanics Atlas: open → browse → edit → persist → register → click → save](02_MECHANICS_ATLAS.md)
3. [Modes: actual behavior, independent expressions and state alternatives](03_MODES_ACTUAL_VS_DESIRED.md)
4. [Exhaustive duplicate/alias/path casebook with serialized inputs and exact routes](04_DUPLICATES_ALIASES_AND_BRANCH_INSTANCES.md)
5. [First-open root cause, request trace and proposed lazy picker](05_FOLDER_BROWSER_FIRST_OPEN_FORENSICS.md)
6. [Storage keys, CURRENT/journal/backup truth and authority gaps](06_STORAGE_INDEX_AND_JSON_REALITY.md)
7. [S3 adapter proposal and independent non-S3 provider boundaries](07_S3_ADAPTER_AND_CLOUD_ISOLATION.md)
8. [Forever Works preservation, fault matrix and regression evidence](08_RELIABILITY_FOREVER_WORKS_AND_REGRESSION.md)
9. [Current-versus-vision gap ledger](09_CURRENT_VS_VISION_GAP_LEDGER.md)
10. [Ordered, reversible future engineering blueprint](10_V3PLUS1_BLUEPRINT_FOR_NEXT_CODEX_REQUEST.md)
11. [Unapproved owner choices and recommended defaults](11_OWNER_DECISION_REGISTER.md)
12. [Inputs for owner/ChatGPT to draft the separate next request](12_NEXT_REQUEST_INPUT_CHECKLIST.md)
13. [Evidence directory and reproducible command index](evidence/COMMANDS.md)

## Owner handoff

Preserve the tested exact identities, natural trie, bounded durable knowledge and original toolbar recovery. Repair the authority gaps and shared registrar failure boundaries before widening the engine. Reuse one intuitive picker with separate mode presentation/alias state after the owner selects its migration semantics. Define an S3 adapter around exact connection identity; prove a fictional second vendor before any real integration. Drive, Dropbox and OneDrive keep their own engines and credentials, sharing only a neutral native registration contract.

Recommended smallest next engineering scope is baseline/harness classification plus all-writer CURRENT durability. A separate later stage can neutralize registrar dependencies, then introduce the adapter seam and picker repair. These are proposals; this audit does not start them. Outstanding decisions include per-mode model, root aliases, duplicate warnings, alternate branches, Apply/partial status, retention/timezone and credential ownership. Installed Chrome and separately authorized disposable provider acceptance remain mandatory before release claims.

Master acceptance gates: G01/G11 documentation-only boundaries are verified by Git preservation evidence; G02–G09 reconstructed in chapters with explicit source/local/unknown distinctions; G10 records all failures and no Chrome/live pass; G12 supplies blueprint/checklist. Runtime acceptance is not green. First-open G06 has actual DOM reproduction; identity G07 has exact synthetic routes, while provider authorization stays unverified. No audit gate is used as a substitute for later installed/provider acceptance.

## Concurrent owner notes preserved

Before push, the remote branch gained five documentation-only commits ending at26e1d70. The audit was rebased onto them; executable source and tests remain identical to the pinned audited baseline. Read [the concurrent vision addendum](13_CONCURRENT_OWNER_VISION_ADDENDUM.md) for the new Shelf navigator proposal: Parents/Siblings/Children panels, each up to three pill rows tall with independent horizontal overflow, optional scoped autocomplete, click-only navigation, explicit Save/Apply, duplicate confirmation and minimal Depth. These are future inputs, not existing behavior. The audit commits themselves add only this dossier folder.

# REDOWN → Click2Cloud V3+1 → Standalone Click2Cloud

**Shared test-system guiding principle:** [Universal Agentic Test Corpus & Pipeline](../IMPORTANT/UNIVERSAL_AGENTIC_TEST_CORPUS_AND_PIPELINE.md) — reuse one logical scenario generator/runner across BOOT, RIGHT-CLICK and UNIVERSAL FILE API, with real owners, independent oracles, permanent regression evidence and future-project adapters. This strengthens—not replaces—the transplant, Chrome/provider and release gates.
## Transplant-first, then branch the proven REDOWN experience for a developer-accessible release

**Owner direction:** November 3, 2026  
**Home:** `thanks-cohn/REDOWN/latest-1132026/`  
**Engineering source:** [`thanks-cohn/Click2Cloud`](https://github.com/thanks-cohn/Click2Cloud)  
**REDOWN reference and eventual transplant target:** [`thanks-cohn/REDOWN`](https://github.com/thanks-cohn/REDOWN)  
**Status:** **PLANNED** — product and implementation roadmap, **not** evidence of completion or permission to deploy, merge, publish, modify live objects, or change production OAuth/billing.

## 1. The end goal

**We build one outstanding, programmatically testable Click2Cloud V3+1 right-click engine; transplant it safely into REDOWN; then branch from the newly proven REDOWN product to produce a standalone Click2Cloud release for users and programmers.**

The future standalone product should **look and feel like REDOWN**, deliberately retaining most of the successful, useful REDOWN experience: its carefully developed visual language, Shelf, provider cards, Cloud Explorer, History/GO TO, direct saves, onboarding and real cloud behavior. It adds the more reliable V3+1 right-click engine and **new, supported programmer-facing APIs**.

**Initial standalone Click2Cloud excludes the SKIN API and the owner-named “Mask API.”** The existing REDOWN roadmap calls the related character-customization work **MASCOT API**. Until naming is clarified, treat **Mask/Mascot extensibility API** as **excluded from this Click2Cloud launch** along with SKIN API. This excludes those **public/framework customization APIs**; it does **not** require stripping the already working visual appearance, static built-in themes, decorative assets, or simple visual feedback that make REDOWN recognizable. Do not promise the full Mascot/Skin plugin ecosystem in Click2Cloud's first release.

The aim is **one dependable core**, not a third implementation of the same file engine, Chrome registrar or cloud service, and not a bare demo with attractive but inert controls.

### The two product tracks, in order

| Track | Purpose | What ships or changes |
|---|---|---|
| **A — Harden and transplant the V3+1 engine into REDOWN** | Replace problematic Cloudflare V3 menu configuration/projection/route coupling with a clean, independently testable engine | REDOWN keeps its current product identity and proven operations. V3+1 arrives behind a reversible feature flag after acceptance. |
| **B — Branch off the proven REDOWN experience into standalone Click2Cloud** | Offer a separate Click2Cloud product preserving most of REDOWN's successful UX, upgraded with the V3+1 engine and documented programming interfaces | Dedicated Click2Cloud packaging/identity, REDOWN-derived visual system, selected Explorer/Shelf/History/cloud features, stable developer API, **without SKIN or Mask/Mascot APIs**. |

**Do not start Track B from an unproven right-click prototype.** Choose and pin an accepted REDOWN integration checkpoint first. Then establish the standalone product branch/repository from that known-good source, deliberately including the V3+1 modules and selected REDOWN product features. Keep two distributable products separated by build, configuration, release automation and versioning.

## 2. What we inherit instead of rebuilding

**KEEP / ADAPT / EXCLUDE decisions must be grounded in a source and test inventory**, not an indiscriminate copy of REDOWN's current behavior. The [source-backed V3 vs V3+1 audit](../final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md) provides the initial map.

| System | REDOWN transplant | Future standalone Click2Cloud |
|---|---|---|
| Universal File API, operations and provider adapters | **KEEP** existing authoritative API/transport owners and proven semantics | **REUSE/ADAPT** the same API contracts and tested provider adapters, not a duplicate file engine |
| Cloudflare OAuth, R2 entitlement, Worker activation/default `redown` bucket | **KEEP** authorized account-specific service and consent boundaries | **REUSE/ADAPT** tested flows; no assumed token, R2 enrollment, billing approval or automatic permission bypass |
| Right-click V3+1 Simple / Nested / Depth | **TRANSPLANT** isolated modes, shared inventory and canonical menu | **INCLUDE** the hardened engine as core Click2Cloud functionality |
| Chrome context menu lifecycle and MV3 startup/repair | **KEEP one native menu owner**; integrate via controlled adapter and feature flag | **INCLUDE** one registrar/click handler, source-backed repair, restored state and real Chrome acceptance |
| Google Drive / Dropbox / OneDrive | **PRESERVE** separate native flat leaves, independent handlers and credentials | **INCLUDE** supported providers as independent flat leaves; do not nest under Cloudflare or assume parity without proof |
| File Explorer and navigation | **PRESERVE** REDOWN's real Explorer; V3+1 engineering workbench must not replace it | **REUSE** selected successful Explorer capabilities and the actual Universal File API, with honest capability gating |
| Shelf, provider cards, History, verified GO TO and Quick Glance | **PRESERVE**, including correct save feedback only on independently verified outcomes | **REUSE** the polished REDOWN-style experience where features meet release acceptance |
| REDOWN appearance / visual identity | **PRESERVE** | **REUSE** layout principles, typography, spacing, themes, polished interactions and relevant assets, while making standalone Click2Cloud product identification clear |
| SKIN API public framework | REDOWN future roadmap remains independent | **EXCLUDE from initial standalone release** |
| “Mask API” / planned MASCOT API extensibility framework | REDOWN future roadmap remains independent | **EXCLUDE from initial standalone release** |
| Agentic diagnostics / Glaciaring | **INTEGRATE** safely behind trusted authorizations and bounded low-cost signals | **INCLUDE** safe diagnostic capabilities with documented consent, privacy and authenticated access |
| Programmer-facing APIs | Existing internal APIs remain privileged | **PUBLISH a separate documented, secure supported API/SDK contract**; do not just expose unrestricted internal debug endpoints |

**Aesthetic continuity is a product requirement:** Click2Cloud should feel like the REDOWN experience the owner has already refined—not a visually unrelated engineering demo. Match the existing Shelf, Explorer, card treatment, typography, color/theme conventions, spacing and interaction quality; where a standalone feature is removed, preserve coherent layout and styling instead of dead buttons. Avoid promising pixel identity until design review.

## 3. Track A: first make V3+1 a proven engine

### A0 — Keep clear boundaries between old V3, V3+1 engine and the Quick Tour

REDOWN's older [November 3 V3+1 engine explanation](V3_PLUS_1_ENGINE_EXPLANATION.md) describes the **onboarding/Quick Tour teaching experience**, where a fictional sample image shows *faux, zero-write* Simple/Narrow/Depth menus. That remains a useful safe teaching surface.

The separate Click2Cloud engineering repository now uses **V3+1** for the **real next-generation deterministic menu engine**. These usages are complementary, **not permission for the faux tour to become an authorized save route**. Keep three distinct surfaces:

1. **Fictional Quick Tour:** zero cloud writes, zero real configuration changes, zero Chrome registration; sample image can be clicked to understand modes.
2. **Real Dashboard/Explorer right-click:** actual authorized image/context → shared canonical MenuSpec/action resolver → real verified save (or explicit refusal).
3. **Real native Chrome right-click:** native rows and clicks generated from the **same canonical model** and dispatched to the same authorized operation owner.

The real in-dashboard working twin and native menu must share *semantics*; the browser's native visual and lifecycle constraints still need independent tests. No DOM illustration alone proves native Chrome behavior.

### A1 — Golden behavioral atlas: 500 written, 1,000 target, 900+ verified an intermediate aim

**Starting assets already committed in Click2Cloud:**

- [337 original condition-to-behavior cases](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/milestones/V3P1_CONTRACT_SCENARIOS.json).
- [163 additional multi-step user journeys](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/milestones/V3P1_163_ADDITIONAL_USER_JOURNEYS.json).
- [Combined 500-case atlas](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json).
- [Codex request to expand to 1,000 and implement testing](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md), guided by [Click2Cloud's AGENTS.md](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/AGENTS.md).

**These are scenario descriptions, not 500 passing tests.** Every case needs a trusted starting state, real user/system action sequence, an independently authored expected menu/action/state outcome, forbidden side effects, source/test mapping, and required evidence class. Expand to 1,000 **substantively distinct**, reviewed cases, not duplicate names, different random seeds or trivially reworded stories.

The owner's intermediate goal is **900+ meaningful verified logical scenarios**, ideally 1,000, plus broad deterministic generation/property/state-machine/fault tests. This is **not a 90% release threshold**: any unresolved P0 safety, wrong-account save, privacy, false success, startup reliability or critical broken behavior blocks launch even with 999 local passes.

### A2 — Scenario Laboratory: Python-like orchestrator over the REAL JS engine

Repeat the successful REDOWN [Python CLI ↔ Universal File API Laboratory approach](../docs/beta/PYTHON_CLI_UNIVERSAL_API_HANDOFF.md) with a thin **agent/Python/Node scenario controller** that calls the **actual V3+1 JavaScript engine**, using injected adapters for deterministic external states and explicit authorized bridges for live integration. Do **not** implement a second menu compiler/uploader/OAuth/History service in Python.

```text
Owner-reviewed expected action/menu/state (independent oracle)
  → fixture/seed/ordered user clicks and mode/account transitions
  → ACTUAL Simple, Nested, Depth → shared MenuSpec/action resolver
  → actual protected engine API + injected/native Chrome adapter
  → actual authorized Universal File API / provider adapters where permitted
  → Glaciaring full critical-boundary trace + honest coverage gaps
  → compare expected tree, routes, accounts, byte receipts and side effects
  → PASS/FAIL/BLOCKED/NOT_TESTED/UNKNOWN + reproducible fixture
  → focused repair, rerun case + neighbor invariants + complete suite
```

The Laboratory must programmatically answer concrete journeys like:

- Only Google Drive connected: which **flat native save leaf** is eligible? What exactly happens when clicking disconnected Cloudflare or Dropbox (hidden vs explicit Connect action is an owner policy decision, not an invitation to invent a working save)?
- Cloudflare authorized but R2 not enabled: what is visible? What can the user do without billing consent?
- R2 verified: does one default `redown` destination become a direct Simple leaf, and does this leave Drive/Dropbox/OneDrive routes intact?
- Cloudflare extra Simple folders added: do the exact submenu rows, separator and final Home default-save appear? Are parent branches navigation-only where Chrome requires it?
- Nested configured branch selected: do only its chosen endpoints and natural ancestors appear? Does `Save here` handle actionable parents with children?
- Depth enabled: do previously unconfigured verified folder descendants become eligible, with honest partial-inventory/overflow evidence?
- Token expires, provider fails, two Apply requests race or the MV3 service worker restarts: does the menu recover and **every stale action fail closed**?
- Two unrelated faults happen: can Glaciaring reveal **both** and an intentionally absent checkpoint, rather than stopping at the first suspicious signal?
- Same label/path exists across two Cloudflare accounts: can no click route to the wrong account/bucket/prefix?
- A provider returns `confirmed:true` without a verified object: are SUCCESS!, counters and History success withheld?

Programmatic simulation may exercise *logical nested clicks*, menus and state transitions **without provider writes**. Real authorized save scenarios must independently verify actual bytes, key/prefix and provider confirmation; simulations cannot be relabeled as live evidence.

### A3 — Glaciaring improves diagnosis, never hides faults

The agent should consume a complete-enough, paginated, privacy-safe debugging API exposing the canonical logical menu, omissions, desired/generated/ACK/observed states, action identity, source/test anchors, correlation IDs, dependency links, simultaneously failing sibling paths, missing beacons, drop/eviction counts and unresolved UNKNOWNs.

This is **low overhead through efficient instrumentation and deferred retrieval**, not a reason to omit critical observations. Never reward Codex for fewer inspected files/iterations when failures were missed. Keep expected goldens separate from actual outputs and use intentional mutation tests to catch a wrong nested row, stale ACK, wrong account, false receipt or missing error signal.

Existing proof in the Click2Cloud implementation is **partial**: a reported 121 passing local tests and a diagnostic lab, but missing real installed native Chrome and authenticated provider proof, incomplete observable boundaries, and an unresolved repeat menu-compilation latency gate. Refer to the [implementation evidence](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/GLACIARING_EVIDENCE.md) and refresh evidence against the commit being used; do not mistake old reports for present correctness.

### A4 — Only then transplant into REDOWN

Use a **pinned REDOWN baseline + separately pinned Click2Cloud engine commit**. Implement a narrowly owned adapter/feature-flag boundary around **Cloudflare V3 right-click mode config/projection/resolution**. Preserve REDOWN's existing single menu registrar, auth/activation services, current durable state and journal, Universal File API/provider operations, other providers' independent flat menus, verified transfer completion, Shelf and History.

Mandatory reversible acceptance: data-safe migration including all saved labels/targets/disabled definitions, exact native menu parity in an approved installed Chrome profile, service-worker cold boot/recovery, actual R2 object readback and correct History GO TO, other-provider parity, source privacy, no duplicate roots, latency/memory repeatability, and rollback to known-good V3 without deleting user cloud objects.

**Do not transplant while these gates are FAIL/BLOCKED/NOT_TESTED.** REDOWN production must keep working while the engine is developed, tested and compared. The newer **BOOT API reliability gate** is especially important: a correct menu model is useless if the service worker fails to start, the Shelf cannot open or the registrar never loads.

## 4. Track B: branch REDOWN after the V3+1 transplant proves itself

**Branch point:** the reviewed, release-candidate **REDOWN commit that already runs and passes V3+1 acceptance**, not merely the Click2Cloud lab branch. Tag or otherwise pin this baseline with provenance, passing suites, migration receipt and rollback point. Create a **separate standalone Click2Cloud product branch/repository and packaging pipeline**, then adapt features intentionally.

### B1 — Reuse the REDOWN look

The standalone release keeps the **same design family and familiar quality**: clean cards, modern typography, high-quality Shelf, Explorer navigation, History with GO TO, relevant image/preview features, and the built-in themes that are compatible with the standalone edition. Keep animations lightweight, responsive, comprehensible and correctly gated on verified results.

Aesthetic parity should be documented with screenshot/component acceptance for the supported shared views. Build a **shared design-token/component extraction or explicitly versioned reuse plan**, avoiding two visual branches silently drifting. Avoid dead Skin/Mascot settings or launch UI that promises APIs not included.

**Excluding SKIN API and Mask/Mascot API is an API/product-scope decision, not an aesthetic downgrade.** Do not require third-party skins, theme runtimes or mascot/plugin SDKs to render ordinary built-in REDOWN-style UI.

### B2 — Reuse successful functionality, not known REDOWN bugs

Decide KEEP / ADAPT / EXCLUDE for each real REDOWN capability through a checked feature matrix, including:

- **Core release candidates:** first-run setup, connect/reconnect, verified Click2Cloud right-click for all supported providers, R2 default destination/activation, direct saving, real Universal File API-backed Explorer, upload and navigation, preview when supported, Shelf and History GO TO, sensible verified feedback, durable settings, failure/recovery and privacy.
- **Optional parity per release acceptance:** premium Quick Glance/history archive, multi-URL developer export, advanced batch actions, snapshots, theme-specific premium effects, future independent S3 adapters, optional mascot *display* effects (without public Mascot/Mask API). Do not promise these without implemented, verified entitlement and feature tests.
- **Excluded from initial standalone API surface:** SKIN API, Mask/Mascot API, experimental REDOWN-only customization/plugin ecosystems, and any unsupported visible control whose underlying operation is not implemented.

Keep existing provider authentication boundaries and separate direct leaves. Decide which standalone capabilities are public/free/premium only after source-backed functionality, provider terms, entitlement, privacy and UX review. The aim is **most of successful REDOWN**, not every dormant roadmap checkbox.

### B3 — New APIs for programmers, without making privileged internals public

The programmer-oriented value is that the user/agent can programmatically query, simulate, automate and diagnose supported **Click2Cloud operations** through a stable, explicit, versioned interface, analogously to REDOWN's Universal File API. Define **two security tiers** rather than opening Glaciaring wholesale:

1. **Supported Developer API/CLI/SDK:** documented `describeCapabilities`, read-only `inspectMenu`, `getModeConfig`, `simulateMenuAction` (strict **zero cloud writes**), `getOperationStatus`, safe permitted History queries/exports, and approved real file API actions (only with explicit consent and correctly scoped provider/session permission). Use closed schemas, typed error/results, stable versioning, pagination and no promises of privileges the caller does not possess.
2. **Trusted Glaciaring Agent Debug API:** deeper internal event/coverage/dependency receipts, error traces, diagnostic exports and replay. Available **only** to properly authorized local owners/developers/agents through a protected extension/test host; redact credentials, original source/page URLs, private filenames where applicable, and secret provider metadata. No public anonymous listener or use of debug consent to bypass provider write consent.

Provide actual developer docs, minimal Python/JS examples, inspectable input/output schemas, fixtures, versioning/compatibility and clear rate/size/error/privacy limits. The API must operate on the same authoritative engine as the GUI, so it does not tell programmers an object was saved unless that underlying action has provider proof.

**Programmer access is a product feature, not authorization to distribute Cloudflare tokens, publish private Workers, disable OAuth boundaries or expose user browsing provenance.**

### B4 — Separate release gates for the standalone edition

- **Product identity:** name, icon, package/extension ID, licensing and distribution rights reviewed; avoid cross-product update collisions.
- **Shared look:** parity of agreed baseline REDOWN views/themes, accessibility, editor, Shelf and Explorer; remove only excluded API-specific controls.
- **Functional parity:** every advertised supported action works through the real shared engine or is explicitly disabled/omitted.
- **Developer API:** published versioned operations; safe SDK/CLI tests, permission scopes, privacy and zero-write simulation guarantees.
- **Browser/provider:** installed Chrome native menus, MV3 restart, verified real provider saves, no-tab direct saves where supported, rollback/migration and correct account/destination.
- **Performance:** repeated p50/p95/p99 measurements of right-click registration, click routing and diagnostic instrumentation; no shortcut by suppressing required error detection.
- **Operations:** no uncontrolled live resource writes; build signing/distribution, support/recovery documentation, privacy/security review and license consistency.

Only publish standalone Click2Cloud when the supported subset of these gates is **actually PASS**, including all critical failure cases. A 900+ verified logical scenario milestone is a strong engineering lead indicator, **not enough by itself** to assert launch safety.

## 5. Execution sequence and durable evidence

| Milestone | Deliverable | Acceptance / evidence | Status now |
|---|---|---|---|
| **C0 — Contract** | 500-case current draft atlas; then 1,000 substantive golden scenarios, fully reconciled expected menu/action semantics | Source-linked IDs, independent oracle review and tracked unresolved product decisions | **IN PROGRESS**: 500 drafts exist, not verified |
| **C1 — Scenario Lab** | Scriptable **real JS engine** controller with optional thin Python wrapper | Reproducible golden execution, state machines, fault injection, per-case receipts; no second engine | **OPEN** |
| **C2 — Glaciaring** | Cheap full critical-boundary diagnostics and regression repair loop | Detect masked/multiple faults, honest coverage gaps, measured cost | **PARTIAL** per latest available evidence |
| **C3 — Browser and provider** | Installed Chrome parity + actual authorized R2 and other-provider saves | Actual nested item/action observations, byte/object identity readbacks, no false success | **BLOCKED / UNVERIFIED** per latest available evidence |
| **C4 — Transplant** | Feature-flagged V3+1 replacement in REDOWN with migration and rollback | Native Chrome, BOOT, other-provider parity, History, safe old-V3 rollback all PASS | **NOT DONE** |
| **C5 — Product branch** | Copy/branch the tested **post-transplant REDOWN baseline**, with Click2Cloud packaging and look | Separate product identity; chosen REDOWN features preserved; Skin/Mask-Mascot APIs excluded | **PLANNED** |
| **C6 — Developer interfaces** | Documented stable Click2Cloud Developer API/SDK alongside protected Glaciaring | Secure consent, read-only simulation, authorized real operations, good sample programs | **PLANNED** |
| **C7 — Standalone launch** | Public standalone Click2Cloud product with REDOWN-quality visual experience | Release candidate certificate: functional, Chrome, provider, privacy, performance, API and packaging PASS | **NOT RELEASED** |

For each milestone commit a **real evidence receipt**: source revision, exact scenario/build versions, pass/fail/blocked/not-tested counts by evidence class, source/test links, Glaciaring diagnostic repros, environment constraints, and any missing owner decisions. Always distinguish **working code**, **an injected test**, **an actual installed Chrome observation**, **an authenticated provider receipt**, and **a future product intention**.

## 6. Non-negotiable owner decisions

- **First stabilize V3+1 and transplant into REDOWN. Only after it proves itself, branch REDOWN to create standalone Click2Cloud.**
- Standalone Click2Cloud retains **most verified REDOWN functionality and the REDOWN look**. Exclude the **SKIN API and Mask/MASCOT extensibility API** from its initial release.
- Do not turn Click2Cloud into a second redundant cloud engine or a technical-only simulator. The intended standalone product has a real, coherent end-user experience.
- Expose new APIs to programmers **safely**, with permissions and versioning, without publishing privileged agent-debug internals.
- Use **1,000 meaningful golden journeys plus Glaciaring** to make development truly iterative, with independent expected outcomes, permanent regression tests and truthful missing evidence.
- Keep original provider routes, authorization, object bytes, History and data safe. No browser click or test is allowed to silently save somewhere else.
- Preserve product appearance, but reject old V3 mode coupling, hidden failure modes and automatic success assumptions.
- **No code transplant, new product branch, merge into main, deployment or store release is authorized by this document alone.** Those are future reviewed execution steps.

## 7. References for the next Work/Codex conversation

**Within REDOWN:**
- [V3 vs V3+1 source audit](../final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md)
- [November 3 onboarding and faux Quick Tour](V3_PLUS_1_ENGINE_EXPLANATION.md)
- [November 3 Need to Do](NEED_TO_DO.md)
- [Python CLI ↔ Universal File API handoff](../docs/beta/PYTHON_CLI_UNIVERSAL_API_HANDOFF.md)
- [Future MASCOT and SKIN API roadmap](../NEED_TO_DO/11012026.md)
- [REDOWN agent entry point](../AGENTS.md)

**Within Click2Cloud:**
- [Click2Cloud agent charter](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/AGENTS.md)
- [Golden 500 atlas](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json)
- [1000-case Codex request](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md)
- [Glaciaring implementation request](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/CODEX_GLACIARING_IMPLEMENTATION_REQUEST.md)
- [Scenario Laboratory prelaunch milestones](https://github.com/thanks-cohn/Click2Cloud/blob/feat/glaciaring-agent-debug/docs/milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md)

**Light next-conversation starter:**

> Read REDOWN `latest-1132026/CLICK2CLOUD_TRANSPLANT_THEN_STANDALONE_DEVELOPER_RELEASE_ROADMAP.md`, the V3 vs V3+1 source audit, Click2Cloud `AGENTS.md`, its 1000-case Codex request and latest evidence. Implement and prove the real-engine Scenario Laboratory + Glaciaring-assisted iteration first. Preserve REDOWN's successful services and aesthetics. Do **not** transplant before Chrome/provider/BOOT/rollback gates pass. After REDOWN accepts V3+1, use the pinned REDOWN checkpoint to plan a separate Click2Cloud product retaining the REDOWN look and successful features, excluding SKIN and Mask/MASCOT APIs while offering safe versioned programmer-facing APIs. Report what is verified versus merely planned.

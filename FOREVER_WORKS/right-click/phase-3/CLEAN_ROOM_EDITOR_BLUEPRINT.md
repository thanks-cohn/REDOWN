# Non-executing reconstruction blueprint

30 October 2026. **AUDIT ONLY.** Source `b7178442c26c7723a9a650613ef65ba38ce26b21`. All implementation facts below are pinned source inspection unless a named local fixture is cited. No installed Chrome or live-provider verification. Proposed boundaries are documentation, not existing APIs or accepted Forever intent.

**PROPOSAL ONLY.** Replace the setup presentation in a separate task; do not replace saved state, menu generator, resolver, credentials or transfer engine. This document is not an executable API or permission to code.

## Composition and retained experience

Retain the existing Right-click setup and Bucket URLs tabs, including independent panels and keyboard selection. Within setup use a stable toolbar for mode, prepared source, +Location, Save and Reload; a clear status row; a folder-outline workspace; and an explicitly separate optional activation/setup disclosure. Each section owns one purpose. Use existing theme tokens, restrained surfaces, consistent alignment and spacing, coherent typography and visible focus, with red deletion in its own predictable corner/action slot.

Simple entries show label, clear account/bucket identity and exact folder path; secondary label/order/root/creation controls can use named disclosures. Nested groups show one clear owner identity per actual profile, root bucket, authentic children and selection ancestry. Same account title does not justify merging distinct profiles. Preserve useful folder browsing, not duplicate empty cards. Collapse changes presentation only. Deeper visual indentation can be bounded while path/DOM/model remain fully hierarchical.

Every rendered Simple primary/extra, Nested group/root/child retains permanently visible red ×, no tooltip and no hover discovery. Group Undo restores stable roots. Deletion wording makes menu-only scope clear without calling any remote delete. Focus moves to a predictable surviving control; screen-reader labels distinguish group/root/branch. At narrow widths stack related fields, wrap paths, retain accessible secondary controls and scroll the outline as needed. No arbitrary hiding, repeated cards or viewport-induced data mutations.

## State ownership and transitions

Keep saved baseline/signature, editable full profile clone, selected mode, validation/readiness, and ephemeral presentation state separately. Existing-only selection updates draft; explicit Create performs marker write and verifies before adopting draft; Add child creates an incomplete menu row only. A visibly complete row is not automatically saved. Mode persistence is immediate in today's contract and must be clearly represented if retained.

Load saved snapshot → versioned draft conversion if eligible → discover root/child readiness without claiming save → edit → validate → existing guarded commit → distinguish saved from registered. Conflict preserves draft and offers deliberate Reload/reconciliation; never retry stale patches with a fresh baseline silently. Registration error preserves saved state and provides bounded retry through the same save path. Unknown completion gets honest unknown state.

No display component may directly write profiles/rightClickMode or call Chrome.contextMenus. Rendering must not materialize folders, activate storage or upload files. Explicit dedicated setup/activation remains an infrastructure workflow with its own confirmation/effects. Do not mistake cfAccounts/cfBuckets discovery for Worker readiness.

## Build sequence for a future authorized task

1. Freeze current positive descriptor/target fixtures, including the P1/P8 inputs and no-resurrection cases.
2. Introduce a local thin view adapter over current load/project/validate/save only, no public new messages.
3. Rebuild sections incrementally with existing tabs/outline/red ×; preserve IDs/target paths and inactive mode data.
4. Review migration/readiness, naming, singleton lifetime and truthful outcome presentation before declaring replacement safe.
5. Run [regressions](REGRESSION_AND_ACCEPTANCE_MATRIX.md), compare actual plan/resolve outputs and approved browser rendering; independently authorize any live provider test.

Exit requirement: all supported existing valid R2 settings produce same descriptor IDs/order/parent/contexts/target. Intentional naming differences need explicit owner acceptance and path-invariance proof. New code must not import historical whole-profile writers, tree fallback, dormant studio layout or an imagined generic cloud API.

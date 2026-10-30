# Phase 2: why Legacy could feel reliable while Modern diverges

[Route](README.md) · [A–Q differential](EQUIVALENT_WORKFLOW_DIFF_MATRIX.md) · [raw reproduction](evidence/phase-2/differential.json)

Source **2e65ba137a35e1656b691fd2fdbf95082a0cdf4e**; historical checkpoint **515c272c48f89eb3f509fa2c7a5a02e0db53f66b**. Product source is unchanged since Phase 1 (Git diff e621ef2..HEAD for extension/tests is empty). This is an audit, not a fix.

## Main answer and limit

**OWNER_REPORT:** Legacy worked for the owner; Modern wiring does not, feels cluttered/unaesthetic, and appears to take cues from Legacy. Owner clarifies that the useful folder outline should remain and Simple's default name should be the bucket, not file/Files. This is real product evidence; it does not identify a unique failing installed-browser boundary.

**CONFIRMED locally:** Legacy selection→autosave and Modern selection→draft are different contracts. Historical bucket-fallback naming and current path-fallback naming differ. Legacy-only tree state is no longer native authority and migration needs an explicit successful Modern save. Saved configuration and successful Chrome registration are different outcomes. These mechanisms explain reproducible classes of “the editor looks changed but Chrome disagrees.” They do **not** prove which occurred in the owner's browser.

**UNRESOLVED:** there is no owner-browser model/registration/error trace or precise click sequence proving one universal runtime root cause. Do not blame CSS for all menu omissions or claim the Legacy writer is still overriding Modern. Current legacy menu callbacks cannot persist definitions through their guarded preference lane. The system still shares profiles, preparation and naming defaults; data inheritance is not competing editor authority.

## Prioritized confirmed differentials

| Finding / first divergence | Evidence and observed result | Counterexample / boundary | Classification |
|---|---|---|---|
| F1 Edit→persistence timing | D1 actual historical selection callback saves prefix photos after debounce; Modern Add renders3 cards while persisted extras remain1/native destinations2, then explicit Save yields extras2/native3 | Modern Save succeeds and produces expected plan in fixture; autosave expectation alone is not a broken saved-model route | HISTORICAL_SOURCE + LOCAL_TEST; confirmed contract difference, owner incident attribution UNKNOWN |
| F2 Automatic Simple name | D6 blank label + prefix files + bucket art: historical bucket fallback renders art, current renders files | Explicit custom label wins today; empty prefix already falls back to bucket. No proof all owner profiles have blank labels | SOURCE_INSPECTED + LOCAL_TEST; confirmed mismatch with newly stated owner default |
| F3 Legacy-only upgrade gate | D2 saved menuTree-only profile in Nested mode produces0 current Nested descriptors; Modern imports unready nodes into draft; Save before expanding root fails “Choose or create every active Nested folder”; expand/discover then Save creates photos | Existing valid modern ready model, even empty, deliberately wins. Reenabling menuTree would violate no-resurrection | LOCAL_TEST; confirmed conditional migration/lazy-read obstacle |
| F4 Persistence versus native registration | D3 injected Chrome create error: label saved, menu count0, UI says Saved but Chrome could not update/Retry Save | Healthy callbacks pass; no actual Chrome error observed. Cause is injected, not diagnosed in owner's Chrome | LOCAL_TEST; confirmed failure behavior, installed cause UNVERIFIED |
| F5 Descriptor versus actionable target | D4 corrupted/missing-token saved snapshot still emits quick:p but resolve returns null | Normal definition Save rejects unprepared targets; direct external storage/native mode changes can bypass full validation | LOCAL_TEST negative fixture; not normal valid-save defect |
| F6 Mode success text overwritten | D5 stored mode becomes nested while final status says Unsaved changes | Stored mode really changed; status failure is not proof rebuild failed | LOCAL_TEST confirmed feedback defect/ambiguity |

### F1 exact historical and current path

Historical options.js simplePrimaryLocationField passes a prefix callback that sets profile.defaultPrefix and scheduleSave; scheduleSave invokes saveProfiles after180ms, and old saveProfiles writes profiles directly. Source was extracted from515c272 into a disposable jsdom fixture; no historical writer touched customer data. Modern [destinations.js:66 function update](../../extension/beta/destinations.js#L66) calls changed only; [destinations.js:48 async function save](../../extension/beta/destinations.js#L48) performs explicit commit. A newly visible card is not a native item until that commit. Current beforeunload warns about dirty data, but does not supply autosave.

### F2 why “files” can appear without a Legacy editor writing

[background.js:1203 defaultPrefix: existing?.defaultPrefix](../../extension/background.js#L1203) preserves existing defaultPrefix, then existing folders.files, caller folders.files, finally literal files. Modern load retains that profile value. [nested-locations.js:76 function menuEntries](../../extension/nested-locations.js#L76) names Simple by explicit trimmed label, deepest selected prefix segment, bucket, Destination. Thus a blank-label primary configured under files renders files. Existing menuLabel may instead explicitly contain Files; that is another path and must be inspected, not erased by assumption. Modern +Location additionally seeds explicit New location, so that default also differs from bucket naming.

Historical buildMenus read simpleLabelFallback and bucket preference could produce art for the same blank-label files target. Current builder no longer reads this setting and current plan ignores it. D6 changes only menuTree and proves the Modern plan unchanged; current name is explained by shared persisted profile/default/path policy, not an active old options writer.

**Owner-directed future requirement:** default automatic Simple name is bucket, with path unchanged. Changing only naming must not move objects or reset saved prefix. Disposition explicit custom labels separately; no naming change implemented here.

### F3 source chain and hidden readiness

[nested-locations.js:41 function initialize](../../extension/nested-locations.js#L41) initializes missing model from old tree only before version1; conversion creates ready:false nodes. Modern load migrates in memory only; mount uses startCollapsed:true. [nested-menu-editor.js:93 async function populate](../../extension/nested-menu-editor.js#L93) verifies root, but folderRow is lazy under expansion. [destination-config.js:7 function validate](../../extension/destination-config.js#L7) rejects every active unready child, including hidden imported descendants. The earliest divergence is native plan refusing old-only state; next is collapsed draft readiness preventing save. This is not caused by CSS changing storage; visibility controls whether discovery callbacks have executed.

Opening all ancestors allows discovery/save in the bounded fixture. A more ergonomic migration is a **PROPOSAL**, not permission to import silently, invent ready status or restore deleted entries. Historical labels are carried as previousLabel rather than assigned current label, so migration may also change displayed names; no full owner migration record is available.

### F4/F5/F6 full boundary discipline

[background.js:2072 function saveDestinationConfig](../../extension/background.js#L2072) writes before rebuild. [background.js:2109 async function buildMenus](../../extension/background.js#L2109) removes all and clears partial menus on creation failure. Registration errors in storage listeners are caught without equivalent visible save status. Native checkbox updates mode through save queue but does not run full validate. [destination-config.js:22 function resolve](../../extension/destination-config.js#L22) is authoritative again at click. Notifications are off by default, so an invalid target can appear inert without a notification.

Modern setMode lazily mounts Nested; readiness normalization changes projected fields/version and context.save calls changed. A later dirty notice replaces mode-success text. Existing status test fails exactly there, while storage says nested. Keep feedback bug separate from routing cause.

## Competing unresolved hypotheses and minimum disproof

- Wrong installed version/profile: capture extension version, source build fingerprint and relevant saved menu projection privately. Repo HEAD is not installed truth.
- User edits remain draft/Save rejected: compare same-window draft against saved signature and validation error. A successful same-revision Save disconfirms F1 for that attempt.
- Old-only state/migration: inspect presence/version of nestedMenu and child readiness. Valid fully modern model disconfirms that migration hypothesis.
- Chrome API failure/depth/platform constraint: capture callback/runtime.lastError and actual registered state, not CSS. Healthy acknowledged registration still needs rendered menu observation.
- Duplicate account/bucket/ID or wrong profile: inspect stable IDs, prepared target and exact account/bucket privately; display names alone are insufficient.
- Auth/provisioning/remote failure: only relevant after an item exists/click resolves; cannot explain a pre-registration absence without another effect.
- Other-window change/suspension: record signature conflicts, build chronology and termination. Not proved by one stale screenshot.

## Future repair appendix — PROPOSAL ONLY

Review autosave expectations versus explicit Save; make draft/saved/native distinctions intelligible with less clutter; use bucket-derived automatic labels without target changes; evaluate explicit verified migration/readiness flow; preserve no-resurrection, single writer lane, red × semantics, exact targets and independent modes. Reuse Legacy's clear action ownership, not its whole-profile writer. No UI, API, background, schema, cloud or provider code changed.

## Additional conditional findings (D7/D8)

**F7 / D7 — missing saved mode plus menuTree-only profile:** old menuMode selected nested, current selected simple, and each builder persisted its inferred mode. First divergence is inference before generation. Counterexample: explicit stored simple/nested bypasses inference. Confirmed local compatibility difference, owner incident attribution UNKNOWN.

**F8 / D8 — imported identifier grammar:** a synthetic profile ID containing colon passes normal validation and saves, generates quick:synthetic:colon, but resolver searches ID segment synthetic and rejects. Normal generated UUIDs do not contain colon. Confirmed negative-case validation/resolution mismatch, not a known owner profile or proof this caused the complaint.

D2 also confirms historical builder generates old tree: descriptor for the same old-only snapshot where current Nested output has none. Migration changes the displayed old explicit label into name fallback because fromLegacy retains previousLabel as historical metadata rather than active label. Source/fixture support these differences; the owner's specific configuration remains unavailable.

**F9 / D9 — repeated account card headings:** two prepared bucket profiles for one account render two account-titled Nested groups, not an aggregated account card. Hidden meta limits immediate distinction; root bucket selectors remain visible. This confirms a structural source of apparent duplication/clutter, not a persistence or native routing defect. Valid distinct profile/root IDs are the counterexample to conflating equal titles with duplicate identity.

**F10 / D10 — character/byte validation boundary:** a synthetic600-character prefix of two-byte UTF-8 characters passes menu validation (length counts characters) but fails the embedded Worker's1024-byte object-key guard (1200 bytes before filename). This confirms a negative transfer-validation mismatch, not the owner's actual data or a missing-menu cause. A short ASCII prefix is a counterexample. Future compatibility must account for total key bytes including filename without changing existing target paths silently.

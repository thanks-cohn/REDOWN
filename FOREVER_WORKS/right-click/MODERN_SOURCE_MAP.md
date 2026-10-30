# Modern editor source map

[Route](README.md) · [Wiring](WIRING_AND_STATE.md)

## Local model and load

destinations.js captures C=RedownDestinationConfig and M=RedownNestedLocations. State includes profiles/accounts/mode/expected/dirty/saving/mounted/epoch/reads/activatingLocation, bucket promise cache and unassigned rows. load clones latest background profiles, falls back to storage, records expected signature, then initializes versioned models **in memory**. Dirty Reload confirms discard; epoch rejects obsolete loads.

project includes identity plus fields: menuConfigVersion, menuLabel, defaultPrefix, simpleBucketName, simpleOptions, simplePrimaryEnabled, simplePrimaryOrder, explorerManaged, showInContextMenu, menuOrder, nestedMenu. Signature is JSON([mode,project(profiles)]), not a cryptographic or monotonic revision. Background ignores patch credentials/account identity and applies only allowed menu fields to known Cloudflare profiles.

## DOM event → action table

| Control | Handler/model | Effect and boundary |
|---|---|---|
| + Location | destination-add onclick | Prepared profile: append UUID Simple option or Nested root. Without profile may confirm cfProvision of selected existing bucket. |
| Menu label | renderSimple input → update | Primary menuLabel / extra label; max60; draft only. |
| Simple visible red × | renderSimple remove | Primary simplePrimaryEnabled=false; extra filtered by ID; unassigned draft removed. No cloud delete, no local Simple Undo. |
| Entry options up/down | move | Swaps flattened rows, writes primary/item order then rerenders. |
| Account change | account.onchange | Adopts an existing target profile, preserves row ID, resets bucket/prefix; primary converts to extra. |
| Bucket change | bucket.onchange | Changes bucket and clears prefix; closes picker. |
| Choose folder | RedownDestinationMenus | cfDestinationFolders read; Select here adopts exact prefix without trailing slash; no provision/create. |
| Bucket root | options action | Prefix empty, draft only. |
| Create folder | creator submit | Validate one segment, check children/duplicate, cfCreateFolder betaNoProvision:true, reread children, adopt only if found. Actual marker precedes Save. |
| Mode | destination-mode onclick | Immediate saveDestinationConfig with profiles:[]; retains dirty definitions, adopts new signature. |
| Save | save | Blocks reads/unassigned rows, validates, locks panel controls, projects and sends expected/mode/profiles. No explicit overall request timeout here. |
| Reload | load | Confirm dirty discard, reread model; successful remote creation is not undone. |
| Other-window storage | onChanged | Clean load; dirty mode-only event rebases expected mode; dirty profile event preserves draft and requests Reload. Saving/activation events ignored locally. |

## Shared Nested mount and controls

Modern mount passes existingOnly:true, allowFolderCreation:true, startCollapsed:true. context.save only marks **draft** dirty; shared strings saying saved do not mean persistence. Wrapped context.send tracks reads and adds betaNoProvision for folder creation.

Shared editor state: context/container/renderVersion, collapsed IDs, pending mutation set, typed-name drafts, last status. pending locks controls; queued refresh executes after completion. Per-render reads deduplicate requests. renderVersion + connected checks prevent obsolete replies painting current UI.

| Nested control | Actual scope |
|---|---|
| Include menu group | nestedMenu.enabled toggled; roots kept. |
| Group red × | roots=[]; removes card; offers Undo merging original and subsequently added roots by stable IDs. |
| Root red × | Removes root and descendants; last root removes card, empty state and focus to + Location. |
| Child red × | Removes branch/subtree from immediate siblings; no child Undo. |
| Expand/collapse | Hidden DOM/collapsed IDs only; lazy children/read on expansion. |
| Root bucket select | Changes bucket, invalidates descendants. Shared bucket creation form hidden by existingOnly. |
| Add child | M.blank UUID/name-empty/ready-false/children; no folder write; depth guard. |
| Select existing child | setLocation name/ready, invalidates descendants if changed; creation draft stays separate. |
| Create folder at this level | Reveals form; explicit real creation + read-back verification before ready selection. |
| Entry options | Trimmed optional label and sibling up/down. Group options reorder profile groups. |

Validation checks duplicate profile/location IDs, label length/control characters, invalid path segments/backslash/control characters, prepared same-account buckets, active blank/unready Nested rows, eight folder levels and500 active locations. Inactive layout can remain invalid when saving the other mode. Native mode checkbox is a separate path without this full validation.

renderPreview uses shared menuEntries and resolve, but restored HTML lacks destination-preview. A fixture injecting it does not establish visible current preview. Current UI is compact restoration plus later red controls, not the old studio.

## Phase 2 addendum — 30 October 2026

Phase2 D1–D8 distinguishes unsaved cards, hidden migration readiness, automatic mode inference and synthetic colon-ID grammar. No current behavior altered. See [A–Q matrix](EQUIVALENT_WORKFLOW_DIFF_MATRIX.md).

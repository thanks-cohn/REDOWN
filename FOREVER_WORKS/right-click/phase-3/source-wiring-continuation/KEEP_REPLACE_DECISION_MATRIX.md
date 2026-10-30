# Preservation and replacement decisions

[Navigation](README.md) · [view blueprint](CLEAN_ROOM_EDITOR_BLUEPRINT.md). OWNER_INTENT controls future presentation; source describes present behavior. These are documentary implementation constraints, not accepted new Forever records.

## Modules and function authority

| Source / functions | Disposition | Why / future boundary |
|---|---|---|
| destination-config.js project/signature/validate/resolve | **PRESERVE** single shared owner; **IMPROVE LATER** reviewed grammar/UTF-8 gaps | Exact save/click contract; don't clone validator/resolver into view |
| nested-locations.js name/path/invalidate/setLocation/destinations/menuEntries/nestedEntries/menuMode | **PRESERVE** semantics/planner | True ancestry, stable IDs, parent-first order, fresh active layout; explicitly R2 filtering |
| initialize/fromLegacy | **PRESERVE** compatibility only; **IMPROVE LATER** readiness visibility | Empty modern model wins; no silent old-tree reactivation |
| background saveDestinationConfig/rebuildMenus/buildMenus/onClicked | **PRESERVE** runtime authority | Sender/expected/fields/queues/receipt; actual browser proof still pending |
| background setProfiles/saveStoragePreferences | **PRESERVE** merge/allowlist safeguards | Never replace with view storage.set profiles |
| background provisioning/setup/native checkbox/mode inference | **PRESERVE** exceptional ownership; **OWNER DECISION REQUIRED** on future simplification | Separate real infrastructure consent and independent mode; no implicit deploy in selection |
| beta/destinations.js closure load/update/rows/renderSimple/mountNested/save | **IMPROVE LATER / FUTURE REBUILD** view/controller | Keep fields/messages; do not pretend closure functions are public API |
| nested-menu-editor.js mount/render/rootRow/folderRow/menuControls/run | **PRESERVE** useful outline/selection semantics; **IMPROVE LATER** DOM/status contracts | Could keep via draft context or rebuild DOM; retain readiness, parent scoping, pending reconciliation |
| explorer-destination-menu.js create/attach/paging | **PRESERVE** existing bounded picker | Exact folder target and keyboard/dismiss logic; no provider API invented |
| quick-links.js selectTab + URL/setup boundaries | **PRESERVE** tabs and separate function ownership | Don't absorb domain/public-access mutations into menu Save |
| options.js current saveProfiles/renderProfiles | **PRESERVE** active preferences/delegation | Whole settings page is not read-only; unrelated storage behavior stays |
| options.js dormant menu constructors/saveNestedMenu/old mode UI | **PROVEN OBSOLETE as current menu UI; cannot safely reuse as writers** | Unmounted/inert; understand interaction only |
| Historical whole-profile writer/tree generator/deep flattening/click routing | **PROVEN OBSOLETE; prohibited restoration** | Concurrent overwrite, resurrection, deep ancestry and stale-mode risks proven locally |
| menu-reorder.js optional grips | **OWNER DECISION REQUIRED** | Modern doesn't load; up/down controls exist; obsolete grip expectation still fails |
| Native ingest / Worker / auth / history / count | **PRESERVE** separate transfer system | No transfer/API rewrite with view; source URL reference is not browser bytes |
| Google auth/provider-opening scaffolds | **PRESERVE** as source facts; **cannot reuse as working upload adapters** | No mounted Drive upload, Dropbox/OneDrive transport; future separate task |

## DOM/CSS/state/interaction inventory

Each control row in [current ledger](CURRENT_MODERN_END_TO_END.md) inherits the disposition of its selector family below. This covers all current menu editor controls; Bucket URLs' independent domain/public-access internals are deliberately outside replacement scope.

| Selector / rule / state | Disposition | Required later treatment and evidence |
|---|---|---|
| #quick-tab-setup/#quick-tab-urls, tablist/tabpanel, aria-selected/tabIndex, quick-panel-* | **PRESERVE** | Functional section separation; keyboard arrows/Home/End, focus and hidden panels; don't merge tabs |
| .destination-toolbar, #destination-mode/profile/add/save/reload | **PRESERVE functions; IMPROVE LATER presentation** | One clear path, wrapping at narrow widths, current immediate mode versus explicit save made legible |
| #destination-status, .nested-status, saving/dirty/reads/pending | **IMPROVE LATER** | Six-truth status; save feedback must not be overwritten by readiness; don't claim “registered” from card/dirty state |
| .destination-stage clamp(260px,45vh,520px), max65vh overflow:auto | **IMPROVE LATER / OWNER DECISION REQUIRED** exact height | Retain contained usable scrolling; no arbitrary width hiding/overflow; don't freeze old constants as aesthetic intent |
| #destination-simple auto-fit min(min(100%,360px),1fr), .destination-card/head/fields/path | **PRESERVE** coherent grouping/path; **IMPROVE LATER** spacing | Token-based premium restraint; title/path distinct; controls accessible at320px and constrained panels |
| .destination-entry-options/.nested-menu-controls/.nested-group-options details/summary | **PRESERVE** named secondary disclosures; **IMPROVE LATER** clutter | Keep labels/order/Create discoverable; × never buried; native keyboard behavior |
| .destination-remove-x,.nested-remove,.nested-inline-remove | **PRESERVE** permanently visible red ×, no tooltip | Separate clean header corner/row; current34px visible/opacity1/danger; do not mistake fixture geometry for full touch acceptance |
| #destination-nested .nested-heading padding-right42/min-height36, group × top/right0 | **PRESERVE ownership; IMPROVE LATER layout if tested** | Long names cannot collide; each distinct profile recognizable |
| .nested-choice/.nested-existing/.nested-children/.nested-path, collapsed Set, data-depth | **PRESERVE** folder outline and authentic immediate ancestry | Existing useful folder browsing stays. Collapse is presentation, not disable/delete; reduce indent only without falsifying ancestry |
| depth2 descendant indentation reset (CSS1187) | **IMPROVE LATER** | Current visual compression differs from model depth; maintain readable true ancestry at narrow width |
| .nested-actions Add child/×, ready/parentReady | **PRESERVE** | Menu-only add and branch remove distinct from Create; disabled parent cannot silently target old path |
| .nested-heading .toggle enabled | **PRESERVE** include/disable semantics | Keep roots when disabled; removed is distinct from excluded/collapsed |
| .nested-heading .meta,.nested-columns display:none | **IMPROVE LATER** | Hidden account/bucket disambiguation can create repeated-title confusion. Preserve meaningful ID/bucket identification without clutter |
| .destination-inline-create,.nested-create,input name drafts, cancel/Escape | **PRESERVE** separation; **IMPROVE LATER** ergonomics | Explicit remote mutation with parent path; input not overwritten by picker; verified creation independent of Save |
| .nested-undo / roots=[] / simplePrimaryEnabled=false / empty-state text | **PRESERVE** | Group Undo exact roots; intentional saved emptiness; no remote delete; Simple/root/child Undo is not current functionality |
| .context-menu.explorer-submenu fixed210–320/max45vh/z1000 | **PRESERVE bounded picker; IMPROVE LATER** fitting if needed | HTML picker can be styled; Chrome native menu cannot. Narrow constraints require actual acceptance |
| #destination-first-setup and quick setup account/label/button | **PRESERVE** optional/collapsed separate mutation path | No bucket creation just for adding ordinary menu location; existing buckets supported |
| #destination-legacy-fallback hidden | **PROVEN DORMANT currently** | Don't present as a working GitHub menu editor; any future change needs explicit scope |
| #destination-preview absence/renderPreview code | **PROVEN DORMANT output**; **OWNER DECISION REQUIRED** whether to add preview later | If added later use shared planner; never duplicate descriptor logic; no preview promise today |
| Existing .destination-card-head gap5 then later10; details flex then :has block | **IMPROVE LATER** cascade cleanup | Effective later rule wins; no need to preserve duplicated declarations as intent |
| :focus-visible outline, reduced-motion rule, hover/active/disabled red states | **PRESERVE** behavior; **IMPROVE LATER** verified accessibility | Keep resting red controls; motion never necessary; focus not lost after rerender |
| Legacy options.html five-column Simple row, responsive650; Nested800/520 | **CONCEPTUAL REUSE**, **PROVEN OBSOLETE as Modern CSS owner** | Separate dropdown/Create/actions ownership is useful; don't transplant fixed legacy navy/purple or assume styles cascade documents |
| Four-region studio/container query480 layout in older handoff | **PROVEN OBSOLETE at current compact pin** | Do not reconstruct from obsolete HTML screenshots; retain only owner goals/required controls |

## Owner decisions still needed before coding

Owner already requires separated tabs, useful folder outline, restrained premium Apple/macOS-like hierarchy/alignment/spacing, visible red × without tooltip, accessible narrow layouts and no accidental cloud deletion. These are fixed obligations, not questions to reopen. Remaining decisions: explicit Save versus separately approved autosave policy; exact automatic bucket naming treatment for existing explicit labels; preview inclusion; identity density for multiple same-account bucket profiles; desired Undo breadth; unavailable/imported folder remediation and all-theme/accessibility acceptance. Do not silently choose a data migration to answer a presentation question.

# REDOWN — P0 NEXT CODEX RUN: History layout, no-login FILES demo, ornate Settings, reverse Elevator, expanded Preview navigation

**Owner's latest consolidated implementation request — November 5, 2026**  
**Priority:** P0 user-facing repair / high-priority aesthetic and onboarding parity.  
**Repository:** `thanks-cohn/REDOWN`, inspect the latest main HEAD before coding.  
**Status at authoring:** **OPEN IMPLEMENTATION REQUEST — NOT YET IMPLEMENTED OR TESTED BY THIS DOCUMENTATION COMMIT.**  
**Run scope:** The *actual* REDOWN Shelf and Universal File Explorer; not a look-alike prototype or new Dashboard-only implementation.

> **OWNER ACCEPTANCE IS THE RUNTIME RESULT, NOT A BEAUTIFUL MOCKUP.** Preserve all existing transfer/auth/storage/drag/backing APIs. Implement as small, reviewable code changes with visual and interaction evidence. No live production cloud writes or Cloudflare Worker deployment.

## 0. Scope, order and latest owner decisions

The user requested **one coordinated next Codex run**, not five independent redesign proposals. Prioritize:

1. **History** entries in this exact order: `FILENAME   TIMESTAMP`, then image preview, then collapsible `> More`, then separate collapsible `> URL` directly below.
2. **FILES with no cloud login**: show **authentic REDOWN logo first**, followed by **authentic Chutey icon** from the Chute reference repo already available **inside this REDOWN checkout**. Real working, offline sample files in the actual File Explorer. **Hide the guest demo automatically when an actual cloud connection is authenticated and available**; present real cloud browsing/provider setup instead. More branded art/products can be added in a *later* iteration; the mandatory first slice is **REDOWN + Chutey**, in this order.
3. **Settings visual overhaul**: premium, ornate, theme-aware, carefully spaced, legible, not a stack of ugly default HTML dropdowns or cramped fieldsets. All current settings and values must remain working.
4. **Reversible Elevator**: when the optional Elevator / Slide Up setting is selected, FILES rises on entry **and descends on exit**, carrying the *same real* Shelf navigation back into place. **Normal remains the default**.
5. **Fully expanded Preview browsing**: arrow traversal MUST work while the bottom Preview is **maximized/expanded**, without restoring it. **Left/Right default**; user may instead choose **Up/Down** in Settings, which works in the same fully expanded view.

Related documents:
- [P0 reverse Elevator and expanded Preview keyboard behavior](CODEX_P0_REVERSIBLE_ELEVATOR_AND_PREVIEW_ARROW_PREFERENCE_2026-11-05.md) — latest expanded-state clarification is controlling.
- [No-login Explorer local sample and future product showcase](REDOWN_GUEST_EXPLORER_LOCAL_DEMO_CACHE_AND_PRODUCT_SHOWCASE_2026-11-05.md) — **this document narrows the first required visible sample selection to REDOWN + Chutey; add the rest later**.
- [Provider folder tabs in the real Explorer](REDOWN_P0_EXPLORER_PROVIDER_FOLDER_TABS_PER_S3_SPLIT_VIEW_2026-11-05.md) — preserve this architecture; does not need to be implemented in this visual repair if not already present.
- [Original File Explorer/Preview/entrance implementation request](CODEX_P0_OPTIONAL_FILES_SLIDE_PREVIEW_SPLITTER_IMAGE_MODES_DRAG_RELIABILITY_2026-11-05.md) and [implementation checkpoint/evidence](../../docs/shelf-chute-integration/P0_SLIDE_PREVIEW_DRAG_IMPLEMENTATION.md).
- [Latest need-to-do](../NEED_TO_DO.md).

**Conflict rule:** Latest owner wording in THIS request overrides earlier conflicting History ordering, non-reversible entrance, Up/Down-only Preview bindings, and generic multi-product demo requirements. This is NOT permission to break other features or alter security/privacy invariants.

## 1. History: exact single-file entry structure and visual hierarchy

### Current source location

- `extension/shelf-history.js` currently builds transfer entries in `dayRows()` and puts `addProvenance()` before the Quick Glance attachment, so provider/status/URL detail can appear before the image. Correct the composition **without replacing History's existing organization/lookup/archive**.
- `extension/history-quick-glance.js`, `history-image-source.js`, `history-image-placeholder.js`, `history-navigation.js`, `history-archive.js` and `extension/shelf.css` are existing reusable owners. Inspect current entitlements/preview URL safety and do not weaken gates.

### Exact presentation contract

```text
[ filename.ext                                 3:24 AM ]
[                                                   ]
[               IMAGE PREVIEW                       ]
[          (actual bytes or honest placeholder)     ]
[                                                   ]
> More
> URL
──────────────────────────────────────────────────────
[next file...]
```

- [ ] **First row**: actual **filename** on the left, human-readable **timestamp** (time of record, right aligned) on the **same horizontal line** with pleasant spacing. Long names ellipsize/wrap deliberately and expose full filename accessibly; timestamp never overlaps. Retain stored exact timestamp and timezone-aware rendering; missing/invalid timestamps show an honest fallback, not a fabricated time.
- [ ] **Next element**: image/thumbnail/preview **directly beneath header**. Use current bounded Quick Glance/preview image handling, preserve fixed aspect/square placeholder bounds, lazy load, cancellation, missing media/fallback state and prior approved Free/Premium policy. Do NOT silently change feature entitlements to satisfy layout; if image bytes aren't available/authorized, retain the preview *slot* with an honest placeholder and accessible filename/type. No layout jumps.
- [ ] **Next element**: user-expanding **`> More`** section. Default collapsed. Include currently available provider name, exact verified location/destination, state/receipt, error diagnostics if applicable, and working History **GO TO** affordance. Keep full details and no info loss. Do not claim verified success unless provider confirmed it. Ensure GO TO stays easy to discover and continues to route via existing exact history target resolver.
- [ ] **Immediately below More**: separate expandable **`> URL`** section. Default collapsed. Show recorded/source/page/src/frame/link and available verified saved/public URLs with full copyable non-truncated text; preserve the old distinction between historical data, current configured bucket URLs and publicly available addresses. Existing URL refresh may run ONLY when the user opens the relevant URL disclosure and under existing authorization/bounded-resource rules. Never auto-expose private addresses as public or turn every source URL into a navigation action.
- [ ] Both disclosures independent and keyboard accessible; clicking `More` does NOT open `URL`; `URL` is directly below More, not nested inside More or elsewhere. Arrow/chevron rotation and low-key hover/focus styling should fit the active theme.
- [ ] Current multi-level Today/Year/Month/Week/Day grouping, Today's expanded behavior, pagination, bounded previews, premium limitations, provider receipt gates, red failure indicator and History GO TO must survive.
- [ ] Empty states, failures, unknown outcome, icon-only files, absent previews, long titles/URLs, all themes and compact Shelf sizes must be verified. No duplicate History records or duplicate image reads.

**Practical implementation:** Refactor `dayRows()`, `addProvenance()` and Quick Glance attachment boundaries to construct the exact order, not a duplicate archive/UI. Existing source URL detail remains inspectable but is a separate disclosure from More. Keep layout logic in `shelf-history.js`, theme rules in `shelf.css`, and provider/API logic in its existing modules.

## 2. FILES: no-login real offline samples, REDOWN first, Chutey second

### Current authentic bundled assets

- REDOWN: `extension/icon.svg` (primary actual REDOWN logo; fallback `extension/icons/icon128.png` if needed for browser rendering).
- Chutey: `chute-reference/extension/icons/icon128.png` (confirmed bundled reference asset). Also `chute-reference/extension/icons/icon48.png` and `icon32.png` exist; prefer the sharper 128px one. **Do not generate substitutes, use unrelated mascot art, or link a web image.**
- Verify the license/attribution and packaging rules of `chute-reference/` and `CHUTE-LICENSE.txt`. For release, package only appropriately allowed original imagery; when packaging excludes the `chute-reference` tree, deliberately copy the approved icon into a small explicit allowlisted runtime asset path, preserving attribution and source provenance. Do NOT reference a path missing in packaged Chrome extension.

### Guest Explorer behavior

- [ ] The actual Shelf **FILES** view must open **without Cloudflare/Drive/Dropbox/OneDrive login**. Use a read-only **REDOWN Demo / Local Samples** virtual folder or proper bundled-local adapter within the existing Universal File Explorer. No second decorative file browser or fake provider auth.
- [ ] **Ordering is exact:** first **REDOWN** logo image, second **Chutey** actual icon. Use authentic visible image preview cards/files, not merely two tiny placeholder glyphs. Show clearly distinguishable filenames/accessible labels; optimize image sizing/containment so the art isn't cropped or pixelated.
- [ ] Selecting files, open/expand/restore Preview, Previous/Next traversal (including maximized Preview), folder navigation and supported drag-out/testing must operate on **real packaged sample bytes**. No automatic network call is needed; demo starts entirely offline. Do not promise unsupported third-party drop acceptance without browser proof.
- [ ] **Hide the pre-login sample display automatically on a genuinely connected/authenticated cloud session** and display the real provider tab/tree or truthful connected-but-setup-needed state. Do not treat mere cached token presence, expired OAuth, stale provider label or transient connection check as proof of connection. Switching accounts/logout/revocation should restore the welcome demo appropriately. Avoid a flash of demo art while async auth state is still resolving; display a restrained neutral pending state if necessary.
- [ ] **Do not delete packaged samples or the user's own local files when demo UI is hidden.** Hiding = UI projection, not destructive storage mutation. Do not upload promotional assets to Cloudflare automatically.
- [ ] The user may experiment with demo assets before ever signing up. Include a tasteful, explicit **Connect Cloudflare** affordance for real cloud storage. Login/activation is never simulated, and first-time login should not require the user to tour Simple/Narrow/Depth.
- [ ] Keep the larger future plan for original product artwork/website links (redown.online, cuteychutey.com, Framezit, others) in its existing roadmap, but **do not delay this P0 by sourcing more images or guessing Framezit's URL.** First required visible assets are just REDOWN and Chutey.

### Storage/security boundary

- REDOWN has `redown-chute-v1` IndexedDB staging, but that is **temporary handoff cache, not a permanent sample library**. Use immutable extension-packaged bytes (or a small read-only local adapter) for these starter assets. Do not change Chutey staging TTL/budgets just to keep promo images around.
- No new permissions required solely to read extension-owned packaged assets and their origin-scoped storage. Do not attempt to enumerate Chrome's global HTTP cache, arbitrary browser files or local machine directories.
- Actual cloud file operations remain within Universal File API/provider-account namespace with real authorization. Example art must not produce verified cloud success counters, History transfer entries or bucket writes.

## 3. Ornate premium Settings — functional redesign, not plain replacement dropdowns

### Existing design and pain points

The current `extension/shelf.html` `#settings-view` includes small fieldsets and many bare `<select>` controls: Files entrance, Click2Cloud pulse, History GO TO, icon background, Explorer theme, directory history policy, etc. There are already richer theme-option/radio widgets. Reuse the established theme system and styling utilities rather than importing a large UI library or rewriting settings ownership.

### Visual system and acceptance

- [ ] Create an original, coherent **premium ornate** Settings composition: generous purposeful breathing room, clear alignment/typography, elegant thematic framing, subtle filigree/rules or premium surface depth where suitable, refined radii, measured glow and tasteful hover motion. **Ornate must remain readable, accessible and fast**—not fussy/bloated or visually loud.
- [ ] Divide controls into visually differentiated, consistent groups such as **Appearance**, **File Explorer**, **Preview & Navigation**, **Click2Cloud**, **History**, **Storage & Recovery**, **Account/Developer** as relevant; logical, not an arbitrary stacked list of compact fieldsets.
- [ ] Replace prominent *generic-looking, visually bland dropdowns* with purpose-built, properly spaced choice surfaces: e.g., **segmented controls for 2–3 choices**, elegant selectable radio cards for theme/entrance/mode, accessible toggles for binary options, or a carefully styled menu/select where the option count requires it. Every change must actually update the existing setting; do not make static decorative fake selectors.
- [ ] Keep the **same semantic preference IDs, values, storage keys and event contracts where possible** so `extension/shelf.js`, `shelf-theme.js`, `explorer-theme.js`, `right-click-engine-settings.js`, `right-click-backup-settings.js`, `shelf-click-feedback.js`, `shelf-history.js`, existing provider/History scripts and test harnesses keep working. If markup changes demand minimal adapter code, migrate deliberately and cover all event pathways.
- [ ] **P0 conspicuous settings**:
  - **FILES entrance:** `Normal (Default)` versus `Elevator / Slide Up`; any selection persists and Elevator includes reverse exit motion.
  - **Preview navigation keys:** `← / → (Default)` versus `↑ / ↓`; setting persists, applies immediately, and works when the Preview is **fully expanded**.
- [ ] Keep all other working options: REMOTES default vs resume previous Shelf tab, toolbar Shelf/Popup, color schemes (Porcelain/Midnight/Ocean/Neon), Explorer palette and Big Buttons, Click2Cloud pulse destination, History GO TO preference, directory backup/recovery and policy, drag size, prepared-file cache, developer/debug controls, icon appearance and any new settings discovered at runtime.
- [ ] Layout: verify at **320, 390, 540, 700, 900 px** and wider with keyboard/zoom/scroll. Nothing cut off, tiny, stacked on top of itself, or escaping the Shelf. Hover focus shouldn't shift card geometry or hide important text. Touch targets comfortable; inputs have visible state and aria labels.
- [ ] Theme craft: Porcelain airy and finely detailed; Midnight rich and restrained; Ocean elegantly aquatic; Neon electric and arcade-inspired while retaining contrast and reducing excess animation; all must feel like one REDOWN product. Honor reduced-motion and high contrast, and never ship more significant layout shift for merely decorative animation.

**Important:** "No lame simplistic dropdowns" means fix the **visual treatment and hierarchy**, not remove keyboard-accessible native controls from scenarios where they are superior. The new controls need equal or better accessibility and functionality.

## 4. Elevator is reversible: same working Shelf/navigation

- `extension/shelf.js` currently implements the optional `slide-up` entrance from other tabs into FILES, using the same live navigation/Explorer elements, but exit only cancels the animation and routes. Add **actual measured downward reverse** FILES → REMOTES/HISTORY/SETTINGS when the user enabled Elevator.
- **Normal stays DEFAULT**, no entrance/exit transition. In Elevator mode, navigating into FILES raises Explorer + pushes the same nav row up; navigating out lowers Explorer + moves the original nav row back down, with symmetrical, polished timing. Don't invent two giant elevator doors or a logo-morph for this specific implementation; those are separate older future explorations.
- No duplicate cloned tabs/overlays; no flash of wrong view; no click blocking, stuck animation or coordinate drift. Rapid clicking cancels/rebases from the active visual state, not from stale origin. Resize, disabled/reduced-motion, async deep-link/History GO TO, startup and error paths settle to the correct visible route. Preserve REMOTES default and existing selected folder/Preview state.
- Source and complete cases are detailed in [reversible Elevator requirement](CODEX_P0_REVERSIBLE_ELEVATOR_AND_PREVIEW_ARROW_PREFERENCE_2026-11-05.md). **Test the reverse intermediate movement**, not merely final nav position.

## 5. Fully EXPANDED bottom Preview traversal is mandatory

- Current `extension/shelf-explorer.mjs`: the expanded state hides and makes other Explorer panes inert; its `browseImage()` currently follows Up/Down and may rely on file rows that cannot receive focus when hidden. This is the **actual reported bug**.
- With Preview maximized in FILES, the user presses **Left = Previous / Right = Next (default)** or optionally **Up = Previous / Down = Next (Settings choice)** and goes through other eligible images/files in the same sorted/filtered **current directory**, **without collapsing the expanded panel**. The current file's selection follows along, and next/previous reads cancel stale image loads.
- Attach the navigation/key ownership to a visible focusable Preview surface, keeping background Explorer nodes inert for modal-like focus safety. On Restore, last viewed file and selection persist; ordinary keyboard/list row navigation resumes. Never create a new Window Preview for each step.
- Settings changes apply without reopening the viewer. Preserve direct Previous/Next clickable controls where present; adding subtle visible arrow buttons to expanded Preview is appropriate if none exist. Protect input editing, text/PDF reading, archive page navigation, splitters, drag operations and assistive technology.
- Preview closed means arrow navigation is **selection-only**; it must NOT pop open the Preview or make a remote fetch. Test several images and mixed unsupported files, first/last limits, rapid switching, narrow expanded view, restart and 4 themes.

## 6. Correctness gates: what must NOT regress

- **Don't rebuild:** Universal File API, existing R2 adapter/Cloudflare TRUE REMOTE Worker-fetch path, Chrome V3/CURRENT right-click menu authority, Chutey bridge, verified saves, provider scopes/auth, REST adapters, History archive, Shelf navigation and FILES core list/preview state.
- **Never fabricate:** auth state, offline cached cloud file contents, saved transfer History, public URLs, provider receipts or third-party drag-and-drop acceptance.
- **Keep HISTORY:** GO TO, provenance, images, date hierarchy and pagination. Re-arrange the view, not the saved records.
- **Keep SHELF:** REMOTES as default, current navigation order, preview split and carousel states, existing failure indicator and counters. Do not replace real FILES with a mockup or preload fake logged-in cloud names.
- **Keep future architecture:** connected S3 account folder tabs inside the real File Explorer and later side-by-side layouts remain separate tracked requirements; do not shortcut into fake S3 connection tabs. The standalone Click2Cloud V3+1 engine work is separate.
- **Packaging/legal:** use real bundled mascot icons/branding with correct asset rights and license; sample data appears even with zero network and zero login.

## 7. Tests, screenshots and sign-off matrix

Codex must add tests to relevant **existing suites** and run actual commands; report PASS/FAIL/SKIP without pretending a mock is installed-Chrome proof.

| Gate | Required evidence |
| --- | --- |
| History order | DOM assertion header filename/time → bounded image placeholder/preview → separate collapsed More → separate collapsed URL, including no available image |
| History semantics | GO TO still works, links are data not automatic navigation, public URL verification unchanged, failures remain failures, day/month/week/year + pagination still render |
| Guest FILES | New profile, zero cloud connections, offline: real Explorer shows REDOWN logo FIRST and Chutey actual icon SECOND; assets resolve from packaged paths |
| Connected FILES | Actual authorized cloud connection hides guest samples and shows real authorized cloud pane/appropriate setup state; reconnect/logout transitions are correct; samples are never cloud-uploaded |
| Real preview gestures | Single-select, double-click explicit open, maximize, Left/Right navigation in maximized state, Settings Up/Down alternative, Restore retains final selection, cancellation and boundary |
| Reversible Elevator | NORMAL unchanged; with Elevator enabled, real measured entrance and exit movement including intermediate frames, tab row moving back, no clone and no drift |
| Settings operation | All stored preferences round-trip, initial values migrated, live changes apply, keyboard and focus, no plain visual downgrades |
| Visual geometry | Screenshots for History, guest FILES, connected FILES, expanded Preview, Settings at 320/390/540/900 px and Porcelain/Midnight/Ocean/Neon, responsive contrast and no overlaps |
| Boot/integration | Existing Shelf launch, REMOTES default, History GO TO, Chutey drag, V3 native menu, provider auth, TRUE REMOTE and storage tests re-run with no newly introduced failures |
| Verification honesty | List exact commands and test counts, environment, browser/runtime restrictions, file changes, SHA and untested installed-Windows scenarios |

**Target code hotspots:** `extension/shelf-history.js`, `extension/history-quick-glance.js`, `extension/shelf.css`, `extension/shelf.html`, `extension/shelf.js`, `extension/shelf-explorer.mjs`, `extension/shelf-explorer.css`, `extension/shelf-theme.js` and relevant tests. Introduce a **small local-demo provider adapter/module** only if existing Universal File API cannot cleanly serve extension-packaged images. Prefer reusing the existing architecture.

## 8. Execution and delivery rule

1. Fetch/check latest main + this spec and linked authoritative documents; locate actual implementation/branch state first.
2. Baseline the existing test suite, list relevant exact source owners and record known failures before changes.
3. Make **focused code commits** for History composition, packaged guest FILES, Settings presentation and wiring, reversible Elevator, expanded Preview navigation. Coordinate shared Settings preference controls and source IDs so there are no incompatible parallel rewrites.
4. Add tests and take real browser screenshots for the required responsive/theme matrix. Inspect screenshots and fix visual overlap. Re-run relevant existing test commands; preserve older evidence rather than overwriting it to claim progress.
5. Use an independently reviewable feature branch/PR unless the owner explicitly requests a main-branch implementation merge. **This documentation commit alone is not implementation authorization to modify production cloud state.** No production Worker deployment, live bucket mutation or unsupported new permissions.
6. Final report: commit/PR URL, files changed, actual screenshots, test receipt and remaining unsupported/untested behaviors. Call the task complete ONLY if the user-visible interactions work, not because the specification or CSS exists.

### One-line Codex completion contract

**History = filename + timestamp → image → More → URL. FILES without cloud = real REDOWN logo above real Chutey icon, both browsable offline; guest demo disappears when authentically connected. Settings = ornate, carefully spaced, truly functional. Elevator = up on entering FILES and down on leaving. Maximized Preview = navigate its directory via Left/Right by default or Up/Down by user choice, without collapsing.**

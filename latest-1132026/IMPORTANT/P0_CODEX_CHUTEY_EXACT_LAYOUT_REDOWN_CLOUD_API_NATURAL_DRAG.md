# P0 CODEX EXECUTION — REDOWN FILES: Chutey Split, Bottom Dock, Stable Scroll, History GO TO and Drag

**Owner directive:** November 4, 2026 (America/Chicago)  
**Repository:** \`thanks-cohn/REDOWN\`  
**Implementation baseline when written:** \`main\` at \`f0eb85462b7fa05d00e7706854d48c54a81dbd4b\` (merged PR #52); re-read current branch head before work  
**Priority:** P0 — usability/drag-first recovery; do **not** interpret this as a broken cloud engine  
**Execution:** Codex feature branch + PR; preserve working code; **do not merge to main or publish without owner review**  
**This file:** Execution request, not implementation or verification.

## LATEST OWNER OVERRIDES — FILES, BOTTOM PREVIEW, SCROLL REGRESSION, HISTORY GO TO

**Priority P0. These newer instructions override all conflicting paragraphs below** about Chutey's original 36% initial split, multi-column auto-fit image cards, visible media filenames, preview inserted after a virtualized row, and the Shelf label “File Explorer”. PR #53 already ported a working Chutey-style UI; fix and refine the current code rather than rebuilding the Universal File API. **This is a Codex execution request, not evidence that these changes are implemented.**

### 1. Rename and fit the Shelf navigation

- Change the visible Shelf tab from “File Explorer” to **“FILES”** in uppercase. Keep internal #explorer route, DOM IDs and relevant links functioning.
- **Uniformly reduce the fonts, letter spacing and padding of all four Shelf nav items** — REMOTES / FILES / HISTORY / SETTINGS — enough that they fit on **one row** in narrow Shelf widths, including Neon. Do not use arbitrarily different sizes across labels. Maintain legibility, accessible focus indicators and text alternatives.
- The Shelf itself and its top tabs must **never require horizontal side-scrolling** at 320/360/390px. Long folder paths may scroll *inside their own tree container* only. Audit the rest of Shelf typography and header for overflowing controls across themes.

### 2. Two panes, 50/50 first, media enlarges as wall moves left

- Keep the real Chutey two-panel split: left cloud/folder tree, right files/media. **Every fresh FILES opening starts at a 50/50 split**, replacing the old 36% default and preventing stored legacy 36% settings from silently undoing it. Keep adjustments stable while the user remains in the Explorer and navigates folders. Honor future user-configured defaults only if such a setting is explicitly provided.
- The divider remains draggable and keyboard-resizable. **Move divider left → narrower folder pane → visibly larger images on right**; move right does the opposite, instantly without refresh.
- Right pane's **media presentation is exactly ONE LARGE IMAGE PER ROW by default**, occupying available content-pane width, with natural aspect ratio (no forced crop/distortion). Dynamic width must follow the splitter; no lingering 64px thumbnails or hardcoded 110px card width.
- **No always-visible image filename, caption or title under the image.** Reveal the actual filename on pointer hover and keyboard focus via restrained tooltip or overlay; expose the accessible name to assistive technology. Keep non-image files intelligible with icons/names and preserve contextual file actions.
- Retain lazy loading, bounds on decoding/storage, selection, Chutey-based real-file drag gestures, and REDOWN's existing Universal File API cloud authority.

### 3. Bottom ONE-THIRD preview dock: compress Explorer upward

- Upon selecting media, open a **dedicated container across the bottom of the FILES content**, approximately **one-third of usable Shelf height**. The two-pane Explorer **shifts/compresses UP into the space above this dock**; **the Shelf navigation tabs remain at the VERY TOP, fixed and visible**. In this preview-focused FILES layout, the large branding/odometer/decorative region above tabs should collapse or move out of the way so the tabs are the visible top anchor.
- The dock is **not an inline preview after a grid row**, not a third side pane, not a full-screen overlay or a second window. It is its own non-scrolling (relative to file rows) lower region; media inside may scroll/zoom as needed. Include close and draggable/keyboard-accessible **horizontal resize grip**. Closing restores the Explorer's height. Bound the dock's min/max height on short screens so both panels remain useful.
- Preserve intended double-click Window Preview separately. Selecting another media file updates bottom dock contents **without moving the file-list scroll offset**.
- Implement with a true bounded flex/grid height contract; avoid fixed 360px minimum or \`height:calc(100dvh - 180px)\` when that would force unwanted document overflow.

### 4. P0 reproducible problem: scrolling fights back near halfway

**Owner symptom:** REDOWN FILES frequently flickers and pulls scroll position backward near the halfway point, preventing reaching the bottom. Treat this as a P0 functional regression, not a cosmetic defect.

**High-confidence code suspect but NOT proven root cause:** Current \`extension/shelf-explorer.mjs\` uses a \`scroll\` listener calling \`renderRows()\` each tick; \`renderRows()\` does \`rows.replaceChildren()\`, recomputes virtual \`mini-spacer\`/\`mini-tail\` and the visible range with \`windowRange()\`, and physically moves the preview into/out of virtual rows using \`positionPreview()\`. Height changes and scrollTop clamping could cause a feedback loop. Current CSS adds \`overflow-anchor:none\`, hardcoded row sizes and a min-height; check those too.

**Mandatory work:**
1. Reproduce in an installed Chrome Shelf and instrument scrollTop, scrollHeight, clientHeight, visible row indexes, thumbnail layout, ResizeObserver and render/reflow counts. Prove the exact cause before declaring it fixed.
2. Move the preview permanently OUT of the virtualized rows into the bottom dock, so selecting/scrolling cannot reinsert preview DOM or change virtual list height.
3. Maintain stable logical total scroll height (spacer + displayed rows + tail) across changes; respect actual one-image-per-row dimensions, which can change with pane width. Use measured heights/anchoring when required. Batch DOM updates on animation frames or update only changed visible ranges, preserving focus, selection and user scroll.
4. Ensure exactly one scroll owner for the right file pane. Never write a stale restored scroll position during an active wheel/trackpad gesture. Keep \`ResizeObserver\` from recursive rerender loops. Allow reaching the last item even with a dock open, massive folders and a resized divider.
5. **Acceptance:** smoothly scroll to the absolute last item and back without flicker, jump, rubber-banding or half-way wall via wheel, trackpad, scrollbar drag, keyboard/PageDown/End, in grid/media/list modes and previews open/closed. Test 1/10/100/1,000/10,000 entries, 320–900px widths, all themes; compare actual installed Windows 11 behavior with fixtures.

### 5. Settings — History GO TO destination: Dashboard or Shelf FILES

**Owner's request:** Settings → History navigation must let users choose:
- **Go to Dashboard** — reuse/open REDOWN's full Dashboard Explorer (\`beta/explorer.html\`) and reveal the exact verified saved item in the actual cloud folder.
- **Go to Shelf FILES** — open/reuse existing REDOWN Shelf, switch to **FILES**, expand/navigate the authorized cloud tree and **scroll to/select/highlight the exact verified saved file** in the file pane, without an unwanted extra tab.

Current implementation has \`historyGoToMode\` choices \`tab\` and \`split\` in \`extension/shelf.html\` and \`history-navigation.js\`. **Do not merely rename these existing choices.** Wire distinct verified navigation destinations. Keep existing safe \`locator()\`, \`legacyR2()\`, verified provider-link routing and file identity validation. Translate legacy preferences deliberately; preserve older Split View workflows safely if supported, without obscuring the two primary new choices.

For Shelf target: if History is already open in the Shelf, switch within that exact Shelf; otherwise request Chrome's existing legitimate Shelf opener under user gesture. Add a one-use expiring, window-scoped intent carrying only validated account/bucket/key locator metadata in session storage, with recipient acknowledgment/result, independent File API auth/verification and cleanup on success/failure/timeout. No secrets or source/page URLs in hashes. Never select a same-named wrong file. For provider locations that REDOWN's Universal File API cannot browse yet, give a truthful error/fallback to the verified provider-owned link where supported. Do not make the toolbar launch wait for cloud discovery or make a second competing opener.

History GO TO **must remain visible and working**. The selected option must persist; both paths must navigate the actual saved location, not just show the Explorer home screen.

### 6. Proof and scope

Required visible acceptance captures: one-line REMOTES/FILES/HISTORY/SETTINGS in every theme; fresh 50/50 split and left-drag enlargement; single full-width captionless image and hover/focus filename; preview dock occupying about one-third height and compressing Explorer upward with tabs visible; fluid end-to-end scroll reaching final row; Settings GO TO choosing Dashboard vs Shelf FILES and resolving an exact verified file; no icon-to-Shelf BOOT regression. Test actual installed Windows Chrome as well as controlled harness. Cite failures and any unverified provider paths accurately.

**Do not rewrite REDOWN Universal File API, Chutey drag technology, working V3 menus, BOOT authority, History archive, save verification or native worker merely to implement presentation changes. These latest owner choices supersede earlier Chutey layout details but preserve the shared two-panel foundation.**

---

## 0. Owner's exact intent — do not reinterpret

> Chutey already has the Explorer layout. **Copy that layout**, including its two-panel split and bottom-expanding preview. Don't invent a new UX or force desktop-page controls into the narrow Shelf. REDOWN's aesthetic is the visual difference. REDOWN manages **cloud** files; Chutey manages **local** files. **REDOWN's Universal File API remains the engine** for the REDOWN cloud Explorer. **Chutey's drag-and-drop technology also powers REDOWN**, but the present integration needs to become effortless: users should simply grab a file and drag it; no "Prepare to drag" button. Eventually both products, plus our native desktop application, should share **one** installed Rcomplex Universal Worker.

**Correction of prior diagnosis:** The owner confirms **REDOWN Explorer works functionally**. The complaint is awkward, exposed machinery and an interface that does not faithfully match Chutey's compact Shelf design. Do not initiate a speculative Explorer runtime rebuild, API replacement, or "broken backend" migration. Audit and repair actual remaining issues as encountered, with evidence.

**ONE-SENTENCE CONTRACT:** Port Chutey's **actual** Explorer view/behavior into REDOWN as directly as practical, skin it with REDOWN's own existing themes, keep REDOWN cloud operations under the Universal File API, and make Chutey-derived drag/drop feel like ordinary grab-and-drop—without lying about browser limitations.

## 1. Code authority and mandatory source reading

Read actual source, do not produce new mock layout based on an interpretation:

- \`chute-reference/extension/explorer-view.js\`: existing Chutey view, compact toolbar, two-column file manager, folder tree, list/grid, selection, resize gestures, thumbnail loader, context menu, and \`positionPreview(row)\` that inserts the preview after the chosen row **or its completed grid row**.
- \`chute-reference/extension/explorer-view.css\`: canonical size and composition. \`.ex-workspace\` has **two panes** with an **8px adjustable separator**; default folder proportion **36%**, adjustable/persisted within implementation limits; two independent scrollable sides; \`.ex-grid\` uses auto-fit cards; \`.ex-preview\` participates in file layout and has **horizontal resize grip**.
- \`chute-reference/extension/drop-lifecycle.js\`, \`chute-reference/extension/content.js\`, \`chute-reference/extension/direct-drop-google-yandex.js\`, plus Chute's actual native \`src/chute/\` code and tests: source of truth for existing local file delivery and limitations.
- \`extension/shelf.html\`, \`shelf.js\`, \`shelf-explorer.mjs\`, \`shelf-explorer.css\`, \`shelf-explorer-model.mjs\`, \`beta/file-api.mjs\`, \`beta/r2-adapter.mjs\`, \`beta/window-preview.mjs\`, \`explorer-theme.js\`: REDOWN Shelf and authoritative cloud file contracts.
- \`extension/chute-drag.mjs\`, \`chute-stage.js\`, \`chute-content.js\`, \`chute-worker.js\`, \`service-worker.js\`, \`manifest.json\`: existing Chutey-derived **browser** handoff, its boundaries, and current \`Prepare to drag\` requirement.
- \`docs/shelf-chute-integration/\`, especially \`ARCHITECTURE_AND_AUTHORITY.md\`, \`SOURCE_AUDIT.md\`, \`DESTINATION_COMPATIBILITY.md\`, \`TEST_MATRIX_AND_EVIDENCE.md\`; issue #51 and merged PR #52; existing related owner requests:
  - \`latest-1132026/IMPORTANT/P0_CODEX_EXECUTION_SHELF_UNIVERSAL_FILE_API_CHUTE_DRAG_DROP.md\`
  - \`latest-1132026/IMPORTANT/MUST_HAVE_CHUTE_DRAG_FROM_REDOWN_TO_CHATGPT_YANDEX_GOOGLE.md\`

The complete Chute source is **physically copied as tracked files** in \`chute-reference/\` (snapshot recorded at Chute SHA \`3f9033b261667a2ad90af4a13c45701ae717ab12\`). It is **not a git submodule**. Do not run \`git submodule update\` or fetch a second copy just to find this source.

**Licensing gate:** Chute reference is source-available with **non-commercial license terms**, not an automatic MIT grant for REDOWN commercial reuse. Inspect exact licenses and existing attribution; document commercial redistribution compatibility and obtain appropriate authorization before packaging additional copied code commercially. Preserve credits and notices. A tracked reference alone is not distribution permission.

## 2. Architecture — keep these responsibilities separated

| Layer | Owner | Role |
|---|---|---|
| Explorer view and interactions | **Chutey-derived view**, reused in REDOWN | Same recognizable two-pane layout, splitter, folder tree, file list/grid, thumbnails, preview placement, gestures and contextual controls |
| Cloud files and mutations in REDOWN | **REDOWN Universal File API** and existing cloud provider adapters | Authorized account/bucket/prefix identities, listings, streams, metadata, previews, folder creation, copy, move, rename, delete, download, verification |
| Local file authority in Chutey | **Chutey local/native file API** | Local Windows folders, local reads and authorized local operations; **not** a remote provider |
| Drag/drop transport & UI | **Chutey technology adapted/bridged into REDOWN** | File materialization/handoff of authorized REDOWN cloud bytes to supported drop destinations, preserving file bytes/name/MIME; target acceptance proven separately |
| Visual identity | **REDOWN's theme system** | Porcelain, Midnight, Ocean, Neon tokens, typography, contrast, hover/focus, polish; NOT a new structural UX |
| Future native infrastructure | **One Rcomplex Universal Worker** (separate RFC/migration) | One native companion install shared by REDOWN, Chutey and future desktop app; distinct Chrome MV3 service workers remain where required |

**Never** replace REDOWN's cloud File API with Chutey local backend, nor create a parallel cloud engine. REDOWN cloud connection tree represents connected cloud locations; Chutey's original tree represents local folders. Same layout, different source authority. Reuse any existing REDOWN operations that work. Preserve OAuth scopes and cloud privacy rules: providers get only authorized file bytes and minimal filename/extension/MIME metadata where necessary; no original URL/page provenance.

## 3. P0.1 — Port Chutey layout EXACTLY; stop redesigning

The design mandate is **layout parity**, not vague "inspiration." Prefer extracting or adapting the existing Chutey DOM/structure, resize, rendering and event patterns. Don't build a brand-new file manager from a wireframe.

**Inside REDOWN's existing Shelf** (first-class \`File Explorer\` peer beside Remotes/History/Settings):

1. **LEFT:** Chutey-style expandable folder tree. Its roots represent authorized REDOWN **cloud provider/account/bucket/folder** structure instead of local Windows roots. Keep R2 distinct from generic S3; don't fake missing provider adapters.
2. **RIGHT:** Chutey-style file listing, icons, optional grid, real thumbnails where safely supported, file selection and context menu. File names and paths remain usable with truncation/scroll rather than cropping inaccessible actions.
3. **BETWEEN:** Copy Chutey's draggable and keyboard-operable vertical split handle, sensible defaults (Chutey uses 36% left by default), and persisted ratio; each pane independently scrolls.
4. **ABOVE:** Chutey's restrained compact Back / Forward / Parent / Roots / Refresh / breadcrumb / grid toggle / search/filter / sort behavior as applicable to cloud paths. No gratuitous oversized header or two layers of navigation that consume the Shelf.
5. **MEDIA:** Grid auto-fits **according to actual right-pane width**. At narrow widths **one image/card per row is absolutely fine**. Never shrink cards or make text illegible to force 2–4 columns. Lazy load and bound thumbnail memory as Chutey does.
6. **PREVIEW:** Precisely preserve Chutey's *expand-below-selected-row* flow: after selected list item or after the last card in the same grid row, **inside the right file pane**, with a horizontal drag-to-resize grip and dismiss control. It is **not** a permanent third column, a full Shelf footer swallowing both panes, or an unrelated forced modal. Preserve existing REDOWN double-click Window Preview semantics where required; reconcile single/double-click interaction deliberately without hiding/overwriting the Chutey inline expansion.
7. **SHELF FIT:** This is a compact Shelf, not a half-page desktop layout. Keep both left/right panes visible at narrow widths (including ~320/360/390px); do **not** collapse the tree into a drawer or switch to a single-column layout as the default. Respect actual panel/container dimensions, Shelf chrome and popped-out/expanded surfaces; prevent horizontal page overflow and overlapping previews/toolbars.
8. **CONTEXTUAL ACTIONS:** Eliminate permanent wall of buttons (Prepare, Cancel, Download, Rename, Delete, Copy, Move, Paste) from the primary view; expose applicable file operations via the Chutey-style right-click menu and contextual controls. Avoid debug jargon and large technical statuses in normal mode. Keep keyboard and accessible equivalents.
9. **THEMES ONLY:** Apply REDOWN Porcelain/Midnight/Ocean/Neon colors and theme typography using established tokens. **Do not alter core layout/gesture semantics in the name of aesthetic modernization.** Preserve small premium hover/focus motion and reduced-motion accessibility.

**Visual acceptance:** show side-by-side Chutey vs REDOWN in equivalent narrow Shelf geometry and expanded geometry. Structure, splitter, selection, list/grid, preview insertion and scroll behavior must match. **Only** color/branding/type/other cosmetic styling and cloud-vs-local file roots should differ.

## 4. P0.2 — Chutey drag/drop already integrated in REDOWN, finish the user experience

The present REDOWN bridge is real but incomplete: \`chute-drag.mjs\` stages a single file and exposes **Prepare to drag**, a one-minute expiry, a 32 MiB normal / 8 MiB low-memory browser budget. The current Chute-derived content receiver reconstructs a \`File\` and dispatches to some browser destinations; these paths are **not** proven on installed Windows/live site targets. Current Chute native interop reports \`NATIVE_CONSENT_REQUIRED\`; REDOWN's manifest does not yet have native enrollment. Do not silently reinterpret a synthetic \`drop\` as a completed upload.

**User-facing interaction contract:** "See file -> grab file -> drag -> drop." No mandatory pre-click "Prepare" button, timing ritual, manual file download/hunt, hidden extra Python popup, console/debug executable, or surprise second install.

Implementation guidance:

- Trace Chutey's actual normal drag behavior and REDOWN's current bridge; port the **gesture**, not just the aesthetic. Keep the simplest available native-like grab-and-drag flow.
- Design safe asynchronous cloud read/materialization around user gesture. Browser native dragstart is synchronous and not every target accepts script-built drops; document **exactly** what is feasible without native helper. Where no seamless browser solution exists, use explicit authorized native interop design or provide an honest minimal fallback, **not** invented acceptance receipts or a hidden URL drag.
- Do **not** pre-download every visible object, entire folders, or enormous blobs to fake "instant" dragging. Use controlled, lazy/bounded demand staging and cancellation. Avoid permanent memory/file accumulation.
- Handle multiple selection and multiple-file gestures when the target and authorized transport support it; do not manufacture capabilities.
- Preserve actual bytes, filename, extension, MIME (as known) and origin privacy; no source/page/link URL or browsing provenance passed to destination/provider.
- Support **ChatGPT, Google Lens, Google Image Search, Yandex Images** with separate real tests; examine other requested Google surfaces (e.g. Drive/Gemini) individually rather than "all Google". Cover supported ordinary HTML file inputs, cross-window drops and Windows native integration when implemented.
- Distinguish \`prepared\`, \`drag_started\`, \`drop_dispatched\`, \`target_accepted\`, \`verified_complete\`. A site may reject untrusted synthetic events; no success animation, cloud History entry, odometer/counter increment, "uploaded" claim or marketing promise without genuine receipt.
- If limitations remain after engineering investigation, disclose them simply in user UX and technically in evidence; never mask an unsupported drop as successful.

## 5. P0.3 — Test REDOWN's real Shelf as a constrained product

Test the actual contained component (not only a 900px desktop page or a jsdom mock) at **320, 360, 390, 540, 700 and 900px**. Include Shelf normal, expanded and popup/attached states. Use screenshots and recorded interactions on the real DOM.

Required functional matrix (at minimum):

- Initial Explorer mount and Remotes / Explorer / History / Settings switching; no unwanted tab or shell/mini collision.
- Connected R2 account -> bucket -> nested folders, pagination, search, sort, refresh; auth/offline/revoke/empty folder; no fabricated Drive/Dropbox/OneDrive/S3 trees.
- Left and right pane independent scroll; pointer + keyboard divider resize and persistence; long tree labels; 1 thumbnail column on narrow right pane without cramped icons; grid/list toggle.
- Selecting file, context menu, multi-select and keyboard focus; thumbnail lazy loading, high file-count virtualization and performance; low-RAM testing on actual supported hardware where available.
- **Preview after relevant file/grid row** with resize/close and preserved selection/scroll; REDOWN Window Preview not broken; no opaque overlays.
- Natural drag initiation; cancellation, expired/replaced staged content, sender/receiver origin binding, worker suspension, slow/large stream, wrong target, rejection and verified acceptance; no unrelated drag interception.
- Distinguish browser fixture, installed Chrome evidence, actual live-site attachment and true Windows/native proof.
- BOOT/first-click Shelf opener, V3 right-click registration, provider auth, Explorer full view, History GO TO, Quick Glance, verified save counters all untouched unless directly necessary.
- Baseline from PR #52 was **1,077 tests / 966 pass / 111 failures**, with same failing names as preceding main **1,064 / 953 / 111**. Do not describe suite as green, delete failing assertions or silently bless current historical debt. Re-run and compare failures by name.

**Required evidence artifacts:** Chutey-vs-REDOWN side-by-side shots at matching widths, screenshots for previews/grid and key themes, interaction receipts, test commands/results and explicit unsupported/live-unverified matrix. Do not claim Windows live acceptance based on managed Chromium Linux fixtures.

## 6. Future: ONE Rcomplex Universal Worker installed ONCE

This is a **separate design track / RFC**, not a prerequisite to the Shelf UX patch.

Owner's longer-term plan: upgrade/rework the native companion into a single much better **Rcomplex Universal Worker** which the user installs just **once** and which supports **Chutey local-file operations, REDOWN cloud-to-native file handoff, and later our native desktop application**. Extensions can each retain their own Chrome MV3 service worker; don't confuse those with the shared OS companion or Cloudflare remote Workers.

Propose a modular, versioned native host/broker with:
- One install, one managed update path, per-app discovery and version negotiation.
- Independently authorized clients / caller origins / explicit per-capability consent; never spoof Chute enrollment or bypass origin checks.
- Local file sessions and authorized cloud-byte staging/streaming as separate capabilities; shared drag/OS integration when supported.
- Reliable startup/health/reconnect after crashes, reboots, Chrome worker suspensions; zero unnecessary console windows, debug EXEs or multiple competing installations.
- Minimal idle RAM/CPU, bounded buffers, cleanup, crash isolation; robust low-spec Windows behavior.
- Safe migration from existing Chute companion while keeping functioning REDOWN Cloud File API; testing and rollback; eventual native desktop IPC adapter.

Do not ship a second native host or change OAuth/native permissions merely to satisfy this RFC. Audit Chute's source and commercial licensing, then design an explicit migration plan before implementation.

## 7. Sequenced implementation and deliverables

**Stage A: Read/audit parity** — Pin actual commit, map existing Chutey HTML/CSS/JS/gesture code and present REDOWN exact divergences; document any licensing blocker. Do not broadly rebuild engines.

**Stage B: UI exact port** — Directly adapt Chutey layout/behavior to REDOWN's Shelf using Universal File API inputs and REDOWN tokens. Preserve working file functions. Remove unnecessary technical chrome and actions bar.

**Stage C: Drag usability** — Implement the best safe no-preparation-button behavior available; if a limitation requires native integration, provide a separately scoped RFC/implementation milestone, explicitly identify presently supported workflows, and no false successes.

**Stage D: Automated/real acceptance** — Screenshot parity at sizes, tests with actual installed browser where feasible, real site uploads and independently verified target results; regressions and failure ledger.

**Stage E: Shared worker RFC** — Document one-install future architecture (not a mandatory runtime change in this PR).

**Expected PR deliverables**:
1. Source-to-source mapping / actual difference ledger with file references.
2. Focused implementation commits (do not commit to main).
3. Paired screenshots and observable layout parity proof.
4. Drag interoperability outcome matrix with explicit supported/unverified/blocked.
5. Test receipts, existing failure baseline comparison, packaging/license assessment, rollback.
6. Separate Rcomplex Universal Worker RFC and migration/test proposal.

## 8. Anti-goals — reject these submissions

- "Improved" one-column drawer or new card dashboard instead of **Chutey's two-panel split**.
- Desktop full-page layout squeezed into the Shelf.
- Preview as forced full-width Shelf footer, third column, overlay or unrelated modal instead of **Chutey's inline below-file/grid-row preview**.
- New permanent row of file action buttons or mandatory **Prepare to drag** ritual.
- "Made drag work" based on merely firing synthetic events; unsupported websites declared compatible.
- Chutey local backend replacing REDOWN cloud Universal File API, or a second independent cloud engine.
- Native permission/origin bypass, unconsented background file transfer, provider URL provenance leakage.
- A shared worker rewrite blocking immediate usable Shelf interface.
- CI pass claims while 111 known failures remain, or changing assertions to conceal regressions.
- Silent license assumptions from the vendored Chute snapshot.

## Final owner acceptance rule

**Chutey's exact compact Explorer layout + interactions. REDOWN's aesthetics. REDOWN's Universal File API for cloud files. Chutey's drag-and-drop for natural file gestures. Future one-install Rcomplex worker.**

A person opens the Shelf, sees folders on the left and cloud files/media on the right, expands a preview below the file as in Chutey, and grabs an eligible file to drag without understanding transport machinery. Every claimed supported transfer must be genuinely verified. Nothing else is the owner's requested design.

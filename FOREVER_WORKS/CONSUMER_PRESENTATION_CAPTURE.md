# REDOWN — consumer presentation capture, draft 0.1

## Capture identity and coverage

Baseline: `31fdbee412361c1d4e01d24929960e6e39aa1a84`, 23 October 2026. Manifest version 0.5.26. Method: inspected local source, bundled mascot image and selected existing local fixtures. **No installed Chrome UI, live provider, rendered screenshot, animation recording or audible playback was observed.** Source values below are declarations, not measured pixels or timings. Inspection host details and fixture counts are in [local verification](verification/presentation/local-tests.log); exact file SHA-256 values are in [source index](verification/presentation/source-index.json).

This fills the first presentation-capture format and is paired with [REDOWN's preservation application](CONSUMER_PRESENTATION_PRESERVATION.md), which fills the proposed specification with project-specific obligations and acceptance work. It adds documentation without changing production behavior, the canonical model, historical evidence or accepted intent status.

Evidence labels: **S** source-declared; **A** directly inspected bundled asset; **D** existing documentation report; **O** owner direction in the available conversation; **P** proposed interpretation/obligation. No S/D/P statement is a runtime observation. Canonical capability IDs below were checked against existing records; `ui.*` labels are document-local IDs, not new Forever record kinds.

## Consumer purpose and intended impression

Current consumer promise (S): “Your cloud companion ✦”; “Your files. Your destinations. All in one place.” Dashboard: “Everything in its place.” A consumer connects Cloudflare, chooses destinations and sends remote links/media through native right-click menus; dashboard surfaces provide bucket selection, file uploads, Explorer and activity. GitHub setup is experimental/Beta-gated. The repository's optional helper and offline agent APIs are not the ordinary popup experience.

Intended impression (O/D): reliable, low-friction saving with pleasurable mechanical/game-like feedback. Earlier owner directions call for temporary SNES-like success/failure tint flashes that fade back to original art, notifications off by default, and bucket selection landing at Explorer's top without overshoot. These directions are reported in project history and implemented-source descriptions; this capture does not reconstruct exact historical approval dates. Detailed geometry below is observed in source, not separately owner-approved.

## Surface inventory

| Local ID | Consumer surface and current declaration | Visibility and limits | Primary evidence |
| --- | --- | --- | --- |
| ui.popup | Brand, connection lamp, Go to Dashboard, Files delivered reel counter, sound toggle, status | Chrome action popup; 320px body width | popup.html; popup.js |
| ui.native-menu | Simple quick-send and Nested location routing configured by saved profiles | Native Chrome context menu; Chrome/platform owns its rendering | background.js buildMenus; nested-locations.js; nested-menu-editor.js |
| ui.onboarding | Connection hero, Connect Cloudflare, conditional Set up R2/Check connection, account/bucket selection | Navigation and storage-dependent surfaces gated while onboarding/storage are pending | options.html; options.js applyOnboarding |
| ui.storage | Account selector, create bucket, tactile square bucket tiles, inset repair circle, Refresh buckets | Normal mode; Debug exposes separate selection/setup/repair controls | options.html; options.js useBucket; storage-signals.js |
| ui.destinations | Right-click presets; Use Simple Menu / Use Nested Menu; Add new location; Refresh locations | Storage-dependent. Simple quick-send editor or Nested Cloudflare hierarchy | options.html; nested-menu-editor.js |
| ui.upload | Upload from computer, bucket/location builder, clickable/keyboard-focusable dropzone, upload status | Connected local-tools area | options.html; options.js uploadLocalFiles |
| ui.explorer | Back/forward/up, breadcrumbs, account/bucket sidebar, file grid, search, New folder/Upload, preview, pagination/footer | Connected area; collapses/reflows at breakpoints | options.html; options.js |
| ui.context | File menu; cut/copy/paste, destination submenus, rename/delete/properties and Get URL disclosure | Selection/operation-dependent; archive/search restrictions apply | options.js showExplorerMenu; public-addresses.js |
| ui.gallery | Inline preview, Expand, full-screen Lightbox, navigation/zoom/media progress | Conditional on file/preview type; media controls may be browser-owned | options.html; options.js setWorkspacePreviewLightbox |
| ui.activity | Downloads with successes first, newest first, retained errors below, name/location interactions | Storage-dependent activity area | options.html; options.js |
| ui.settings | Hamburger disclosure: Desktop notifications, Beta Mode, Debug Mode | 210px settings popover; notifications explicitly opt-in | options.html; options.js |
| ui.support | Runtime/Explorer diagnostics, support bundles, simulation, experimental rich index | Debug; simulation explicitly says storage is unchanged; Beta is independent | options.html; storage-signals.js |
| ui.companion | Metallic decorative robot at lower left | Shown on initial load/scroll, fades when idle, hidden in lightbox; ignores pointer events | settings-mascot.js; settings-mascot.png |
| ui.browser-feedback | Temporary action icon tint/title; optional desktop notifications | Browser-owned placement; effect separate from notification preference | background.js createToolbarFeedback/notify |

## Visual system, structure and spacing

All numeric values are CSS declarations in this baseline. Cascade, viewport and state determine final output. Retain full original HTML/CSS/assets; these selected values do not replace the complete stylesheets.

| Region | Source declaration |
| --- | --- |
| Popup foundation | Dark purple background `#0d0b15` with upper-right radial `#30204488`; text `#f5effb`, muted `#b6a9c5`; 320px body, shell padding 20px; body 13px/1.45. Header gap 10px, bottom margin 24px. |
| Popup brand/action | Icon 34×34px, radius 11px; wordmark 14px/850, tracking .14em; subtitle 10px. Dashboard button padding 13px 15px, radius 12px, gradient `#8053cd` → `#a674e5`, white 750-weight label. |
| Counter housing | Panel top margin 24px, padding-top 18px and subtle divider; centered reel housing gap 4px, padding 9px, radius 11px, background `#09070e`, border `#493652`. Reels max-width 38px, height 1.35em, split horizontal seam, inset shadow; tabular numerals. |
| Dashboard foundation | Background `#0b101b`; panels `#151e30`/`#1b263c`; line `#303e58`; text `#f1f4fc`, muted `#aab6ce`; accents `#a48aff`/`#c4b4ff`, green `#72ddb0`, red `#ff8b9b`. Body 14px/1.55. Wrapper max-width 1240px, centered, padding 32px 32px 48px. |
| Dashboard hierarchy | Header bottom margin 24px; brand icon 54px/radius16; wordmark19px/800/.16em. Hero padding32/radius22/bottom margin28; title clamp(26px,3.4vw,38px), weight600, line-height1.15, tracking−.045em. Sections margin-top24/padding26/radius20; cards padding20/radius14/margin14px 0. |
| Buttons and navigation | Ordinary buttons min-height40px, padding10px 16px, radius10, weight600; focus outline2px with offset3px. Page nav flex/wrapping, gap6/padding7/radius12; links min-width100px/padding10px 12px. |
| Bucket tiles | Top-down projected bevels, 8px faces, outer radius22px; inner surface inset8/radius18. Pale sage/cream marble-like gradients with fine embedded SVG veins, highlight and heavy grounded shadow. Inner gap11/padding16px 11px 32px; name13px/650/two-line clamp, status11px; repair circle27px at right18/bottom18. Do not describe as a flat grey button. |
| Storage grid | One-row resting scrollport; margin-top28px, base2 columns/gap20px; container thresholds540/720/900/1080px give3/4/5/6 columns. Expanded height fitted to content, viewport and remaining space; cap900px/75vh, with minimum row. Expansion reserves document space. |
| Explorer | Radius16px; toolbar gap10/padding10px 12px; body columns180px/minmax(0,1fr)/240px, height clamp(460px,70vh,760px). File columns minmax(190px,1fr)/90/135/100px; header36px, row min-height38px, cell padding8px 12px. Footer min-height31px. Selected rows purple `#353657`; cut rows opacity.5. |
| File menu / URL | Menu z50, min-width190/max320 and viewport−16px, padding6/radius10; items8px 10px/12px. URL popover z60,width420/max viewport−16,padding8,radius12; rows12px 44px 12px 10px, monospace URL11px. |
| Lightbox | Full viewport/z120; backdrop rgba(15,14,17,.96) with blur18px; rows76px/flexible/52px; head horizontal padding38; stage margins104px, padding16px 0. Circular controls min44px; side arrows46px, left/right30px, vertically centered. Caption10px uppercase/.15em. Image object-fit contain; no forced crop. |
| Mascot | Fixed left/bottom max(12px,safe area); width96px/z20; drop shadow; pointer-events none; hidden from accessibility tree as decorative. |

### Typography and assets

S: popup and dashboard declare local variable **DM Sans**, weights100–1000, `font-display:swap`. Popup falls back to system-ui/sans-serif; dashboard to ui-sans-serif/system-ui/sans-serif. Counter uses weight600 and `clamp(12px,calc(190px / var(--digits,6)),29px)` with line-height1.35. **Bucket surfaces override DM Sans** with `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`. Exact chosen system font depends on OS. Technical keys/text previews use ui-monospace/SFMono-Regular/Consolas/monospace.

Bundled font: `extension/fonts/dm-sans-latin-variable.woff`; README describes a local fontTools Latin subset retaining variable weight/optical size, covering U+0000–024F, U+1E00–1EFF and U+2000–206F. Other glyphs fall back. SIL OFL1.1 is retained in fonts/OFL.txt. No Google Fonts request is required for this font. Font loading/rasterization at runtime was not observed.

A/S: `icon.svg` is a purple-gradient R on a dark rounded square; PNG sizes16/32/48/128 accompany it. Inspected mascot PNG depicts a reflective silver egg-shaped robot, warm gold trim/antenna, black faceplate and two cream light eyes. Preserve original asset and licensing evidence; font licensing does not establish rights for every other asset. Asset hashes are in the index; broader asset/license inventory remains incomplete.

## Effects and animations

| Local ID | Trigger, sequence and source parameters | Interruption / limits |
| --- | --- | --- |
| ui.fx.toolbar | Success tint RGB45/205/144; failure239/82/107. Tint120ms → original160ms → tint120ms; ten60ms fade frames with strength `(1-frame/10)^2`; restore exact original PNG paths/title REDOWN. Nominal pause budget1000ms, excluding API latency. Luminance shapes tinted RGB; alpha retained. | Generation ticket cancels old effects; cosmetic failure swallowed. Success/failure mappings inspect completion/history paths, not every possible operation. No reduced-motion check located in this background factory; preserve this gap explicitly. |
| ui.fx.reels | Count rolls from last displayed/seen reading to current total. At most18 bulk steps plus final3 single increments; bulk delay30+round(60×fraction²)ms; tail140/220/340ms; first frame adds180ms. Final settle waits110ms before one click. CSS reel transition100ms linear while rolling, otherwise650ms cubic-bezier(.2,.75,.2,1). | New totals cancel obsolete schedules; pagehide cancels. Reduced motion settles immediately without roll/click. Planner delays are not measured browser frame timing. |
| ui.fx.connection | Checking popup dot breathes1.2s ease-in-out, midpoint opacity.35/scale.75; connected green, disconnected pink-red. | Reduced-motion removes animation. Status is also available in title/ARIA label. |
| ui.fx.storage-open | Hover/focus expands in-flow scrollport with100ms ease-out entrance, translateY−4px/opacity.84 →0/1. Tile hover−1px/press+1px with120ms ease-out transform. | Escape dismisses and returns focus to Refresh buckets when appropriate; viewport-fitting on entry/resize. Global reduced-motion removes animations/transitions. |
| ui.fx.storage-signals | idlegrey #adbac7; attentionamber #d9a64d; repairred #df766d; workingblue #82bdec; readygreen #71bf8c. Coordinated perimeter, inset lamp, glyph and caption. Fresh attention:1.2s pulse×2; repair:.95s×3; working glyph spin1.6s. Ready perimeter2.4s ease-out, visible through65%, then fades. | Text and glyph accompany colors. Reduced-motion disables effects and hides ready perimeter. Source sets signal-fresh based on state changes. |
| ui.fx.gallery | Lightbox opacity entrance200ms ease-out; controls180ms transitions and hover scale1.05. Preview spinner800ms linear. | Reduced-motion removes decorative transitions/animation. Media itself may have independent playback. |
| ui.fx.mascot | Initial show and captured scroll events reveal companion. Transition750ms ease opacity/translateY8px→0; hide after1800ms idle. | Nested scroll renews timer; page hidden/pagehide hides; lightbox forces visibility hidden. Reduced-motion removes transition. |
| ui.fx.misc | Dashboard button hover brightness1.08 over150ms; ordinary dashboard button styling160ms; mini button hover−1px/120ms; dropzone160ms; busy spinners800ms. | Source-only timing inventory, not an exhaustive motion graph. |
| ui.fx.landing | Successful ordinary bucket selection refreshes required inventory, calls goLocation, dismisses expanded bucket grid, focuses Explorer with preventScroll, then scrollIntoView(block:start, smooth). Reduced motion uses instant. | User interaction with Explorer during setup suppresses takeover; repair path does not initiate the ordinary selection landing. No fixed scroll duration; installed overshoot acceptance unknown. |

## Sound effects and haptics

S: popup synthesizes a short mechanical click through Web Audio, rather than loading a sound file. One channel, ceil(sampleRate×.018) samples; random noise scaled by `(1-i/length)^4`, gain .09. Fires once after an animated roll settles; sound preference defaults true, persists in `popupOdometer`, and can be toggled with Sound on ♪ / Sound off. A suspended AudioContext changes the control to Enable sound ♪; Chrome may require a user gesture. Audio creation/resume failures must not block the count. Reduced motion also suppresses this sound. Perceived loudness and actual latency were not measured.

Desktop notifications default off independently of counter sound. Quiet desktop notifications therefore do not mean all audio defaults off. No haptic implementation was identified in the inspected files; absence across every extension/vendor path is unproven. Browser media previews may play file audio; that is content playback, separate from UI feedback. No full soundscape or imported game audio is claimed.

## Journeys, states and implementation links

| Journey | Visible behavior declared in source | Workings and existing canonical links | Remaining verification |
| --- | --- | --- | --- |
| Open action popup | WAIT.. while checking; disconnected LOGIN! invites sign-in; connected zero READY!; unavailable count ------; positive numeric count padded to at least6 digits. Dashboard opens options page. | popup.js checkConnection/renderCount; redown.capability.authentication; redown.capability.delivery-counter | Real account expiry, popup sizing/font/audio and Chrome policy. |
| Save remote link | Native Simple/Nested destination menu dispatches selected target; history/completion routes can trigger icon feedback, optional notification and qualifying count. | background.js buildMenus; redown.capability.remote-ingest; redown.capability.toolbar-feedback | Native hierarchy/labels, failed/partial write and omission reports. No end-to-end delivery proof. |
| Choose bucket | Selecting/Setting up/Repairing → Verified — ready, Saved · check connection or Repair needed; disabled controls while setup; ordinary success lands at Explorer. | options.js useBucket; storage-signals.js; redown.capability.storage-ui; redown.capability.worker-provision | Installed layout, stale request suppression and live setup results. |
| Upload | Bucket/exact location selector, dropzone/file choice and local upload status. | options.js uploadLocalFiles; redown.capability.local-upload | Page-lifetime queue, conflicts/races, uncertain writes; no durable-resume promise. |
| Browse files | Sidebar/account/bucket, breadcrumbs, sorting/search, selected rows, preview, numbered pagination/page-size controls; loading/empty/error feedback. | redown.capability.explorer.navigation/listing/search/pagination/selection (each slash denotes a separate existing redown.capability.explorer.* ID) | Representative content sizes and installed rendering; stale prior Explorer map remains a separate issue. |
| Manipulate files | Context menus, exact destinations, conflict prompts, inline rename, delete confirmation; operation feedback must track its own ticket. | options.js; explorer-status.js; redown.capability.explorer.copy/move/rename/delete/folder.create | Copy404 remains open. Source implementation/fixtures do not establish safe live outcomes. |
| Get URL | Get URL submenu/disclosure reveals configured URLs; row click copies; availability/setup explanations and separate public-access confirmation. | public-addresses.js; redown.capability.explorer.public.urls | Configured does not mean externally reachable; clipboard/native acceptance pending. |
| Preview/lightbox | Select file, expand/lightbox, previous/next, Escape closes, Tab wrapping, right-click zoom/double-click fit. Lightbox owns focus and restores prior focus through close flow. | options.js; redown.capability.explorer.preview; redown.capability.explorer.lightbox | Full media/type matrix, focus/zoom, next-item behavior and browser playback. |

Keyboard source maps: Ctrl/Meta+A/C/X/V/F; F2 rename; Delete confirmation path; Enter open; Up/Down selection; Left/Right preview; Backspace or Alt+Left back; Alt+Right forward; Escape closes menu/lightbox/expanded preview or clears selection. Editable controls are excluded. Destructive actions on search-result rows are restricted with a request to open the containing folder. Lightbox intercepts all four arrows for browsing except editable/media/model controls or modifier combinations. These mappings require installed accessibility acceptance.

S/D: `explorer-status.js` records running/success/failed/partial/cancelled/idle and protects newer operations with tickets. This pass located base status colors and state metadata but did not establish every final paint path for all states. The intended white-running/green-success/red-failure behavior is an acceptance obligation, not a universal verified observation. Loading, empty, error, offline, authentication-expiry and cancellation must be captured per journey; a generic status mapping does not prove every state is reachable or well presented.

## Most resembles ____

These are scoped comparisons, not claims of exact historical influence or requests to copy third-party assets. No external reference screenshots were retrieved for this pass.

| Reference/style | Resembling dimensions | Basis and confidence | Differences / boundaries |
| --- | --- | --- | --- |
| Mechanical odometer / rolling numeral counter | Separate inset number reels, seam, tabular digits, bounded roll-up and final click | S directly supports comparison; high for metaphor | CSS strips, not proven physical wheel simulation; no pixel-art font. |
| SNES-era sprite palette-hit effect | Brief repeated tint, original-art interval, final fade and restoration | O/D reported owner direction; S background comment and schedule; high for scoped effect | Not a complete SNES interface or game soundscape. Exact game reference unknown. |
| Tactile instrument panel / decorative skeuomorphism | Projected stone-like bevels, glossy pale surfaces, recessed colored repair lamps | P observer comparison grounded in CSS; medium | Full dashboard still uses ordinary modern dark panels; no demonstrated literal hardware recreation. |
| Contemporary dark desktop file manager | Sidebar, breadcrumb navigation, file table, context menus, properties, keyboard shortcuts | P structural comparison; high for layout pattern | No specific Explorer/Finder visual-copy claim; exact nearest software project unestablished. |
| Gallery-style media viewer | Nearly black full-screen backdrop, contained media, sparse circular controls and generous space | P source-grounded comparison; medium | Particular gallery/application reference unknown. |
| Friendly polished robot companion | Reflective silver body, gold trim, illuminated face, decorative idle presence | A inspected mascot; high for description | No identified franchise/character provenance or authorized substitution. |

Owner's broader previously discussed odometer/futuristic-spaceship/steampunk direction is contextual inspiration, not proof of current leather textures, a spaceship layout or resemblance to a particular game. **Nearest named project by overall aesthetic remains unknown.** A later owner comparison session can supply bounded references without overwriting current evidence.

## Adaptation, accessibility and performance

S: dashboard at ≤760px uses wrapper20px 14px 32px,42px brand icon,20px section/hero padding,16px radii; grids collapse. Explorer at ≤1120px moves search to its own row; ≤1000px hides side preview; ≤760px hides desktop sidebar/breadcrumbs, shows mobile location selector and uses a bounded main-pane height; ≤520px leaves name/size columns. Lightbox ≤600px uses64px/flexible/84px rows,18px media margins and bottom arrows. Mascot shrinks to64px. Final ≤520px bucket overrides reduce icon to18px, surface gap3/padding4px 6px 32px, repair offsets12px. Read later CSS overrides rather than the earliest mobile rule alone.

Keyboard focus outlines, some ARIA labels/statuses, non-color captions and broad reduced-motion overrides exist. Screen-reader reading order, contrast, zoom200%, touch hit targets, RTL/localization, extreme names, every popup digit count and aesthetic quality across widths are **unknown**, not certified. Popup fixed320px width is a portability constraint; no arbitrary-size guarantee. Bounded reel planning avoids one frame per historic file; no measured FPS/latency is claimed. Native menus, permission prompts, notifications and media controls depend on browser/OS.

## Gaps and next capture

First priority: installed screenshots at1366×768 and a narrow viewport, popup states, storage resting/expanded/working/failed/ready, bucket-to-Explorer landing and selected/empty/error file lists. Record build/scale/theme/data and stable synthetic fixtures. Next: video and audio of reel settlement, tint flash/fade and mascot; measure fonts/spacing/timing from rendered output. Then verify failure/partial/auth recovery, reduced motion, muted/autoplay-blocked sound, keyboard/assistive technology and long/large-content adaptation. Exact native-menu rendering and third-party login screens need their own captures.

Known baseline from CURRENT_STATE.md:365 pass/10 fail in historical fresh ingestion; no live acceptance. Fresh focused results here apply only to the named fixtures and are recorded separately. This is a populated source-backed first capture, **not a complete runtime presentation archive or source-independent reconstruction proof**.

## Related creator direction

[Creators Notes](CREATORS_NOTES.md) records the owner-directed interface-as-operating-system
and interface-as-product philosophy, the one-click shtick, aesthetic ambition,
easy entry and proposed gamification. This intent does not upgrade any runtime
observation or verification result in this document.

Additional owner direction: the [Creators Notes addendum](CREATORS_NOTES.md#addendum-visible-mechanics-charm-and-a-world-worth-entering) calls for visible machinery, charismatic details and a sense of fantasy, adventure and wonder, exploring SNES-era charm, steampunk instruments and spaceship interiors. These are intended aesthetic influences, not newly observed current styling or externally verified historical comparisons.

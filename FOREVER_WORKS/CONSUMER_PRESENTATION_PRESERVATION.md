# REDOWN — application of Consumer Presentation Preservation, draft 0.1

## Scope and authority

This is the project-specific application of the proposed Forever Works presentation specification, paired with the [filled capture](CONSUMER_PRESENTATION_CAPTURE.md). It preserves what the consumer encounters and its relation to underlying behavior at REDOWN commit `31fdbee412361c1d4e01d24929960e6e39aa1a84`. It is a documentation draft, not a new schema/API or an owner-approved detailed redesign.

The format originates in the first Forever Works draft at local commit `9a91d3a` prepared in this conversation; publication of that upstream draft was not established. This project copy is readable independently of it. Current/source-declared values, historical reports, owner directions and proposed preservation rules remain distinct. Detailed inferred obligations below require review; this capture does not silently promote the canonical model's inferred intent to accepted authority.

## What is the consumer product?

The primary visible system consists of a Chrome extension action popup, native destination context menus, the connected dashboard with onboarding/storage/presets/upload/Explorer/activity, media preview/lightbox, optional desktop notifications and temporary toolbar feedback. Debug and Beta disclose additional surfaces under independent settings. Internal APIs, tests, sample Workers and optional bridge code support or experiment with the product but are not automatically consumer-facing deliverables.

The consumer's task is to send, organize and inspect files at the selected destination with little friction. The presentation adds a friendly companion, tangible bucket controls, rolling delivery count and celebratory feedback. Preserving only the transfer backend would omit part of this product's identity.

## Preservation obligations and acceptance

IDs in this table are local documentation identifiers. Values in the capture are source evidence, not automatically immutable design tokens. These draft rules implement the requested preservation exercise; they are P (proposed) except where an owner direction is identified. Owner directions listed here are reported in available history; exact archived approval links are not supplied by this capture.

| Local obligation | Purpose and intended boundary | Implementation/evidence connection | Acceptance procedure / present result |
| --- | --- | --- | --- |
| preserve.entry | Retain native quick-send and understandable popup/dashboard entry. Do not expose every repository feature to ordinary users merely because it exists. | popup.html/js; background.js buildMenus; capture surface inventory | Replay fresh and configured installation; inspect all default surfaces and gates. Source-supported; installed result unknown. |
| preserve.hierarchy | Maintain readable hierarchy, grouping, spacing and product vocabulary; retain independent popup/dashboard/bucket/gallery visual treatments unless an accepted decision changes them. | options.html/popup.html and capture token table | Compare fixed synthetic fixtures at agreed widths; annotate spacing, alignment, font and label differences. Source values recorded; rendered comparison unknown. |
| preserve.typography | Preserve DM Sans assets/OFL, numeric legibility and deliberate bucket system-font override; record platform fallback variation. | fonts/*; popup.html; options.html | Verify loaded font, fallback/non-Latin text, variable weights, full-size counts and200% zoom. Asset/source proof only; runtime unknown. |
| preserve.destination | Exact destination and current selection must stay legible and truthful through nested menus, upload and Explorer; stale setup must not hijack a newer Explorer choice. | options.js useBucket; nested-menu-editor.js; existing destination/Explorer capabilities | Use multiple similarly named paths, stale async responses and concurrent user navigation. Focused fixtures are limited; installed/provider outcome unknown. |
| preserve.landing | O: selecting the bucket should land at Explorer from its top without overshooting. Preserve collapse-before-measure/focus ordering or prove an equivalent mechanism. | options.js useBucket dismiss/focus/scroll; redown.capability.storage-ui | Record resting and expanded grids, narrow/desktop screens, delayed setup and reduced motion. Source ordering established; actual landing unknown. |
| preserve.toolbar | O: short success/failure palette flashes fading to original art, rather than permanent replacement. Preserve alpha, art and truthful success meaning. | createToolbarFeedback; redown.capability.toolbar-feedback | Check success/failure, overlap, action API failure, actual Chrome icon/title restoration; decide reduced-motion treatment explicitly. Local mocks cover schedule/restoration; installed and motion preference policy unknown. |
| preserve.counter | Retain device-local qualifying delivery total, bounded mechanical roll and one final click. Presentation never increments the total. Keep READY!/WAIT../LOGIN!/unavailable distinctions. | transfer-counter.js; odometer.js; popup.js; redown.capability.delivery-counter | Verify exact totals, interrupted rolls, mute, storage failure, blocked audio, reopen and large digits; record actual motion/audio. Named fixtures only; live semantics and perceived quality unknown. |
| preserve.quiet | O: desktop notifications off by default; separate cosmetic toolbar feedback and counter sound preferences. Do not describe notification silence as universal silence. | notificationsEnabled===true gate; popupOdometer.soundEnabled; notification-preference fixtures | Fresh profile and persisted preferences; confirm all failure/success notifications and audio behavior. Source/mock evidence; installed unknown. |
| preserve.signals | Preserve text/glyph/lamp coordination for unchecked/attention/repair/working/ready; ordinary surface and repair target have distinct actions. | storage-signals.js; options.html; redown.capability.storage-ui | Replay all states, rapid changes, independent repair click and reduced motion. Source plus selected fixtures; rendered/live unknown. |
| preserve.status | O/D: processing should be light/white, success green, failure red; partial/uncertain outcomes remain explicitly described. Prevent old operations overwriting new feedback. | explorer-status.js; options.js; public-addresses.js | Trigger concurrent operations, partial/failure/cancel and each paint location; inspect computed colors and announcements. Ticket mechanism source-supported; complete color mapping/runtime unknown. |
| preserve.media | File content stays focal: contain media, generous gallery space, navigation, zoom/fit and close/focus recovery; no decorative mascot over lightbox. | options.html/js; settings-mascot.js; existing explorer.preview/lightbox capabilities | Test image/video/audio/text/model/unsupported/failed media and keyboard focus; capture wide/narrow. Source-supported; full media/accessibility matrix unknown. |
| preserve.companion | Retain companion asset identity and decorative, nonblocking initial/scroll/idle behavior; do not invent task-bearing functions for it. | inspected settings-mascot.png/js and CSS | Check nested scroll, idle timer, hidden tab, lightbox and small/reduced-motion view. Fixture evidence; rendered result unknown. |
| preserve.adaptation | Preserve clarity and aesthetic hierarchy across supported sizes and content extremes, with non-color meaning, keyboard use and appropriate motion/audio alternatives. | CSS breakpoints, global reduced-motion, focus handlers | Width/zoom/theme/content matrix, keyboard/screen-reader review and recorded aesthetic assessment. Source rules exist; acceptance unknown. |
| preserve.truth | Configured URL is not proven accessible; queued is not completed; local test success is not deployed health. Present errors/recovery without false celebration. | public-addresses.js; Worker/Explorer receipts and issue routes; FAILURE_ATLAS.md | Disposable authorized live scenarios and exact consumer feedback. Copy404 remains open; current report does not close incidents. |

## Workings ↔ visible experience

| Internal event/state | Consumer expression | Preservation risk |
| --- | --- | --- |
| Authentication check and login phases | Popup connection lamp, WAIT../LOGIN!, sign-in guidance; dashboard onboarding gates | Treating an access token's presence as verified ongoing connection. |
| Bucket setup/verification/repair | Selected tile, busy caption/lamp, Verified versus Saved/check connection; ordinary Explorer landing | Reporting configured as verified; accidental repair from the primary target. |
| Qualifying completion/history event | Counter increment, optional toolbar flash/notification, later popup roll | Counting dispatch, stale state or ambiguous completion as delivered. |
| Source and destination transfer/verification | Explorer progress, partial/error/success, conflict choices | Attractive feedback concealing unresolved copy/move outcomes or source loss. |
| Async operation generation/ticket | Only the latest relevant response paints current status or animation | Older work replacing newer state or stealing focus. |
| Display preferences and browser policy | Muted/Enable sound/reduced motion and settled reel | Audio or animation failure blocking a successful task. |
| Debug/Beta settings | Additional diagnostic/experimental controls | Leaking internal simulation as real cloud results or advertising experiments as general support. |

## Evidence package and review procedure

The [capture](CONSUMER_PRESENTATION_CAPTURE.md) contains source values, state/journey inventory, sound formula, asset descriptions, adaptation rules and the required **Most resembles ____** section. The [source index](verification/presentation/source-index.json) pins inspected evidence with SHA-256. The [test log](verification/presentation/local-tests.log) retains fresh named fixture results. These establish source-backed navigation and bounded fixture behavior, not actual UI appearance, sound quality or cloud outcomes.

For each future capture, append a new dated observation rather than changing historical evidence to match new source. Record build/artifact hash, OS/Chrome, viewport/device scale/zoom, theme/locale/font loading, configuration, synthetic content, steps, expected result and original image/video/audio. Link accepted directions and discrepancies. Native browser UI requires separate platform evidence.

Baseline screenshot comparison should mask only declared dynamic/private regions and use agreed tolerances for font rasterization; animation verification additionally needs timing/trajectory/state evidence, and sound needs audible capture. A reviewer must assess hierarchy, utility and intended character alongside numeric differences. There is no current universal pixel threshold or demonstrated full-fidelity reconstruction.

## Current acceptance and next work

Source capture: populated for the reviewed surfaces, selected geometry/tokens, main effects and counter audio. Complete native-menu inventory, every dynamically generated dialogue/preview, exact runtime fonts, screen-reader audit and universal sound absence are not established. Keep these gaps even when focused tests pass.

The highest-value next experiment is a bounded reconstruction of popup plus bucket-to-Explorer interaction using only this package and behavior contracts. Compare independently against installed captures. Until both exist, source-independent reconstruction is unknown. Do not present a newly styled mockup as a capture of the original product.

No production code, cloud data, runtime settings, canonical model records or original issue statuses were changed by this documentation exercise. Future schema/profile adoption belongs in Forever Works with versioned schemas, conformance fixtures and binding/API updates where needed; these documents do not claim that work is complete.

## Related creator direction

[Creators Notes](CREATORS_NOTES.md) records the owner-directed interface-as-operating-system
and interface-as-product philosophy, the one-click shtick, aesthetic ambition,
easy entry and proposed gamification. This intent does not upgrade any runtime
observation or verification result in this document.

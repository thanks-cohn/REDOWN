# REDOWN: Complete prioritized work review
## FOR WEEK OF NOVEMBER 1, 2026

**Repository:** [thanks-cohn/REDOWN](https://github.com/thanks-cohn/REDOWN)  
**Branch:** `codex/v3-parity-first-reconstruction`  
**Review period:** Week beginning Sunday, November 1, 2026  
**Type:** Weekly planning and ranked, deduplicated work register  
**Status:** A prioritization proposal, not proof an item is implemented or verified.  
**Original review:** 120 items reviewed across the October 31 and November 1 registers, fundamentals, standalone CODEX handoffs, bug reports and historical fix ledgers.  
**New owner ideas:** Appended after the original 120 under **IMPORTANT NEW IDEAS**; high importance is independent of their appended numbering.

### Ranking rules

P0: Startup, correct right-click destinations, transfer/data safety, verified persistence and real Chrome acceptance.  
P1: First-use Explorer, archives, keyboard navigation, and core organizational actions.  
P2: Remaining robustness and enhancements.  
Future: Reader ecosystems, visual spectacle and business experiments after reliable foundational behavior.

**Interpretation:** An older bug may already be patched in source yet still need installed-Chrome validation; those items request verification and targeted repair, **not a rewrite**. Overlapping original specifications have been grouped instead of duplicated, and the latest owner decision overrides conflicting older notes. Estimates are rough single-developer engineering hours including focused testing, **not promises or execution evidence**. Each numbered item gives two action sentences followed by the requested estimate and urgency.

## Priority 1 — CRITICAL: REDOWN must work reliably

**1. Startup BOOT API and root-cause repair.** Implement unified lifecycle status, audit, repair and history atop current systems. Reproduce why reloads mysteriously restore the icon/menu and correct the proven failure. **Time required: 24–48 hours; Urgency level: CRITICAL.**

**2. Unresponsive toolbar icon and Shelf fallback.** Test clicking the icon in a fresh Chrome profile with no Cloudflare connection. Confirm Shelf-first opening and the existing attached popup fallback without dead-clicks. **Time required: 8–20 hours; Urgency level: CRITICAL.**

**3. Disappearing native right-click menu.** Audit Chrome registration acknowledgments, persisted generations and MV3 worker activation. Keep root, Manage and authorized destinations available without destructive routine resets. **Time required: 12–24 hours; Urgency level: CRITICAL.**

**4. Cloudflare right-click opening Home instead of saving.** Capture native item IDs and distinguish default-save Home from Explorer Go Home. Validate the latest menu fix with actual authorized R2 save receipts. **Time required: 8–16 hours; Urgency level: CRITICAL.**

**5. BUG-019: Keep Both must never merge or overwrite folders.** Reproduce directory conflicts against disposable files with identical names. Verify unique destination resolution and original byte preservation, not just a source patch. **Time required: 8–20 hours; Urgency level: CRITICAL.**

**6. BUG-018: Copy Move Cut and Paste reliability.** Retest historical cross-bucket routing and ambiguous completion using disposable objects. Require exact identity, successful destination read-back and no source deletion until verified. **Time required: 16–32 hours; Urgency level: CRITICAL.**

**7. BUG-020: Preserve exact selected destination path.** Test native-menu, popup and Explorer saves to full selected prefixes. No operation may normalize into the wrong parent, bucket or account. **Time required: 6–14 hours; Urgency level: CRITICAL.**

**8. BUG-009: Cloudflare expiry and inconsistent authorization.** Trace refresh-token availability and auth handling across Shelf, Explorer and transfers. Coordinate supported renewal while keeping reconnect explicit when required. **Time required: 16–32 hours; Urgency level: CRITICAL.**

**9. Activate Buckets across all authorized Cloudflare buckets.** Verify existing global activation across accounts, partial failures and retries. Do not depend on the Explorer selection or change bucket privacy. **Time required: 8–16 hours; Urgency level: CRITICAL.**

**10. First-run automatic redown bucket and default.** Check for an existing lowercase redown bucket and reuse it without mutation. If missing, follow confirmed creation and verify writable default before enabling quick save. **Time required: 12–24 hours; Urgency level: CRITICAL.**

**11. V3 Save Changes and native menu synchronization.** A successful Apply must mean Chrome acknowledged the newest native menu generation. Repair stale depth/projection updates and ineffective initial Reload without destructive rescans. **Time required: 12–24 hours; Urgency level: CRITICAL.**

**12. CURRENT-first durable directory authority.** Finish crash-safe verified node updates in the IndexedDB CURRENT graph. Partial scans and MV3 suspensions must not erase untouched authorized paths. **Time required: 16–36 hours; Urgency level: CRITICAL.**

**13. Independent directory backup and restoration.** Verify dated BACKUP/WORKING/CURRENT plus encrypted export and import. Demonstrate recovery after extension-origin data loss without leaking credentials. **Time required: 16–32 hours; Urgency level: CRITICAL.**

**14. Installed Chrome and real-transfer acceptance.** Exercise clean installs, restarts, worker wakeups, native clicks and real authorized R2 save/read-back. Classify installed outcomes separately from local or mocked passes. **Time required: 16–32 hours; Urgency level: CRITICAL.**

**15. Private storage and public URL permission safety.** Never infer public access or write permission from an OAuth login. Require consent and verified addresses before exposing shareable URLs. **Time required: 8–16 hours; Urgency level: CRITICAL.**

**C-SKIN-01. CRITICAL: SKIN API after BOOT and right-click API stabilization.** Once the existing BOOT startup API and V3 right-click API have both passed actual installed-Chrome reliability and save-routing acceptance, implement one formally versioned SKIN API exposing controlled CSS variables, layout zones, component states, orb colors and importable theme manifests to independent creators. Keep REDOWN's proprietary functional core separate from public skin contracts, compile eligible native/helper internals into distributable binaries where appropriate, validate every pack inside the extension, and prove that user customization never compromises permissions, transfers, secure controls or startup. **Time required: 32–64 hours for initial SKIN API separation, conformance suite and prototype; Urgency level: CRITICAL (GATED: AFTER BOOT + RIGHT-CLICK API STABILITY).**

## Priority 2 — HIGH: core saving, navigation and first-use usability

**16. Provider identities and capability contracts.** Define independent account/container/item IDs and verified operations for each provider. Keep R2 assumptions out of native Drive and other provider connectors. **Time required: 20–40 hours; Urgency level: HIGH.**

**17. Universal Simple provider and Home behavior.** Verify direct-save leaves with one eligible default and siblings/separator/Home-last when expanded. Keep peer providers independent and avoid fake active providers. **Time required: 6–14 hours; Urgency level: HIGH.**

**18. Nested Narrow with multiple buckets.** Display only configured targets and required natural ancestors. Verify exact routes across same-name folders and multiple accounts. **Time required: 8–18 hours; Urgency level: HIGH.**

**19. Nested Depth and remembered folder longevity.** Present actual authorized directories up to depth 1–10 while retaining previously known deeper records. Shrinking and re-expanding depth must not discard CURRENT. **Time required: 12–24 hours; Urgency level: HIGH.**

**20. Silent directory discovery and clean menu.** Keep inventory warnings out of native save choices while preserving diagnostic evidence. Apply bounded incremental discoveries without blocking right-click. **Time required: 6–14 hours; Urgency level: HIGH.**

**21. Activated buckets missing from open Setup.** Verify that global activation refreshes the already-open V3 editor. Users should not need to reopen or manually reload to see prepared buckets. **Time required: 4–8 hours; Urgency level: HIGH.**

**22. Lazy bucket/folder chevrons versus Browse folders.** Clicking a chevron should fetch immediate children through the existing listing service. Preserve cache, pagination, focus, loading and retry without a redundant initial Browse click. **Time required: 3–7 hours; Urgency level: HIGH.**

**23. V3 input focus and keyboard stability.** Typing in forms must not trigger tree typeahead or unexpected navigation. Preserve drafts and unaffected rows across asynchronous requests. **Time required: 6–14 hours; Urgency level: HIGH.**

**24. BUG-004: Nested editor unexpected whole rerenders.** Update only affected rows and descendants instead of rebuilding the entire tree. Preserve focus, scroll, open controls and sibling configurations. **Time required: 8–16 hours; Urgency level: HIGH.**

**25. BUG-016: Simple editor unexpected whole rerenders.** Make local edits update only the changed destination and dependent path. Keep other drafts and selections stable throughout editing. **Time required: 6–12 hours; Urgency level: HIGH.**

**26. BUG-012: Nested dropdown ancestry errors.** Investigate duplicated bucket segments and missing immediate child folders. Preserve exact R2 path semantics and reject stale listing responses. **Time required: 6–14 hours; Urgency level: HIGH.**

**27. BUG-013: Upload from Computer missing subfolders.** Enumerate immediate children scoped to the selected parent and bucket. Test pagination, deep paths and out-of-order requests. **Time required: 8–16 hours; Urgency level: HIGH.**

**28. BUG-014: Existing folder fills creation input.** Selecting an existing directory must not copy its name into a new-folder draft. Verify separation of selection and explicit creation through installed Chrome. **Time required: 3–6 hours; Urgency level: HIGH.**

**29. DBG-001: Deep nested Add Child becomes disabled.** Verify the source patch at five or more consecutive directory levels. Selecting or creating children must not require reselecting the bucket. **Time required: 3–7 hours; Urgency level: HIGH.**

**30. BUG-005: Multiple Simple destinations and duplicate Files.** Add and preserve independent sibling destinations, labels and ordering. Ensure all configured actions appear and resolve to exact objects. **Time required: 8–16 hours; Urgency level: HIGH.**

**31. BUG-001/002: Saving to bucket or parent with children.** Keep bucket-root and parent destinations genuinely selectable. Respect Chrome's native restriction on clickable submenu parents with a supported Save here or equivalent action. **Time required: 8–20 hours; Urgency level: HIGH.**

**32. BUG-010: Unified Simple and Nested editor.** Keep exactly two top-level modes and remember separate configurations. Narrow and Depth remain submodes inside Nested. **Time required: 3–7 hours; Urgency level: HIGH.**

**33. Double-click opens independent Window Preview.** Always open supported objects on the first double-click even with Side Preview present. Keep window and side viewers independently owned. **Time required: 10–22 hours; Urgency level: HIGH.**

**34. ZIP/CBZ double-click and reader arrow keys.** Open supported archives in a real Window Preview reliably. Left/Right turn internal pages while Up/Down move among outer Explorer items with clear focus rules. **Time required: 12–26 hours; Urgency level: HIGH.**

**35. Side Window and Lightbox independence.** Closing one viewing surface must not destroy another's resources or selection. Verify escape, rapid switching, focus and object URL lifecycle. **Time required: 12–24 hours; Urgency level: HIGH.**

**36. BUG-007: Lightbox fails to render media.** Reproduce blank or broken viewer states using actual files. Repair media lifetime, loading feedback and file navigation before polishing aesthetics. **Time required: 8–18 hours; Urgency level: HIGH.**

**37. Side Preview Lightbox control overflows.** Replace cramped visible text with an elegant accessible icon at narrow widths. Avoid collisions with preview-mode, minimize and close controls. **Time required: 2–5 hours; Urgency level: HIGH.**

**38. History GO TO exact saved file.** Select the correct provider, bucket, folder and object, then show its preview. Reuse an appropriate Explorer instance without conflating saved objects with source websites. **Time required: 8–18 hours; Urgency level: HIGH.**

**39. History GO TO flicker and loading flashes.** Reproduce interface disappearance during GO TO and ordinary load transitions. Correct conflicting render/loading stages instead of masking them with more animation. **Time required: 8–20 hours; Urgency level: HIGH.**

**40. Original History source URLs in native Split View.** Offer a separate option to open the recorded original webpage on Chrome Split View's left. Keep REDOWN Explorer on the right and provide a truthful unsupported fallback. **Time required: 12–24 hours; Urgency level: HIGH.**

**41. Purpose-built compact left Explorer.** Design for narrow Split View rather than compressing a desktop dashboard. Preserve key actions, breadcrumbs, previews and More overflow. **Time required: 24–48 hours; Urgency level: HIGH.**

**42. BUG-011: Site-specific video right-click failures.** Determine whether problem sites expose direct URLs, playlists, protected streams or blob media. Improve supported transfers without promising universal protected-stream downloading. **Time required: 8–20 hours; Urgency level: HIGH.**

**43. Core file operations and transfer-status regression.** Run upload, download, copy, move, rename, delete and cancel tests against supported provider operations. Never retry uncertain destructive writes or report false completion. **Time required: 16–32 hours; Urgency level: HIGH.**

**44. BUG-008: Downloads location does not select object.** Retest exact-file selection through large R2 cursor pages. History navigation must end at the actual saved file and preview. **Time required: 5–12 hours; Urgency level: HIGH.**

**45. BUG-006: File pagination and bounded scrolling.** Validate 25/50/100 page sizes and remote continuation cursors. Preserve sorting, selection, search and keyboard operations across pages. **Time required: 6–14 hours; Urgency level: HIGH.**

## Priority 3 — MEDIUM: finish core product and remove defects

**46. Get URL and verified public addresses.** Validate actual R2, custom domain and Worker URLs. Distinguish public links, private objects and temporary local blob previews. **Time required: 6–14 hours; Urgency level: MEDIUM.**

**47. Triple-dot and unusual directory names.** Reproduce path/object failures with unusual valid key characters. Preserve exact keys throughout listing, preview and saves. **Time required: 4–10 hours; Urgency level: MEDIUM.**

**48. Asset hostnames versus generated URLs.** Confirm each link uses the configured verified hostname and path. Never fabricate accessible links for private or unsupported addresses. **Time required: 4–8 hours; Urgency level: MEDIUM.**

**49. Popup destination readability and persistence.** Retest earlier popup fixes under narrow layouts and restart. Always show the saved exact target rather than a stale prefix. **Time required: 3–7 hours; Urgency level: MEDIUM.**

**50. BUG-003: Cramped Upload child rows.** Test existing responsive CSS against long folder names and deep nesting. Keep selectors and action buttons aligned without overflow. **Time required: 3–7 hours; Urgency level: MEDIUM.**

**51. BUG-017: Simplify right-click location editors.** Clarify existing folders, creation, bucket context and destinations. Reduce visual clutter without a new incompatible editor. **Time required: 10–20 hours; Urgency level: MEDIUM.**

**52. Normal versus Big navigation buttons.** Confirm 36px default and optional 48px control preference. Check saved settings, live cross-tab updates and breadcrumb space with Shelf open. **Time required: 2–5 hours; Urgency level: MEDIUM.**

**53. Premium Back Forward Up arrow artwork.** Visually verify optically centered filled SVG shapes in every theme. Retain gloss, direction and accessible focus in compact mode. **Time required: 3–7 hours; Urgency level: MEDIUM.**

**54. Lightbox scrollbar separate from controls.** Keep scrollbars in the media pane rather than over navigation and close actions. Verify images, PDFs, zoom and narrow windows in Chrome. **Time required: 4–10 hours; Urgency level: MEDIUM.**

**55. Premium immersive Lightbox design.** Refine layout, framing and unobtrusive theme-aware controls after function is reliable. Test actual rendered appearance rather than DOM-only presence. **Time required: 16–32 hours; Urgency level: MEDIUM.**

**56. History GO TO normal preview bottom clearance.** Use the existing bottom-gap convention without unnecessarily expanding preview dimensions. Check actual installed-browser spacing and scrolling. **Time required: 3–6 hours; Urgency level: MEDIUM.**

**57. History technical error bleed.** Clear stale Could not open Explorer messages after successful History loads. Preserve meaningful errors only for actual failed operations. **Time required: 2–5 hours; Urgency level: MEDIUM.**

**58. Shelf and popup Home icon consistency.** Verify both use the intended cute house icon and open Explorer Home. Keep provider-local save Home behavior unchanged. **Time required: 2–4 hours; Urgency level: MEDIUM.**

**59. False toolbar exclamation and warnings.** Retest source fixes for late Shelf readiness and unknown transient states. Do not display frightening diagnostic hover text during healthy opening. **Time required: 3–7 hours; Urgency level: MEDIUM.**

**60. Go Home utility versus provider-save Home.** Keep native Explorer Go Home a navigation command and provider Home a save target. Validate dispatch from exact menu IDs, not labels. **Time required: 3–6 hours; Urgency level: MEDIUM.**

**61. Automatic Depth reload after Save.** Reconsider immediate and 30-second Reload after fixing CURRENT synchronization. If warranted, use bounded cancellable reconciliation rather than repeated blind work. **Time required: 5–10 hours; Urgency level: MEDIUM.**

**62. Scoped Refresh Folder Listing.** Refresh affected folders without erasing other known authorized paths. Apply verified results promptly to CURRENT and native menus. **Time required: 8–18 hours; Urgency level: MEDIUM.**

**63. Post-save navigation and refresh.** Select a newly saved object at its exact destination without losing scroll. Prefer verified scoped updates over full rescans. **Time required: 6–12 hours; Urgency level: MEDIUM.**

**64. Windows paths CRLF and fixture reliability.** Retest documented Windows path and symlink/junction failures. Distinguish platform limitations from product regressions without weakening security. **Time required: 8–18 hours; Urgency level: MEDIUM.**

**65. Delivery counters and History accuracy.** Count confirmed successful transfers and record truthful completion details. Document unavoidable gaps from prior history limits or interrupted commits. **Time required: 6–12 hours; Urgency level: MEDIUM.**

**66. ZIP/CBZ archives as virtual directories.** Browse folders and pages without mandatory archive extraction. Use bounded reads and safe behavior for malformed archives. **Time required: 12–24 hours; Urgency level: MEDIUM.**

**67. Resumable transfer queue and cancellation.** Add durable job visibility with truthful recovery constraints. Do not blindly replay ambiguous writes or overpromise provider resume support. **Time required: 24–48 hours; Urgency level: MEDIUM.**

**68. Bulk rename metadata and management.** Add scoped batch changes with preview and confirmation. Keep destructive work dependent on verified provider capabilities. **Time required: 20–40 hours; Urgency level: MEDIUM.**

**69. Smart Duplicate Finder.** Compare candidates through trustworthy hashes and scoped metadata. Require explicit review before any potentially destructive merge or deletion. **Time required: 20–36 hours; Urgency level: MEDIUM.**

**70. Advanced ZIP/CBZ Archive Workshop.** Build optional split, merge, repackage and metadata operations atop reader primitives. Preserve free basic viewing and bounded memory use. **Time required: 36–72 hours; Urgency level: MEDIUM.**

**71. GLB/GLTF Asset Studio.** Inspect current model preview before adding rotations and thumbnails. Reuse viewer state and protect performance against enormous files. **Time required: 20–40 hours; Urgency level: MEDIUM.**

**72. Time Machine and Lock On.** Track verified folder observations using CURRENT and existing journals. Explain that directory records do not restore deleted object bytes. **Time required: 40–80 hours; Urgency level: MEDIUM.**

**73. Tracked Files beside Favorites.** Provide a stable navigation entry for explicitly tracked objects. Display scope and last verification without suggesting all objects are fully backed up. **Time required: 8–16 hours; Urgency level: MEDIUM.**

**74. Find This File or Where Did It Go.** Search known paths, renames and moves with stable identity. Distinguish verified locations from inferred or stale observations. **Time required: 16–32 hours; Urgency level: MEDIUM.**

**75. What Changed and What Was Here.** Compare dated directory observations with coverage timestamps. Never turn an incomplete scan into proof an object was deleted. **Time required: 16–32 hours; Urgency level: MEDIUM.**

**76. True versioned object restoration.** Restore bytes only when versioned provider storage or independent backups exist. Keep this capability separate from JSON history. **Time required: 24–56 hours; Urgency level: MEDIUM.**

**77. Native Google Drive OneDrive and Dropbox adapters.** Develop each provider's real auth, identity, listing and write paths. Gate availability on verifiable functionality rather than UI mockups. **Time required: 80–160 hours; Urgency level: MEDIUM.**

**78. Additional S3-compatible cloud adapters.** Test AWS S3, MEGA S4, B2, Wasabi, Spaces and other endpoints individually. Validate signatures, bucket semantics and save receipts per provider. **Time required: 40–100 hours; Urgency level: MEDIUM.**

**79. Multiple accounts and independent cloud panes.** Keep simultaneous account/container identities distinct in one workspace. Share the established file-operation engine instead of duplicating backends. **Time required: 32–64 hours; Urgency level: MEDIUM.**

**80. Cross-cloud copy move and mirroring.** Verify destination bytes and identity across supported providers. Never delete the source before sufficient confirmation of the destination. **Time required: 40–80 hours; Urgency level: MEDIUM.**

## Priority 4 — roadmap, product development and polish

**81. Credential vault and rotation.** Secure connection storage and supported refresh/revocation paths. A desktop-token helper must not expose persistent secrets to untrusted extension contexts. **Time required: 16–32 hours; Urgency level: MEDIUM.**

**82. Native desktop companion.** Offer optional local-file functionality using shared contracts. Preserve the standalone extension's working cloud behavior. **Time required: 80–160 hours; Urgency level: LOW.**

**83. Automation recipes.** Provide user-authored routing and classification rules with dry runs. Require scope approval before risky automated changes. **Time required: 32–64 hours; Urgency level: LOW.**

**84. Preserve True Remote transfer architecture.** Keep direct source-to-cloud ingestion where supported. Distinguish real remote transfers from local or browser-staged paths. **Time required: 12–24 hours; Urgency level: MEDIUM.**

**85. Scrolldown Pretty immersive reader.** Use a centered active document with neighboring covers and atmospheric modes. Remember progress without loading whole enormous archives. **Time required: 32–64 hours; Urgency level: LOW.**

**86. Regular Scrolldown.** Offer accessible continuous vertical reading of supported documents. Keep it fast and distinct from decorative Pretty. **Time required: 16–32 hours; Urgency level: LOW.**

**87. Page-by-page Reader mode.** Support sequential pages, spreads and optional manga direction. Keep user choice and page identity consistent. **Time required: 20–40 hours; Urgency level: LOW.**

**88. Magazine reading mode.** Develop elegant editorial compositions for media reading. Reuse shared preview and object identity. **Time required: 24–48 hours; Urgency level: LOW.**

**89. Comic World or Comic Universe.** Make a bounded browsable comic-cover plane from authorized archives. Open actual content in the established ZIP/CBZ reader. **Time required: 48–96 hours; Urgency level: LOW.**

**90. Comic series favorites and progress.** Organize volumes with saved reading status and cover overrides. Keep metadata distinct from actual archive bytes. **Time required: 20–40 hours; Urgency level: LOW.**

**91. Collection Studio and sanctuaries.** Create persistent curated media spaces from existing folders. Store styling and captions without altering original content. **Time required: 40–80 hours; Urgency level: LOW.**

**92. Gallery presentation switching.** Switch collections among gallery, Pretty, Scrolldown, Reader and Magazine. Reuse the same item identities across layouts. **Time required: 12–24 hours; Urgency level: LOW.**

**93. The Grand Story occasion format.** Create reusable hero, opening, memory, spotlight, people, timeline and closing sections. Let families replace content without remaking designs. **Time required: 40–80 hours; Urgency level: LOW.**

**94. Five signature occasion formats.** Deliver reusable designs for celebrations with shared metadata. Keep privacy, publication and hosting behavior consistent. **Time required: 60–120 hours; Urgency level: LOW.**

**95. Guestbooks QR invitations and uploads.** Add opt-in event participation with consent and access controls. Define moderation, hosting cost and data deletion responsibilities. **Time required: 40–80 hours; Urgency level: LOW.**

**96. Living Gallery or Living Canvas.** Explore non-destructive animation recipes for media collections. Avoid burdening standard Explorer with experimental rendering. **Time required: 40–80 hours; Urgency level: LOW.**

**97. History By Website A–Z organizer.** Provide a tactile button to switch History into a site index. Preserve original chronology and support reduced-motion use. **Time required: 20–40 hours; Urgency level: LOW.**

**98. Export History and By Website.** Export complete or site-filtered records through searchable selections. Preserve portability, redaction and honest coverage. **Time required: 12–24 hours; Urgency level: LOW.**

**99. Click2Cloud onboarding.** Offer Google Drive/OneDrive as approachable entry options alongside Cloudflare True Remote. Only advertise operational provider integrations. **Time required: 12–24 hours after providers; Urgency level: LOW.**

**100. REDOWN Compass guidance arrow.** Use a glossy viewport-aware arrow to indicate a real next action. Keep it dismissible and limited to useful guidance. **Time required: 20–40 hours; Urgency level: LOW.**

**101. Follow the Arrows prerequisite guidance.** Point blocked users toward a verified missing setup action. Remove guidance once prerequisites are satisfied. **Time required: 12–24 hours; Urgency level: LOW.**

**102. Helpful Comments in ZIP/CBZ reader.** Try brief handwritten arrow-key hints after repeated no-op boundary input. Fix actual reader navigation first and avoid inferring panic. **Time required: 8–16 hours; Urgency level: LOW.**

**103. Varied right-click-related animation speeds.** Apply anticipation, fast travel and gentle settling to REDOWN-owned effects. Never block real operations or promise to control Chrome-owned native-menu animation. **Time required: 6–12 hours; Urgency level: LOW.**

**104. NEON materialization.** Reveal correctly laid-out theme geometry without a wrong-color flash. Keep effects independent of app readiness. **Time required: 8–16 hours; Urgency level: LOW.**

**105. BUG-021: Rainbow outline after-effect misalignment.** Track the current outline position rather than old animation geometry. Test movement, resize and reduced-motion conditions. **Time required: 4–10 hours; Urgency level: LOW.**

**106. Alternative geometry reveal.** Explore optional entrances without destabilizing correct NEON behavior. Reuse shared timing and layout rules. **Time required: 12–24 hours; Urgency level: LOW.**

**107. Theme-aware Shelf transfer arrival.** Animate dispatch and verified completion distinctly. Never show a successful save effect for a failed transfer. **Time required: 12–24 hours; Urgency level: LOW.**

**108. Original anime-style energy-ball save effect.** Create original luminous fast-moving save feedback with varied paths. Limit its rendering cost and avoid copyrighted visual assets. **Time required: 20–40 hours; Urgency level: LOW.**

**109. Money Machine save sound.** Play an optional satisfying cue after verified saves. Offer mute and theme families without audio dependency. **Time required: 8–18 hours; Urgency level: LOW.**

**110. Save streaks and music progression.** Base streaks only on confirmed success. Cap volume, simultaneous sounds and visual overload. **Time required: 10–20 hours; Urgency level: LOW.**

**111. OVERDRIVE mode.** Celebrate approximately 100 verified saves per minute with optional spectacle. Respect cooldown and user motion/sound choices. **Time required: 12–24 hours; Urgency level: LOW.**

**112. Interactive REDOWN orb mascot.** Explore a dismissible playful interface companion. Never obscure core controls or trap the user. **Time required: 24–60 hours; Urgency level: LOW.**

**113. Theme-specific Home icon personalities.** Give each visual theme a distinctive version of the same recognizable house. Keep Home semantics accessible across palettes. **Time required: 6–14 hours; Urgency level: LOW.**

**114. Unified REDOWN branding.** Align iconography and theme presentation across extension surfaces. Prioritize crisp contrast over startup-delaying decoration. **Time required: 8–16 hours; Urgency level: LOW.**

**115. Developer Notes and Chute.** Provide authentic creator notes and verified links. Do not imply experimental features are live. **Time required: 4–8 hours; Urgency level: LOW.**

**116. Pricing and Elite packaging.** Evaluate inexpensive plans against actual cloud and support costs. Keep functional reliability independent of premium pricing. **Time required: 12–24 hours of analysis; Urgency level: LOW.**

**117. Event planners and photographers.** Study professional repeat use versus one-off family occasions. Confirm hosting and package needs before multiplying editions. **Time required: 16–32 hours of research; Urgency level: LOW.**

**118. Save Changes circular shimmer.** Reflect real pending Apply with an elegant circular outline. Stop on acknowledged completion and explain failures without raw debug entries. **Time required: 4–10 hours; Urgency level: LOW.**

**119. Activate Buckets first-run guidance.** Highlight the control only while authorized preparation remains pending. Stop pulsing after verified completion. **Time required: 3–6 hours; Urgency level: LOW.**

**120. Premium Narrow and Depth setup presentation.** Polish bucket hierarchy, scroll and depth controls after behavior is repaired. Preserve V3 configuration and established visual character. **Time required: 8–16 hours; Urgency level: LOW.**


## IMPORTANT NEW IDEAS — owner-directed additions at the end of the weekly review

**IMPORTANT:** The following entries are deliberately placed **after** the original 120 to retain the prior ranked review. This position **does not mean low urgency**: Favorites, manual tags and user-controlled reaction choices are confirmed important baseline functionality; the optional expanded emoji palette and Atlas-style model-ingestion engine are not prerequisites for that baseline.

**121. Favorites for files and folders: mandatory core organizing action.** Give every supported cloud file and folder an obvious reversible Favorite control, with a Favorites view/filter that reopens the exact provider, account, container and item without copying or moving it. Persist Favorites as portable user-owned metadata across ordinary restarts, preserve their state when cloud access is unavailable, and include supported backup/restore plus keyboard access. **Time required: 12–24 hours; Urgency level: HIGH.**

**122. User-selected emotional reactions: required baseline, optional expanded library.** In addition to Favorites, let a user react to individual files and folders with human-chosen options such as **👍 Like, ❤️ Love, 😠 Angry, 🤢 Gross, 😂 Funny, 😮 Wow and 😢 Sad**; reactions express the user's personal organization or feelings, **not public Facebook activity, automatic sentiment inference or cloud object mutation**. Offer **Shelf Settings → Reactions → Default / ALL**, where Default shows a small curated set and ALL unlocks a larger scrollable, accessible picker of widely used Unicode emoji, optionally with quick search, keyboard controls and an original premium look. **Time required: 16–32 hours for baseline and selector; Urgency level: HIGH.**

**123. Manual tagging for individual files and folders: mandatory core organization.** Provide Add tag, reusable tag choices, multiple tags per object, tag editing/removal and visible searchable tag chips, without forcing automatic tagging. Keep canonical item identity, tag identity and user-entered display names durable across authorized providers, restarts, edits and supported backup/restore, with manual provenance protected from any later model output. **Time required: 16–32 hours; Urgency level: HIGH.**

**124. Atlas-style JSON tagging-model compatibility: experimental foundation.** Explore a versioned, provider-scoped JSON metadata format with per-tag provenance such as \`manual\`, \`folder-derived\` or \`model\`, optional model name/version/confidence, timestamps, and independent per-model outputs so future tagging models can plug in without overwriting human tags. This is **EXPERIMENTAL**, not permission to run AI models, scan cloud content, change provider permissions or block shipping manual tagging and Favorites; model execution should be local/opt-in where appropriate, resource-bounded, audited and isolated from existing file operations. **Time required: 24–56 hours for design and a bounded adapter proof of concept; Urgency level: LOW (EXPERIMENTAL).**

### Decisions and guardrails for reactions and tags

- **Mandatory first slice:** Favorite/unfavorite, baseline manual reaction selection, switch between **Default** and **ALL**, manual add/remove tags, immediate search/filter, exact file/folder targeting and durable persistence.
- **Default / ALL setting:** Default is compact and approachable, not an enormous emoji wall; ALL is a deliberately scrollable palette of broader common Unicode emoji including broadly understood emotional reactions. The user's chosen picker mode persists, can be switched without migration, and applies in grid/list, preview and file details. Normal selections and all available emojis must be keyboard accessible and screen-reader labeled.
- **Favorite is a distinct action:** Do not force Favorite to be one of the emotion reactions; users should still be able to mark favorites even after changing a reaction. Define if an object may have one active emotion or multiple; prefer **one primary reaction per item** initially while allowing independent Favorite and multiple manual tags, subject to user review.
- **No social-network dependency:** Facebook and Instagram are **interaction references**, not third-party API integrations. Standard Unicode emoji rendered by the user's OS are a low-friction default, but actual appearance differs between Apple, Windows and Android; do not redistribute Apple/Facebook/Instagram proprietary icon assets or promise exact proprietary styles without licensing. Original REDOWN artwork is an optional later investment.
- **Common-emoji research (future):** If curating ALL or default options based on popularity, use defensible published usage data or user research and record source/date; do not fabricate “most popular” rankings or claim global userbase evidence. Never silently replace existing users' reaction choices because a popularity list changed.
- **No unsafe metadata merging:** Key metadata by typed provider/connection/container/object identity, not display name. Separate user-owned manual tags from optional model tags and keep private-by-default behavior. If an object disappears or is renamed, show an honest stale state until exact identity is reconciled.
- **Suggested JSON format, not a shipped schema:** Document \`schemaVersion\`, \`objectRef\`, \`favorite\`, \`reaction\`, \`tags[]\`, and separately \`modelRuns[]\`, where a user tag has \`source: "manual"\` and a model suggestion has \`source: "model"\`; support provenance and compatibility instead of a destructive monolithic tag list.
- **No premature AI work:** Build the manual features and test everyday workflows **before** implementing RAM++, JoyTag or any future tagging engine. The Atlas comparison concerns extensible metadata/provenance, not a mandate to copy or couple the projects.
- **Acceptance:** Favorite + reactions + manual tags on both files/folders, rename/move/unavailable item handling, account isolation, restored metadata, Default/ALL preference, no permission changes, no external data publication and no regressions in existing Explorer operations.

### Sources and authority

- [November 1 daily register](11012026.md) — P0/P1/P2 status, including current high-priority manual Favorites and Tags entries.
- [October 31 historical roadmap](10312026.md) — reliability incidents, compact Explorer, readers, galleries and future product ideas.
- [Owner-approved fundamentals](fundamentals.md) — CURRENT-first persistence, provider isolation, menu invariants.
- [Standalone Codex work requests](CODEX/) — BOOT API and V3 context-menu implementation specs; do **not** replace them with this weekly planning document.
- [Bug reports and fix histories](../bugs/) — unresolved failures, source patches awaiting browser proof and experimental ideas.
- This weekly review is **planning documentation only**; no implementation, real Chrome tests, cloud changes or release acceptance are implied.


---

## IMPORTANT NEW IDEAS — INTERNET ERAS IN AMBER, RETRO CAPTURE, AND COMMUNITY-CREATED REDOWN THEMES

**Added to weekly review:** Week of November 1, 2026.  
**Status:** OWNER CONCEPTS / LONG-TERM PRODUCT ROADMAP; documentation only, no production implementation or public launch promised.  
**Owner vision:** REDOWN should preserve the feeling and useful interaction patterns of beloved internet eras as **optional aesthetics and organization experiences**. People could revisit the eras they love while still using a dependable modern file manager, effectively a personal time machine for their files, memories, visual organization and creative styles.

**Priority rule:** Finish startup BOOT, native right-click reliability, authorized saving, safe file operations, Favorites, user-chosen reactions and manual tags FIRST. Theme packs and community customization must not delay critical stability or introduce a second Explorer engine.

### Historical eras worth translating into original REDOWN theme families

| Proposed REDOWN style | Historical reference | The useful behavior and emotional appeal to preserve | Avoid |
| --- | --- | --- | --- |
| **Porcelain / Red-and-White** | Pinterest-era image boards and polished pinboards | At-a-glance tile collections, visual browsing, simple saving and personal curation; this already overlaps with REDOWN's existing white/red aesthetic | Reproducing protected logos or an exact proprietary screenshot |
| **True Blue / Tumblr-era** | Early-2010s Tumblr dashboard and customizable blogs | Warm blue/dark navy, spacious content cards, photo sets, quote and text cards, chronological collections, powerful tags and expressive personal pages | Assuming reblogging and public social feeds belong in the private file-manager core |
| **Hearts / We Heart It-era** | Simple visual inspiration boards and hearted collections | Dreamy soft colors, rounded image tiles, simple hearts, mood collections, personal aesthetics, highly legible favorites | Reusing proprietary branding or misrepresenting REDOWN as the original service |
| **Homestead / GeoCities-era** | Late-1990s to early-2000s personal homepages | Personal ownership, tiled/patterned backgrounds, custom borders, visitor-book *presentation*, badges, custom text blocks and playful self-expression | Auto-playing music, inaccessible flashing, spammy elements, unsafe custom HTML |
| **Profile Studio / MySpace-era** | Personalized social profiles and early custom page designs | User-customizable colors, background patterns, panels and self-expression; profile-like collections in a private/local-first setting | Executing arbitrary untrusted scripts or rebuilding a public social network |
| **Journal / LiveJournal & early blogs** | Blogrolls, dated posts, moods and community journals | Chronological memories, annotations, tagged daily collections and thoughtful long-form captions | Unrequested public sharing of personal notes |
| **Skin Lab / Winamp-era** | Thousands of community-created music-player skins | The ability to personalize the same underlying functionality through reusable small theme packages | Bundling copyrighted character art or allowing skins to run privileged code |
| **Classic Desktop / Mac System 7–OS 9** | Early Macintosh Finder-style file management | Clean folders, recognizable desktop metaphors, nostalgic type, restrained monochrome or early color treatments | Deliberately reintroducing weak accessibility or blocking modern file tasks |
| **Classic Desktop / Windows 95–XP** | Historic desktop windows and iconography | Bold controls, generous affordances, playful window chrome, deliberate bitmap/pixel styling | Impersonating a modern system permission dialog |
| **Futurist Console / PS2-era** | Retro console dashboards and visual system menus | Glossy materials, layered depth, gentle animation and satisfying input feedback | Expensive animations that delay files or hide loading state |
| **Kernel Lab (humorous experimental)** | Terminal and systems-development culture, including modern Rust-in-kernel jokes | A playful diagnostic/terminal-inspired skin for technically inclined users, without replacing REDOWN's actual implementation | Pretending that a CSS theme changes the OS/kernel or app's programming language |

These are **design inspirations**, not claims of any formal association, license, original userbase transfer or access to another platform's private data.

### New weekly entries

**125. Optional theme packs celebrating recognizable internet eras.** Expand existing Porcelain, Midnight, Ocean and NEON styling with original **Tumblr-era blue, GeoCities-inspired personal homepage, We Heart It-style heart collections and classic desktop** options, while keeping a familiar default and the same working Explorer semantics. Launch one small fully tested theme at a time, preserve the user preference across restarts, and test narrow windows, accessibility, reduced motion and every essential file operation. **Time required: 24–48 hours for a first additional theme plus theme contracts; Urgency level: LOW (AFTER STABILITY).**

**126. Tumblr-era True Blue and expressive post-style collections.** Offer a beautiful blue/navy palette with warm cards, photo sets, tagged media and optional quote/note treatments, borrowing the usefulness of classic chronological dashboards without copying the platform's exact assets. Keep these as presentation slices over existing REDOWN objects so switching back to ordinary file management never changes file identity or permissions. **Time required: 12–24 hours; Urgency level: LOW.**

**127. GeoCities, We Heart It and expressive personal homepages.** Explore original handmade homepage layouts, backgrounds, personal badges, heart-first collections and mood boards as optional user choices. Let users preserve old-web playfulness while constraining animation, controlling contrast and never requiring unsafe script execution or external publication. **Time required: 20–40 hours; Urgency level: LOW.**

**128. Classic file-system skins and retro desktop capture.** Offer optional classic Mac Finder, Windows 95/XP and humorous modern terminal/kernel-lab styling that preserves the actual file operations and data model. Treat retro capture as a curated mode or screenshot/theme recipe, not permission to impersonate a browser security prompt, copy copyrighted interface assets or replace the real OS. **Time required: 20–40 hours; Urgency level: LOW.**

**129. REDOWN Retro Capture as a personal time machine.** Let users deliberately assemble dated collections, save page/screenshot references and annotations, and browse their own files through chronological “internet-era” views backed by exact provider identity, provenance and the evolving JSON tag/metadata system. Capture only content the user owns or is authorized to preserve, make provenance/availability honest, and keep this distinct from Time Machine's real-object version restoration. **Time required: 32–64 hours; Urgency level: LOW.**

**130. Separate visual presentation from REDOWN's stable functionality.** After the application stabilizes, create a versioned theme contract that maps semantic components and states to CSS variables/tokens, layout zones and responsive invariants, without moving save logic, permissions, keyboard semantics or object identity into theme code. Every theme must preserve native right-click functionality, Shelf launch, Explorer accessibility, safe overflow behavior and sensible fallback when a style is incomplete. **Time required: 24–48 hours for staged extraction and conformance tooling; Urgency level: MEDIUM (ARCHITECTURAL, AFTER STABILITY).**

**131. Community-created REDOWN theme and skin ecosystem.** Allow creators to build, import, share and preview custom themes via small declarative manifests, scoped CSS tokens and controlled assets so REDOWN can continue evolving through community creativity. Validate schemas, bound asset sizes, reject privileged JavaScript and unsafe URL/script injection, provide sandboxed previews and safe rollback, and respect creator copyright/licensing and compatibility versions. **Time required: 40–80 hours for a secure first creator SDK and importer; Urgency level: LOW.**

**132. Era Gallery / Theme Museum and safe compatibility rules.** Build an optional browsable gallery of user-installed or creator-shared designs, sortable by era, mood, accessibility and compatibility, rather than turning core Settings into an overwhelming theme marketplace. Preserve old compatible packs when possible, offer modern fallbacks when interfaces evolve, and avoid claiming REDOWN owns the third-party aesthetic movements it celebrates. **Time required: 24–48 hours; Urgency level: LOW.**

**133. Long-run creator economics and mass-market viability.** Model affordability, broad participation, creators' ability to share their designs and optional revenue sharing without depending on unverified billion-user forecasts. A hypothetical **1,000,000,000 paying users × $5/month × 12 months × 20 years = $1.2 trillion gross nominal subscription revenue**, before all fees, taxes, expenses, churn or discounts; this is arithmetic, **not a realistic subscriber forecast**. **Time required: 8–16 hours of scenario/financial modeling; Urgency level: LOW (EXPLORATORY).**

### How to make a theme ecosystem sustainable rather than fragile

1. **The engine is not the skin.** File API, storage, transfer routes, metadata, keyboard actions, permission prompts, safety confirmations, search, Favorites, reactions, tagging and real archives remain in the core; a theme cannot redefine them.
2. **Theme manifest rather than arbitrary application code.** Introduce a tested versioned manifest (theme ID, version, creator/rights, compatible REDOWN versions, tokens, optional assets, zones/variants, reduced-motion settings and fallbacks). Prefer JSON plus CSS custom properties; author extensions under strictly controlled scopes rather than allowing unreviewed CSS/JS to change security-critical UI.
3. **Any-shape responsiveness and accessibility.** Every skin must satisfy component minimums, readable breadcrumbs, focus visibility, 200% zoom where practical, overflow-to-More rules and keyboard usability at narrow widths. Preserve the stable navigation/preview contract no matter how wildly the surface looks.
4. **Profiles, not data silos.** A favorite, tag or reaction belongs to its actual file/folder in stable provider-scoped metadata; it remains intact across Porcelain, Blue, GeoCities and classic OS skins. User-defined archive/story layouts are separate exportable presentations over those references.
5. **User consent and rights.** Retro themes are original derivatives or properly licensed creator works. Do not bundle copyrighted brand logos, old website assets, third-party profile content or Apple/social-platform proprietary emojis without permission. Use a clear import safety screen for externally authored packs.
6. **Offline-first aesthetic continuity.** Previously installed compatible skins should render without dependency on a defunct theme provider, and the built-in stable theme must always be available. Theme failures cannot prevent the extension icon, right-click menu or Explorer from opening.
7. **No speculative subscriber claim.** Revenue scale depends on actual paying active users, retention, price, platform/store rules and meaningful net margins. Treat $1.2 trillion as a fixed-input twenty-year gross mathematical illustration, not a target or prediction.

### How this relates to previous important entries

- **121 Favorites, 122 Reactions, 123 Manual Tags** remain required earlier foundation features and should not wait for the theme marketplace.
- **124 Atlas-style JSON tagging-model compatibility** can later supply provenance and searchable archives, but does not authorize model scanning as part of theme selection.
- **72 Time Machine and 75 What Changed?** track real observed objects and history; Retro Capture can present those records but cannot resurrect missing file bytes.
- **91 Collection Studio and 93 The Grand Story** can use optional era skins without forking the file engine.
- **104 NEON reveal and 114 Unified Branding** should reuse the future declarative theme system rather than multiplying fragile UI-specific overrides.
- **No production code change requested by this appendix.** Any implementation must have an approved scoped work request, proper tests and real browser validation.

**Concept references for research, not copied assets:** [Tumblr Help: tagging](https://help.tumblr.com/knowledge-base/organizing-with-tags/), [Tumblr Help: dashboard](https://help.tumblr.com/knowledge-base/getting-started-on-tumblr/), and [Winamp Skin Museum](https://www.prandor.com/skins/). Historical platform styling must be reinterpreted rather than imported wholesale.

---

## IMPORTANT NEW IDEAS — NATIVE DESKTOP COMPANION, LOCAL FILE BRIDGE, AND INSTALLABLE CREATOR THEMES

**Added:** Week of November 1, 2026.  
**Status:** OWNER-DIRECTED PRODUCT VISION / FUTURE IMPLEMENTATION, not currently shipped.  
**Placement:** Deliberately **below** the internet-era theme ecosystem section as a continuation, leaving all earlier weekly priorities and entries intact.  
**Dependency:** Stabilize REDOWN's Chrome extension, Cloudflare saves, BOOT startup, file operations, metadata and theme contracts first; do not destabilize the extension to build these future features.

### The owner's integrated product experience

The optional **REDOWN Native Desktop App** is envisioned as an **included benefit with either a paid monthly subscription or a paid yearly subscription**, with no separate desktop-app surcharge in the proposed offer. This is proposed future packaging and must not be advertised as currently available or guaranteed until pricing, entitlement and platform support are implemented.

The desktop companion runs a **native local worker/bridge**, with explicit authorization to selected local folders. Once paired with the browser extension, a user can browse a meaningful **Local Desktop / Local Files** surface inside the familiar REDOWN Explorer, view actual folder trees, and move/copy files between authorized local directories and supported cloud locations with ordinary Explorer interactions such as drag/drop, Copy, Cut, Paste and Move. This would let REDOWN become a cohesive file manager spanning the desktop and clouds without needing a completely different application every time the user changes storage location.

Separately, a creator should be able to **download or build a REDOWN theme pack, install it into the native desktop application, and have that theme become an available one-click choice in the REDOWN browser extension**. The desktop companion may serve as a local theme library and validation/distribution helper, while the extension remains functional with its own preinstalled themes if the companion is unavailable.

### New weekly entries

**134. Desktop app included with monthly OR annual REDOWN subscription.** Define a future subscription entitlement that bundles access to the native desktop companion with either the monthly or yearly paid plan, rather than charging a separate desktop-app fee. Clearly document whether the extension remains independently usable, how offline access works, how optional free trials and renewal affect desktop functions, and whether locally owned files remain accessible after a subscription expires. **Time required: 8–16 hours of product/entitlement design; Urgency level: LOW (FUTURE PACKAGING).**

**135. Native local-file worker and secure extension-to-desktop bridge.** Build a signed local companion/worker that can enumerate and perform supported operations inside **explicitly user-authorized** local directories and expose them through REDOWN's existing provider-neutral file API. Prefer an authenticated Chrome Native Messaging host or another deliberately secured local IPC design; verify extension identity, origin, permitted folders, request types and user grants, rather than allowing arbitrary websites, browser tabs or untrusted theme code to read the filesystem. **Time required: 40–80 hours for a secure cross-platform prototype; Urgency level: MEDIUM (AFTER CORE STABILITY).**

**136. Browse and freely organize authorized Desktop files inside REDOWN Explorer.** Add a **Local Desktop / Local Files** source to the extension Explorer so users can list/search/preview local authorized folders and copy, move, upload or download to supported cloud destinations via the same selection and operation patterns. Preserve existing cloud identity and file safety, handle Windows paths and other platform differences, distinguish copy from move, apply Keep Both and read-back/verification where possible, and never delete a local source before the destination has been reliably confirmed. **Time required: 40–80 hours for initial local/cloud operations and interaction tests; Urgency level: MEDIUM (FUTURE).**

**137. Creator theme installation through Desktop, available instantly in Extension.** Separate REDOWN's stable functional interface from its theme-specific CSS/tokens and provide a versioned **creator theme pack** format, so a creator can publish or share a pack that a user downloads into the desktop app. After validating it, the paired extension discovers the installed theme and exposes it as a simple one-click option (including the choice to restore built-in Porcelain, Ocean, Midnight or NEON), with installed themes optionally cached in extension storage so they survive temporary desktop disconnection. **Time required: 32–64 hours following the shared theme contract; Urgency level: LOW (CREATOR ECOSYSTEM).**

**138. Orb/ball customization and theme-controlled accent colors.** Allow creators and users to configure the **colors, finish, accent/glow and permitted appearance variants of REDOWN's decorative/navigation orbs or balls** using theme tokens, an accessible color picker or a theme manifest. Where appropriate, an installed theme may occupy one configurable theme-selection orb or replace a purely decorative existing ball, so users can select the theme with one click; **do not silently replace or remove an orb that has an essential functional action**, and always retain a discoverable alternative and accessible label. **Time required: 8–20 hours for configuration UI, validation and theme hooks; Urgency level: LOW (PERSONALIZATION).**

**139. Creator submission, versioning and safe theme sharing.** Develop a straightforward workflow to package, preview, export/import and optionally submit theme packs from the desktop app into a future community catalog. Treat CSS and visual configuration as a constrained presentation surface, never blanket privileged-code access: enforce per-component styling boundaries, permissions, resource/CSP restrictions, schema compatibility, creator attribution, moderation/rights checks, reversible install/uninstall and safe fallback if a pack is broken or malicious. **Time required: 32–64 hours for an initial controlled creator pipeline; Urgency level: LOW (COMMUNITY PLATFORM).**

### User journey (desired, not implemented)

1. User subscribes monthly or yearly and installs the **included REDOWN Desktop App**; the extension continues working without it for ordinary supported cloud tasks.
2. On first desktop connection, REDOWN securely pairs its own extension with the signed local worker and asks the user to **choose which local folders** can be browsed or changed. Nothing is granted just because a program is installed.
3. In REDOWN Extension → Explorer, **Local Files** appears alongside authorized clouds. Users can browse their local desktop folders and copy/move selected files between authorized local and R2 locations using familiar workflows.
4. User downloads a creator-made original theme or creates one with REDOWN's styling controls, then chooses **Install Theme** in the desktop app. The native app validates and stores its declarative pack and communicates the installed theme manifest/assets to the paired extension.
5. The extension exposes the new style in its Theme Settings and optionally as a **theme orb/ball** that the user clicks once to apply. Creators can define suitable ball/orb colors through supported tokens, while core save, menu, login and navigation semantics remain intact.
6. When the desktop app closes or the computer disconnects, the extension falls back gracefully: cached compatible visual themes may remain selectable, but unavailable **local filesystem access is reported as disconnected**, never simulated or silently replaced with cloud data.

### Architecture and safety contracts

- **Core remains independent of appearance.** Extension launch, Chrome native right-click menu, Cloudflare auth, file operations, identity, Favorites, user reactions, tags, transfer receipts and metadata live in versioned stable core modules; theme CSS is a separate replaceable layer.
- **Meaning of “full access.”** Offer creators broad access to documented design tokens, layout zones, supported themed components and visuals, not arbitrary privileged JavaScript execution or unrestricted read access to files, tokens, tabs or browser APIs. Strong isolation is part of making third-party themes safe enough for a large userbase.
- **One semantic file API, multiple providers.** The desktop adapter is a genuine new provider/capability implementation (e.g. `local-desktop`) under REDOWN's existing typed provider/connection/object-reference contracts, not a competing Explorer or a parallel transfer engine. Desktop paths are treated as local paths with platform-specific permissions and durability, not fictitious R2 object keys.
- **Safely “move files around.”** Between local folders, cloud buckets or local/cloud boundaries, present Copy, Move, Rename and Delete only when actually supported and authorized; use staged writes, conflict policies and verification to protect data, and show partial/uncertain outcomes. Cloud-to-cloud TRUE REMOTE transfers and local-to-cloud uploads are **different transfer modes** and must be labeled honestly.
- **Local authority is explicit and revocable.** Permission to browse a user-selected folder does not authorize browsing the whole device. Provide a simple accessible control to revoke directories, unpair the local bridge and remove installed themes; prevent path traversal, symlink escape and cross-profile data leakage.
- **Cross-environment theme distribution.** Desktop and extension agree on manifest version, asset hashes, theme-ID provenance, cache invalidation and rollback; a corrupt theme or outdated desktop build cannot block extension startup or hide critical controls.
- **Themes are portable.** Support an original, documented exportable theme pack so a creator can distribute their style outside an eventual REDOWN catalog. User-owned Favorites and tags are independent of aesthetic packs and never lost when switching appearance.
- **Presentation orbs are not permission controls.** A creator may recolor or customize **decorative** orbs, and a selectable theme orb can be user-configured, but security prompts, destructive action confirmations, focus indicators and status icons must remain recognizable and trustworthy.
- **Business model is a proposal.** “Included with monthly or yearly subscription” is a proposed marketing/entitlement choice, not a live paid plan guarantee. It must not become an excuse to lock people out of their local files or make essential extension reliability premium-only.

### Implementation ordering and acceptance

1. **First:** Finish the weekly CRITICAL/HIGH work, especially BOOT, native saving, file safety, working previews and manual Favorites/Tags.
2. **Second:** Extract a stable shared theme contract and build a basic no-code/manual theme importer with original assets, validated manifest, live preview and safe rollback.
3. **Third:** Prototype the secure native worker pairing and authorized local-folder listing without performing destructive operations.
4. **Fourth:** Implement verified copy/upload/download/rename/move behavior incrementally, including identical filename conflicts, unavailable desktop bridge and interrupted operations.
5. **Fifth:** Add desktop-installed themes that sync to extension selectors, user-programmable orb colors, compatibility checks and one-click application.
6. **Last:** Consider creator submission, public catalog, distribution and subscription entitlements only after permission, platform, performance and marketplace governance are tested.

**Status and authority:** This appendix is a detailed future feature record in the weekly review, **not** a Codex implementation handoff, product release announcement, or permission to inspect local files or perform cloud mutations. Create scoped approved implementation requests only once the project is stabilized.


---

## IMPORTANT NEW IDEAS — RECOMMENDED DESKTOP THEME MANAGER, OPTIONAL DIRECT EXTENSION IMPORT

**Owner's design decision (week of November 1, 2026):** **Recommend REDOWN Desktop as the best, easiest, safest place to install and manage creator-made themes, but do not require it for ordinary safe themes.** Both desktop-assisted and direct-to-extension imports must pass the **same versioned validation and compatibility contract**. Desktop performs the extra asset preparation and creator management; the extension remains the final authority on what styling it will accept and display.

**140. Recommended desktop-first theme manager, not a forced desktop dependency.** Advertise REDOWN Desktop (proposed to be included with either monthly or yearly subscription) as the recommended installation and creator-management experience, with convenient pack previews, asset preparation, conflict detection, compatibility checks, theme libraries and one-click sync into the browser extension. Still let a user download a supported simple theme pack and import it **directly into the extension** without installing Desktop or granting local-file access, so the application remains approachable and independently useful. **Time required: 12–24 hours for dual-path import design and first compatible implementation; Urgency level: LOW (AFTER CORE STABILITY).**

**141. Shared theme compliance, namespace isolation and safe fallback.** Maintain one documented versioned manifest/schema and common validation conformance suite for both installation paths: scoped design tokens, approved assets, compatibility/size limits, required accessible states, responsive layout invariants and restricted styling surfaces. Desktop may reject or repair malformed packages before installation, but **the extension must independently validate** any installed/cached theme and never trust it merely because the native companion says it is valid; reject theme scripts, unsafe URLs, privileged code and styling that would obscure save destinations, permission prompts, focus, Delete confirmations or error states. **Time required: 16–32 hours for validator, fault tests and rollback; Urgency level: MEDIUM (ARCHITECTURAL, AFTER STABILITY).**

**142. One-click theme selection and independently themed orbs.** After installation, list each compatible theme in the extension's existing theme controls and optionally represent chosen packs with configurable **theme-selector balls/orbs** whose colors, gradients, gloss, glow and decorative appearance can be edited through allowed theme tokens. A theme may replace a purely decorative orb or take an optional selector slot, but **may not hijack a core functional control**; preserve keyboard access, accessible labels, built-in themes, a one-click revert option and cached offline appearance if Desktop is closed. **Time required: 8–20 hours for theme selector and orb tokens; Urgency level: LOW.**

### Two supported installation routes, one trustworthy result

| Experience | Import and management | Final validation | Offline and failure behavior |
| --- | --- | --- | --- |
| **Recommended: REDOWN Desktop** | Download/open a creator pack, preview and validate it, resolve supported token or asset conflicts, then offer **Install to REDOWN Extension** | Extension applies its own manifest/schema/content checks before activation, even when Desktop prepared the pack | Previously installed compatible themes stay usable when Desktop is closed; local-file capabilities appropriately show disconnected |
| **Simple: REDOWN Extension only** | Choose a downloaded theme pack in an extension-owned import UI; parse only allowed declarative tokens/assets | Exactly the same extension validator and conformance rules as the Desktop route | Theme is cached in appropriate extension-owned storage, with a built-in theme fallback and clear errors if unsupported |

**Compliance is not a promise of arbitrary CSS access.** Give creators rich documented customization through CSS custom properties, constrained component variants, approved layout/zone tokens and decorative asset slots, not unrestricted replacement of the extension's code or controls. The exact accepted format must be designed around Chrome extension security/CSP and current store rules, verified against current authoritative requirements at implementation time. Direct import means importing a pack as data into extension-controlled storage; users do not edit or overwrite the installed Chrome extension files.

### Practical product and release rules

- **Desktop = workshop and trusted convenience layer; extension = independent safe renderer.** Keeping security checks in both places minimizes collisions from incomplete or incompatible packs and prevents a malicious or broken Desktop installation from bypassing extension safety.
- **One theme engine.** Avoid separate desktop-only and extension-only renderers whose behavior eventually diverges; implement a common versioned token contract, reference fixtures and deterministic conflict rules.
- **A failed theme cannot break the app.** Before activating a new pack, retain a known-good active theme; apply validated changes in a bounded preview/commit step, and roll back automatically on missing required styles/assets or startup failures.
- **Creator-made packs should be portable.** Allow import/export of original themes, stable theme IDs, hashes, declared creator/license and compatible-version ranges, with opt-in distribution and proper rights.
- **No automatic broad local disk access.** Installing a theme or using the extension-only route should not grant authorization to browse Desktop files; Local Files remains a separately opted-in native capability.
- **Product positioning:** “Create anywhere. Customize everything. Install with REDOWN Desktop for the complete experience.” This is suggested future marketing copy, not a currently shipping claim.
- **Sequencing:** Stabilize REDOWN core → establish the theme manifest/validator → ship extension-only simple import → add Desktop creator tooling and sync → optional theme orbs/community submission. The exact schedule may change with measured readiness and security testing.

**Status:** Owner-approved conceptual direction recorded here only. **No production code or theme import feature is implemented by this documentation edit.**

---

## CRITICAL FOLLOW-UP — SKIN API, CREATOR CONTROL, AND PROPRIETARY CORE SEPARATION

**Task ID:** `C-SKIN-01`  
**Urgency:** **CRITICAL, gated**  
**Trigger:** **BEGIN ONLY AFTER** REDOWN's BOOT API and native V3 right-click API have stable, source-backed and real installed-Chrome acceptance evidence; do not interrupt incident repairs or unsafe transfers for cosmetic work.  
**Status:** Owner-directed architectural requirement, NOT IMPLEMENTED.  
**Location in ranked work:** Explicitly listed under **Priority 1 — CRITICAL** as `C-SKIN-01`; the same identifier appears here for its detailed contract.

### Owner vision

> Once REDOWN's two critical operational APIs are stable, **MAKE THE SKIN API**. Let creators control how REDOWN looks, its themed balls/orbs, visual states and responsive design, without handing over REDOWN's proprietary file-transfer, cloud and startup implementation code. The public interface can be generously customizable while eligible internals are supplied in compiled/binary distributions instead of a copy-ready source tree.

This is a desire for **a thriving skin ecosystem with a maintainable, protected proprietary engine**, rather than giving theme makers unrestricted access to the source or producing separate builds of the product for every visual era.

### Why separate the two layers

- **Stable engine:** Owns provider identities, authenticated remote/local file operations, BOOT, native context-menu registration, CURRENT/metadata, History, Favorites/tags, permissions, error reporting and non-negotiable keyboard semantics.
- **Public SKIN API:** Defines theme manifests, semantic UI slots, customizable CSS design tokens, approved layout variants, icons/orbs, badges, surfaces, shadows, typography, motion and safe breakpoints/overflow behavior. Supported creators customize those without changing a save destination or injecting privileged code.
- **Shared styling contract:** Both the desktop manager and direct extension importer use the same spec, compiler/validator fixtures, compatibility version rules and rendering tests. Native Desktop is the recommended creator workshop, not required for simple theme imports.
- **Commercial separation:** REDOWN may publish documentation, schemas, examples and an intentionally narrow SDK while retaining proprietary operational code under an appropriate commercial license; skin creators do not require the private source repository.

### Binary distribution idea, with the real technical boundary

**Owner preference:** If separating CSS makes creator access possible, keep as much **proprietary functional implementation** as practical in compiled binary artifacts, especially in a native desktop companion, so consumers are not receiving a neatly readable copy of the core. Preserve ease of skin creation without handing out the engine's source.

**Critical reality check:** A browser extension is delivered to a user's machine and its HTML, CSS and client-side JavaScript are inspectable. Minification, obfuscation or WebAssembly can make some code harder to understand but cannot make shipped client-side logic impossible to extract or reverse engineer; they also create performance, debugging, accessibility and store-policy tradeoffs. A native compiled executable or library can reduce casual copying of the desktop portion, but binaries themselves can still be reverse engineered. Never put credentials, secret signing keys or access-control authority in client-side binaries and assume they cannot be discovered.

**Recommended feasible architecture:**

1. Keep **extension-required JavaScript and declarative CSS/theme tokens** packaged in the extension, built/minified if appropriate, with a stable public SKIN API and private application source repository.
2. Put **native-only capabilities** such as authorized desktop-file access, local indexing and selected proprietary algorithms into signed compiled native companion modules behind a narrow, authenticated IPC/Native Messaging contract where practical, without moving browser-owned action/context-menu logic to an unavailable helper.
3. Keep genuinely secret or abuse-sensitive functions on a trusted server when justified and feasible; do not require constant connectivity for ordinary file browsing or installed skins.
4. Expose **only versioned data schemas, token names, component slots, sample skin code and tests** necessary to build skins. Do not publish internal cloud transfer source merely to enable design changes.
5. Prefer demonstrable quality, brand, creator ecosystem and license protection over claiming that code cannot be copied. Never advertise a binary as unbreakable or rely on obscurity to enforce permissions.

### First SKIN API deliverables and acceptance

1. **Inventory/architectural audit:** Map every current inline CSS, theme override and hardcoded color/size to a semantic UI component without prematurely rewriting BOOT, right-click or file transfer internals.
2. **Versioned `skin.json` / design token contract:** Cover recognized theme IDs, compatible app versions, safe asset types, optional layout variants, light/dark baselines, typography, focus and hover, accent/orb colors, animations, responsive rules and required fallback styles.
3. **Public minimal developer kit:** Ship sample themes, visual slot documentation, a manifest schema validator, screenshot/regression fixtures and clear rights/creator attribution, without sharing proprietary application source.
4. **One renderer and validator:** Validate and apply themes in the extension, even when Desktop helped prepare them; reject unsafe style injection, scripts, unsupported resources and attempts to conceal security-critical controls.
5. **Safe creator freedom:** Allow personalization of theme backgrounds, shadows, borders, image cards, layout composition in documented zones and decorative orb/ball colors while preserving readable navigation, accessible keyboard focus and responsive fallback.
6. **Atomic theme application and rollback:** Preserve a last-known-good skin and built-in fallback; malformed or incompatible themes must not prevent the app, Shelf, context menu or Explorer from opening.
7. **Binary/native helper assessment:** Identify what functionality actually benefits from native compilation and what must remain in the browser extension; document realistic limitations and existing app store/policy requirements before introducing packaging complexity.
8. **Honest proof:** Test built-in and external themes in installed Chrome at narrow and wide viewports, 200% zoom where practical, dark/light themes, reduced motion, offline desktop absence and failed/partial theme imports. Report exact failed tests and distinguish preview from installed acceptance.

### Explicit non-goals and ordering

- **Do not** replace REDOWN's stable provider engine, create a new menu writer, introduce a second BOOT entrypoint or rewrite cloud saving under the guise of skin isolation.
- **Do not** gate essential startup recovery or file safety behind a desktop app or subscription.
- **Do not** let creators modify browser/extension privileges, security and permission prompts, exact save routes or arbitrary privileged JavaScript through theme packs.
- **Do not** make complicated native binaries a prerequisite for an ordinary CSS/theme-only importer.
- **Do not** claim the extension's shipped implementation is secret because its presentation CSS is isolated.
- **Sequence:** Complete BOOT API → complete and real-Chrome-verify right-click API → validate data safety and stable core UI contracts → implement `C-SKIN-01` SKIN API separation and compatibility tests → open simple theme imports → expand native desktop creator tools and community themes.

**Development handoff:** When the stability gates are met, create a scoped `NEED_TO_DO/CODEX/` implementation request for SKIN API engineering with source inspection, exact tests, commits and a rollback plan. This weekly list is a priority/architecture record, not an instruction to prematurely ship a new theme API now.


---

## IMPORTANT NEW IDEAS — DAILY FINDINGS CAROUSEL, CLICK-TO-OPEN, CHUTE DRAG-OUT, AND LOGO IDENTITY

**Captured:** November 1, 2026. **Status: NOT IMPLEMENTED.** This is the consolidated weekly master entry. The dated actionable task list is [NEED_TO_DO/11012026.md](11012026.md), entries **P1.9–P1.11, P2.9, P3.6**. Existing P0 stability and V3/Boot work take precedence.

### Daily image findings, source-aware vertical rolling Shelf carousel (high priority)

- [ ] **Today's visual discoveries:** A premium vertical roulette/carousel of the **actual saved image findings**, available directly in the REDOWN Shelf's existing History experience. Source records must distinguish the original webpage URL, source image/file URL, actual saved cloud object, timestamp, provider/account/container and filename. Real thumbnails and source links, not fabricated ones.
- [ ] **Default-open behavior:** **ON by default**, displaying the findings carousel automatically when the user enters/opens History so they immediately see what they saved or clicked without finding a separate gallery. Shelf Settings offers a toggle to **OFF**, switching to an explicit accessible click-to-open control within History. Keep all existing History entries, navigation, GO TO and state intact.
- [ ] **Strict lazy-load envelope:** Current finding + **7 next + 5 previous** (13 potential positions total). Load thumbnails on demand in that moving bounded window; release out-of-window resources; cap concurrent loads, reject stale completions and handle day boundaries. No bulk eager-loading all historical image bytes or unrelated files. Do not expose private signed URLs or prefetch without authorized data access. Empty, missing, failed, non-image and deleted items have truthful representations.
- [ ] **Writable/annotatable discoveries stream:** User may add optional short notes/labels to a finding, stored as portable per-object metadata separately from cloud content, without automatically altering the actual saved file. Smooth premium scrolling, responsive size, touch, keyboard, focus and reduced-motion controls, plus persisted selection/scroll where reasonable.

### Chute framework integration: drag from REDOWN into Google/Yandex/ChatGPT (research + demo)

- [ ] Audit actual **Chute** code/contract, browser drag payload formats and the current Shelf surface; prototype user-initiated drag of compatible images/files or their authorized URLs from carousel into **Google Images**, **Yandex Images** and **ChatGPT**. This is a **product demo idea**, not guaranteed cross-site functionality; external sites decide accepted drag payloads and may refuse browser-extension cross-origin or URL-only drags. Provide copy-URL/manual-save alternatives when native drag cannot work.
- [ ] Never auto-upload or silently submit private images to outside search/AI services. An originating webpage URL is not interchangeable with image bytes; a private R2/Drive/Dropbox/OneDrive object is not a public URL. Explicit user intent, provider permissions, readable error/fallback, privacy safeguards and real installed-Chrome tests required. Preserve independent cloud connectors and Chute ownership.

### New brand-logo direction (design candidate only)

- [ ] Explore a **massively recognizable solid bright blood-red R, upper-left weighted, on black**, with a **single rising bottom-left-to-top-right diagonal slash integrated into the red letter**, visually conveying **sliding/forward movement**. Sharp and unmistakable even as a tiny toolbar icon; restrained, not over-ornamented. Develop large SVG and small PNG export options for same-brand use across extension, redown.online, Google, Dropbox and OneDrive. Owner must choose/approve before any replacement; existing icon/website/OAuth configuration remains unchanged by this note.

**Acceptance/priority:** Carousel and default-on History setting are P1 product features; bounded lazy-loading is a performance requirement, not optional polish. Drag-to-other-sites is a P2 feasibility + demo project contingent on actual destination support. Logo is a design decision, not an automatic code/app identity change. **No development is marked complete by this documentation.**


### FUTURE REVENUE IDEA — Annual search-engine sponsorships for the Shelf discovery flow (owner proposal, November 1)

- [ ] **Consider a yearly fixed-fee B2B partnership model.** If REDOWN gains enough users and its Chute-backed daily findings carousel becomes a proven image search/reuse gateway, pitch **Bing (Microsoft), Yahoo and other serious competing providers** on paying an **annual lump-sum sponsorship** to receive prominent inclusion or promotion **as major alternative search choices** alongside Google Images, Yandex Images and other supported discovery destinations. The strategic argument is visibility to REDOWN users at the exact moment they want to research or reuse a saved image. Study whether provider-sponsored launch/drag/search shortcuts, clearly labelled partner cards or co-marketing slots generate measurable value, and define possible annual reach-based terms **only after** real adoption data exists.
- [ ] **Keep the user experience and trust first.** Paid prominence must be disclosed as **Sponsored / Partner** rather than misrepresented as unbiased ranking, default recommendation or provider endorsement. Never sell private URLs, image contents, saved-history records or account data; don't trigger third-party search/upload without a user's explicit action. No fake support for drag-and-drop, no guaranteed deal, no exclusive removal of competitors, and no attempt to sidestep destination or Chrome policies. Negotiate only within relevant brand, consent, policy and technical limits. Preserve easy user choice and a reliable free workflow independent of sponsorship.
- [ ] **Sequencing:** First deliver and verify the History carousel, default-on/optional click-to-open, **1 current + 7 next + 5 previous** bounded lazy loads, accurate source tracing and Chute feasibility tests for Google Images, Yandex Images and ChatGPT; then measure active discovery use and prospective referral demand before making a commercial approach.

**Cross-reference:** [Dated action list, P4.1–P4.2](11012026.md). This is **a business idea only**, not authorization to sell placements, insert ads, change destination order or modify the running product.


### November 5 addition — Cloudflare Add Token on Dashboard

- [ ] **High priority after MEGA S4 Explorer connectivity:** Add **Add Token** directly underneath Cloudflare buckets in the Dashboard. Open an in-dashboard modal for the Cloudflare management token/account ID and optional R2 S3 access key/secret/endpoint. Verify connection and capabilities before use, retain credentials safely across restart, and avoid repetitive OAuth when valid credentials suffice. Preserve existing OAuth as an alternative, and never claim indefinite login if keys expire or scopes are missing.
- [ ] **Authoritative implementation detail and security/acceptance checklist:** [Cloudflare Add Token dashboard popup and persistent connections](CLOUDFLARE_ADD_TOKEN_DASHBOARD_PERSISTENT_CONNECTION.md). Specification only; not yet implemented.

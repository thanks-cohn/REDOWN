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

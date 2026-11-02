# CODEX REQUEST — Dropbox filename fidelity, provider Shelf celebrations, Google Drive one-click parity
**Date:** 2026-11-02  
**Repository:** thanks-cohn/REDOWN  
**Target branch:** `codex/flat-provider-native-menus`  
**Owner's local checkout:** `C:\Users\jg202\Desktop\Extension\remote-download-2-cloudfare`  
**Observed local HEAD after fast-forward:** `c76a56e` (confirm current HEAD; do not assume it remains unchanged)  
**Status:** IMPLEMENTATION REQUEST; nothing in this document claims implementation or verification.

## Mandatory workflow and boundaries
1. Inspect current branch, working-tree cleanliness, the read-only flat-provider-menu audit at `docs/CODEX_P0_REAL_CHROME_FLAT_PROVIDER_MENUS_RELIABILITY_HANDOFF_2026-11-02.md`, relevant source, tests and existing sound/theme/persistence mechanisms. Record baseline and impacted file inventory.
2. Preserve Cloudflare's protected V3 right-click menu projection/resolution, CURRENT, shared native registrar, Cloudflare TRUE REMOTE transfer engine, existing credentials, permissions, history, provider privacy contract and other providers' save routes. No rearchitecture of V3 or unrelated changes. Cloudflare is NOT part of the FREE GB badge-spacing change.
3. Implement in small separately testable increments; run targeted, full regression and real installed-Chrome acceptance where feasible. Never reinterpret mock tests as real Chrome proof. Document unresolved failures separately; never delete/weaken tests to hide failures.
4. Commit/push changes to the designated feature branch only after verifying actual worktree and branch state. Do not merge to `main` without owner approval. Give exact changed-file list, commits, tests and residual risks.

## P0 — Dropbox: preserve the source's actual filename, without gifting more metadata
**Observed complaint:** Downloads saved into Dropbox use generic names (`image`, `image (1)`, etc.) when a legitimate original filename exists.

**Required:** Determine the actual filename from information **REDOWN already legitimately has or receives while downloading bytes**: e.g. a trustworthy `Content-Disposition` filename in the existing source response, a reliable user-visible link/download filename, or the appropriate final URL path when available. Specify precedence and safe decoding/sanitization, handling Unicode, extension integrity, query strings, redirects, extensionless sources, MIME/URL disagreements, dangerous path segments and absent names. Only fall back to a generic name if the original cannot reliably be derived.

**Strict additive-only metadata rule:** Dropbox must continue receiving **EVERYTHING REDOWN ALREADY GIVES IT TODAY, unchanged**. Do not remove, suppress, rename, reclassify or change the value of existing request fields, metadata, headers, protocol options, or existing history behavior. The **sole newly permitted information is the best-available real filename**, determined within REDOWN and used in the existing filename/destination field; add a dedicated filename field only if strictly necessary and supported by the existing Dropbox API flow. Do not add any other provider-facing metadata, and do not request new Dropbox permissions. Do not send original source/page/link/frame URLs or raw download headers *as part of this filename fix*. No new origin inspection by Dropbox. Audit and show before/after provider request fields to prove the only semantic difference is improved filename resolution.

**Important:** Keep the existing `Keep Both` numeric suffix behavior exactly as-is. When a name genuinely collides, retain the existing `(1)`, `(2)`, `(3)` convention and its current implementation. Prefer a real filename **when available**, but allow the current generic naming fallback when the name cannot be reliably discovered. **Do not modify conflict resolution logic or numbering rules.** Maintain consistency with REDOWN History and provider result.

**Acceptance:** Real source name preferred when reliably available; genuine collisions still receive existing numbered suffixes; unknown names still get current safe fallback; all Dropbox fields and metadata already transmitted remain intact; no newly transmitted information except the resolved name; tests and authorized readback evidence.

## P1 — Shelf provider card composition and animation parity
### FREE GB positioning
For **non-Cloudflare** provider cards, visually space the FREE GB label more evenly in the region between **GO TO** and the **three-dot menu**. Preserve click targets, order, responsive sizing, accessibility, and actual provider quota semantics. **Do not relocate Cloudflare's FREE GB badge** as part of this task.

### Existing Cloudflare mini-ball
Inspect the **existing little ball animation already used by Cloudflare** and reuse its behavior/component for other applicable cloud cards rather than approximating it with a new unrelated animation. Match current component timing/state semantics; do not imply Cloudflare success during other providers' operations.

## P1 — Successful-save Shelf card feedback and lifetime counter
**Count only actual completed successful saves**, correlated to durable REDOWN receipts, exactly once per successful operation (idempotent through duplicate callbacks, restart, retry and History reload). Do not increment on click, upload start, partial upload, failure, cancellation or uncertain outcome.

### All themes — counter and text position
- Each provider card maintains/display its **own cumulative successful-save count**, durable across sessions, and increasing without an intentionally imposed reset. Never confuse this with the existing global odometer; avoid silently rewriting either history or preexisting counters. Inspect provenance and recovery for migration.
- For **non-Neon themes**, place the number and a tasteful **SUCCESS!** label **between GO TO and FREE GB**. Follow the theme's palette/typography, never use SNES/pixel fonts for these themes. The count should remain visible as it grows; progressively scale text down within legible bounds and use an overflow strategy for very large values (do not shrink to unreadability). Keep the three-dot action accessible.
- For **Neon**, use the same correct lifetime count in the card, with a retro `+1` rising at the **center** of the provider card when an actual save succeeds. Directly beneath **FREE GB**, show `SUCCESS!` in **green retro SNES-inspired text with a yellow offset duplicate/drop-shadow** (owner describes a yellow 'double imposition'). Interpret as a layered offset shadow/outline, **not two independently readable SUCCESS labels**. Neon-only typeface for arcade elements: **Bitcount Grid Double Ink** (load under proper asset/license/build rules; do not bundle font if licensing or assets unavailable, and document fallback). A little two-color glowing square behind the rising `+1`, gentle shimmer, and provider-specific soft outline glow complete the animation.
- For **other themes**, `SUCCESS!` uses complementary colors and a restrained glint/glow with that theme's normal type system. The success state/label must not falsely appear before confirmed saves. Decide and document lifecycle for transient `+1` versus durable count and persistent/temporary SUCCESS label; avoid clutter if cards are compact.
- For **all** providers, successful save briefly shimmers/glows the **card border** in a provider-appropriate, theme-compatible way. Keep any animated glow from covering controls or stealing focus. Honor reduced motion, high contrast, and suppressed effects settings.

### Audio, with exact defaults
- **Neon:** play a short, memorable, original/licensed **SNES-era-inspired success sound** on each *confirmed successful save*. The user can disable this in Settings; provide discoverable toggle/volume if consistent with existing sound controls. Avoid unwanted duplicate playback on restored receipts.
- **Odometer:** offer its own distinct sound toggle and set its default to **OFF**. Never automatically enable it via the Neon success-sound preference; keep these controls independent and persist them.
- Other themes should NOT automatically receive Neon arcade sound styling; preserve existing theme sound preferences where applicable. Respect browser autoplay restrictions and mute/reduced sensory preference; never block a save because audio fails.

## P0 — Google Drive: login once → direct right-click save
**Target owner experience:** Once authorized, `REDOWN → Google Drive` should save automatically, like the desired Dropbox/OneDrive flow. **No Google transfer tab, no 'keep this tab open' step, no repeated prompts per ordinary save, and no REDOWN-imposed 32 MiB cap.** Present correct progress, durable outcomes, and recoverable errors in existing Shelf/History surfaces without requiring a foreground tab.

- Inspect the real MV3 browser-lifecycle constraints, service worker/offscreen-document/background transfer options, Google Drive resumable API and permissions; use a compliant, persistent/resumable architecture with chunking/streaming so multi-GB sizes are feasible within service and browser resource limits. Do not buffer multi-GB blobs fully in memory. Removing the app-level 32 MiB cap is mandatory; do not promise literally unlimited file size.
- Once connected, no extra consent prompts for normal already-authorized saves. A genuine expired/revoked permission, newly needed source-host permission or user gesture requirement must be handled truthfully, not bypassed. Do not silently widen OAuth scopes or host permissions to paper over issues.
- Preserve source filename and extension. Save at the intended authorized Drive destination (no unwanted `REDOWN` folder); respect least-privilege `drive.file` scope and the actual APIs' limits. Google receives bytes, filename and only necessary storage metadata; **no original page/source/link/frame provenance**. Source capture and Drive upload are separate trust boundaries.
- Keep direct leaf dispatch and Cloudflare-only nesting isolated; investigate integration with one shared native menu authority, no competing registrars. Verify if the feature-branch flat menus actually render in installed Chrome; the existing audit found none of that proven.
- Test small/large, concurrent, permission-limited, interrupted/restarted, duplicate callback, collision, missing filename and actual provider readback scenarios. Failed, unknown or deferred jobs must not trigger SUCCESS!, +1, sound or the lifetime counter.

## UX examples / exact location contract
For a **non-Neon** card, preserve this logical flow: `GO TO` | `SUCCESS!  12345` | `FREE GB` | `⋯`, with aesthetically balanced spacing and scaling. For Neon, preserve the functional controls, display the lifetime count unobtrusively, put `SUCCESS!` immediately beneath `FREE GB`, and animate centered rising `+1` only after confirmed saves. Exact pixel alignment should be verified against the real card implementation at different widths. The green label's yellow treatment is an **offset text shadow/double-print effect**; offer a screenshot or two concise variants to the owner before locking a difficult-to-reverse visual direction.

## Required deliverables
- Technical audit of affected components and explicit minimal-change implementation plan.
- Working code and focused tests for each requirement, including filename selection/metadata minimization, count idempotency/persistence, visual layout, sound defaults, Google resumable uploads, and protected V3 invariants.
- Verified screenshots/video or reproducible UI evidence for Porcelain, Midnight, Neon, responsive cards, and settings audio toggles.
- Installed-Chrome and real-provider evidence where available; specifically distinguish verified, blocked, and untested.
- Release and rollback notes with exact changed files and commit IDs.

**Do not claim done because files changed, mock tests passed, or an API acknowledged a menu plan.**

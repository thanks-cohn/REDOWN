# REDOWN Shelf History, brand icon, and Explorer login controls

**Branch:** `release/cloudflare-true-remote`  
**Implemented:** October 29, 2026  
**Baseline tag `BASE-102926`:** unchanged

## Shelf History

The Shelf's History view is intentionally quiet: a centered **YOUR PERSONAL ARCHIVE** caption above **History**, with breathing room from the preceding divider. No explanatory paragraph or bulk record cards.

The timeline orders transfers by local date and year. Its newest section displays the present day, the remaining part of this week, and recent weekly groups. Older records fold into **Month → First/Second/Third/etc. Week → Day → Transfers**. Each heading is a native keyboard-accessible `<details>` disclosure, with one sibling group expanded at a time. Hover treatments use a small transform and theme-aware glow. Reduced-motion preference disables optional transitions.

Pagination renders at most 40 retained records per page. Buttons move between bounded local archive reads, without loading every historical record into the Shelf DOM. A small status line shows the known record count.

### Retention and historical completeness

`extension/transfer-counter.js` still maintains the legacy `chrome.storage.local.transferHistory` window of 50 records for compatibility with existing right-click and diagnostic features. In addition, `extension/history-archive.js` persists **newly recorded** transfer entries in an extension-local IndexedDB archive and exposes bounded pagination.

The first Shelf read imports whatever legacy records remain; stable deterministic IDs cover old records without an ID. It **cannot recover records discarded before this feature**. Browser-local data is subject to available storage/quota, browser profile deletion, and device loss. This is not a cloud backup and cannot guarantee unlimited lifetime persistence. Current recording coverage matches REDOWN's existing transfer recorder; other Explorer file operations are not newly audited by this feature.

If IndexedDB is unavailable, History still paginates the existing recent records, identifies the fallback, and never blocks transfers. Remote R2 renames update the historical record's filename and location.

## Unified REDOWN icon

One vector definition and one palette table in `extension/brand-icon.js` supplies the Shelf and Explorer marks. The Chrome toolbar renders the same paths at 16/32/48 using OffscreenCanvas/ImageData. The packaged 16/32/48/128 PNGs and the Explorer SVG favicon use the same red-on-black Midnight baseline for consistent cold-start artwork.

* Midnight: **red R on black** everywhere.
* Porcelain, Ocean, NEON: palette-appropriate R gradients and backgrounds.
* Shelf: follows Shelf theme and the existing original/theme icon-background setting.
* Explorer: follows its **effective Explorer palette**, including independent theme selection.
* Chrome action icon: follows the Shelf palette. Temporary success/failure feedback returns to the themed mark.

The toolbar rendering uses bounded buffers and no continuous animation. The assets and CSS use no external icon package.

## Explorer session controls

While signed out/unauthorized, the account placeholder collapses to a single, **centered LOGIN** button with a classic Mac/Aqua-inspired treatment. The redundant account and reconnect text are hidden visually in this state. LOGIN reuses the existing Cloudflare sign-in action, not a second authentication system. During real discovery errors, the original retry/recovery affordance remains.

When signed in, **LOG OUT is centered on the same sidebar axis** with matching width and retains its existing confirmation. Responsive and reduced-motion styles are included.

## Validation and caveats

JavaScript syntax and focused mock interactions have been inspected. The repository contains new and updated regression tests for modern destination navigation, History grouping/pagination, record archiving, shared brand colors, toolbar restoration, and LOGIN/LOG OUT layout. Full Node test suite and installed-Chrome visual testing still require execution in the real project runtime; do not mistake static checks for visual acceptance.

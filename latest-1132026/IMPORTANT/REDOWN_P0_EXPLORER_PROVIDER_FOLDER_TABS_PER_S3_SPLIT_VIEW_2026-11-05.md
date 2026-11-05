# REDOWN — File Explorer Provider Folder Tabs, One Per Connected S3 Cloud, Future Side-by-Side Docking

**Date:** November 5, 2026
**Owner direction:** Preserve the premium tactile folder-tab idea, but put it **inside the actual REDOWN File Explorer** where files/folders are browsed. Every independently connected S3-compatible cloud must have its own top tab. Those tabs can later be separated/docked to form independently navigable side-by-side Explorer panes.
**Priority:** High-priority Explorer architecture and UI requirement, with staged split-pane follow-up. **OPEN — documentation only, not implemented or installed-browser verified.**
**Scope:** REDOWN's real Universal File Explorer (its full Explorer and corresponding compact Shelf FILES experience). The tab concept must not become a second, decorative Dashboard-only file explorer.

## 1. Source/context: what is being corrected

- **Existing visible tab aesthetic:** `extension/beta/explorer.css` contains the `.quick-links-panel`, `.quick-links-tabs` and `.quick-links-content` styling described as *tactile office-folder tabs over the existing Explorer API*. Reuse this visual design language as appropriate, but **do not leave the actual connected-cloud provider tabs marooned in that Quick Links/Dashboard card**.
- **Prior owner-approved note:** `NEED_TO_DO/11022026.md`, section **P1 — Top-of-Explorer provider tabs and draggable side-by-side cloud views**, already describes top provider tabs, independent panes, future LOCAL and no fake transfer. This document is a current-date clarification and implementation handoff, not a separate conflicting feature.
- **Current Explorer:** `extension/beta/explorer.html` / `extension/beta/explorer.mjs` with the actual file workspace and REDOWN's `file-api.mjs` / `r2-adapter.mjs` provider boundaries. There is also the compact Shelf **FILES** surface (`extension/shelf-explorer.mjs`) and its existing tree/files split and bottom preview.
- **Important distinction:** The requested **side-by-side cloud panes are a layout inside REDOWN's own Explorer**, NOT necessarily Chrome's browser-level Split View pairing a webpage and REDOWN. Preserve any working Chrome Split View / History GO TO flows as independent features.

**Definition:** A *provider folder tab* is an attractive, tactile, document-folder-style tab at the top edge of the REAL file-browser viewport. It binds to exactly one connected S3 cloud **connection identity** (provider + authenticated account + endpoint/region/namespace as applicable); buckets and subfolders live inside the selected tab's own file tree. It is **not one tab per individual folder**, and it is **not the Shelf's FILES/REMOTES/HISTORY/SETTINGS navigation row**.

## 2. Mandatory layout and first usable version

```text
REDOWN Shelf / full File Explorer

[existing FILES / REMOTES / HISTORY / SETTINGS navigation, if Shelf]
[existing relevant branding / actions, responsive]

FILE EXPLORER WORKSPACE
┌─[ Cloudflare R2 ]─[ My S3 ]─[ Another S3 ]─[+ future connections]────┐
│  selected provider's REAL account/bucket/folder tree | REAL files      │
│  breadcrumbs / actual selection / previews / search and file actions │
│  existing bottom Preview dock, if current FILES layout calls for it  │
└────────────────────────────────────────────────────────────────────────┘
```

- [ ] Move/adapt the folder-tab **visual treatment** to sit *at the top of the actual FILE EXPLORER's file-content area*, not in the Dashboard's separate Quick Links/configuration card, beneath the Explorer, or among bottom navigation shortcuts.
- [ ] **Automatically show a tab for EACH authenticated, connected and eligible S3-compatible cloud connection.** Cloudflare R2 is one such connection; AWS S3, Backblaze B2 S3, Wasabi, DigitalOcean Spaces, or other S3-compatible endpoints may receive tabs **only when actually implemented and connected**. These are examples, not claims REDOWN already supports each one.
- [ ] **One tab per independent connected cloud/connection**, not per bucket or directory. When the same provider has multiple separately connected accounts, use distinguishable connection names/account suffixes and exact scoped identity; do not merge access or accidentally reuse credentials. Buckets and folder expansion remain inside the cloud's corresponding tab.
- [ ] No empty fabricated tabs for disconnected/unimplemented providers. Reconnecting an existing known connection should restore its tab and known local browsing state when authorization is fresh; a disconnected connection may remain visible as a clearly labeled reconnect state if preserving a user's workspace, but must not appear ready or allow an unauthorized file action.
- [ ] Clicking a tab changes the actual Explorer data context and tree/listing through the **shared Universal File API**, using provider/connection-specific adapters. **No separate provider-by-provider Explorer rewrites**, duplicate UIs, or fake tab panels. Reuse existing loading, pagination, previews, selection, drag/drop, file operations and authenticated permissions.
- [ ] Each tab retains its own account/bucket/folder, breadcrumb, selection, sort/filter, scroll position, preview and navigation history as appropriate. Switching tabs must not overwrite another connection's state or trigger needless full re-listing, and must not land on a same-named folder in a different account.
- [ ] If only Cloudflare R2 is connected, show a tasteful single **Cloudflare R2** tab. Maintain the same functional Explorer layout without dummy tabs or a separate home page.

## 3. Future docked split Explorer: separate top tabs into side-by-side panes

```text
Normal: [ Cloudflare R2 ] [ My S3 ] [ Another S3 ]
        └──────────── one real Explorer viewport ─────────────┘

User drags [My S3] tab onto the right-hand dock target:

┌─[ Cloudflare R2 ]───────────────┬─[ My S3 ]──────────────────────┐
│ own folder tree + file list    │ own folder tree + file list   │
│ own breadcrumbs / selection    │ own breadcrumbs / selection   │
│ own previews / scroll / focus  │ own previews / scroll / focus │
└────────────────────────────────┴───────────────────────────────┘
                    adjustable divider
```

- [ ] Tabs can be picked up, reordered, **docked beside** an existing Explorer tab, and **undocked/rejoined**. Provide unambiguous visual drop targets, a stable split, and a visible way to close split without disconnecting a provider or losing browsing state.
- [ ] Side-by-side means **two fully working, independent views within the ONE Universal Explorer**, not a screenshot/preview or two unrelated Browser tabs. Each pane retains its own navigation, files, selected bucket, focus, scroll, preview and async request lifecycle.
- [ ] Split divider is resizable; narrow Shelf sizes and browser windows use a graceful single-pane / tab-switching fallback rather than hiding controls, overlaying text, or rendering an unusable 1-pixel pane. Do not break the existing FILES middle splitter or bottom Preview dock; specify how they coexist.
- [ ] Dragging a **provider tab** modifies the Explorer layout **only**. It must NEVER initiate cloud-to-cloud transfer. Dragging a **file** between two panes is a separate, later authorized file operation using existing Universal File API and Keep Both/conflict semantics; it requires independent end-to-end proof and exact destination validation.
- [ ] Provide keyboard alternatives for tab rearrangement/docking, focusable and labeled active tabs, accessible close/split controls, reduced-motion support, and screen-reader identification of each provider/account.
- [ ] Save stable tab order, pane arrangement, selected connections and browsing state as appropriate under local workspace preferences **without storing credentials** or restoring expired authorization as live.
- [ ] **Future native desktop LOCAL tab:** Only after a native companion grants access to actual user-approved local directories. LOCAL may dock beside clouds, but must never be shown as working today without a verified local bridge.

## 4. No architecture regressions

- **One Universal File API** remains the authority for directory/file operations; underlying S3-compatible providers share a common S3-capable adapter contract but their tokens, endpoints, identities, R2/Worker capabilities, object namespaces and privileges stay isolated. Non-S3 Drive/Dropbox/OneDrive may eventually participate as independent tabs through native adapters when their Explorer listing contracts are real; do not pretend they are S3 services.
- **Cloudflare Click2Cloud TRUE REMOTE** is still a Worker-side remote HTTP fetch to R2. Moving/docking tabs does not alter context-menu transfer routing or change TRUE REMOTE into a browser-mediated source download.
- Chrome right-click registration, V3/CURRENT menu authority, Simple/Narrow/Depth, provider flat leaf rows, History GO TO, successful-save verification, logout/revoke, and per-provider permission gates stay unchanged.
- **Actual Shelf navigation remains FILES / REMOTES / HISTORY / SETTINGS** (or its currently verified configuration). The folder-tab strip lives *inside FILES*, below the application-level navigation. Shelf default REMOTES, preview sizing/behavior, toolbar and independent browser Split View behavior must remain intact.
- Do not move the folder-tab aesthetic to the right-click destination popup or turn the decorative Quick Links panel into the backing storage browser.

## 5. Acceptance tests and implementation boundaries

- [ ] One actual authorized S3 connection → exactly one real top folder tab; clicking it reveals live authorized folders/files.
- [ ] Three independently connected S3-compatible clouds → three distinct top tabs; connection/account/root isolation verified, including identical bucket and folder labels in two accounts.
- [ ] A deep folder selected in provider A; switch to B; switch back to A → restore path, breadcrumbs, selection, scrolling and preview without stale cross-provider data.
- [ ] Disconnected, expired token, revoked credentials, no buckets, partial pagination, network loss and rapid tab switches → typed truthful state, no fake listings, no wrong-cloud mutations.
- [ ] Existing Dashboard Quick Links folder styling is moved/adapted into the actual Explorer content workspace, with visual inspection in the full Explorer and compact Shelf FILES; no duplicated decorative provider tab strip elsewhere.
- [ ] When split is implemented: drag tab → visual docking → two independent Explorer instances; resize, undock, reorder, keyboard equivalent, tab restart persistence, compact-screen fallback; demonstrate zero unintended file transfers from tab dragging.
- [ ] When file drag between panes is later implemented: genuine authorized copy/move with destination byte verification and non-destructive failure, not just a visual gesture; don't mark as shipped before end-to-end proof.
- [ ] Re-run existing File Explorer, drag/drop, preview, history GO TO, native menu, TRUE REMOTE, provider auth, boot and Shelf rendering tests. Provide actual installed Chrome/browser evidence separately from unit mocks.
- [ ] Code changes, cloud writes, new S3 account connectivity, cross-cloud transfers and deployment **are NOT authorized by this documentation note**.

**One-sentence owner contract:** Keep the beautiful folder tabs, but attach them to the REAL REDOWN File Explorer so **every connected S3 cloud gets its own tab**—and those tabs are designed to become **two side-by-side, independently browsable Explorer panes** when docked.

**Related prior design:** [NEED_TO_DO/11022026.md](../../NEED_TO_DO/11022026.md) — "Top-of-Explorer provider tabs and draggable side-by-side cloud views". 

# REDOWN — No-Login File Explorer Demo: Local Cache, Chutey Images, and Branded Product Showcase

**Date:** November 5, 2026  
**Priority:** High-priority onboarding / product discovery; **NEED TO DO**.  
**Status:** Owner-approved product direction, **NOT IMPLEMENTED**, no images created, no source changes or permission additions made here.  
**Primary tracker:** [latest-1132026/NEED_TO_DO.md](../NEED_TO_DO.md).  
**Related:** [Provider folder tabs inside REAL Explorer](REDOWN_P0_EXPLORER_PROVIDER_FOLDER_TABS_PER_S3_SPLIT_VIEW_2026-11-05.md), [existing Chutey staging](../../extension/chute-stage.js), [existing local RFIS observations](../../extension/rfis-index.js), [Shelf File Explorer](../../extension/shelf-explorer.mjs).

## Owner's product concept

A new REDOWN user should be able to open **FILES** and get an actual, attractive, interactive **offline demo of REDOWN's own File Explorer BEFORE logging in or connecting any cloud**.

The user can try the interface using **one or several cute original Chutey mascot pictures** and a curated collection of **branded images representing ALL REDOWN-family products and websites**. The samples are both a functional test drive and a delightful, nonintrusive cross-product showcase.

Examples of owner-specified brands/properties to represent:
- **REDOWN** — **redown.online** (use `https://redown.online` as the owner-supplied destination, verify the actual live domain/brand before shipping).
- **Cute(y) Chutey / Chutey** — **cuteychutey.com** (use `https://cuteychutey.com` as the owner-supplied destination, verify the actual live domain/brand before shipping).
- **Framezit** — product name supplied; use its verified official URL only when confirmed. **Do NOT invent a Framezit domain.**
- Other related products as owner supplies approved assets, official names and sites; keep the promotional gallery extensible, not a fixed hardcoded three-entry cap.

**This is not a request to generate artwork now**. Use only owner-approved, appropriately licensed original product imagery, including the cute Chutey designs; track each asset, caption, brand and destination in an explicit package manifest. No third-party copyrighted marketing imagery or unrelated user browsing content should be bundled as if owned by REDOWN.

## What first-time users see

```text
REDOWN Shelf  [ FILES ] [ REMOTES ] [ HISTORY ] [ SETTINGS ]
                 |
            REAL FILE EXPLORER
[ REDOWN Demo / Local Samples ]   [ cloud tabs appear when connected ]
    ↓
  ├─ Meet Chutey               (cute Chutey photos, poses or sprites)
  ├─ Explore REDOWN            (REDOWN-branded screenshots/art)
  ├─ Cute(y) Chutey            (cute mascot + cuteychutey.com)
  ├─ Framezit                  (official product artwork)
  └─ More from our family      (other approved brand/site samples)
```

- [ ] **No account, Cloudflare OAuth, new Chrome permission, native worker installation or remote website load is necessary** to open and inspect bundled sample assets in extension-owned storage.
- [ ] Open the **same real Universal File Explorer**, same file tree and file list, same thumbnail/list view, same selection, preview, fully expanded Preview with configured arrow navigation, navigation history, keyboard support and safe drag gestures. **No mock Explorer widget**.
- [ ] Give the samples a distinctive **REDOWN Demo / Local Samples** folder or tab within the actual Explorer. It can remain available after login if useful, but always visually distinguishes packaged/local demo files from provider-owned cloud objects. In the new provider-tab design, this local-demo tab is **not a falsely connected S3 provider**; connected S3 clouds still each get their own tab.
- [ ] Include **multiple cute Chutey pictures** where approved: different poses/expressions/styles that actually test preview traversal, large images, expanded preview and optional drag-out. Include distinct product images/cards for REDOWN, Chutey, Framezit and other approved products. The assets must show **recognizable product branding**, not generic stock imagery. Each branded sample can have a clear, unobtrusive **Learn more** action for its verified official site (links require user click; never navigate automatically).
- [ ] For sample images, using Explorer preview and dragging/exporting a legitimate packaged image should operate on **real bytes** if supported by the existing extension-owned drag/download pipeline; don't claim drop acceptance on arbitrary websites until tested. No Cloudflare requirement merely to preview sample bytes.
- [ ] Keep the demo pleasant and useful, not a blocking ad: no auto-opening promotional sites, fake success counters, unsolicited uploads, forced registration, popups or autoplay promotions. A simple contextual **Connect Cloudflare to use your own cloud workspace** invitation appears when they choose to graduate beyond demo or attempt a cloud-only capability.
- [ ] The owner wants a **limited introductory experience**; **continued normal cloud file use** requires a legitimate connected/authorized Cloudflare destination (or supported future provider policy). Distinguish demo-only functionality from cloud-backed operations. The no-login demo must not fabricate cloud save readiness. Do not lock away local demo sample access or trap/export-block files that the user already explicitly provided just because authentication is absent.
- [ ] After successful authorized Cloudflare connection, transition from demo to the real provider tab smoothly. Preserve any local browsing/preview settings and do not silently upload bundled art or user files to Cloudflare. Cloud login alone is not proof of a prepared bucket or verified save.

## Storage boundary — REDOWN's own cache, NOT Chrome's general HTTP cache

- [ ] **Bundle approved images with the extension package** so the demo is available offline from first launch. The Explorer can display these packaged bytes directly (no need to copy them) or index them as **read-only virtual files in REDOWN-owned local storage**; if physical cache copies are made, seed once idempotently with version/asset IDs, support upgrades without duplicates, and manage cache size.
- [ ] **No extra Chrome permission required just for bundled extension images or access to REDOWN's own origin-scoped IndexedDB**. Respect browser quota, extension CSP and ordinary asset permissions; do not imply the extension may browse Chrome's global network/cache contents.
- [ ] **Do NOT conflate the demo asset collection with the existing ephemeral Chutey transfer queue**: `redown-chute-v1` currently holds prepared transfer bytes, has expiration/size/entry limits, and must remain disposable. Do not change its TTL or use the live transfer queue as durable seed storage.
- [ ] RFIS/Right-click CURRENT are metadata and configuration indexes, not a guaranteed offline copy of cloud file bytes; don't show previewable file contents without bundled or deliberately cached actual bytes.
- [ ] Storage and cache controls should clearly distinguish built-in read-only demo assets, any future user-owned local files, ephemeral transfer staging, and actual connected cloud folders. Clearing transient drag cache must **never remove the packaged demonstration images** or falsely delete cloud objects.
- [ ] If user explicitly imports personal files into a future persistent REDOWN-local workspace, disclose local retention/quota/clear actions; no silent collection of downloaded images, whole-browser history, browser HTTP cache or website assets. Do not presume files are durable unless persisted successfully.

## Cross-product showcase — brand, link and privacy rules

- [ ] Maintain a **manifest for every promotional image**, including product name, alt text, source/rights status, preferred folder/group, asset filename, optional accessible caption and an **owner-verified official HTTPS landing page**.
- [ ] Include `redown.online`, `cuteychutey.com`, and **Framezit**, plus other approved family properties. **No invented URLs**. Product showcase may be updated through extension releases; do not require a network call just to display the gallery offline.
- [ ] Keep imagery compressed/optimized without destroying visual quality; prevent the extension package or memory budget from ballooning. Gracefully fall back when a particular asset is missing, and don't keep full-size decoded images in memory when not needed.
- [ ] Make brand links **explicit user-selected navigation**, distinguish them from folder navigation or file downloads, and avoid tracking clicks or uploading personal files without separately approved policy and user intent.
- [ ] Small branded descriptions, link labels and accessible alt text support keyboard and screen-reader users. Respect theme palettes and reduced-motion preferences.

## Tests and acceptance

- [ ] New install, offline, **zero cloud connections**: FILES opens successfully and immediately shows the bundled Chutey + branded product image collection; no auth error or blank Explorer.
- [ ] Sample images have actual bytes; select, preview, Expand, traverse Previous/Next using the chosen arrow pair, Restore and browse directories without a Cloudflare login or unrelated permission request.
- [ ] Clear Prepared Files / transfer TTL expires / restart service worker: sample images remain available because they are packaged or separately stored, and demo images are not accidentally counted as real transfers or charged cloud storage.
- [ ] No browser global cache enumeration and no browser-history scanning; no silent external network requests or marketing link opens during sample viewing.
- [ ] Clicking a real product **Learn more** link opens only the verified intended site; non-link image interactions remain normal File Explorer interactions.
- [ ] On first Cloudflare login, exactly authorized account/bucket/Worker capabilities become available; no demo file is uploaded or treated as a cloud object unless user explicitly asks.
- [ ] After login, the real provider tabs use the same Universal File API without the demo cache replacing provider data or changing TRUE REMOTE.
- [ ] Verify theme/width/accessibility, file count and storage budgets, no duplicate assets after upgrade/reopen, good performance on low-memory systems and no required online image fetch.
- [ ] Clearly report unverified: sample imagery/official brand rights, domain validity, browser installed Chrome behavior, drag acceptance and real-cloud integration. These cannot be certified from documentation alone.

**One-line owner experience:** **Try REDOWN before logging in** — explore several cute Chutey images and branded REDOWN-family product pictures offline, including redown.online, cuteychutey.com and Framezit, then **connect Cloudflare to continue with real cloud storage**.

**No art creation or runtime changes authorized by this documentation entry.**

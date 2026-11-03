# REDOWN — ADVERTISED FEATURES

**Product:** REDOWN, Download Direct-2-Cloud  
**Date:** November 2, 2026  
**Status:** OWNER-APPROVED PRODUCT REQUIREMENT / ADVERTISING CONCEPT. **NOT YET IMPLEMENTED AS A FREE/PREMIUM ENTITLEMENT.** Do not advertise subscription enforcement as live until a production paywall and entitlement tests are complete.

## The pitch

### Free: your public URL, in one right-click

**Save to your cloud. Get your public URL. Keep moving.**

Free users can right-click a saved file and choose **Get URL**. REDOWN returns **only that file's available public URL**, not a collection of alternate links, original source addresses, hosting-page metadata, or other premium URL information.

History stays intentionally simple for free users: **the saved filename and GO TO**. GO TO is a real button that navigates to the saved file using REDOWN's existing verified destination logic, not a hyperlink to the original source.

> **Free: Your file. Your public URL. One right-click.**

### Premium: every available URL, without opening Cloudflare

**All your file's URLs, together. One right-click or one visit to History.**

Premium members can discover, view, and manage a **REDOWN-unlimited collection of available URLs associated with a saved file**, including additional legitimate public bucket domains, custom domain addresses, REDOWN Worker addresses, and preserved REDOWN-owned source/page/media/frame/link provenance where applicable.

They get the same capabilities from **right-click → Get URL** and **History → expand URLs ▸**, without needing to leave REDOWN and visit Cloudflare just to find or copy the addresses.

As bucket URL configurations change after a save, REDOWN should refresh current addresses for that exact verified object, retaining historical provenance and labeling current vs previously recorded addresses accurately.

> **Premium: Every available URL. One place. No Cloudflare dashboard required.**

### Premium flagship feature: History → By Website → Export

**Turn a pile of saved files into a searchable, exportable website archive.**

Premium users open **History → By Website** and see their archived files organized by the website they were originally saved from. A search box lets them type the **website name or domain** to instantly narrow results. Selecting a website **opens that website's saved-record collection** inside REDOWN. An obvious **Export** action sits **beside the website name**, not buried in settings.

For each website, **Export** produces a structured, machine-readable dataset of all REDOWN records associated with that site, including the filename, genuine saved destinations, available public URL(s), subsequently discovered or manually added website/domain URLs, and REDOWN's original source/page/media/frame/link metadata **where actually recorded**. Export the **complete associated URL collection**, not just the free public R2 URL. The source website, saved-file provider and additional URL domains must retain their respective labels; do not mistakenly categorize Cloudflare asset domains as the original source website.

**Premium removes repetitive work:** Free users can already use Cloudflare's own development/dashboard tools to obtain their permitted Cloudflare public addresses, and REDOWN Free provides the single public file URL via right-click. Premium brings discovery, cross-reference, organization, search and batch export directly into REDOWN without repeatedly visiting Cloudflare, copying each address or reconstructing relationships by hand.

> **Premium: Search by website. See every saved file. Export every recorded URL in one action.**

**Website grouping rule:** Determine the source website from the stored parent/hosting page when known, otherwise from the actual source URL. Use a normalized hostname as the stable grouping identity, preserve original display name/URL, and never infer a parent website when the receipt does not provide one. Distinguish subdomains without silently merging unrelated publishers; support alias/display-name search as an enhancement when verified. If metadata is absent, show an explicit *Unknown website* group, not a fabricated identity.

**Export contract (planned):** Start with a versioned **JSON** export suited to programs, scripts and archiving; consider CSV for simpler analysis. Include one item per real save receipt, stable record/delivery identity, timestamp, source website grouping, filename, actual cloud provider and saved path, verified status, each supported URL plus its **role** (public/current-configured/historical/source/hosting-page/media/frame/link/custom), discovery/verification timestamp and URL availability state where known. Represent many URLs per file as an array, not a lossy single column. An index/manifest and stable schema enable automated processing and future opt-in integrations. For all-site exports, provide pagination or streaming for large archives rather than risking browser memory.

**Safety and trust:** Export only data owned by or available to the authenticated REDOWN user, at the user's explicit request. Never include OAuth access/refresh tokens, Worker secrets, private signing material or unrelated browser data. Do not send REDOWN-owned source provenance to Dropbox, OneDrive, Cloudflare or third-party analytics merely to construct the export. Do not equate URL presence with public reachability; a configured or historical URL is clearly labeled. Refresh of current bucket addresses is authenticated, read-only and bound to the exact saved object. Export does **not** publish private buckets, change hosting configuration or generate public share links without permission.

**Status:** This By Website index/search/export workflow is **not yet implemented**. Existing time-based History and single-record URL disclosure are the starting point; the new experience must be built and tested before it is shown as a live Premium feature.

## Exact tier behavior

| Capability | Free | Premium |
|---|---|---|
| Right-click **Get URL** | **One existing public file URL only** | **All available and verified URL choices** for that file, no REDOWN-imposed collection limit |
| If there is no public URL | Explain that none is currently available; don't fabricate or expose a private address. Follow any existing explicit user-consent flow for enabling public access. | Same security rule; show what is verifiable and label private/non-public addresses honestly |
| **History** entry | **Filename + GO TO button only** for a successful, navigable file | Filename + GO TO + provider/saved location + expandable full URL data and provenance |
| History's URL drawer | **Not available** | Available, closed by default, showing selectable/copyable full strings, **not hyperlinks** |
| History **By Website** navigation | Not included; free History stays filename + GO TO only | Browse saved records grouped by their original website, search website names/domains and open each website's collection |
| Website-level **Export** | Not included | **Export next to website name**, including all recorded files, associated URLs, saved destinations, and later added/updated URL data, in a programmatically usable format |
| Additional bucket/domain URLs | Not listed as a collection | Show all *actually configured/eligible* URLs of the exact saved object, including newly added addresses after read-only refresh |
| Visit Cloudflare dashboard to inspect URLs | Free tier provides only the single public URL through REDOWN; richer URL inspection is premium | No Cloudflare dashboard visit needed for ordinary REDOWN-supported URL discovery |
| Original source URL, hosting page, src, frame and link provenance | Remains securely stored by REDOWN where recorded, **not exposed in the Free History UI or Get URL menu** | Available in the expanded URL data view when REDOWN actually recorded them |
| GO TO | **Available free** when record is actually navigable; this is a defining REDOWN feature | Same GO TO behavior, unchanged |
| Failed/unverified records | No false GO TO or fabricated successful/public URL | Same trust and verification guarantees |

**Explicit correction (owner's instruction):** Free **Get URL offers public URL only**. It does **not** expose a shortened list of multiple URLs, cloud-source provenance, or an expandable premium chooser. Free **History shows only the filename and GO TO**, not the provider path, a shortened URL preview, or the premium URL drawer.

## Product boundaries: accurate promises

1. **“Unlimited URLs” means no artificial REDOWN cap on the number of legitimate addresses shown for the same file.** It does *not* mean REDOWN can provision infinite domains, override Cloudflare plan/limit policies, conjure URLs, or promise that all generated addresses are publicly reachable.
2. **Discovery never enables public access automatically.** If R2 object/bucket access is private, a public link is unavailable until the user explicitly authorizes an existing public-access setup flow. Premium does not change Cloudflare privacy settings or permissions without approval.
3. **Verification matters:** only derive current public-address strings from authenticated/read-only bucket-domain configuration AND an exact saved-object existence check. Distinguish “configured address” from “confirmed publicly reachable”; don't claim live external reachability unless directly tested and validated. Handle revocation, removed custom domains, expired links, login changes, and failures honestly.
4. **Provenance stays REDOWN-owned.** Do not forward page/source/frame/link URLs to Dropbox, OneDrive or other cloud providers. Premium makes locally retained information visible to its rightful user; it does not grant providers ownership of REDOWN's browsing provenance.
5. **History is not paywalled as a storage or verification system.** Free accounts still get durable internal receipts, history accounting, legitimate GO TO, correct per-provider verified counts, and lifetime odometer. Gate only the agreed richer UI/URL presentation and premium retrieval controls.
6. **No forced payment or misleading links.** Existing cloud save behavior must remain functional on Free where available. No paid entitlement can make failed uploads count as successes.

## Implementation tasks: to do before selling this feature

- [ ] Create a **single background-owned Free/Premium entitlement projection**, with appropriate logged-in subscription verification and cache/expiry rules. Don't rely on hiding controls with CSS alone.
- [ ] Implement **Free** `Get URL` as a single-public-URL result, and ensure the browser right-click menu does **not** expose premium choices. When no legitimate URL exists, show an accurate unavailable state and the existing optional, explicit public-access flow if offered.
- [ ] Implement **Premium** `Get URL` as a chooser/list of all eligible current URLs; support copy, clear labels and an explicit refresh without inventing or sharing URLs. Preserve original context-menu routing and V3 configuration (Simple/Narrow/Depth must not be touched).
- [ ] Gate **History** presentation: Free renders a compact saved filename + authorized GO TO, no location/provider metadata/URLs dropdown; Premium renders full path + expandable selectable URL data with original and newly discovered R2 addresses.
- [ ] Ensure private source/history provenance is still kept in the existing durable REDOWN archive for both tiers, with premium visibility controlled by entitlement, not a destructive migration.
- [ ] Reconcile current on-demand History URL refresh with the entitlement gate, avoiding unauthorized repeated provider calls. Don't weaken the original object-verification or OAuth checks.
- [ ] Introduce tests for Free→Premium→Free transitions, expired entitlement, multi-window/sidebar states, offline account, private bucket, no-public-URL, newly added/revoked domains, deep/nested file keys, failures/uncertain receipts, accessible keyboard GO TO and URL drawer, and exact provider/session identity.
- [ ] Build a **Premium-only By Website view** alongside existing chronological History, grouping by actual recorded hosting/source domains; preserve chronological view and Free filename + GO TO.
- [ ] Add a responsive website-name/domain search field. Opening a website displays only its correctly attributed saved records, with normal individual **GO TO** controls and premium URL drawers.
- [ ] Place **Export** directly beside the opened website name. Produce versioned machine-readable **JSON** containing full authorized REDOWN metadata and all available associated URL entries, including added/current bucket domains with timestamp and source labels. Consider CSV and a documented schema after JSON.
- [ ] Design export for large archives without arbitrary loss of records; handle archive pagination, repeated source links, duplicate domain aliases, missing metadata, file moves/deletions, private bucket data and offline snapshots.
- [ ] Add a website-grouping/export security boundary: explicit user gesture, authenticated ownership, premium entitlement checked in the actual data/export layer (not CSS), no tokens/secrets in export, and no external sharing of proprietary source provenance.
- [ ] Write integration tests covering many saved files from a single website, nested subdomains, website search, no-known-site records, additional Cloudflare URLs created **after** the original save, duplicate URLs, missing object, revoked public domain, and subscription upgrade/downgrade.
- [ ] Test real installed Chrome, actual R2 object/domain states, and the subscription backend before changing public advertising or claiming a released Premium feature.

## Related work

- Existing URL drawer and on-demand Cloudflare bucket-address discovery: `extension/shelf-history.js` and `extension/background.js`.
- Existing History navigation authority: `extension/history-navigation.js`; preserve GO TO for both tiers.
- Ongoing work and acceptance: `NEED_TO_DO/11022026.md`.
- Subscription plan/prices are a **separate commercial decision**; no charge, amount or entitlement has been implemented by this document.

## YouTube showcase concept: “From one URL to your entire website archive”

**Product demonstration sequence, only after the Premium workflow ships:**

1. **Show Free first:** right-click a file → **Get URL** → one genuine public Cloudflare file URL, fast and useful. Briefly acknowledge that technically capable users can obtain more addresses using Cloudflare's own tools.
2. **Reveal Premium:** open REDOWN History → **By Website**. Enter part of a website's name in the search field. Its saved collection appears instantly.
3. **Open the website collection:** show its name prominently, the list of verified saved files, existing **GO TO** buttons, saved cloud destinations and rich URL details.
4. **Demonstrate the differentiator:** add or enable a *real* permitted custom/public bucket address, recheck it, and show the newly available URL associated with an older saved image without visiting the Cloudflare dashboard to manually gather all addresses.
5. **Click Export beside the website name:** open the resulting JSON file in a code editor and display the organized records and complete available URL arrays, beyond a single public URL. Avoid exposing actual sensitive identifiers or credentials in the video; use a sanitized test library.
6. **Close on the promise:** “Free gives you your public URL. Premium turns your saves into a searchable, exportable archive, organized by website.”

**Marketing truthfulness:** The YouTube video should show a real working implementation or clearly identify a concept preview, never misrepresent screenshots or mock export data as a released service. The benefit is convenience, organization and legitimate data access, not exclusive ownership of publicly available Cloudflare URLs.

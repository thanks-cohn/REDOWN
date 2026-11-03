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

## Exact tier behavior

| Capability | Free | Premium |
|---|---|---|
| Right-click **Get URL** | **One existing public file URL only** | **All available and verified URL choices** for that file, no REDOWN-imposed collection limit |
| If there is no public URL | Explain that none is currently available; don't fabricate or expose a private address. Follow any existing explicit user-consent flow for enabling public access. | Same security rule; show what is verifiable and label private/non-public addresses honestly |
| **History** entry | **Filename + GO TO button only** for a successful, navigable file | Filename + GO TO + provider/saved location + expandable full URL data and provenance |
| History's URL drawer | **Not available** | Available, closed by default, showing selectable/copyable full strings, **not hyperlinks** |
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
- [ ] Test real installed Chrome, actual R2 object/domain states, and the subscription backend before changing public advertising or claiming a released Premium feature.

## Related work

- Existing URL drawer and on-demand Cloudflare bucket-address discovery: `extension/shelf-history.js` and `extension/background.js`.
- Existing History navigation authority: `extension/history-navigation.js`; preserve GO TO for both tiers.
- Ongoing work and acceptance: `NEED_TO_DO/11022026.md`.
- Subscription plan/prices are a **separate commercial decision**; no charge, amount or entitlement has been implemented by this document.

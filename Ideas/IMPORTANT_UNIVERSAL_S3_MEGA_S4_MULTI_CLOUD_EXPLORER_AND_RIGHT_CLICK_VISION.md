# IMPORTANT: REDOWN Universal S3 Explorer, MEGA S4, right-click destinations, previews and multi-cloud roadmap

**Type:** Product/architecture proposal; NOT implemented functionality or a release claim  
**Captured:** 2026-10-30  
**Repository:** thanks-cohn/REDOWN  
**Target branch at capture:** release/cloudflare-true-remote  
**Decision status:** Ideas for owner review. Explicit requirements in this document are desired acceptance rules, not assertions about currently working behavior.  
**Commercial companion:** [MASS_ADOPTION_PRICING_AND_BUYER_PITCH.md](MASS_ADOPTION_PRICING_AND_BUYER_PITCH.md)

## 0. Executive vision

REDOWN is a beautiful, browser-first, provider-independent remote downloader and universal cloud object-storage Explorer. One connected-account selector; one Explorer UI; one authoritative right-click setup; many storage backends. Users can choose *only* MEGA S4, *only* Cloudflare R2, or any two connected accounts side-by-side without installing a separate file manager. Cloud-side transfer coordination avoids needless download-to-PC and re-upload steps for supported public sources.

**Key distinction:** MEGA S4 is MEGA's S3-compatible object-storage offering. It is not the same service or API as ordinary consumer MEGA Cloud Drive. The common abstraction is **S3-compatible storage**, not a unique "S4 standard."

The user asks for massive adoption, delightful UX, 3D and archive specialty features, and a very low subscription price. Do not lock ordinary previews, basic provider connection, or account portability behind needless complexity.

## 1. The connection experience

- Add storage via `Connections -> Add Storage -> MEGA S4`, or choose another named S3-compatible preset / Custom S3.
- Initial fields: friendly connection name; API endpoint; signing region; S3 Access Key ID; Secret Access Key; optional bucket or allowed prefix when bucket-list permission is missing.
- Presets should prefill safe defaults where authoritative provider documentation permits and let the user override as necessary; never presume a universally correct region.
- On Connect: validate credentials and permissions without mutating data, discover authorized buckets when possible, and enter the same Explorer surface used by other providers. If listing buckets is forbidden, permit adding a specific bucket with permission-tested access.
- No repeated interactive MEGA website login after valid S4 keys have been securely connected. Reauthentication/configuration is required if credentials are revoked, expire, rotate, are inaccessible because the vault is locked, or service permissions change. A connection is not guaranteed forever.
- Several independently named accounts of the same provider may coexist; removing one must not remove other accounts or rewrite unrelated provider profiles.
- Users connecting MEGA only must get a complete useful product. **Cloudflare R2 as a customer storage account must not be required.** REDOWN can still use its own Cloudflare infrastructure for remote jobs.
- Connection security: never save plain secrets into Chrome local/sync storage or the right-click configuration; separate encrypted secret material from display metadata; redaction in diagnostics; explicit credential rotation, revoke/remove and permission checks. Evaluate server-side secret ownership versus locally encrypted vault and document the trust model before implementation.

## 2. Universal model and S3 compatibility

Required separation: `Provider type -> Connected account -> Bucket -> Key/prefix -> Explorer pane`.

Define a provider-neutral contract covering at least:
- `connect / testConnection / listAccounts / listBuckets / list / stat / read / readRange / write / multipartUpload / copy / move / rename / delete`
- `publicUrlCapabilities / archiveRead / previewRead / transferCapabilities`, with capability reporting instead of false universal guarantees.
- Object identity is stable: provider+account+bucket+exact key; keep prefixes, Unicode, repeated slashes and punctuation lossless. Cloud object stores emulate folders by prefixes.
- One typed provider registry shared by Explorer, Right-click Setup, history, favorites, previews, account picker, and transfer engine.
- Start with an S3 SigV4-capable adapter and provider-specific presets, signing regions, addressing modes, checksum/ETag semantics, CORS/range/multipart and errors. Providers will not have identical S3 behavior. Do not assume AWS CopyObject works cross-provider.
- Candidate S3-compatible services to evaluate: MEGA S4, Cloudflare R2, AWS S3, Backblaze B2 S3 endpoint, Wasabi, DigitalOcean Spaces, Storj, Hetzner Object Storage, Scaleway, MinIO, Ceph, IBM Cloud Object Storage, Oracle Object Storage, IDrive e2, OVHcloud, Akamai/Linode and custom compatible servers. **All listed services are candidates, not verified integrations.**
- Ecosystem potential: dozens of implementations, not an assertion that "90+" are all certified on REDOWN. Provider certifications require actual end-to-end tests.
- Crucial current-source warning: the Beta Explorer currently imports `createR2Adapter` and calls Cloudflare-specific `cf*` message paths. First extract a universal interface and keep existing Cloudflare behavior; adding a preset alone is insufficient. Reference `extension/beta/r2-adapter.mjs`, `extension/beta/explorer.mjs`.

## 3. One-pane and dual-pane Explorer, independent of provider

The user wants an **account selector inside the existing Explorer button/surface**:
- Hover on desktop reveals a compact account/location pop-out; click, focus, Enter and touch remain fully accessible. Do not depend exclusively on hover.
- Selecting a connected account **reuses the same Explorer**. No separate "MEGA Explorer" product, special tab or duplicate interface.
- Default: ONE Explorer panel, filling space. Optional Split/Dual Explorer opens an independent second pane. Either pane can show MEGA, R2, the same provider in another account, or even the same account in another folder.
- Each pane can swap which account it shows, close independently, and restore independently. If one pane closes, the other takes available space without losing controls. If both close, provide an inviting Open Explorer chooser rather than a dead end.
- Maintain per-account/per-pane folder navigation, selected item(s), scroll offset, sort, filter, side-preview state and relevant dimensions as safe and predictable. Switching accounts must not throw away the previous navigation.
- Resizable split; responsive compact layout with accessible overflow, without hiding or deleting important actions. Avoid squeezing controls into unusable widths.
- Account-specific provider tint stays visible but subdued: **MEGA always reads as red** and adopts a theme-specific palette. Neon theme: playful electric/neon red. Porcelain/light theme: Pinterest-like refined red/crimson. Midnight theme: muted ruby/red. Preserve a constant semantic color role, not identical hex everywhere. Ensure red errors/delete affordances are distinct from non-dangerous MEGA branding.
- Provider naming, accent stripe, icon and connection status can carry identity in Chrome's native right-click menu; Chrome native menus cannot accept arbitrary REDOWN CSS palettes.
- A shared visual system (spacing, typography, hierarchy, progressive disclosure, keyboard use, focus, scrollbar, no jank) applies across all providers and screens.

## 4. Right-click setup: the *single authoritative* destination registry

No legacy destination setup may compete with the new Right-click Setup.
- Connecting any S3 account makes its authorized accounts/buckets/folders eligible for selection in Right-click Setup.
- Nested structure may expose `Save with REDOWN -> Provider/account -> Bucket -> Favorite folder`; user controls visible destinations, order, labels and nesting; use lazy paging/search for deep hierarchies rather than sprawling duplicate cards.
- Right-click direct-to-MEGA must work even if the user has *no* R2 account. Other S3-compatible accounts should receive the same treatment once certified.
- Destination identity must be stable and source-backed. Deleting a nested destination must remove its actual underlying configuration and rendered menu item; no orphaned empty cards; no stale legacy menu, cache or click handler.
- The menu must route every click to the selected exact provider/account/bucket/prefix, with no incorrect Cloudflare fallback.
- Remote browser save pipeline: context-menu URL -> authorize/fetch where permitted -> user-selected destination -> streaming upload -> verification -> History receipt.
- Some authenticated, expiring, cookie-restricted or anti-bot URLs cannot be fetched by a remote Worker; use safe browser-assisted flow or explain the limitation. No invented success.
- Default filename conflict policy: **Keep Both**, not Skip or Replace. Confirm exact final key. Separate delete/unsafe actions; never infer approval.
- Show success/error status, original clickable URL, destination, timestamps, bytes and retry action in History. Shelf History opens Today expanded. Deduplicate concurrent retries and preserve uncertainty after timeouts.

## 5. Specialty previews: portable *above* the provider adapter

The preview layer should consume authenticated bytes, ranges, URLs or streams through the same adapter regardless of storage provider.

### ZIP and CBZ
- Recognize ZIP and CBZ as archives, while treating CBZ visually as a comic collection. Internally, offer archive-as-virtual-folder with path-safe index and page/entry selection.
- Extract a **representative first image** (or chosen cover) for a cached thumbnail. Show thumbnail on a folder/stack-like background so the tile remains clearly an archive, not a loose image file.
- Preview selected archive entries/pages without downloading the entire archive *when reliable range reads and the archive layout allow it*. Read end-of-central-directory and central directory through bounded requests; decompress only requested entries. Avoid repeated cover extraction with metadata-aware thumbnail cache and invalidation.
- Reader controls: left/right arrows navigate pages and neighboring objects; clicking an image preview can expand reading; Escape closes lightbox back to the exact prior context. Support side preview and large reader.
- Support archive folder browsing, internal entries, individually selected extraction and optional copy-to-other-provider through verified transfer.
- Defensive limits: ZIP64 handling as implemented/certified, unsupported/encrypted methods clearly reported, zip bombs/decompression ratio ceilings, traversal and `../` paths rejected, compressed/uncompressed limits, memory/time bounds, MIME validation and error clarity.
- Range requests may be unavailable or nonconformant on a particular provider. Offer bounded full-download fallback or clear unsupported state; no misleading "instant preview" promises.
- Apply preview concepts to *directories* as well: selecting a folder can show a bounded peek at contained files, with left/right inside preview, without accidentally navigating away or listing millions of keys. Keep archive, folder and image behavior coherent.

### 3D GLB and glTF
- Support model previews in side panel / lightbox with orbit, zoom, reset camera, suitable lighting, safe errors and navigation between models.
- **Restore legacy parity:** `extension/options.js` already builds a bundled `model-viewer` for GLB/glTF; current Beta `previewType` lacks those types. Reuse existing dependency rather than introducing a redundant renderer.
- Standalone .glb packages assets more reliably. .gltf may reference sidecar textures/buffers; resolve authorized relative assets without exposing credentials, leakage or forbidden URLs. Cross-origin/CSP behavior must be tested per provider.
- No claim of live rendering until Chrome installed/Beta and provider-backed tests pass.

### Common files
- Images, PDFs, text, supported audio/video, markdown/code as appropriate. Browser codec support varies.
- Metadata, content-type detection (extension plus MIME), size-bounded previews, lazy loading, remembered selection and navigation.
- Build once; verify adapters, not duplicate renderers per storage service.

## 6. Cross-cloud transfers through Workers, with durability

- A REDOWN-owned Cloudflare Worker can orchestrate server-side **relative to the user's computer**: source provider -> Worker streaming/chunks -> destination provider. This is NOT free magical direct provider-to-provider copying and may incur provider data transfer charges.
- Small supported objects: bounded streaming, never whole-file memory buffering by default. For large objects/batches: multipart uploads, durable workflow/queue state, progress receipts, retries, resume tokens, deadlines and cancel/reconciliation, rate limits, provider capabilities and quotas.
- Workflows/Durable Objects/Queues candidates for coordination; evaluate Cloudflare limits and real cost, not blanket "unlimited" claims.
- Read/transfer credentials are securely scoped; no secret in front-end logs, serialized URLs or diagnostics. For arbitrary custom S3 endpoints enforce SSRF/DNS/IP/redirect restrictions to prevent private-address access.
- **Move invariant**: copy -> verify destination content/metadata/read-back -> only then conditional delete original. If destination isn't independently verified, retain original and mark transfer incomplete/uncertain.
- **Keep Both** by default everywhere, including copy/move and right-click uploads. Support explicit Replace or Skip only when deliberately chosen.
- Distinguish same-provider optimized server-side copies from cross-provider stream transfers; never assume one provider can sign for another.
- Possible future: mirror to several providers, independent receipts, background migration, scheduled backup/sync and redundancy. Do not silently create publicly accessible buckets or links.
- A locally locked encrypted MEGA vault cannot authorize brand-new unattended jobs unless a separately consented server-side/session key policy explicitly permits it; previously submitted jobs may continue under documented revocable authorization. Clearly expose this tradeoff.

## 7. Optional connection-specific MEGA password / secure vault

- Password is a **REDOWN vault password**, not the website's MEGA account password. One-time S4 access keys still authenticate API requests.
- Owner option to require a password before opening or operating MEGA account, independent of R2 and other S3 accounts.
- Auto-lock choices (e.g., on Explorer close, 5/15/30 min idle) and optional "Unlock before right-click save".
- Truly protect credential keys with authenticated encryption and strong password derivation; a cosmetic password screen hiding already usable keys is NOT security. Password recovery/key loss behavior must be disclosed.
- Lock at account level, not visual pane level; identical account in two panes cannot bypass lock. Other accounts continue operating.
- Secure secret storage/trust boundary, memory cleanup, UI lifecycle, extension background/service worker lifetime, user sessions and worker jobs need an explicit threat model.
- Secure link sharing is separate from private bucket access. Public URL activation always asks Yes/No and explains bucket-wide implications.

## 8. REDOWN uniqueness and marketing claims

Position REDOWN as **"Your files. Your cloud. Your rules. Right-click. Save. Explore. Transfer."**
Value propositions to emphasize (some implemented or partially present, others planned; validate release-specific claims):
1. right-click URL-to-cloud saving;
2. remote transfer without mandatory PC download;
3. a single consistent, attractive Explorer;
4. visual, intuitive bucket/folder management;
5. personally configured nested context-menu destinations;
6. independent connected accounts/providers;
7. inexpensive, pleasant premium look and themes;
8. side preview, lightbox, keyboard browsing;
9. ZIP and CBZ archive-as-folder and cover thumbnail;
10. interactive GLB/glTF orbit viewer;
11. file/folder copy/move/rename/delete with verified outcomes;
12. collision-safe Keep Both;
13. Get URL with transparent public/private consent;
14. History with original source, exact destination and explicit errors;
15. Favorites and remembered location;
16. creator-friendly workflows for photography, comics, 3D assets, web publishing, research;
17. dual-pane optional cross-cloud file manager;
18. cloud migrations, backups, mirroring later;
19. advanced Time Machine tracking of authorized files, separately specified;
20. theme-aware provider identity without different feature sets.

Customer-facing descriptions **must mark planned features as upcoming until verified**. Avoid calling MEGA S4 an encrypted personal MEGA Drive replacement, or implying that a hosted intermediary never touches data.

## 9. Delivery order, without destructive redesign

**Stage 0 Audit:** baseline and branch; current Beta vs legacy preview parity, Explorer coupling to `cf*`, account model, right-click configuration authority, security, credentials, archive code, worker limits and failure paths. Record exact file map and evidence; protect existing user-data workflows.

**Stage 1 Contract:** document provider-neutral API, state invariants, credential model, color role tokens, capability matrix and negative tests. Feature flag new connectors.

**Stage 2 First connector:** MEGA S4 preset and Custom S3, read-only credential/bucket tests and ordinary browsing without R2 account. Prove real provider list/stat/read/range/write in controlled test bucket before marketing it.

**Stage 3 Shared previews:** restore GLB/glTF model-viewer to Beta; portable ZIP/CBZ cover, reader, folder peek; file navigation and lightbox. Regression test both current R2 and MEGA.

**Stage 4 Right-click parity:** one new Right-click Setup registry drives actual Chrome menu, exact destination identity, persistence and routing across providers, no orphan cards; integrate origin URL and Keep Both history.

**Stage 5 Dual-pane:** account hover/click picker, two arbitrary independent panes, closing, sizing, swap, restored navigation; responsive adaptive rules; themed red MEGA identity.

**Stage 6 Transfers:** durable cross-cloud copy and verified move, monitoring, clear costs and limits. Only after failure/large-file/provider testing, consider sync, backups, mirror.

**Stage 7 Monetization:** Free/Plus first, measure usage and costs before adding higher transfer tier. See pricing companion.

## 10. Non-negotiable acceptance tests

- Connect MEGA S4 from only endpoint/region/key/secret; never ask the user to log into MEGA web UI after connection while credentials remain valid.
- With **zero R2 accounts**, right-click save, list, preview and upload to MEGA function; no implicit provisioning of a customer R2 bucket.
- Switch Cloudflare to MEGA and back; exact previous folder, selection, scroll and pinned preview restore.
- Open MEGA-only and R2-only; open MEGA and R2 side-by-side; close either pane; use two MEGA accounts, or two panes into the same account.
- Native Chrome menu matches new Right-click Setup exactly after add/rename/reorder/remove/nested delete; there are no ghost account cards.
- ZIP/CBZ first-image thumbnail, distinct archive styling, safe browse and left/right page iteration work on both providers with bounded bytes and fallback handling.
- GLB interactive orbit/zoom/reset works in **new Beta** on authorized private objects. .gltf sidecar dependencies either load safely or show actionable unsupported errors.
- Move refuses source deletion after unverified copy, uncertain timeout or wrong collision resolution; Keep Both remains default.
- Public URL enable is opt-in, never implied by a preview or by connecting the account.
- Vault locks MEGA storage and right-click saves when configured, while leaving other providers accessible; no stored plaintext access keys.
- Simulated API incompatibility, blocked byte-range, expired key, long transfers, browser close, partial multipart completion and costs are explicit, recoverable or bounded.
- Independent platform/browser/live evidence: do not equate mocked tests with a release.

## 11. References and current technical evidence

- Code: `extension/beta/explorer.mjs`, `extension/beta/r2-adapter.mjs` (Cloudflare-specific), `extension/options.js` and `extension/options.html` (legacy bundled model-viewer), archive browser and Worker file API.
- Preservation: `DO_NOT_REPEAT_MISTAKES/explorer-parity/LEGACY-VS-BETA-EXPLORER-CAPABILITY-MATRIX.md` documents GLB/glTF as **legacy-only** in the Beta parity snapshot.
- External S3 compat context: https://rclone.org/s3/ ; MEGA S4 specs: https://github.com/meganz/s4-specs
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/ ; Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Chrome menus platform: https://developer.chrome.com/docs/extensions/reference/api/contextMenus
- These links are reference/validation targets, not assertions that an implementation has passed live testing.

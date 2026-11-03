# Premium Quick Glance — November 3, 2026

Implemented against the standalone owner request at
`303a20bc76110387103b52a0a61b2f69a71301e4:latest-1132026/CODEX_REQUEST_QUICK_GLANCE_PREMIUM_HISTORY_2026-11-03.md`.
The supplied checkout starts at `2e93718`; the request was absent locally and was
read from remote main. No unrelated remote implementation commits were merged.

## Behavior and boundaries

The existing Shelf History remains one vertical timeline with its original
filename, destination, outcome, date, disclosures and GO TO controls. Today opens
by default. The existing IndexedDB timeline index supplies **all Today metadata**;
older records retain 40-record pages. The legacy 50-record compatibility window
and archive ownership/schema are unchanged. No transfer engine, counters, export,
GO TO routing, Worker deployment, menus, permissions or OAuth scopes were changed.

There is no billing/entitlement service in the current source. Previews therefore
require the narrowly scoped local boolean **`quickGlancePremiumEnabled === true`**;
missing/false disables them. This is an integration gate, not proof of a paid
subscription. A future entitlement owner must control this flag before a Premium
release. For authorized development, set it using `chrome.storage.local.set` in
an extension's trusted developer context. There is no invented checkout or billing
UI. The Today expansion/metadata fix also applies with the gate disabled.

Eligible Today records have a known image extension, recorded image MIME type, or
existing `2d` category. Failed/pending records can still show their original image;
preview availability never changes their status. Unknown file types are not
speculatively downloaded. Each eligible row immediately reserves the same centered
square (up to 240 CSS pixels); image contents use `object-fit:contain`.

`history-image-placeholder.js` owns the replaceable `HistoryImagePlaceholder.render`
renderer. The pipeline supplies its common wrapper class, so a static logo renderer
retains the same ready/failed visibility contract. Three CSS ellipse outlines use
only transforms, theme variables and opacity. Actual viewport visibility controls
animation; reduced motion uses static curves. The decoded image fades in as the
placeholder fades out inside the existing square. Definitive failure hides the
placeholder and leaves an inert square, preserving the entry and layout.

`history-quick-glance.js` admits ten initial eligible previews and subsequent
observer-driven batches of ten, with three concurrent jobs, a 30-slot active window,
a 20-second job deadline, no automatic failure retry, and cancellation on eviction,
closed date groups, leaving History, hidden documents, Shelf closure, gate revocation
or provider identity removal/change. Late results are discarded. Object URLs are
revoked on eviction/disposal. Failed slots are not retried by observer churn.

Response bodies are streamed with a **4 MiB** limit including unknown-length bodies;
only browser raster image MIME types are accepted. Native `createImageBitmap`
resizes to width 256 with aspect ratio preserved; results taller than 1024 pixels
are rejected, bitmaps closed, and small canvas-backed PNG URLs retained only in
memory. At most 30 such images are retained. Native decoding's transient internal
allocation is browser-owned, not a hard process-memory guarantee. Original files
exceeding the byte limit, unsupported formats and extreme aspect ratios may have
no preview. No unbounded full-resolution image cache was added.

## Authorized provider reads

| Provider | Cloud-first method and current grant | Unsupported/fallback cases |
| --- | --- | --- |
| Cloudflare R2 | Existing `RedownCloudflareApi.request` private management object GET with recorded account/bucket/exact key. | Missing auth, denied object reads, unsupported/large bodies fall back. No Worker preparation, public-domain lookup, publication or repair is invoked. Dot traversal segments are rejected rather than normalized to another object. |
| Google Drive | Additive `RedownGoogleDriveStream.preview` reuses existing noninteractive identity and `drive.file` authorization; validates recorded account/file, requests `thumbnailLink` and reads the short-lived Google thumbnail. | Disconnected/mismatched account, files outside the app's existing grant, missing thumbnails, unsupported thumbnail host or redirects use source fallback. No interactive authorization or broader Drive grant. |
| Dropbox | Existing PKCE auth `ready` under `files.content.read`, `files.metadata.read` and the recorded account/connection/root namespace; `get_thumbnail_v2` by recorded file ID, JPEG 256 fit. | Old receipts without identity/namespace or mismatched current account skip auth entirely (cannot change the new account's card state). Unsupported image/thumbnail or denied reads fall back. No shared link creation. |
| OneDrive | Existing `Files.ReadWrite`/`User.Read` client, matching recorded account/drive/root; authenticated Graph `/thumbnails/0/medium`, followed by the temporary content URL without forwarding a token. | Missing IDs, disconnected/mismatched account, no generated thumbnail, expired URL or read failure use source fallback. No sharing or new scope. |

Experimental GitHub/unknown-provider records currently use original-source fallback;
no file read grant or exact destination receipt is assumed for them.

Only destination identifiers are sent to cloud APIs. The recorded original
`sourceUrl` is fetched separately **after** cloud retrieval/decode failure, with
credentials omitted, no referrer, no cache, and redirects rejected. Hosting page,
frame, link and other provenance are never transmitted to providers. Provider
URLs/tokens are never persisted or sent to web-page contexts; all code executes
inside the trusted Shelf. Both retrieval failures simply produce no image. Auth
refresh may use the existing clients' ordinary local credential refresh paths.

## Verification

All evidence below is local; provider responses are simulated.

- Clean checkout after `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`:
  `npm test` **1,044 tests, 933 pass, 111 fail**. The first attempt before installing
  locked dependencies was invalid due to missing modules and was not used as baseline.
- New `node --test tests/history-quick-glance.test.mjs`: **13 pass, 0 fail**.
  Covers all 235 Today records and older paging, gate behavior, 1,000 reserved slots,
  initial ten/concurrency/batches/30-image retention, replaceable logo, disposal and
  stale responses (including old decode/new request races), final failure, cloud-first private R2, decode fallback, MIME and
  streamed-byte limits, Dropbox namespace, OneDrive token separation, Google
  noninteractive account-bound thumbnail read, cancellation during pending auth,
  and preservation of failed/pending records and unrelated connected accounts.
- Relevant existing History/GO TO and Google/Dropbox/OneDrive fixtures plus the new
  tests: **175 tests, 160 pass, 15 fail**; all 15 failures also occur in the clean
  checkout baseline.
- Full regression through `npm run reliability:check`: **1,057 tests, 946 pass,
  111 fail, zero skipped**. Failure names match the clean checkout's 111 failures
  exactly (none added/resolved). Syntax, API registry and issue inventory pass;
  architecture freshness fails against untouched `options.js`/`background.js`
  anchors. Overall reliability remains **failed / release blocked**: its older
  policy classifies 105 existing failures as new, six as known, and one old
  drag-handle test as unseen. Frozen hashes/assertions were not refreshed or weakened.
- `node scripts/history-quick-glance-preview.mjs`: **passed** in ordinary headless
  Chrome **154.0.8037.57**, using a local HTTP mock and real native image decoding,
  IntersectionObserver and CSS. All 120 rows remained; initial work was ten image
  jobs. Loading/ready/failed geometry was unchanged; an 80×160 portrait retained
  ratio 2; four themes (Porcelain, Midnight, Ocean, Neon), reduced motion, offscreen
  pausing and cleanup passed. Across runs, scrolling to slot 30 produced 29–30
  total jobs and retained 16–20 images. Repeatable screenshots/results are written to
  `work/quick-glance/`; no extension is installed by this fixture.
- `npm run check` and `git diff --check`: **passed**.

## Remaining acceptance

No installed-extension Chrome session or live Cloudflare/Google/Dropbox/OneDrive
request was performed. Existing unpacked-install administrator restrictions were
not bypassed. Real private R2 object permissions, provider thumbnail API/CORS and
redirect behavior, OAuth grant state/account refresh/disconnection races, hotlink
and expiring-source behavior, native GO TO and scrolling very long real days still
need installed/browser/provider acceptance. Local mocks establish the read order
and absence of public-access mutation; they cannot certify private R2 retrieval in
an owner's account. Entitlement integration remains open as described above.

## Main integration follow-up

At the owner's explicit push-to-main request, merged remote main `303a20b` into
`e57d30a`. Resolved Shelf script-list and syntax-target conflicts by preserving
both sets of additions, including main's Pulse Destination setting and
`shelf-click-feedback.js`. Post-merge Quick Glance, click-feedback and Shelf-save
fixtures: **30 pass, 0 fail**. Syntax and the local Chromium Quick Glance fixture
pass. The full-suite counts above describe the implementation before this merge;
the full suite was not rerun for the integration. Installed/provider gaps remain.

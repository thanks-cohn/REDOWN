# Get URL and semantic Explorer feedback

Date: 22 October 2026. Extension: 0.5.16.

Before implementation: `98e66e4c1a3ffeffa0d06d8f7d9941caeb50907e` on `main`. The concurrent bugs-only update `b776de499ea2f315bf296575a092f5a11f881bbe` was retained before publication. The exact published source commit is recorded in the completion record below; it cannot be embedded in its own commit.

## Get URL

The former asynchronously relabeled Copy public URL action is now one stable **Get URL** action, in its previous position before Properties. Search-result files use the same action and their actual account/bucket. Selecting it performs one read-only `cfPublicAddresses` discovery, using `RedownPublicAddresses.popover` in the existing public-addresses module. No discovery is triggered merely by opening the context menu. Properties and preview keep their existing URL disclosures; no second public-address discovery system was introduced.

The nonmodal floating dialog has a compact filename heading, full-row copy controls, visible availability descriptions, hover/focus states and temporary checkmark/Copied feedback. It stays open after copying. URLs truncate visually but copy the complete string. Arrow keys, Home/End, normal Tab focus, Escape, outside pointer press, scrolling outside the panel and a close control are handled without triggering Explorer shortcuts. Escape/close restores the source row's focus when it still exists. Viewport-fit positioning is reapplied after content changes and resizing; long lists scroll inside a viewport-bounded panel.

Address construction reuses the existing account/bucket-bound snapshot and exact per-segment object-key encoding. Configured subdomains remain intact; R2 custom domains use bucket-root paths and Worker domains retain `/assets/`. Duplicate complete URLs are collapsed. Disabled, pending and unknown configurations remain visible but cannot copy. No usable configuration produces an explanation. HTTPS-only validation rejects credentials, query/fragment-bearing bases, authenticated Cloudflare API/dashboard addresses and private/object read routes. A configured public URL is explicitly labeled **accessibility not verified**. Discovery neither probes public object contents nor changes public visibility, CORS, DNS, SSL or Worker configuration.

Each invocation freezes its source/key and gets a generation. New selections, searches, location navigation, another menu or dismissal invalidate old discovery. Clipboard promises cannot paint a newer dialog or operation. Clipboard errors use a generic actionable message rather than leaking raw browser/provider errors.

## Shared state colors and lifecycle

`extension/explorer-status.js` supplies a single semantic state-to-style mapping, used by the Explorer footer/detail text, upload feedback and preview progress. Theme-aware tokens select neutral/white, restrained green, red and amber; wording remains explicit. Dark-surface and white-surface palette contrast is tested numerically at4.5:1 or better. REDOWN's existing interface remains dark; this does not add a new theme picker.

| State | Color | Meaning |
|---|---|---|
| running / pending / loading | Neutral | Work or verification still in progress |
| done / success | Green | The operation's completion boundary has succeeded |
| failed | Red | Denied, failed or unconfirmed work requiring attention |
| partial | Amber | Mixed receipts, skipped/conflicting items or incomplete results |
| cancelled / idle | Neutral | Cancellation or informational/resting state |

Operation tickets guard asynchronous completion/status messages. Terminal feedback revisions guard old expiry timers. Folder loads capture a request generation and the source/prefix before awaiting; older responses cannot replace a newer folder or its feedback. Folder refreshes after mutations retain the mutation's ticket. Preparation/retry messages share the parent's listing ticket. Search, preview, properties, copy/move, rename, folder creation, extraction, upload and download feedback use explicit completion states. An older upload batch cannot replace a newer batch's progress on the shared upload panel.

Starting a native download stays neutral. A Chrome complete callback is required for green; USER_CANCELED stays neutral. Archive downloads without a terminal observer remain neutral and explicitly direct the user to Chrome Downloads. Partial transfer/delete/extraction receipts and incomplete searches use amber. Upload metadata/size checks retain their existing guarantees; color does not invent an independent content hash. Preview readiness means the existing retrieval/render boundary completed, not an end-to-end cloud integrity certificate. The duplicate inline live region is disabled so the footer announces meaningful changes once; identical message/state renders are not rebuilt repeatedly.

An adjacent upstream defect found by regression testing was corrected: the new managed-public-host fallback regex used overescaped literal dots and rejected real `pub-<hex>.r2.dev` hosts. The corrected anchored regex retains the same strict allowed hostname shape and explicitly enabled-bucket guard. Existing unusual-key preview/download tests pass. The old401 test fixture now models the new read-only managed-domain lookup explicitly; its original two authenticated-object-attempt assertion remains.

## Diagnostic/API integration

Get URL records a `public.urls` invocation with HMAC source/key identity, endpoint classification and discovery outcome. Actual clipboard requests/results are child `clipboard` operations. Classification uses `r2.managed`, `r2.custom`, `worker.assets` or `provider.public`; future adapters can supply the same configured-address contract. Endpoint classification is not evidence of public object access.

New structured codes: `EXPLORER_URL_DISCOVERY_FAILED`, `EXPLORER_URL_UNAVAILABLE`, `EXPLORER_CLIPBOARD_FAILED`. The collector and independent schema allowlist them; raw addresses, filenames, credentials and copied values are not stored in events. Debug gating and review-before-export remain unchanged. The current Explorer source map includes the pop-over and status module; frozen historical evidence was not rewritten.

```sh
npm run explorer:smoke -- --preset urls-and-status
npm run explorer:smoke -- --preset all
node agent/explorer/cli.mjs getSmokePlan --input '{"preset":"urls-and-status"}'
node agent/explorer/cli.mjs explainOperation --input '{"name":"public.urls"}'
```

## Verification and limits

- Full available regression suite: **288 tests,281 pass,7 retained historical failures** (six frozen project/debug/semantic evidence cases and the removed Nested drag-handle expectation). [Full output](verification/get-url/tests.log).
- Fixed smoke presets: **163/163 pass**. The focused URLs/status preset is included in `all`. [Smoke output](verification/get-url/smoke.log).
- Syntax check and current architecture anchors pass. Two Explorer schemas and17 simulated bundles pass; unknown/unredacted fields remain rejected.
- Tests cover one/multiple addresses, multiple custom subdomains, Worker prefixes, disabled/pending/private endpoints, exact triple-dot/Unicode/reserved-character keys, clipboard success/failure, rapid switching, stale completion, viewport clamping, keyboard/dismissal, source capture/no eager discovery, diagnostic privacy, state/color mapping, download acceptance/completion/cancellation, partial receipts, listing races and expiry guards. Existing preview/lightbox/search/transfer tests pass.
- DOM interaction tests use JSDOM and mocked browser/cloud responses. Geometry is explicitly simulated. Chromium rendering was attempted; the available download returned a truncated/invalid archive, so no screenshot or actual installed-extension/native clipboard pass is claimed. Native Chrome paste testing and visual review at desktop/narrow sizes remain in `bugs/README.md`.
- Audit-only0.5.16 package builds with34 allowlisted runtime files. Existing root/bundled license mismatch still blocks normal release certification. No store publication or live Cloudflare mutation was performed for this feature.

## Completion record

Published source commit after implementation: `278f0405b1e3defbfba024240f3f3d1a9d15857e`.

Published source tree: `22932235e356a0f7ddef1013ca0180893cafc807`, identical to the locally tested implementation tree. This follow-up record changes documentation only.

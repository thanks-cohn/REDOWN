# Codex request — Diagnostic source and hosting-page URL context

**Date:** 2026-11-12  
**Repository:** thanks-cohn/REDOWN  
**Priority:** P1 diagnostic usability, after live OAuth/save reliability P0  
**Status:** Owner-requested implementation specification; NOT IMPLEMENTED.  
**Scope:** Read-only diagnostics and export. No provider transfer changes, permission expansion, or automatic website monitoring.

## Problem observed on real owner Windows run

The Nov 12 installed REDOWN diagnostic ZIPs contain `attempts.json`, `queue.json`, `source-and-provider-failures.json`, etc. They correlate attempt IDs and HMAC `sourceId` across cloud providers, but **do not include the right-click hosting-page URL or the actual file/media source URL**. This prevents determining whether repeated failed saves correlate with a hosting website, CDN/resource host, media type, source redirect, provider API, or REDOWN's own runtime.

The owner explicitly requests **both the source URL and host webpage URL** in future diagnostics for trend analysis and fault attribution.

Relevant current source:
- `extension/background.js` already receives `info.pageUrl`, `info.srcUrl`, `info.linkUrl` and `tab.url` on supported native save paths. `selectedUrl(info)` prefers src, then link, then page; do not conflate these.
- `extension/runtime-diagnostics.js` `createAttempts().begin(info)` saves a keyed HMAC fingerprint of `srcUrl || linkUrl || pageUrl`, but not the distinct page context.
- `extension/diagnostic-bundle.js` intentionally excludes raw source and page URLs, and `extension/diagnostic-download.js` exports stored metadata offline without waking the worker.
- `extension/options.js` has separate buttons for Inspect save attempts / Inspect runtime / Export Diagnostic Bundle.
- `extension/save-evidence.js` currently sanitizes source HTTP/Content-Type/response categories but no URL field.

## Feature contract

Add an explicit **Diagnostic URL Context** control in REDOWN Developer/Debug Settings, not active by default on existing or new installations. When enabled, newly observed eligible native right-click attempts capture, within the existing bounded attempt evidence:

- `pageHost`, `pageOrigin`, and a **sanitized hosting-page URL** derived from `info.pageUrl` (or `tab.url` only when authoritative and appropriate). This identifies where the right-click happened.
- `sourceHost`, `sourceOrigin`, and a **sanitized actual asset URL**, derived from `info.srcUrl` / `info.linkUrl` with explicit `sourceKind: image|video|audio|link|page|blob|data|unknown`. Keep the actual choice separate from page. Avoid accidentally recording page URL as a successful asset URL.
- Optional `finalResponseHost` for actual fetch redirect landing host **only where already observed through authorized existing transport**, not through an extra request. Capture redirect observed / blocked / not measured, HTTP status class, content type class, source failure code. Do not confuse provider upload endpoint with original asset host.
- Provider, attemptId, current stage and terminal reason already present; correlate to same ID, and allow grouping attempts by (pageHost, sourceHost, provider, sourceKind, result), including missing/unknown cases.
- Optional sanitized path only when the user explicitly checks **Include URL paths**. Default should be **origin/domain only**, since paths may contain private identifiers. A sanitized URL includes scheme/host and optionally path; **always remove credentials, query, fragment, tokens, signed parameters and any unsafe control characters**. Do not pretend arbitrary path redaction guarantees complete anonymity: show a warning/review UI.
- Explicit data-retention policy (max 100 attempts, bounded bytes, optional short TTL) and Clear captured URL context separate from Clear traces; turning the toggle OFF stops new capture and clearly describes whether previously captured URL context remains until separately cleared.
- Diagnostic ZIP includes the above **only if enabled** and must visibly indicate `urlContextMode: off|origins|sanitized-paths`, scope, completeness, limitation and sharing warning. ZIP remains a user-triggered local file; never automatically upload URLs to REDOWN, GitHub, OpenAI, Cloudflare, or connected destination clouds.
- Keep source `sourceId` HMAC for cross-provider comparisons; do not change its derivation without a version marker.
- Do not log user browsing outside explicitly attempted REDOWN saves; no blanket `chrome.webRequest` capture or new host permissions.
- Do not modify actual transfer/History routing or backfill old ZIPs. Old diagnostics cannot reconstruct missing context.

**Privacy rule:** Raw URLs can embed access tokens, session IDs, personal identities or private filenames. Do not put full unredacted URLs into ordinary support exports or cloud object metadata. Explain limitation and support a separate local-only inspection workflow if owner later needs exact raw URLs. No key material, cookies, auth headers, account IDs, private path identifiers or signed links in shared ZIPs.

## UI wording

Toggle label: **Include website and source context in diagnostics (OFF by default)**.  
Helper: **Helps diagnose site/CDN vs cloud-provider failures. Exports hostnames, and optional sanitized URL paths. Query strings, fragments and credentials are removed. Review ZIP before sharing.**  
Add clear context only, not a transfer/storage reset.

Example sanitized attempt (illustrative, not owner data):
```json
{
  "attemptId": "opaque-id",
  "provider": "cloudflare",
  "pageOrigin": "https://gallery.example",
  "sourceOrigin": "https://cdn.example",
  "sourceKind": "image",
  "pageUrlSanitized": "https://gallery.example/posts/123",
  "sourceUrlSanitized": "https://cdn.example/images/photo.jpg",
  "finalResponseHost": "cdn.example",
  "queryPresent": true,
  "terminal": "FAILED",
  "failureCode": "SOURCE_FETCH"
}
```

## Test and acceptance gates

1. Source image embedded from a different CDN: accurately differentiate hosting page and media source.
2. Anchor to file, media-src inside anchor, page-only click, blob/data/download button, empty/malformed/privileged browser URL, missing tab/page/frame: record accurately with unknown if not authoritative.
3. Signed/private query string, `#fragment`, username/password URL, host lookalike, IDN/IPv6 and path identifiers: never leak raw credentials in ordinary export, with sanitization tests.
4. URL-context toggle OFF and Debug off: no accidental URL capture; OFF->ON captures future attempts only; schema survives restart without breaking transfer; clear-context operation is narrow and reversible via backup where appropriate.
5. Export passes storage bound and privacy tests. Inspect save attempts, Inspect runtime and offline Diagnostic Bundle remain separate read-only tools.
6. Provider failure diagnostics show the matchable pageHost/sourceHost and stage/reason correlations for the same attempt; do not make causal claims solely from domain correlation.
7. Chrome installed owner acceptance: two different page hosts sharing a CDN; multiple providers of same source; repeated one-provider-only failure; HTML-instead-of-image response; URL redirects; worker restart; short-lived signed URLs.
8. No extra network requests, no OAuth/permission changes, no History/counter overwrite, no new upload, and no site-wide scraping. Run existing suites and add focused tests.

**Definition of Done:** Implement + test the setting, recorder, sanitized export, bounded retention and plain-language interpretation; provide the owner a diff, focused test results, Windows manual test steps and updated README. Do not claim it is active until code is merged, pulled locally and installed Chrome extension reloaded.

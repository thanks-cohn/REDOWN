# REDOWN History Archive & Versioned JSON Export

**Implemented source scope:** `beta-explorer`, 2026-10-30. Requires installed Chrome and live-account verification before release sign-off.

## Preservation model

REDOWN uses **Chrome extension `chrome.storage.local`**, independent of browser cache and browsing-history storage. Normal Chrome cache/history deletion ordinarily does not erase this extension-specific data, but removing the extension, deleting the Chrome user profile, certain resets, disk failure, or explicitly clearing extension data **can erase it**.

- `transferHistory`: existing capped **50 latest compatible entries**, for older features and clients.
- `transferHistoryArchiveV1`: a durable **full local event journal**, including successful transfers, failures, retries and captured `pageUrl`, `srcUrl`, `frameUrl`, `linkUrl`, `sourceUrl` metadata when available.
- New records are written to both stores in the same `chrome.storage.local.set` operation under the existing `navigator.locks` coordination when supported. Counters remain unchanged in shape; failed persistence must not publish a counter increment.
- A read or later record rehydrates old `transferHistory` entries into the journal; the original 50-window contents are preserved. Records that the old 50-entry truncation **already discarded cannot be recovered**.
- A successful retry may replace its earlier failed attempt in the compatibility window, but the **journal keeps the failed attempt too**, so all interaction history remains inspectable.
- The Worker/History rename route updates the same event ID in both stores.

The extension requests `unlimitedStorage` to avoid Chrome's ordinary storage.local quota. This does **not** ensure unlimited disk space or protect against extension removal/profile deletion. An exported, separately backed-up JSON file is the independent recovery copy.

## Export History (JSON)

At the bottom of Legacy Activity History and the Beta History dialog, the user can select **Export History (JSON)**. This generates a locally downloaded, human-readable, two-space-indented `redown-history-v1-YYYY-MM-DD.json` file. Nothing is uploaded. The export includes all records currently retained in the journal and all record fields, including old and new URL provenance, destinations, status, errors, and unknown future record fields. Records already lost to the former 50-entry cap cannot be recreated.

The `extension/history-export.js` module owns the versioned schema, builder, reader, and file-download logic. Export files are **sensitive**, because URL query parameters, private page paths and saved destinations may be present. Users control where copies are stored and shared.

### Version 1 format (illustrative)

```json
{
  "format": "redown.history",
  "schemaVersion": 1,
  "exportedAt": "2026-10-30T14:20:00.000Z",
  "application": "REDOWN",
  "description": "Locally recorded REDOWN saves, failed attempts and related URLs. URL accessibility and transfer outcomes are historical, not live checks.",
  "count": 1,
  "urlFields": {
    "pageUrl": "Webpage where the user requested the save",
    "srcUrl": "Direct image/audio/video URL if Chrome provided one",
    "frameUrl": "Containing frame URL, if provided",
    "linkUrl": "Right-clicked hyperlink target, if provided",
    "sourceUrl": "Actual source REDOWN attempted to ingest"
  },
  "records": [{
    "id": "example-record-id",
    "at": "2026-10-30T14:19:55.000Z",
    "ok": true,
    "pageUrl": "https://example.org/gallery",
    "srcUrl": "https://media.example.org/picture.webp",
    "sourceUrl": "https://media.example.org/picture.webp",
    "location": "https://pub-example.r2.dev/gallery/picture.webp"
  }]
}
```

Future readers should route by `format` and `schemaVersion`, validate `records` and `count`, and preserve unrecognized record properties. The already implemented `RedownHistoryExport.read(json)` provides v1 parsing, validation, and explicit newer/unsupported-version errors. New schema versions must get an explicit migration adapter, **never silently drop older fields**.

The Bookmarks-by-page feature can later group imported records by pageUrl, srcUrl, frameUrl, linkUrl, website domain, date, or destination. **There is no Import History UI yet.** The format reader is present for that eventual workflow. Exports also contain errors and attempted downloads, and should not be mistaken for proof a remote file still exists.

## Acceptance and gaps

- Run focused tests: `tests/transfer-counter.test.mjs`, `tests/history-json-export.test.mjs`, `tests/history-provenance.test.mjs`.
- Installed-Chrome: record more than 50 mixed failures and saves; restart browser/extension; clear cache/history; verify full journal retained; export and open JSON in a text editor; compare event count and URL roles; rename an old event.
- Verify the download prompt, file access permissions, large-export behavior, interrupted writes and recovery messages with actual Chrome.
- No automatic disk backup, export scheduling, import UI, IndexedDB migration, cloud synchronization, encryption-at-rest or guaranteed loss-proof protection was added.

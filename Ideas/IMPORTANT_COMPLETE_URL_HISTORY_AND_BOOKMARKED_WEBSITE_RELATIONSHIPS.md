# IMPORTANT — Complete URL provenance in History and future website Bookmarks

**Project:** REDOWN, `thanks-cohn/REDOWN`
**Working surface:** Legacy Activity/Downloads History, shared right-click transfer records, and future Beta parity
**Status:** owner-directed requirements; refer to implementation commits for what actually ships

## Immediate History requirements

1. Every explicit REDOWN browser context-menu save must retain each available Chrome right-click URL independently: `pageUrl` (webpage), `srcUrl` (image/video/audio source), `frameUrl` (containing frame) and `linkUrl` (clicked link). Keep `sourceUrl` as REDOWN's actual selected remote-ingest source and as a fallback for older/partial records.
2. **Best effort, never fabricate:** save all supplied usable fields, even if only one, two or three of the four context URLs exist. Do not require every URL to resolve, load or remain accessible. If a particular context field is absent, omit that field; retaining the actual transfer `sourceUrl` remains essential. Existing historical records should continue to render without migration or loss.
3. Show provenance **parent page first**, then **direct image/media URL** (or actual link/download source for a link save), then containing `frameUrl`, then `linkUrl` and any distinct transfer `sourceUrl`. Preserve labels to distinguish URLs that happen to be equal. Clicking a provenance URL must not accidentally navigate the Explorer to the stored destination.
4. Display a **collapsible and re-expandable** source-links section per History item, both successes and errors. Links should wrap at any length and be individually clickable/copyable where safe. Keep the destination location button and its existing navigate-to-file behavior separate.
5. Keep existing transfer outcome/count semantics; provenance is **metadata**, not evidence that URLs currently work or that a file transfer completed. Never relabel failures as successes.
6. Retain URL fields only for the explicit user-initiated save, scoped to local History; never dump unredacted URLs to Debug diagnostic bundles. Navigation should use secure link-handling precautions (no implicit external requests, avoid referrers, safe protocols).
7. If a later browsing surface cannot retrieve metadata for an old entry, show what was recorded at the time rather than reconstructing a speculative page/source relationship.

## Next: Bookmarks for websites and their interaction history

The owner wants a lightweight **Bookmarks** tab: save/bookmark a website or tab, then review all REDOWN interactions and saved links originating from that parent page.

Proposed website record and link relationship:

- Bookmark: canonical or literal page address, user-selected title, optional tags/categories and notes; keep original captured URL separately when canonicalizing.
- Save events: time, transfer status, destination, direct resource URL, original parent page URL, frame URL, link URL, exact relationships and original per-field provenance.
- Browse/group/filter by **pageUrl, srcUrl, frameUrl, linkUrl**, and optionally by destination, file/media type, tags, date and website domain.
- Build a parent-page view displaying *every saved interaction* involving that address; retain the originating page even when the resource is served from a third-party CDN.
- Provide collapsible event histories, clear direct/source versus parent distinction, and eventually a downloadable **JSON** export of bookmarks and linked interaction records with versioned schema.
- Search, deduplicate presentation without destroying event records, and support grouping over overlapping relationships (a link may appear under both a page and a resource).
- Remain privacy-conscious: explicit bookmarking, local-first storage by default, no automatic publishing or synchronization, no link crawling or background fetching without permission; exports should be user-initiated.

### Non-goals of this immediate change

The new Bookmarks UI, crawler, tag editor, full-history durable archive, and JSON export are **future ideas**, not authorized as implemented just because this document exists. Today's transferHistory is capped; a bookmark/history archival model will require a separate retention and migration design.

### Acceptance checklist

- Right-click an image within a webpage: History stores/displays its page URL and image source URL, in that order; frame and hyperlink URLs appear if supplied.
- Right-click a link: preserve its parent page and linked source even when `srcUrl` is absent.
- Missing/unreachable `frameUrl` or `linkUrl` never prevents successful recording of other captured URLs.
- Success and failure records both expose provenance; pre-existing `sourceUrl`-only records still work.
- Source disclosure can collapse and reopen; destination navigation is unaffected.
- A secure renderer never interprets URL text as HTML and never blindly opens unsafe schemes.
- Source metadata remains out of unredacted telemetry/diagnostics; JSON bookmarks remain future work.

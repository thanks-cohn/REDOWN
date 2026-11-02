# P0 — Cloudflare SUCCESS! must be verifier-driven, not loginless or time-driven

**Owner observation:** The Cloudflare card has appeared to flash SUCCESS! when not logged in or when no file was saved. Other providers' SUCCESS! signals must be audited against their respective verifiers. Owner also requested polished non-Neon counters; exact tagline case **Your Cloud Companion**; and History footers of the form `Provider · verified/destination/path` with trustworthy file links when actually known.

**Branch:** `CONSOLIDATED`. **Status:** Source fixes and focused regression coverage, LIVE installed-Chrome acceptance still required. Do not close this P0 from a mocked test.

## One verified-save contract

1. An authenticated *save-attempt ball* remains decorative. It must not run for a logged-out cloud and must not create SUCCESS!, increase counts or fabricate an upload.
2. **Cloudflare:** first upload through existing R2 Worker; HEAD the exact object and require exact key, bytes, ETag and source metadata match; only then bind a proof of type `r2-head-v1` to the current Cloudflare OAuth `sessionId`. An expired, revoked, absent or replaced login prevents visual SUCCESS! authorization. The Shelf also requires that the current connection status has passed the background account API check.
3. **Google Drive:** background stream confirms the created Drive file's ID, name, parent and bytes through an authenticated readback. Count by the exact verified file ID only.
4. **Dropbox:** authenticated metadata readback must include correct full account/connection/namespace/root, file ID, revision, content hash, path/name and byte count.
5. **OneDrive:** Graph GET readback must confirm exact item ID, drive/parent and bytes.
6. Every provider must have `ok===true`, `verified===true`, `status==='completed'` and a matching provider-specific proof before the *shared transferCounter* writes `providerSaveReceipts`, a daily count or lifetime attribution. Denied/failed/pending/uncertain/cancelled and duplicate immutable delivery IDs cannot be credited.
7. **UI events:** only the newly committed `providerSaveReceipts.latest` may start in-card SUCCESS!. Source URL availability, button clicks, sent messages, popup/open events, cached startup hydration, and decorative timers must never create that event. The word/flash timers are visual choreography *after* proof, not proof substitutes. Toolbar green completion flash follows the persisted verifier-backed receipt rather than a success-looking URL.
8. If a real receipt arrives while the Cloudflare Shelf is checking account access, defer that specific live event briefly and show it only after the same login session is verified. If the user logs out, auth changes or the check fails, discard/cancel it. The saved per-provider total may still be displayed on subsequent reloads without replaying the old animation.
9. Preserve the working falling balls for authenticated attempts, unchanged verified-only non-Neon italic and Neon SNES money-green animations, and the lifetime odometer's monotonic count.

## Historical destination footer

- Display one provider name and one genuine destination, no duplicated profile/bucket labels: `Cloudflare R2 · hp-mini/images/file.jpg`, not `Cloudflare R2 · hp-mini · hp-mini`.
- Cloudflare: actual bucket/key path. Only a **Worker-returned explicit publicUrl** is an actionable public URL; a constructed fallback in a private bucket is not sufficient proof of public availability.
- Dropbox: actual verified metadata `path_display`, e.g. `Dropbox · art/file.png`. Do not invent a web link when none is provider-confirmed.
- OneDrive: the verified root path `/file.docx`, or a future known folder path. Show its stored verified Graph `webUrl` if it safely resolves to a Microsoft provider-owned destination.
- Google Drive: `My Drive/file.png` at root, known explicit folder path when available, or an honest `Folder ID x/file.png` when only an opaque parent ID exists. Link to the verified Google Drive file URL only.
- No fabricated paths, no source or hosting URL presented as a saved destination, and no public link for private/unknown destinations. Failed uploads must not present tentative destination paths as completed saves.

## Visual details

- Capitalize the header tagline exactly **Your Cloud Companion**.
- Numbers in Porcelain, Midnight and Ocean use theme-specific small glass/porcelain/steel-instrument readouts with depth and typographic character, not unstyled plain digits. Neon retains its existing square hot-pink number bezel. Numbers shrink only as digits increase.
- The new History footer and link share one legible line (wrapping naturally on narrow Shelf).

## Regression and live acceptance

- The focused GitHub Actions workflow now includes unit tests for transfer counters, daily toolbar badges, four provider card animations, authenticated Cloudflare state changes, and History destination paths/public-link safety.
- Confirm in actual installed Chrome using *real* authorized users and remote items: no Cloudflare login -> no balls and no SUCCESS!; login but source fails -> no SUCCESS!/count; successful R2 Worker POST with wrong/missing HEAD -> no success; exact R2 HEAD and connected current OAuth session -> one provider count, one daily count, one lifetime increment and one transient SUCCESS!; logout/revoke midflight -> no completed SUCCESS!. Repeat for Google, Dropbox and OneDrive when each auth works.
- The broader reliability gate and actual OAuth/storage integration remain independently tracked, and the focused test does not certify all of REDOWN.

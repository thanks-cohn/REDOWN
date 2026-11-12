# P1 — Dropbox provider card repeatedly expands/collapses while temporarily unavailable

**Owner report:** 2026-11-12 (America/Chicago), after REDOWN main `7b7f6d1` pull.  
**Status:** **OPEN — owner-observed in Windows Chrome, root cause unverified; no fix claimed.**  
**Priority:** P1 persistent visible UI instability. Escalate if repeated status transitions correspond to excessive API calls or auth retry storms.

## Reproduction (owner-observed)

1. Open REDOWN Shelf with Dropbox connected or in a temporary-unavailable/reconnect state.
2. The status/debug message roughly **"Dropbox temporarily unavailable. Try again later."** flashes or alternates with another message.
3. The Dropbox card **expands and retracts repeatedly**, shifting itself and adjacent cards up and down.
4. Click **Disconnect Dropbox**: repeated resizing stops.
5. Click **↻ Refresh/Reconnect Dropbox** again: repeated resizing returns.

No precise interval, CSS height, theme, viewport or provider error code was captured; do not invent them. This occurs alongside a separate report that multiple ↻ buttons do not open the expected OAuth prompt (see `CRITICAL/2026-11-12_P0_ALL_PROVIDER_RECONNECT_CONTROLS_FAIL_TO_OPEN_EXPECTED_OAUTH_RECOVERY.md`).

## Source-grounded diagnostic leads (not proven root cause)

- `extension/shelf-dropbox.js` `paint()` changes the inline `errorNote.hidden`, `data-login-error`, the normal status line and authorization hint based on asynchronously updated `dropbox:state` and transfer state.
- `extension/shelf.css` explicitly applies `min-height:88px` to `[data-provider="dropbox"][data-login-error="true"]` and reveals the multiline `.dropbox-inline-login-error`. The new `.provider-authorization` consumes a second grid row, can wrap, and may vary with text length.
- The combination could create genuine layout shifts **when status alternates**, but a live DOM/render timeline is needed to establish which specific change or re-render causes the observed oscillation. A status update loop is a separate possible issue, not a proven cause.

## Expected / acceptance

- Keep the Dropbox tile and neighboring tiles **visually stable** while displaying truthful connectivity/auth/error states. A single intentional disclosure expansion is permissible; endless expand/collapse/jumps are not.
- Reserve a stable bounded status area, constrain wrapping or overlay transient notices as appropriate **without hiding actionable error text**, and ensure keyboard/screen reader access.
- Avoid repeated reflow caused solely by network polling/status oscillation; inspect whether provider refreshes are rate-limited, coalesced and cancelled appropriately.
- Verify in installed Windows Chrome and at 320/400/480/640px, varying zoom and themes, during connected, temporary error, reconnect, disconnect and partial outages. Monitor card height/repaint/CPU/network and capture a screen recording.
- Preserve existing GO TO, OAuth, jobs, exact destinations, History and saving logic; no code change made by the issue report.

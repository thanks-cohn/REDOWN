# P0: Dropbox false success despite Login state — History and count desynchronization

**Date:** 2026-11-02  
**Status:** OPEN / owner-observed / not independently live-reproduced. No code fix or Dropbox verification claimed.  
**Branch:** codex/v3-parity-first-reconstruction  
**Implementation work request:** [P0 Dropbox receipt + verified-success animations](../../NEED_TO_DO/CODEX/CODEX_REQUEST_P0_DROPBOX_FALSE_SUCCESS_AND_VERIFIED_SAVE_ANIMATIONS_2026-11-02.md)

## Reported reproduction and impact

1. Chrome REDOWN native right-click offers a Dropbox destination/action.
2. Dropbox provider card says **Login** (apparently disconnected).
3. Clicking the Dropbox native menu item creates a History entry and increases the provider card saved count by **+1**.
4. Owner reports the file was **not actually created / not visible in Dropbox**.

**P0 risk:** REDOWN may be falsely reporting a completed save and corrupting the trustworthiness of History and lifetime save totals. This does not prove whether Dropbox remotely committed an object under an unexpected account, path or namespace; inspect evidence before concluding the file is absent.

## Investigation requirements

- Trace exact native menu ID, session/account/root/namespace, background service-worker dispatch, upload job, provider final response, metadata readback, History creation and transfer-counter increment. Identify whether stale Shelf login state, stale actionable menu state, or premature completion is responsible.
- Compare the earlier [November 1 Dropbox reconnect/namespace/missing-file incident](2026-11-01_P0_DROPBOX_RECONNECT_NAMESPACE_REJECTION_AND_MISSING_SAVED_FILES.md). Correlation is not proof of a shared cause.
- Preserve original saved History, Dropbox job records, connection material and remote files. No blanket logout, storage clearing, unverified resave or count rewrite as an investigation shortcut. Never publish secret tokens, private URLs, names or sensitive paths.
- Only provider-confirmed final commit may write verified success, increment a success counter once, enable successful GO TO, or trigger SUCCESS!. Preserve pending/failed/blocked/uncertain statuses.
- Keep source/page/frame/link provenance REDOWN-owned; Dropbox only receives file bytes and required destination/name/extension/API data. Do not broaden scopes or disrupt other providers, V3 menu authority, Cloudflare TRUE REMOTE or working falling-ball animation.

## Closure criteria

- [ ] Redacted, reproducible trace identifies the first incorrect success transition.
- [ ] Disconnected or revoked Dropbox native action produces truthful login/reconnect/failure behavior, never an invented file receipt.
- [ ] Failed/uncertain Dropbox saves do not increment successful-save counters or play SUCCESS!; History remains accurate and recoverable.
- [ ] Successful final Dropbox commit has remote metadata confirmation, correct account/root, correct original safe filename/extension and exactly one count increment.
- [ ] Repeated events, worker restart, retry, account/namespace drift, History hydrate and Shelf reopen do not duplicate successes.
- [ ] Other provider menu/save routes and theme-specific temporary animations pass their scoped regression checks.
- [ ] Mock vs installed Chrome vs actual Dropbox proof and any NOT_TESTED cases are reported honestly.

**Owner animation requirement tied to this bug:** Neon alone briefly flashes whole SUCCESS! between money-green and its normal Neon colors in SNES style, then hides. Other themes animate italic Times New Roman letter by letter, blink twice briefly, show a longer third appearance and disappear. Never animate an unverified save.

## Tracking

- [November 2 daily NEED_TO_DO](../../NEED_TO_DO/11022026.md).
- [November 2 scoped P0 Codex request](../../NEED_TO_DO/CODEX/CODEX_REQUEST_P0_DROPBOX_FALSE_SUCCESS_AND_VERIFIED_SAVE_ANIMATIONS_2026-11-02.md).
- [Existing Dropbox reconnect incident](2026-11-01_P0_DROPBOX_RECONNECT_NAMESPACE_REJECTION_AND_MISSING_SAVED_FILES.md).


## 2 November implementation follow-up — live incident remains OPEN

Local receipt/counter integrity hardening, exact readback checks, attempt History, stale-auth status repair, safe known-ID reconciliation and verified-only theme choreography are implemented on the working branch. See [actual implementation and verification report](../../docs/DROPBOX_VERIFIED_SAVE_REPORT_2026-11-02.md). No installed Chrome or authenticated Dropbox proof was obtained; the installed phantom-save cause, historical false-count assessment and team/root-home selection remain unresolved. Prior observations above are retained. No historical counts or owner records were rewritten.

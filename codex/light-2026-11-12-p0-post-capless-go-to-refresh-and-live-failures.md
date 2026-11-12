# LIGHT Codex starter — REDOWN post-CAPLESS P0: GO TO + refresh, provider OAuth failures, recorder overflow

**Date:** 2026-11-12 (America/Chicago)  
**Repository:** thanks-cohn/REDOWN only  
**Status:** Starter prompt for the new, not-yet-implemented P0 follow-up; previous CAPLESS implementation already exists.

## Paste this into Codex

Read and execute these REDOWN instructions in order:
1. `CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md` — NEW authoritative P0 scope and live owner evidence.
2. The POST-CAPLESS FOLLOW-UP section of `codex/2026-11-12-p0-crash-root-cause-flight-recorder-capless.md` — continuing crash/recorder investigation and preservation requirements.
3. `AGENTS.md` and only the existing source/tests needed for this scope.

Repository: `thanks-cohn/REDOWN` ONLY. Fetch latest `origin/main`, record actual HEAD and working-tree status, and work in a new focused branch from latest main. Do NOT restart the previously implemented CAPLESS feature from an obsolete baseline. Do NOT modify Click2Cloud. Preserve Chrome user/profile state, credentials, destinations, pending jobs, History, counters, real cloud files, existing append-only CAPLESS archive, pinned incidents, and all private/untracked evidence. No reset, uninstall, destructive cleanup, auto cloud replay or RAW export to public GitHub.

PRIMARY UX FIX: Keep each provider's **GO TO** navigation available when there is a meaningful known cloud destination; place a small, separately clickable **refresh/reconnect icon next to GO TO**, always accessible even if a saved status says `connected`. Reserve **LOGIN** for genuine first-time/no-account or confirmed disconnected states, not every API error. Do NOT equate provider website access, stale connected flags, OAuth permission or upload readiness. The refresh icon calls the provider's official user-triggered authorization flow; add keyboard accessibility, truthful states and provider-specific errors across Google Drive, OneDrive and Dropbox, plus popup fallback where supported.

REPRODUCED GOOGLE FAILURE: `interrupted · PROVIDER_FAILED`, `OAuth2 not granted or revoked.`, two `uncertain` source-phase jobs (3 attempts, 0 bytes reported), with Shelf incorrectly showing GO TO and no reconnect. Owner manually invoked existing `googleDriveOpen`, completed Google's consent form, and real Google Drive saves then worked. Make that recovery available through UI; do not assert why the grant failed or duplicate uncertain uploads.

ONEDRIVE: `ONEDRIVE_GRAPH_503`, `ONEDRIVE_NETWORK` and direct Microsoft website sign-in HTTP 503. Treat 503 as temporary provider/network unavailability, not proof of revoked credentials; avoid repeated unsolicited OAuth or destructive logout.

RECORDER/CHROME P0: Main CAPLESS archive advanced to 2,473 records with zero current backlog/write failures/pending segments and `stalled:false`; separately, pinned incidents filled 16/16 with mostly unknown MV3 epoch stops, repeatedly warning at `flight-recorder.js:526` and causing sticky `captureIncomplete`. Preserve all evidence, repair pinned incident retention/classification and misleading warnings. Investigate ~5s Chrome API timeout/late-accepted observations and the previously unavailable Options/extension until Reload; do not claim the original disappearance root cause is proven.

Implement focused code and regression tests, isolate healthy providers, keep verified receipts honest, prevent duplicate replays, and provide precise installed-Windows-Chrome acceptance steps. Distinguish observed, inferred and unknown. Deliver a reviewable PR/commits plus test results, changed files, remaining limitations and safety/privacy notes. Do not claim live success from synthetic tests. STOP after the review-ready handoff.

## References

- [New authoritative P0 request](../CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md)
- [Original master request and new post-CAPLESS follow-up](2026-11-12-p0-crash-root-cause-flight-recorder-capless.md)

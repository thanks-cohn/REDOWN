# Handoff — Visible Queue and offline diagnostics

Implementation branch: `fix/p0-visible-queue-diagnostic-bundle-2026-11-11`.
Base: `main` at `ad9a8f9aa05b857d724c8e5035a1db763edd1e4c`, preserving `c2be0d1` P0 repairs.
Delivery: preserve the implementation branch and merge it to main, as requested. No deployment is included.

## Start here

Read [the review](VISIBLE_QUEUE_REVIEW_2026-11-11.md), [implementation report](docs/VISIBLE_QUEUE_DIAGNOSTICS_2026-11-11.md) and [validation record](docs/verification/visible-queue-2026-11-11/validation.json). The request is preserved at `CODEX_REQUESTS/P0_VISIBLE_QUEUE_DEBUG_CARDS_ONE_CLICK_SUPPORT_BUNDLE_2026-11-11.md`.

The visible Queue is the read-only projection in `extension/transfer-queue.js`; existing provider modules still own uploads, admission, recovery and verification. Shelf presentation/navigation lives in `shelf-queue.js` and `shelf.js`. Source observation/sniffing lives in `save-evidence.js`; OneDrive's bounded acquisition stays in its original API module. The existing attempt recorder is extended in `runtime-diagnostics.js`.

`diagnostic-bundle.js` builds only whitelisted metadata. `diagnostic-download.js` performs an explicit offline local download without contacting the worker. It uses the same canonical projector and existing local archive. Runtime RPCs remain trusted-context-only; do not add generic provider mutations or raw storage dumps.

## Reproduce local verification

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
node --test tests/visible-queue.test.mjs tests/shelf-queue.test.mjs \
  tests/queue-background-api.test.mjs tests/diagnostic-download.test.mjs
node --test tests/save-attempt-lifecycle.test.mjs tests/save-attempt-diagnostics.test.mjs
node scripts/visible-queue-browser.mjs work/visible-queue/browser
npm run reliability:check
python scripts/package_chrome_store.py --audit-only
```

The full runner is expected to retain documented failures. Inspect the report rather than treating an exit code or a large passing count as release acceptance. Never refresh frozen hashes, reset History or weaken assertions to hide those failures.

## Next acceptance work

Use an administrator-approved Chrome environment that permits REDOWN. Preserve the existing browser profile, credentials, History, destinations and owner jobs. Do not uninstall, clear databases, recreate buckets or bypass browser policy.

Authorize disposable locations in each provider, then compare the same legitimately accessible source across Google Drive, Dropbox, OneDrive and R2. Run 50+ real attempts, verify exact remote objects independently, and exercise cold/warm startup, suspension, restart, Shelf closed/open, queue pressure and network interruption. Collect one offline ZIP before and after the first bad attempt. Check local source/destination identities privately; never add signed URLs or credentials to shared bundles.

For Cloudflare, separately establish callback delivery, PKCE/code exchange, durable token state, account API access, Worker readiness and independently verified R2 object existence. Do not interpret token presence, a card label, queue admission or an animation as a successful cloud save.

Generic per-job mutations need safe owner-specific contracts before they can be added. In particular, do not automatically replay an uncertain commit.

## Preservation

All source, tests, request, reports, selected screenshots and example ZIPs are committed. `docs/verification/visible-queue-2026-11-11/WORKING_EVIDENCE.tar.gz` preserves the complete `work/visible-queue` investigation directory and the audit package, including earlier failed iterations. Those older logs are historical troubleshooting evidence, not final passing results. Use `validation.json` and the final focused/browser files for the delivered outcome. Hashes and contents are listed in `preservation.json`.

The original feature branch remains untouched. Keep the implementation branch as an additional recovery point after merging. No Click2Cloud work or production deployment is part of this handoff.

# Immediate Click2Cloud interaction feedback

Source baseline: `2e9371891e4a0b46f6e4c88cd02e0863c9ab6ac3` on the supplied `work` branch. Implementation branch: `fix/immediate-click2cloud-pulse`. Remote main was six documentation-only commits ahead at inspection; those documents are not changed by this patch.

## Cause and execution trace

Before: native menu click → Cloudflare profile/destination resolution (or flat provider dispatch) → `launchSaveDroplet` → local authentication-state read → `RedownSaveDropletGate.permitted` → for Cloudflare, `listCloudflareAccounts` network/OAuth check plus session read-back → page injection → 860ms flight (including an initial stationary fade-in) → page-edge ring → persisted `redownShelfImpact` → Shelf forced-layout/CSS impact. A disconnected, expired or unavailable provider suppressed the initial light. A hidden or newly opened Shelf could replay a stored impact.

After: native supported destination selection → one `launchSaveDroplet` call → immediate `chrome.scripting.executeScript` invocation using cached appearance → visible, moving page light → ephemeral `redownClickArrival` → matching visible window/tab's Shelf/Popup handoff. Profile resolution, login, upload and verified receipts run independently. The chooser's More control does not acknowledge a save; its claimed destination selection launches once. `saveResolvedRightClick` and upload callbacks no longer launch a light.

The initial call contains no credential read, account request, upload wait, startup timer or queue. Chrome worker wake-up, script injection, frame isolation and painting still have nonzero platform latency; no zero-latency claim is made.

## Destination and lifecycle

Settings → Click2Cloud → Pulse Destination offers Shelf (default) and Provider Card, persisted as `click2CloudPulseDestination` in local extension storage. Appearance preferences hydrate once at worker startup and track local changes; a cold worker can immediately launch with its default palette rather than wait for storage. The handoff samples the hydrated destination preference after flight. No credentials enter the visual preference cache.

Chrome cannot draw a single DOM element through its page/Shelf boundary. The page light retains the existing right-edge destination. Provider Card mode continues that same interaction in the Shelf toward the selected card's freshly measured bounds. Cloudflare R2, Google Drive (`google` in Shelf markup), Dropbox and OneDrive are the four currently active cloud providers. Measurement also works for any rendered `data-provider` card matching a future event provider; a newly added native provider needs its action ID mapped in `providerFor`.

Missing, hidden or offscreen cards fall back to the visible REDOWN surface edge. Closed Shelf: the page flight remains available and does not open a panel. Chrome-protected pages cannot host injected DOM; an already visible matching REDOWN surface can acknowledge the click instead. If both the source page and REDOWN surfaces are unavailable, Chrome offers no drawable surface for this effect.

`click-origin.js` is a small declarative isolated-world listener recording only the latest local contextmenu position and timestamp. No storage, messages, polling or observer runs in the source page. This adds no permission or host grant. Existing tabs without the new listener use one-shot injection immediately, with a bounded matching-source-center scan and viewport fallback. Embedded-frame clicks also use that fallback rather than stale top-frame coordinates. Exact origin capture on those existing/embedded pages is not claimed.

Each click has its own event ID and WAAPI run, so rapid distinct saves are not debounced. Shelf handoffs deduplicate live IDs, reject stale/future/page-origin events and check invoking window plus active tab. No events hydrate from storage. Page navigation/tab removal cancel pending handoffs. Pagehide cancels source motion; visibility, route, theme, resize and pagehide changes cancel Shelf motion and invalidate pending asynchronous targeting. No retained target coordinates or DOM polling.

## Removed code and CSS audit

- Deleted `extension/save-droplet-gate.js`, including `permitted`, authentication-specific `providerFor`, expiry/account/grant matching and its worker import.
- Deleted the launcher's live accounts call and auth/session recheck, per-provider duplicate launch branches, and the launch from `saveResolvedRightClick`.
- Deleted the initial stationary fade-in keyframe and separate page-edge ring/cleanup path.
- Deleted `redownShelfImpact` writes, storage listener, hydration read/replay, hidden-Shelf `pendingImpact`, `impact`, impact ID/timestamp state, 850ms reset timer and forced `offsetWidth` restart.
- Replaced the interaction-owned `.shell::before`, `[data-save-impact]` selectors and `shelf-save-droplet-impact` keyframes. Removed both overlapping reduced-motion media overrides. One dedicated `.redown-click-light` uses WAAPI with per-run cleanup instead of shared theme pseudo-elements or transitions.
- Removed obsolete preview-script impact replay/source-flight paths; pulse preview now lives in `scripts/click-feedback-preview.mjs`. Replaced tests asserting obsolete authentication gates with interaction independence tests; receipt assertions remain.

The reference audit found this one source-page launcher, this one old Shelf impact handler and their dedicated stylesheet. No duplicate initial-pulse selectors remain in Neon, Porcelain, Midnight or Ocean theme rules. Success typography/flashes, celestial motion, lifetime odometer and the bottom-left Shelf failure laser have separate references and are preserved. Receipt verification, provider authentication and upload implementations are unchanged. No new dependencies or permissions.

The Chrome audit packager now traverses manifest content-script references, ensuring the origin recorder is included alongside worker/HTML imports. The audit ZIP contains all three feedback modules and excludes the removed gate. Existing license/release gates remain blocked; the audit artifact is not a publishable release.

## Verification

- Locked dependencies installed with `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`. The initial pre-install attempt lacked local dependencies and is not used as the baseline.
- Unchanged `git archive HEAD` export into `work/baseline`, sharing installed dependencies (no worktree): **1,044 tests / 933 pass / 111 fail / 0 skipped**.
- Final `npm test`: **1,047 tests / 936 pass / exactly the same 111 failing test names / 0 new failures / 0 skipped**. The interaction tests and replacement of obsolete gating/replay assertions yield a net gain of three tests.
- `node --test tests/click-feedback.test.mjs tests/shelf-save-feedback.test.mjs tests/daily-save-badge.test.mjs tests/transfer-counter.test.mjs tests/odometer.test.mjs`: **34 pass / 0 fail**. Covers immediate injection independent of authentication/network/storage, four providers, rapid actions, navigation, source origin, live geometry, fallback, deduplication, persistence and failed/unverified receipts.
- `CODEX_PRIMARY_RUNTIME_NODE_MODULES=/opt/codex/cua_node/lib/node_modules node scripts/click-feedback-preview.mjs`: **16 provider/theme geometry cases pass**, plus source-page flight/origin/cleanup, hidden-card fallback, reduced motion and preference writes; **0 page errors**. Existing host Playwright, no project dependency added. Actual Shelf HTML/CSS at 420×1100, extension APIs mocked, external fonts/icons omitted. Local screenshots/logs remain in `work/`.
- `npm run check` and `git diff --check`: pass.
- `npm run reliability:check`: **fails**. Syntax, API registry and issue inventory pass; existing architecture freshness and regression debt remain. The frozen registry recognizes six existing failures and labels 105 additional failures relative to its historical pin. Fresh unchanged-baseline comparison finds no newly failing cases. Historical hashes/assertions remain unchanged. The unchanged architecture query also reports partial findings.
- An initial reliability attempt before staging the deleted gate produced an invalid local inventory report. Two diagnostic tests temporarily failed while reading it; after staging/regeneration both diagnostic suites pass (**17/17**) and the final full run matches the 111-case baseline. This was verification ordering, not a runtime fix.
- `python3 scripts/package_chrome_store.py --audit-only`: passes. ZIP inspection confirms all three feedback scripts and absence of the old gate. Existing licensing/release blockers remain; nothing was published.

Inspectable comparison, all 111 failing test names, browser geometry and source hashes: [verification results](verification/click2cloud-pulse/results.json).

## Installed Chrome acceptance still required

No installed-extension, actual OAuth, live upload or Chrome-restart verification was performed. Repository onboarding records unpacked-install administrator restrictions; those restrictions were not bypassed. The ordinary Chromium fixture renders the actual Shelf HTML/CSS but mocks extension APIs; it does not certify extension messaging, provider state or packaged installation.

In an administrator-approved Chrome profile, load the exact reviewed artifact and check:

1. While logged out, logged in, expired and offline, select each supported destination: one promptly moving light, independent of whether login/upload proceeds.
2. Keep Shelf closed; repeat, then open it: source flight remains, no stored or delayed replay and no forced opening.
3. Select Provider Card, reveal each provider card and repeat: final segment targets that card. Hide/scroll it out and check the edge fallback. Switch to Settings/History during flight and ensure no stale-card arrival.
4. Save rapidly, navigate during flight, change themes, resize and switch tabs/windows: one initial light per action, no later ghost effects or other-window handoffs.
5. Confirm a real successful save increments counts/odometer and celebrates only after provider verification. Force a definitive failure: no success or counter increment; the persistent bottom-left Shelf failure indicator remains until its existing review action.
6. Select each destination preference, restart Chrome and verify both the setting and subsequent destination. With reduced motion, verify a brief static surface acknowledgment rather than travel.

These are remaining manual acceptance steps, not performed results.

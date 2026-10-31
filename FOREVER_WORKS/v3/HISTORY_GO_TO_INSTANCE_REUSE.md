# History GO TO instance reuse

30 October 2026, America/Chicago. Supersedes the opening behavior in
[the original implementation](HISTORY_GO_TO_IMPLEMENTATION.md). Exact receipt
validation, paginated object stat, row eligibility and preview renderer remain.

## Tab selection and handoff

Previously `history-navigation.js` always called tabs.create. It now queries
only the exact extension `beta/explorer.html` application URL, excluding unrelated
and discarded tabs. Candidates sort by current window, active state, then tab ID.
Each candidate must answer a credential-free 1.2-second session-storage probe
with authenticated frontend readiness; tab existence alone is insufficient.
The first ready candidate is activated without assigning its URL or reloading.
Another window is focused only if no suitable current-window candidate exists.
Only absence of a suitable responder leads to creating the existing Explorer
page with an opaque expiring request token. No credentials enter URLs.

The sender serializes selection and startup acknowledgement, not the entire
provider read. Native Web Locks additionally serialize creation across extension
pages when available; the local promise lane remains for environments without
that API. A new instance must accept its first request before the next queued
selection proceeds. Rapid requests in the same sender discard superseded opening
work. Tests cover reusing the newly opened context for the next request.

Existing tabs receive `historyNavigation:<token>` addressed to their tab ID.
The actual Explorer receiver registers through the shared navigation helper.
A 12-second acceptance wait is separate from a 95-second completion wait;
Explorer's own read timeout is 90 seconds. Acceptance occurs after initialization
and authentication checks; success/failure is returned via `historyResult:<token>`.
Waiters are installed before publishing intents. Probe/request/result keys are
cleaned up. A missing acknowledgement, closed tab, stale context or lost session
reports reload/retry guidance, without blindly opening a duplicate recovery tab.
A fresh GO TO can then select another usable context or create one if needed.

## Side Panel and Dashboard

Side Panel mode still calls the supported open API synchronously within the click
gesture. Opening an already-open panel is a request to reveal that same surface;
no tabs are queried, activated or created. Existing window-scoped panel Explorer
receives the intent and navigates in place. Browser left/right placement remains
untouched. The initial Shelf host still uses its established one-time same-panel
handoff to the Explorer document when no Explorer is loaded there; it does not
create a second panel or tab. Later requests stay in the running Explorer.
Failures offer the existing explicit New Tab fallback without changing preference.
Completion errors now also return to History rather than relying on receipt alone.

Source inspection finds no distinct Dashboard router inside the Beta application:
`beta/explorer.html` is the Dashboard and already contains File Explorer. GO TO
loads its exact existing account/bucket/folder, then selection scrolls the file
workspace into view; it does not reload the dashboard to achieve that transition.
The destination tools, URL tabs, preferences and unrelated DOM remain mounted.
A Legacy options page is not falsely treated as an equivalent Beta Explorer.

## Latest request and identity

Explorer retains request epochs, abort controllers, account/discovery epochs,
exact folder checks, real paginated stat, selected key, scrolling and existing
showPreview. A new request clears the old preview and aborts its reads. Superseded
navigation timers are cleared and ticket-checked, preventing an old deadline
from interrupting a new file. Old object/preview results cannot select a different
same-named file. Provider/account/bucket/final Keep Both key come only from the
successful saved-object receipt. Missing/deleted/unauthorized targets report failure.

Session intents and frontend receivers do not depend on an active MV3 worker.
Extension reload can clear session state; startup reports an expired handoff.
There is no claim of durable resume across browser restart or extension reload.
The underlying read may finish after abort when its adapter cannot cancel;
existing epoch checks prevent publication. No transfer retries are introduced.

## Evidence and remaining acceptance

[Focused evidence](reconstruction-evidence/focused.log) includes no-instance
creation, ready-tab reuse, deterministic window/active selection, no URL reload,
repeated requests, new-instance reuse, latest target, receiver errors, exact
lookup, delayed reads, missing/auth failures, Side Panel gesture/fallback and
failed History row DOM equivalence. The real UI/dispatcher menu tests are separate
from mocked Chrome and in-memory REST evidence. No History renderer or preview
renderer was rewritten.

Installed Chrome is unavailable (ENOENT, zero assertions); actual tab/panel
activation, side placement, Dashboard visual transition, Web Locks across real
extension contexts, screen-reader operation, real MV3 suspension and live R2
preview remain unverified. Native panel lifecycle and real multi-window races
require the approved browser retest. No live Cloudflare reads/writes were performed.

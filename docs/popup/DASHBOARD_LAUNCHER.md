# Dashboard launcher and delivery odometer — 0.5.22

Baseline main: `5f7066aacd9149ab2c189563b153e84423c65a03`.
The owner explicitly chose to replace the toolbar URL/folder form with a compact launcher.
`options.html` is now titled REDOWN Dashboard. The former optional folder popup is historical;
its saved preference is left intact, and the existing ingest contracts remain available to callers.
No Dashboard file operations or provider settings were removed.

The popup contains Go to Dashboard, the connection light, and one odometer. Red/unavailable
connection spells LOGIN! inside its six windows. Clicking the display or the red light opens
the existing Cloudflare OAuth flow. Checking/sign-in spells WAIT.. with a restrained pulse.
Successful account verification turns the light green; zero deliveries spells READY! inside
the same six windows. Otherwise it displays a minimum of six numeric digits (000001 onward),
expanding for larger totals. Numbers use rolling strips; reduced-motion preferences suppress
motion. The display has a meaningful accessible label, and the login state is a native button.
A current token alone does not produce green. Account access is not Worker or transfer health.
OAuth continues in the existing background-owned flow when the popup closes.

## Counting contract

`extension/transfer-counter.js` owns local `transferCounter` version1: an exact decimal string,
start timestamp and migration basis. No file names, URLs, credentials or clipboard data live in
this counter. Background `deliveryCount` exposes only this summary. The unified project's
subsystem map and Explorer source map point agents to this owner and the navigation smoke preset.

Initial migration counts successful cloud/local-upload entries still present in transferHistory,
then banks new counts independently of its fifty-entry cap. Existing discarded history cannot
be reconstructed: this is a lower bound for owners upgrading after prior use. It is local to
this browser profile and is lost if extension data is removed; it is not cloud-synchronized.
Counter value uses BigInt arithmetic and does not silently lose precision above 2^53.

Confirmed remote cloud saves and local-upload success observations count one each. GitHub
workflow dispatch strings and failed attempts do not count. Verified Explorer copy batches
increment only copied file receipts; Move increments only after exact source deletion confirmation.
Folder markers, conflicts, unsuccessful items and rename-only operations do not increment.
A partial batch retains its confirmed successes. Count updates never replay a transfer. Counter
storage failures on Explorer copy/move are nonfatal and log only a generic message.

Native browser downloads, archive-entry extraction and other uninstrumented paths are excluded;
no complete historical/lifetime usage certificate is claimed. Local-upload observations retain
the existing upload verification limitations. MV3 termination after a remote completion but before
the local counter commit can undercount; this feature is a local keepsake counter, not a durable
billing ledger or cross-provider transaction journal. Counter/history writes share one local patch
for recorded saves, with native Web Locks and a queue preventing concurrent increment loss.

## Verification boundaries

Existing tests for the explicitly removed popup form are retired. Backend exact-prefix, discovered
bucket validation and legacy path-capability regressions remain. New regressions exercise the
actual current launcher: LOGIN!, READY!, direct sign-in success/failure, reopening during OAuth,
digit carry, large counts, stale responses, migration, fifty-entry history trimming, concurrent
completions and failed persistence. Actual embedded Worker pipeline tests also assert delivery counts.
The login harness loads the added runtime script; its authorization assertions are preserved.
The literal message inventory adds deliveryCount and updates its reviewed exact count to37;
frozen catalog/debug/semantic evidence hashes remain unchanged.

See launcher-verification.json. Installed Chrome appearance, native keyboard/OAuth acceptance,
real profile history migration and provider transfers remain separate owner acceptance tasks.

# Live R2 write PROVIDER_ERROR — incident, acceptance UNPROVEN

Status: OPEN. Original cloud cause is not proven. No deployment or live write was performed in this investigation.

## Original owner evidence (verbatim from the mandatory assignment)

Owner's Windows 11 / Python 3.14.7 / Chrome REDOWN environment:
- `redown-client 0.5.0`, then connection-repair branch installed as `0.5.1`; extension was reported as `0.5.26` before repair.
- Native Messaging host registration succeeded with extension ID `mkadkgpekmkknfbniacdlmgikihjjepf`.
- Initial CLI test: `EXTENSION_DISCONNECTED`, six `BLOCKED`, zero dispatched.
- After connection-lifecycle fixes, CLI pairing succeeded; `connectionError: null`, `dispatchedOperations: 3`; `list: PASS`; eight-byte `hello.bin` upload `FAIL PROVIDER_ERROR`; directory marker (`mkdir`) `FAIL PROVIDER_ERROR`; dependent read/metadata/copy `BLOCKED UPLOAD_NOT_VERIFIED`; zero verified files and bytes.
- Operation IDs upload `f1447436-1a64-4798-a134-e86e61b0aa8c`, mkdir `876c6026-8bce-4786-abf7-74935cbca860`. Provider spans approximately 142.5 ms and 139.9 ms respectively. Both reached execution and failed; no provider-native reason survived in JSON.
- The existing `test-1-new` bucket contains a pre-existing `hello bucket.txt`, which must NOT be modified. No test-uploaded `hello.bin` was visible to the owner.
- **The cause of `PROVIDER_ERROR` is NOT YET KNOWN.** Outdated/misconfigured Worker and loss of exception codes across layers are hypotheses, not findings.
- Existing code uses `extension/lab-worker.mjs` to verify saved Worker identity, OAuth Worker settings/binding and deployed conditional-create capability before making a protected Worker request. Reads and listing do not exercise all the same write dependencies.
- Local simulated tests and source inspection alone do not establish deployed-Worker behavior.

Capture original commands, timestamps, reports, evidence IDs and snapshots in a permanent incident. Never rewrite past observations as a success after repair.


## Source-backed investigation

Upload and mkdir share `performUniversal`'s first `destination.stat` call. Before this
repair `extensionR2Adapter.stat` used HEAD on Cloudflare's OAuth Object API. The
current Cloudflare OpenAPI lists GET/PUT/DELETE, not HEAD, for that route. The adapter
collapsed every non-401/403/429 error into PROVIDER_ERROR and cancelled the body.
Thus an initial HTTP 400/405/5xx could stop BOTH operations before `laboratoryCreate`
or any Worker write request, and its original reason could never survive the journal.
The owner timings and absent visible object are consistent with this path but do not
prove which HTTP response occurred. An old Worker remains a separate unproven blocker.

Proven defects: use of an undocumented metadata method; loss of HTTP/native code and
stage at the adapter; error-only journal/projection and Python exception fields;
possible preflight errors mislabeled uncertain after coordinator beforeWrite.
Injected faults reproduce the loss and the repaired propagation. These are not proof
that the original live failure had precisely the injected cause.

## Repair

`extension/file-engine/adapters/extension-r2.mjs` now uses documented GET prefix-list
metadata, exact-key equality, bounded page size and normalized ETags. It never reads
the existing object's body or replaces conditional-create protection. Prefix races
remain protected by Worker `onlyIf`. Existing empty, Unicode and copy tests continue.

`diagnostics.mjs` and `diagnostic.schema.json` retain allowlisted HTTP status/numeric
native code, stage, causal envelopes, W3C context, mutation phase and retry safety.
Messages, URLs, headers, object keys, file contents and credentials are not copied.
The engine preserves them in failed jobs/evidence and the existing Atlas span keeps
its operation ID and error code. Python validates and retains them through framing
and JSON/Markdown. Invalid/unrecognized provenance is typed DIAGNOSTICS_LOST.

Doctor uses the authorized extension grant, never a separate Python cloud client.
It compares the old HEAD and GET routes, checks the new metadata route, saved profile,
OAuth Worker settings/subdomain, binding/jurisdiction, and authenticated capabilities.
The old HEAD is informational only after the repair. All probes are read-only,
including the existing capabilities action. Optional eight-byte smoke requires both
`--smoke` and separate extension write approval, with a fresh run namespace. No
cleanup, repair, provisioning, policy change or write retry is invoked.

## Remote observation boundary

The separate Cloudflare connector could read control-plane settings: HTTP 200,
STORAGE bound to test-1-new, global_fetch_strictly_public present, script modified
2026-10-25T02:08:52.446651Z. These are current connector observations, not the owner's
extension OAuth permissions. Read-only object-list probes returned HTTP 200 with an
empty result for their queried prefixes; they establish neither owner fixture state
nor object-write permission. A separate unauthenticated Worker-root GET was
unobservable (HTTPError). The connector could not produce the original extension's
HEAD response or authenticated capability action. No secret binding values were read
or printed. Existing `hello bucket.txt` was never written, deleted or downloaded;
its unchanged bytes remain NOT_TESTED.

## Decisive next evidence / causal conclusion

Run the documented Doctor on this branch in the OWNER'S existing authenticated
extension session. Its object.stat HEAD HTTP status/native code versus documented
metadata GET and its worker.settings/subdomain/capabilities stages decide whether
the undocumented HEAD route explains the first failure and identify any independent
Worker blocker. Preserve original reports alongside new ones. A fresh successful
smoke plus independent dashboard readback is still required for live closure.
Confidence: HIGH in the source-level information-loss and API-contract defects;
UNPROVEN in the original deployed failure's single cause. No live PASS is claimed.

## Regression, rollback and safety

`tests/diagnostic-evidence.test.mjs` exercises HTTP faults, no-write preflight,
conditional uncertainty, privacy and completeness. `tests/extension-native-e2e.test.mjs`
launches Python processes and checks code 10021/status 400/stage/mutation phase across
native framing, coordinator, Atlas, JSON and Markdown. Its provider is injected.
Python Doctor/schema tests cover unavailable sessions, old versions and write approval.
AAC adds a completeness scenario; full results are recorded in verification/reliability-write.

Preserved connection branch: 7321381031e901d3e843182bfd283fc9c48bf10c, merged as an
ancestor on the feature branch. Keep its pairing timers, listener-before-ready fix,
connection-error/dispatched counts and scrollable GUI. No automatic merge to main.
Rollback: reinstall 0.5.1 from that preserved branch for read-only use; do not revive
unsafe retries or treat rollback as cloud remediation. All cloud changes require
separate explicit owner authorization. See the handoff for final commit IDs/results.

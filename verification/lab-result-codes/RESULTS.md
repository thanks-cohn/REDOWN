# Local verification, Laboratory results v1

Branch: `fix/lab-result-codes`. Base: `2d06b4fbf897640b445ad4703742fce693007ef4`.
Linux, Python 3.12, Node 24.19.0. Python package 0.5.5; no deployment or live provider
requests. Historical uncertain namespace untouched. Tests use injected providers,
real local native frames/TCP/Python processes and DOM fixtures as stated below.

| Command / scope | Actual result |
| --- | --- |
| `PYTHONPATH=/tmp/redown-test-deps:clients/python npm run lab:test` | 43 Node tests pass; independent architecture schema passes six statuses/four negative controls. |
| `PYTHONPATH=clients/python python -m unittest discover -s clients/python/tests -v` | 50 tests run, 49 pass, one desktop layout test skipped because DISPLAY is unavailable. |
| `npm run providers:test` | Contract drift check and 15 provider tests pass. |
| `npm run reliability:check` | Syntax, registry, issue inventory and architecture stages pass; regression remains blocked: 499 pass / 9 fail. Seven known historical failures plus two reproduced on the untouched base. No full-suite green claim. |
| `git diff --check` | Pass. |

`jsonschema[format]==4.26.0` was installed in the temporary test-only directory
`/tmp/redown-test-deps` to run the existing independent schema checks. It is not a
new runtime dependency. `npm ci` used the repository lockfile.

## Focused evidence

- Ten codes are exercised across positive, lifecycle/uncertain and recovery tests.
  Acknowledgement without checkpoint evidence cannot earn LAB-003. Wrong metadata
  size cannot earn LAB-005. Exact 65,537-byte fixture exclusion remains visible.
- Same-run coordinator observations bound verified counts and bytes; cross-run,
  duplicate replay inflation, fabricated success, unknown fields, oversized reports,
  unsafe references and revocation are checked. Reporting invokes no provider calls
  and cannot add execution privileges.
- Native end-to-end test runs actual Python, authenticated loopback and native frames
  against the actual session/coordinator with an in-memory provider. It asserts a
  final Python summary reaches the extension callback, verified counters agree,
  acceptance stays INCOMPLETE, and failures retain safe canonical provenance.
- DOM test exercises sticky Results content, indeterminate preflight, safe copy and
  client-string/token exclusion. CSS handles reduced motion. This is not installed
  Chrome or visual acceptance; real rendering/animation remains an owner check.
- Existing tests cover pairing timeout/close/reject, Windows registration mocks,
  source changes, first GUI checkpoint, cancellation, >500 operations, atomic-create
  prerequisites, auth interruption, no mutation replay and crash reconciliation.
- JSON checkpoints remain the recovery authority. Source metadata/results remain
  local; copied summaries omit paths/payloads/credentials and show safe references.

The reliability runner labels two failures as new relative to its old baseline list:
`issue-inventory.test.mjs` / “explicit labels are recorded as partly addressed while
the omitted-item report stays open” and `options-debug-display.test.mjs` /
“successful provisioning refreshes destination editors and inventory before reporting
ready”. Both were separately reproduced by exporting the untouched base with
`git archive HEAD`, reusing installed dependencies and running those two test files
from the exported directory. Their assertions were not weakened and baseline records
were not rewritten. Seven other failures are preserved agent/debug/semantic evidence
and removed Nested drag-handle expectations. Full details are in the existing
reliability runner output; the committed summary JSON records names and counts.

## Not executed / not established

Owner-installed branch/package/extension identity; actual Windows GUI and Chrome
native messaging; the 2,221-file / 157,571,693-byte owner corpus; actual Worker
capabilities and >64 KiB transfer; fresh R2 Quick; dashboard navigation/token expiry
with a live run; original uncertain-write reconciliation; next Comprehensive run.
No original live incident is closed. No main merge, Worker update, deletion or
production change was performed.

Next: follow `docs/phase28/RESULT_CODES_CMD.md`, run read-only Doctor, then explicitly
approve a fresh test-1-new Quick namespace. Review original lifecycle/failure groups
and exact exclusions before moving to Comprehensive. Larger files remain unsupported.

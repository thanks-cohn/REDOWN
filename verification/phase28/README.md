# Phase 2.8 local verification

[Machine results and exact retained failure names](report.json),
[full reliability evidence](reliability.json),
[Windows/live runbook](../../docs/phase28/README.md).

| Command | Result |
| --- | --- |
| `npm run python:test` | 31 pass, 0 fail |
| `npm run lab:test` | 15 pass, 0 fail; independent architecture report schema positive/negative controls pass |
| `npm run providers:test` | 15 pass, 0 fail; generated provider contracts match |
| `node --test tests/phase28-laboratory.test.mjs tests/extension-lab-ui.test.mjs tests/cloudflare-login.test.mjs tests/cloudflare-session.test.mjs` | 30 pass, 0 fail |
| `npm run resources:test` | 7 pass, 0 fail |
| `npm run resources:schema` | schema compilation and published-schema checks pass; 3 tests pass |
| `npm run aac:test` | 18 pass, 0 fail |
| `npm run aac:schema` | published AAC schema checks pass |
| `npm run reliability:check` | syntax, current Explorer architecture, registry and issue inventory stages PASS; full regression 465 pass / 9 fail |
| Untouched main `npm test` from `git archive bea1952` | 460 pass / same 9 fail |
| `python -m pip install --force-reinstall ./clients/python` | wheel build/install 0.5.0 PASS |
| `python -m pip wheel --no-deps ./clients/python --wheel-dir work/phase28/wheels` | PASS |
| `python -m redown.lab complete --directory test-fixtures/architecture-samples --offline --depth Comprehensive --report work/phase28/delivery-offline.json` | exit 2 as documented, JSON/Markdown, 185 BLOCKED cases |
| Same CLI with unavailable extension, default Quick | exit 2, JSON/Markdown, 104 BLOCKED cases |
| `git diff --check` | PASS |

The nine failure names match the untouched base. The existing ratchet recognizes
seven as historical and still calls the other two “new”; the separate untouched-main
run reproduces both issue-inventory and provisioning failures. Its blocked release
state is preserved; this delivery does not certify a full release or fix that debt.
See both baseline and current logs. No frozen evidence hashes/assertions were changed.

The native integration launches real Python processes and tests the new CLI through
actual framing, loopback authentication, session approval, engine, evidence and Atlas,
using injected provider bytes. Separate embedded Worker tests exercise actual
conditional storage calls against an in-memory binding. They establish local
execution, not installed Chrome or live R2 success. The 510-write test verifies
bounded journal eviction and refusal to replay old idempotency history. The 501-file
Python test verifies comprehensive coverage includes duplicate-content files.

The Windows test invokes the real registration function with mocked winreg/whoami/
icacls and an interpreter path containing spaces. No actual Windows execution is
claimed. Tk import succeeds; actual GUI startup fails for lack of a display.
The current local authenticated REDOWN Chrome/native session is unavailable.

Initial missing-dependency failures are retained in `initial-*` logs. Installing the
package/npm dependencies and the required `jsonschema[format]==4.26.0` extras resolved
them. The exact selected runtime source hashes are in report.json. Code revisions
are source-bound there; the eventual published Git SHA is provided in the delivery
response because a commit cannot embed its own hash.

Committed logs normalize trailing whitespace only; original command output remains in work/phase28 during this session.

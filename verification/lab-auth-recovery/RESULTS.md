# Authentication recovery verification

Base main: `30e27a4`. Branch `fix/lab-auth-recovery`. Linux local source/fixtures;
no Windows/native Chrome or real Cloudflare acceptance. Dedicated provider test
namespace was NOT accessed. No deployment, cloud write, delete or policy change.

| Command | Result |
| --- | --- |
| `PYTHONPATH=clients/python python -m unittest discover -s clients/python/tests -v` | 46 tests: 45 pass, 1 GUI display skip |
| `npm run lab:test` | 40 JavaScript tests pass; generated session contract and architecture report schema pass (6 statuses, 4 negative controls) |
| `node --test tests/lab-auth-recovery.test.mjs tests/cloudflare-files.test.mjs` | 20 pass |
| `node --test tests/runtime-reliability.test.mjs tests/diagnostic-evidence.test.mjs` | 34 pass |
| `node --test tests/explorer-diagnostic-fixtures.test.mjs` | 20 pass |
| `npm run diagnostics:test` | Shared diagnostic compiler and 25 tests pass |
| `npm run providers:test` | 15 pass |
| `npm run resources:test` | 7 pass |
| `npm run aac:test` | 17 pass / 1 fail: independent invalid date in resource-schema-agreement; reproduced on unchanged main |
| `npm run reliability:check` | FAILED: 496 pass / 9 fail; syntax, current architecture, registry and issue-inventory stages pass |
| `git diff --check` | pass |

Captured logs have trailing whitespace normalized. Counts overlap; do not sum them. Full suite is NOT green. Seven failures match the
recorded regression baseline. Two extra failures (issue-inventory explicit labels;
options provisioning refresh) were reproduced on unchanged main using temporary
stash/restore in the same checkout. Baseline-extra.log contains that independent
check. Baseline-aac.log preserves the independent schema/date failure. No assertions
were disabled; frozen historical catalogs were not refreshed. Only the current
Explorer navigation model's Cloudflare API anchors were re-inspected and updated
for the changed source. Earlier architecture SOURCE_CHANGED failure is repaired.

The lab script initially could not import jsonschema. It was installed in the local
test environment and the script re-run successfully. The GUI layout test is skipped
because no desktop display exists. Python 0.5.4 avoids colliding with the owner's
reported 0.5.3; the checked-out main advertised 0.5.2.

New Python cases verify first GUI checkpoint, redacted missing-field diagnostics,
halt after read-side authentication loss, crash after upload reaches destination,
restart reconciliation using read/download only, matching SHA-256, conflicting
bytes, tampered destination rejection, and malformed write reply halting as
indeterminate. Existing native integration covers connection loss. New JS cases
verify serialized token rotation, preserved grant identity, missing refresh token,
invalid_grant without claiming revocation, transient refresh failure, no write
replay after HTTP 401, permission denial, local TTL/revoke, and ordinary dashboard
navigation without replacing credentials. These are simulated, not live proof.

Original incident cause remains unproven. Automatic mutation continuation across
new approvals remains unsupported. Read-only reconciliation provides restart
verification while preserving account/scope boundaries. The bug record contains
exact Windows installation and live acceptance commands.

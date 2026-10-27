# Acceptance investigation results

Baseline: cc7cab5. Local correction scope: asynchronous copy dispatch and bounded
large-file read-only reconciliation. No Cloudflare writes, deployments or cleanup.

- Python: 61 discovered, 60 pass, one skip. Initial attempt lacked PYTHONPATH and
  failed imports; rerun used `PYTHONPATH=clients/python` and passed.
- Streaming/corpus/native: 11 pass, no failures/skips. Includes all 12 payloads,
  exactly 209,715,200 bytes, independent Node and vendored SHA-256 checks and actual
  Python/TCP/native framing with injected provider. Generated manifest exactly
  matches the retained authoritative manifest. See streaming-local.log.
- New session-copy assertion initially exposed a fixture pagination defect: the
  fake provider ignored per_page=1. Fixture now sorts and honors the limit;
  production validation is unchanged. Copy destination and preserved source hashes pass.
- Reliability remains non-green; exact classification in local-summary.json.
  Its inventory recognizes seven frozen baseline failures and classifies three
  additional failures; the prior streaming milestone already records those three.
  No historical evidence hashes or assertions were rewritten.

Live source inspection found deployed streaming routes. Live R2 metadata shows
only the original additional-notes.txt in the 200 MiB run namespace, with no copy.
No completed staging objects were listed. Incomplete uploads are NOT VERIFIED.
See provider-readonly.json and the two docs/verification reports.

The original live checkpoint is unavailable here. No uncertain write was replayed.
Installed Windows/native, GUI, live hashes and complete CRUD acceptance remain open.

Laboratory: 43 Node tests pass. Architecture-report schema initially could not run
because jsonschema was absent; after installing pinned jsonschema[format]==4.26.0,
the independent schema command passes.

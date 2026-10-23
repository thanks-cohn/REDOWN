# Existing states and recovery boundaries

| Context | Actual distinctions | Persistence/recovery limit |
|---|---|---|
| OAuth | opening/verifying, completed, expired attempt, reconnectRequired, transient renewal failure | Attempt expiry differs from access-token expiry; shared lock/session guards; actual refresh grant unknown |
| Local upload | preflight yes/no/unknown, skipped, queued retry, PUT attempted, response checked, failed/uncertain | File queue lives in settings page; no restart recovery; cannot claim absent-check/PUT atomicity |
| Worker copy/move | source read, destination conflict/write, read-back, source/destination pre-delete checks, delete result, partial move | Pre-delete checks are not atomic multi-object transactions; timeout may mean write completed |
| Explorer status | pending/running neutral, completion green, failed red, mixed/partial amber, idle/cancel neutral | Ticket/generation guards prevent stale completions painting newer work |
| Download | request accepted, Chrome complete, interrupted, cancelled | Starting a download is not green completion; archive paths without terminal observer remain unconfirmed |
| Public URL | configured/disabled/pending/unknown; confirmed enable and settings read-back | Constructed/configured URL remains object-access-unverified |
| Diagnostics | available/partial/unavailable plus native namespace codes | Imported snapshots and HMAC identities cannot be joined across independent scopes by string equality |
| RFIS/history | capped transfer history and opt-in observations/export | No complete transactional transfer journal, durable content identity or complete archive guarantee |

Use extension/explorer-status.js, runtime-diagnostics.js, explorer-diagnostics.js, background.js and options.js at the cited revision for exact handlers. This is documentation of existing contexts, not a new universal job schema or state engine.

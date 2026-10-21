# Scoped reliability incidents

These records supplement, and do not rewrite, the frozen debug corpus. Status is **local regression verified; installed/live closure pending** for each incident.

| ID | Reproduction / cause | Correction | Evidence and residual boundary |
| --- | --- | --- | --- |
| REL-001 | A request rejected under an old token could obtain a new login's token and replay against old account paths | New login session generation; check before replay and before returning; cancel searches on generation change | Two expected pre-fix auth failures in reproductions.txt; current runtime/session fixtures pass; no live account-switch observation |
| REL-002 | Sequential whole-bucket search withheld all results, silently capped top 200, and failed inventory looked empty | Pull page sessions, max two reads, stable append results, visible scope/progress/errors/caps, stale/cancel guards; account/object/bucket malformed shapes reject | Engine + actual UI VM tests; no installed workload latency or durable resume proof |
| REL-003 | Successful HTML/malformed listing response parsed to `{}` and appeared empty | Require object/account/bucket listing shape | Actual listObjectsPage mock regression; live HTML fault not performed |
| REL-004 | Local queue repeated failures indefinitely; unknown preflight could write and ambiguous transport failures could replay | Confirmed-negative preflight, max four failed checks, stop after attempted-write error; uncertain size observations remain unconfirmed | Actual uploadLocalFiles VM regression with accelerated time; direct PUT absence-check race and durable recovery still block release |
| REL-005 | Transient read 429 returned without recovery | One safe-read retry for bounded Retry-After/jitter; long waits returned unchanged; no transient write replay | Mock HTTP regression; full provider rate-limit/session behavior unknown |

No incident claims live R2 bytes, real installed workflow completion or store-distributed verification. General remote-ingest idempotency is not solved by REL-004; manual retry after an unknown remote commit can still create another numbered copy. Do not infer fixed from the existence of code.

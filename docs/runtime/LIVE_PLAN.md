# Scoped live-session and workflow plan (not executed)

State: blocked / no live-resource authorization or configured credentials in this managed environment. No Cloudflare reads, writes, deployments or cleanup were performed. Connected documentation retrieval failed with internal tool error; no current Cloudflare or Chrome policy claims are inferred from memory. Historical official links in PRE_SUBMISSION_CHECKLIST remain review prompts, not a new policy review.

Before execution, name an isolated browser profile, candidate ZIP SHA-256, exact account/bucket and unique run prefix, expected Worker revision/binding STORAGE, maximum fixture bytes/requests/storage budget, owner and cleanup policy. Explicitly authorize each selected live write/provision/delete probe. Missing authorization is blocked, not skipped-as-pass. Never use production objects, copy raw credentials into evidence or delete originals. A programmatic cloud execution adapter is not implemented; this is an operator-run plan.

| Scenario | Declared remote effects | Assertions / evidence required |
| --- | --- | --- |
| Fresh OAuth and concurrent renewal | Consent, token exchange/refresh; account/bucket listing reads | Current registered scopes, actual refresh-token presence only, expiry/skew, revoked grant, denied consent, multiple settings tabs, generation boundaries |
| Session elapsed/soak | Controlled benign listing reads at login, expiry+margin, idle return and next day | Real start/end UTC and measured elapsed duration, suspension/browser restart; no fake-clock duration substitutions |
| Progressive search | Dedicated benign multi-page fixture writes only if authorized; listing reads | Early-match latency, slow/error bucket partials, duplicate full keys, cancellation/replacement, actual account ownership, navigation/preview across pages |
| Direct remote ingest | Source fixture fetch + R2 writes via actual embedded Worker | Known/unknown length, zero bytes, prefixes, type, sequential/concurrent collisions; response key versus independent HEAD/read/hash observations |
| Browser-assisted/local | Source bytes pass through browser; direct API or Worker R2 writes | Explicit existing-object skip, unknown preflight refusal, interrupted request unconfirmed; no automatic replay after ambiguous write; size/hash independently verified |
| GitHub path | Workflow installation/dispatch/commit on named disposable repository only | Dispatch accepted != committed; actual resulting bytes and final path; requires separate scope authorization |
| Repair compatibility | Worker provision/upgrade only when explicitly selected | Actual script revision, STORAGE binding, private access; separate from passive snapshot/listing |
| Cleanup | Delete only exact objects created by this authorized run | Run-owned resource list; independent confirmation; preserve any preexisting object |

Installed workflow matrix still required: fresh/update profile migration, menu creation/reorder keyboard/drag, exact destination receipt/history click without scroll/lightbox, Explorer pagination/refresh/account switch, preview expanded/lightbox Escape/arrows/loading and object URL cleanup, denied/offline/malformed states, settings persistence and empty/invalid storage. Test on modest Windows and 1366x768/320px, keyboard/focus/contrast/reduced motion. Define/measure responsiveness budgets using realistic lists; do not infer them from collector microbenchmarks.

Evidence records must include scope, source commit/tree digest, extension version, package SHA-256, browser/OS, scenario, times/real elapsed duration, Worker revision/capability, assertion outcomes and sanitized incident links. A UI notification, HTTP success, returned key, HEAD result, full read and byte/hash verification stay separate fields. Beta/RC/public decisions remain blocked until applicable gates close; there is no readiness percentage.

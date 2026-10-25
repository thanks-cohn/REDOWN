# Phase 2.7 implementation and verification

Baseline `dc17dfa` (latest main at checkout); feature branch `feat/phase27-extension-python-lab`. **Read-only connection implemented; complete assignment acceptance remains incomplete.** No merge or production authorization change.

## Actual architecture and reuse

Inspection covered the extension OAuth/token refresh and service worker; canonical engine, provider contracts and Atlas; scoped owner sessions and Python SDK; old local forwarding helper; Phase 2.6 implementation and verification; AAC and current-state Forever Works records. Existing local helper `local/bridge.mjs` forwards ingest URLs to a separately credentialed Worker and has no suitable pairing or canonical execution connection. The Windows native scaffold references an absent source file. Neither can securely connect Python to current extension authorization.

A new **transport**, rather than a second filesystem engine, connects Python to an extension-owned page via Chrome Native Messaging:

- Chrome launches `redown.native_host`, allowlisted for the exact installed REDOWN ID. The helper listens on **127.0.0.1 only**, on an ephemeral port. Every connection authenticates with a fresh random 256-bit local credential discovered through a protected per-user file. No manual secret entry; the key is never a Cloudflare credential. Before authentication the timeout is five seconds; at most eight concurrent connections are accepted.
- Python receives a per-connection random code. REDOWN shows the self-declared client name and matching code, with explicit approve/reject controls. Approval grants list/metadata/read for the currently selected bucket roots, for at most five minutes and 100 executions. There is no implicit approval, shared global journal access, script execution, cloud-token export or relay filesystem RPC.
- The extension page owns `authorizeLab`, the actual `createFileEngine`, its private in-memory store and Atlas. The existing scoped-session implementation was extracted unchanged into a browser-safe module. Node keeps its Ajv validators; extension validators are statically generated from the exact same 0.2, 0.3 and session schemas, with a reproducible drift check and no runtime code generation. Existing stdio consumers retain their API and behavior.
- `extensionR2Adapter` uses **the unchanged shared `RedownCloudflareApi.request`**. It supports OAuth REST listing/pagination, HEAD metadata and bounded GET reads. Provider handling stays inside the JavaScript adapter; Python contains no Cloudflare request or authentication implementation. Discovery reuses existing `cfAccounts`/`cfBuckets` messages and never calls preparation/deployment handlers.
- Every execution returns a canonical operation ID, receipt and session-owned evidence/Atlas queries. Revocation, grant expiry and session changes prevent further access, including to previous job evidence. A revocation during an in-flight read suppresses its eventual response; already-sent provider requests cannot be undone.

The library includes `ExtensionClient`, `redown --extension`, a Tkinter desktop laboratory, conformance runner and JSON/Markdown export. Mode selection reserves `direct-s3` with an explicit unsupported error. Windows per-user registration and Linux Google Chrome registration are implemented; Windows native host/ACL behavior and real Chrome launch are untested here.

## Security boundaries and limitations

Native Messaging origin allowlisting is not cryptographic application identity. Another program under the same OS user can read local authorization material; names are self-declared. Users must compare connection codes. The helper does not claim to protect against a compromised OS account, Chrome process or modified extension. No cloud credentials cross into the helper/Python.

Grants exist only while the owning laboratory page and local connection remain alive. Multiple tabs can host separate independently approved sessions; the last-started host is discovered for new clients. A crash can leave a stale discovery record, but authentication rotates when the helper restarts. No session is silently resumed or replayed. Atlas/journal data is currently in memory, not durable restart recovery.

**Extension mode mutation operations remain unsupported.** OAuth access does not establish safe atomic creation/deletion semantics. The new adapter does not route through the old overwrite-capable Explorer handlers, deploy a temporary Worker, reuse a deleted lab Worker or weaken canonical authorization. Upload/copy/mkdir/move/rename/delete must be added later through verified conditional primitives and separately approved scopes. Cancellation execution and reconcile are denied in this read-only grant. The CLI reports those limits instead of awarding passing mutation coverage.

Reads are at most **64 KiB**; frame size is 512 KiB with an additional extension response budget. Listings are at most 100 objects per request. Range reads, non-default jurisdiction buckets, macOS registration, streamed/multipart transfers and durable connection recovery are unsupported. Expired provider sessions and insufficient object-read permissions remain classified failures, not success inferred from login.

## Verification performed

| Command / scope | Observed result |
| --- | --- |
| `npm run lab:test` | 8/8 pass: approval UI, matching scopes, rejection/revocation, expiry, session change, in-flight revocation, invalid/unauthorized RPC, classified permission errors, bounded/truncated reads, pagination, exact key escaping, Python/native round trip |
| Python SDK tests (`python -m unittest discover -s clients/python/tests -v`) | 10/10 pass: prior SDK compatibility, timeout/no replay, malformed/oversized output, authenticated listener, rejection, framing, disconnect, reserved-mode refusal and installer import |
| `node --test tests/file-agent-session.test.mjs tests/file-engine-authority.test.mjs` | 6/6 pass |
| `npm run providers:test` | 15/15 pass, including existing provider/schema conformance |
| `python -m compileall -q clients/python/redown` | pass after fixing installer string syntax caught during review |
| `npm run reliability:check` final | See `verification/phase27/status.json` for exact final count; full suite retains nine previously recorded failures and is not green. Syntax, architecture, API registry and issue inventory stages pass. |
| `git diff --check` | pass |

The external-process integration actually launches two Python processes, traverses the authenticated TCP listener and native framing, then executes the real session/coordinator/adapter with an **injected provider fixture**. It verifies bytes/downloads, metadata, denial and Atlas correlation. Its configured `realProvider` receipt is adapter metadata; that fixture receipt is expressly **not live Cloudflare evidence**. The test labels, comments and report preserve this distinction. The extension approval UI uses jsdom rather than installed Chrome. No Windows/desktop visual acceptance is asserted.

The first full regression introduced an Explorer current-source freshness failure from the added Settings link. Its report is retained. `scripts/explorer-architecture.mjs --write` changed only seven current `options.html` digest references after inspecting that exact additive link. No frozen historical catalog/debug/semantic hashes were changed. Final full regression retains the same seven historical test failures and the two additional issue-inventory/provisioning failures already recorded in `verification/phase26/regression.json`.

## Exact live acceptance blocker

The available computer-use browser inventory was one cloud Chrome surface with **no tabs**. Access to `chrome://extensions/` was rejected by browser URL policy (only HTTP/HTTPS allowed), explicitly prohibiting workarounds. There was no accessible installed REDOWN/native-host session or authenticated extension pairing surface. Consequently, **zero live Cloudflare operations were attempted or certified**. No cloud tokens were obtained through another connector and no separate Worker was treated as extension proof.

The remaining central acceptance step is to install/update this branch in an approved local Chrome environment, register the helper, approve the matching code, and run conformance against a known authorized test object with an independently known SHA-256. Preserve JSON/Markdown reports and manually verify rejection/revocation in that real environment. [Windows execution instructions](README.md) provide exact commands. Full mutation conformance, live permission/lifecycle faults, durable recovery, installed UI and Windows validation remain open.

## Preservation and reproduction

`FOREVER_WORKS/PHASE27.md` is an additive current-source supplement, not invented accepted intent or full AAC certification. New tests are included in CI and the portable syntax target list. `verification/phase27/` retains local command results, initial failures, final status and source hashes. The old production authentication and forwarding helper are unchanged.

## One-click architecture implementation

Current GUI adds a normal directory picker, visible configurable scan limits,
selection preview, authorized multi-bucket run button, queued progress, cooperative
cancel and exact JSON copy/save plus Markdown. Advanced requests and the original
read-only conformance command are retained. New reusable Python modules inventory
local sources and coordinate canonical read-only cases; there is no Python S3 client.
The actual extension provider adapter now rejects oversized/invalid declared lengths
before consuming a response body, retaining bounded unknown-length streaming.

Reports have stable schema 1.0.0, six distinct uppercase statuses, hashed bucket/job
identifiers, source hashes/relative paths, receipt/Atlas correlation, no mutation
cleanup and overall INCOMPLETE. The CLI checkpoints each completed case atomically;
GUI snapshots make partial results copyable. No session resume or replay is claimed.
See [runbook](ONE_CLICK_RUNBOOK.md) for exact limitations and
[verification](../../verification/phase27/architecture/README.md) for observed results.

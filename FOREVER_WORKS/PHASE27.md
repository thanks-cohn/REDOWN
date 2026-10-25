# Phase 2.7 current-source supplement — not accepted intent or certification

Owner directive: external Python must request user approval and use the extension's existing authorization through the canonical Universal API, without receiving cloud credentials. This supplement records implementation and unresolved obligations; historical manifests and source hashes are preserved.

Connection chain: `clients/python/redown/extension.py` → authenticated 127.0.0.1 native relay (`native_host.py`) → Chrome native port (`extension/laboratory.mjs`) → shared `extension/file-engine/scoped-session.mjs` → canonical `engine.mjs` and Resource Atlas → `adapters/extension-r2.mjs` → unchanged `RedownCloudflareApi.request` OAuth handling.

`agent/files/api.mjs` delegates to the same extracted session facade with its original Ajv validators. The extension uses schema-generated static validators, avoiding runtime evaluation under extension CSP. Rebuild/check with `scripts/phase27/compile-session.mjs`. API/session versions remain distinct from provider contracts and Forever Works versions. No new accepted canonical Forever entity IDs are invented.

Preserve: explicit approval; selected-bucket and operation scope; five-minute revocable grants; session-change invalidation; per-session job ownership; no provider credentials returned; no arbitrary code/filesystem RPC; authenticated local-only listener; bounded framing; no automatic replay; canonical operation/Atlas correlation; old stdio clients and versioned requests. A replacement transport must preserve these behaviors and separately verify its platform trust boundary.

Known gaps: extension mode is read-only, 64 KiB reads, no general mutation/conditional-create bridge, no durable connection journal/recovery, no jurisdictional buckets or macOS registration. The old forwarding bridge remains separate and unchanged. Native Messaging's origin allowlist does not prove the identity of another same-user local process. Names are self-declared; users compare connection codes. Evidence from the injected provider is not real R2 acceptance.

Verification, installation, failure states and reproducible commands: [Phase 2.7](../docs/phase27/README.md), [implementation](../docs/phase27/IMPLEMENTATION.md), `verification/phase27/`. AAC full certification is not changed. Installed browser, Windows and live Cloudflare acceptance remain blocked/untested, rather than inherited from prior Phase 2.6 Worker runs.

## Connection follow-up

Owner requested longer sessions after the first Windows install. Current approval defaults to one hour with explicit four/eight-hour options; revocation and session-change boundaries remain. The initial five-minute descriptions above are historical. The authenticated host idle cutoff was incorrectly 130 seconds; it now permits eight hours of idle time, while the extension separately enforces each grant. Unauthenticated handshake timeout and per-request deadlines remain bounded. The Python GUI probes connection health every 30 seconds and displays expiry/actionable failure guidance. Chrome native-host errors are visible in the extension status. No installed-Windows/live-cloud success is inferred from these source fixes.

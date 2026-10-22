# Current readiness: beta, release candidate and public launch blocked

This change delivers working local diagnostics, a progressive search path and scoped reliability fixes. It does **not** finish the premium reliability request. Read [implementation/stages](IMPLEMENTATION.md), [runtime API](API.md), [live plan](LIVE_PLAN.md), [machine gates](release-gates.json), and [test classification](verification/failure-classification.json).

Current evidence boundaries:

- Mock/VM/DOM: auth renewal/login, generation guard, rate-limit recovery, progressive page/UI races, malformed listing, upload uncertainty and collision behavior. Full suite results retained, including failures.
- Local integration: actual schemas/CLI/allowlist ZIP integrity and bounded collector microbenchmark. This does not establish browser/cloud behavior.
- Installed Chrome: executable Chromium 154.0.8037.57 was launched, but administrator policy explicitly prohibits unpacked extension loading. **Zero extension assertions executed.** This is blocked evidence, not an installed-extension pass.
- Live Cloudflare: not run; no scoped authorization, credentials or disposable fixtures. No successful R2 HEAD/read/hash or deployed Worker evidence.
- Exact package: deterministic audit ZIP with per-file SHA-256 inventory. Default release build blocks license drift; explicit audit-only build preserves the differing licenses. Extracted-package installation blocked by same administrator policy. No CRX or store-distributed installation.

High-priority blockers: installed workflow matrix, real-session expiry/next-day soak, direct local-upload race prevention, remote ingest idempotency/ambiguous retry, ordinary durable transfer recovery, actual Worker/R2 object-truth tests, root versus bundled license drift, and six preserved historical evidence assertions. Current diagnostics lacks durable traces, complete cross-context spans and transfer/preview adapters; search lacks durable resume and in-flight network abort. Search only covers loaded/authorized target inventory and explicit bounded result limits.

Store comparison: inspected `origin/chrome-web-store` against `origin/main`; store-specific packager, license, manifest and UI differences exist. No branch reset/synchronization performed. Main now reuses the store packager's explicit allowlist approach with additional runtime scripts and an audit-only drift override; original notices remain byte-preserved. PRE_SUBMISSION_CHECKLIST remains historical, supplemented here rather than marked complete. Publisher identity, privacy/support URLs, third-party license review, permission minimization and current official policy review remain pending. Do not submit this audit artifact.

Permissions retained: contextMenus (native destinations), notifications (completion/failure), storage (profiles/auth/history/settings/RFIS), identity and webNavigation (OAuth callback), alarms (OAuth timeout and gallery queue), downloads (private download path), scripting (explicit gallery capture). Host callers remain Cloudflare API/OAuth/Workers, GitHub and shipped site capture. This source inventory is not proof that every permission is minimal or store-approved. Diagnostics adds no permission/host/remote receiver. Existing source URLs, profile names and history still have their preexisting retention/privacy obligations; the new support bundle excludes them.

Next smallest step: run the exact extracted audit ZIP harness in an administrator-approved testing environment. Resolve license drift with its owner before building a release candidate. Then authorize a disposable Cloudflare prefix under the runnable live plan; never test ordinary user objects. Keep each gate blocked until its evidence actually exists.

Scoped official documentation review on 21 October 2026: [service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) confirms global state is lost on shutdown and warns against indefinite keepalive; the pull protocol therefore reports interruption rather than claiming durable recovery. [Prepare an extension](https://developer.chrome.com/docs/webstore/prepare) requires testing, manifest review, a ZIP with manifest at root and a higher version for a subsequent store upload. The audit package retains 0.5.13 and is not an upload candidate. Retrieved-document hashes are recorded in verification/official-references.json. This review does not cover the complete current policy/privacy/licensing checklist or represent Google approval.

22 October three-stage follow-up: [actual report](../THREE_STAGE_REPAIR_REPORT.md) and
[live acceptance checklist](THREE_STAGE_LIVE_CHECKLIST.md). Normal-flow bucket containment,
read-only contextual URL discovery and Worker v5 transfer safeguards have local evidence.
Final suite:226 tests,219 pass,seven existing failures. Ordinary Chromium UI fixtures use
mocked extension/Cloudflare/Downloads; real background+Worker integration uses in-memory R2.
Installed/live gates remain open. Source version checks do not make R2 deletion atomic.

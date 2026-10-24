# Guided help and agent-executable acceptance

Owner direction: make local and remote storage feel like one dependable file browser, with interchangeable cloud connections and familiar Copy/Cut/Paste/Move/Rename/Delete/List/Search/Preview/Upload/Download semantics. Future authorized cross-computer use is a separate transport and device-identity requirement. The user should be able to expect ordinary laptop-like workflows. Competitor parity or superiority requires published real-workflow evidence; neither the guide nor simulated results establish it.

This increment adds an evolving guidance/testing layer to the **Beta Explorer**. The existing production Explorer and operational cloud routes remain unchanged. It delivers working guidance, unattended simulation acceptance and explicit readiness gaps; it does not add real providers, a local filesystem adapter, binary transfers or cross-computer transport.

## Guidance and test cases share stable feature identities

Open **Walkthrough** in Beta Explorer:

- **First 5 · Get started** introduces the sandbox, source/destination selectors, navigation/search, selection/views and preview/help. It is opt-in and can later be reused as onboarding. Reading a step is recorded as `read`, never as a passed file operation.
- **Full feature check** covers 34 stable steps, including all currently exposed Beta controls and recovery/comparison limits. An operator can confirm, report an issue, skip or mark a control unavailable.
- **Help with a feature** opens any step directly. Pause, minimize, Back, Escape and explicit Resume are supported. A minimized guide still observes actions. Beta off hides the guide and blocks its console controls while retaining progress.
- **Run isolated automated checks** runs twelve deterministic core checks in fresh memory, without touching the current UI database, profiles, files, transfer history or cloud credentials.

Content is in `extension/beta-walkthrough-steps.mjs`; renderer/progress/reporting is in `beta-walkthrough.mjs`; `beta-explorer.mjs` emits scoped action/outcome events from actual execution. Targets are existing stable control IDs/selectors. Adding a feature requires updating the content, execution observations, automated recipe and independent expected outcome together. Retain step IDs; change `GUIDE_VERSION` with an explicit progress migration when semantics change. Unknown progress versions are not silently resumed.

The nonmodal popup highlights its control and allows the underlying interface to remain operable. It opens relevant disclosures, but never clicks Copy/Move/Delete, accepts a confirmation or seeds files on the user's behalf. A missing/invisible control is explicitly unavailable; pagination is not a pass merely because a small folder has no Next button. New-user help and detailed diagnostics remain separate choices.

Progress is a bounded, versioned `localStorage` record under `redown.phase2.beta.walkthrough.v1`. It is not an operation journal. Storage refusal/full conditions leave guidance working in memory and report the save failure. Imported progress is whitelisted; unknown fields, content, arbitrary names/tokens and malformed evidence are discarded. Starting a new guide replaces its current saved session; export first to retain an older report. Closing/hiding the guide does not cancel or replay jobs. No automatic resumption or first-run popup is enabled.

## Evidence semantics

`beta:guide-event` is a local UI observation channel, not an authenticated provider/audit transport. Matching events after the current step starts can enable Next. Reports distinguish:

| Record | Meaning |
|---|---|
| read | Guidance viewed; no functional assertion |
| observed_action | Matching action/engine outcome observed; visible/provider outcome still requires verification |
| user_confirmed | Operator reported success; not independently measured |
| reported_issue | Operator reported a problem |
| skipped / unavailable | Not verified |

Event evidence contains only whitelisted operation IDs, operation/state/error classifications and timestamps. No file contents, URLs, tokens, account names or object paths are exported by the guide. User confirmations cannot become automated passes. Automatic test results are separate reports with assertion evidence and an explicit simulation scope. Browser console messages and successful API responses alone do not establish byte integrity; critical transfer tests compare read-back data and source preservation as well.

## Agent / browser-console entrance

The Beta page installs a narrow, discoverable testing port, `window.RedownBetaQA`. It is not a second project-wide diagnostics server or an authorization grant. The existing `agent/diagnostics` gateway keeps issue/evidence ownership; registering this scoped testing port with that gateway is future integration work.

```js
RedownBetaQA.describe()                       // immutable copies: methods, steps, targets, readiness gaps
await RedownBetaQA.runSelfTest()              // isolated core simulation only; never the user's database
RedownBetaQA.getLastSelfTest()                // structured result; console logs the same scoped proof
RedownBetaQA.startGuide('help', 'paste')       // presentation only
RedownBetaQA.getWalkthroughReport()           // user/observed guide results
await RedownBetaQA.inspectOperation('uuid')   // read-only stages, provider IDs, redacted identities, verification strength
```

Read-only methods never prepare, repair, deploy or execute a file operation. `inspectOperation` rejects malformed IDs and is Beta gated; raw request payload/content is omitted. Tests can still be inspected from the existing UI. No arbitrary executor, adapter, script, network URL or production connection can be supplied to the self-test. Repeated concurrent self-test requests share one in-flight run. Destroyed controllers remove their page testing port.

## Unattended acceptance: no user clicking required

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run beta:selftest
# Provide a Playwright runtime and ordinary Chromium; no extension-install policy bypass:
CODEX_PRIMARY_RUNTIME_NODE_MODULES=/path/to/node_modules BETA_CHROMIUM_PATH=/path/to/chromium npm run beta:acceptance
node --test tests/phase2-engine.test.mjs tests/phase2-beta.test.mjs tests/phase2-walkthrough.test.mjs
npm run reliability:check
```

`beta:selftest` runs the actual shared contract/coordinator with isolated fake stores. It records Node/platform, commit and source digests plus assertions/receipts in `work/beta-walkthrough/core.json`. Cases cover complete pagination, upload/read-back SHA-256, cross-provider copy and source preservation, move, conflict immutability, recursive copy, rename, exact-target delete, cross-coordinator idempotency, journal reopening/read-only inspection, blocked real-provider routing and destructive confirmation.

`beta:acceptance` starts an ordinary localhost page in a **fresh browser context**, mocking only the Chrome Beta setting. It drives actual UI controls and native dialogs, runs all 34 guide feature cases, captures operation IDs, checks visible outcomes, and directly reads back the dedicated fake store to assert data/content and SHA-256 equality. It tests cancelled then confirmed deletion, preserves an unrelated object, seeds 55 disposable entries through the engine solely in that fresh context, and verifies 50 + 5 UI pagination. Reload adds only a listing rather than replaying a mutation. It verifies guide resume and Beta rollback. Popup bounds and horizontal overflow are checked at 1366/768/390 widths, with screenshots. The harness is not an attached user session and cannot invoke a real provider.

Reports live in `work/beta-walkthrough/acceptance.json`, `core.json` and viewport screenshots. Failed assertions produce a nonzero exit. Seed operations and observed browser tests remain distinguishable. Automated results do not come from clicking “Works for me.” The first browser run identified a harness-only comparison-disclosure toggle error; the guide already opens that disclosure. The assertion was corrected to verify the open/readable state rather than close it. The failure and correction are not a repaired customer incident.

## Current verification and release gates

See `verification/walkthrough/` for retained exact focused, core and browser reports plus screenshots, and the delivery report for the full-suite count. Current unattended scope is **real browser UI + shared engine + local IndexedDB + deterministic fake providers**. It is not an installed-extension or live-R2/Drive pass. The browser checks all 34 currently described features, not every product capability that must eventually exist.

Machine-readable readiness in `file-engine/acceptance.mjs` and `RedownBetaQA.describe()` always retains `releaseReady:false`: real R2 and a second real adapter, local filesystem permission model, binary upload/download and media previews, durable network/restart recovery, installed-extension security/accessibility/performance, and competitor workflow benchmarks remain release requirements. Cross-computer transfer is future work with explicit device authorization. This is how missing capabilities stay visible instead of disappearing behind a green walkthrough.

Promotion remains owner-approved and gated by the original Phase 2 directive. Live/provider mutation needs separately authorized dedicated test resources, matching adapter/capability tests and actual provider read-back evidence. No success here authorizes cloud access, replaces legacy or claims to beat rclone/SaveAnywhere.

### Recorded acceptance for this increment

**20 focused Node tests, 12 core checks and 34 browser feature cases pass. Full suite: 395 tests, 385 pass, the same 10 pre-existing failures, no skips.** Syntax/registry/issue-inventory pass; the existing Explorer architecture check remains stale. Exact scope, source digests and operation IDs: `verification/walkthrough/browser.json`, `core.json`, `reliability.json`; focused output: `focused.log`; actual guide appearance: `desktop.jpg`, `mobile.jpg`. Package remains audit-only with the existing license/release blocker.

The conflict oracle explicitly requires a completed first copy followed by a failed second copy with **CONFLICT**, retained source and unchanged destination. A self-target validation error cannot satisfy it. Export acceptance parses the actual browser download. These assertions prevent superficially successful clicks or generic error displays from being counted as proof of the intended workflow.

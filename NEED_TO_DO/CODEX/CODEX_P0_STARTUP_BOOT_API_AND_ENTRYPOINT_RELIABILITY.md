# CODEX P0 — REDOWN STARTUP BOOT API, ENTRYPOINT SELF-HEALING, AND ROOT-CAUSE REPAIR

**Repository:** `thanks-cohn/REDOWN`  
**Mandatory branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P0 — the product is unusable if its toolbar icon or native right-click entrypoint stops functioning.  
**Execution:** Inspect → reproduce → trace and prove failure → implement → test/fault-inject → document → commit → push.  
**Status:** OWNER IMPLEMENTATION REQUEST, NOT COMPLETED WORK OR A CLAIM OF VERIFIED ROOT CAUSE.

**THIS IS A PRODUCTION IMPLEMENTATION REQUEST. DO NOT STOP AT AN AUDIT, PROPOSAL, DEBUG LOG, MOCK, OR DOCUMENTATION-ONLY CHANGE.**

## 1. Owner's observed incident and required result

Across new and existing Chrome profiles, the REDOWN toolbar icon has sometimes failed to open anything, and the native right-click `REDOWN → Cloudflare` save entry has sometimes been missing or sent the user to Explorer/Home instead of saving. The problems persisted through some ordinary page refreshes, then abruptly disappeared after a later extension update/reload, **without consciously clearing browsing cache or reinstalling**. This recurrence is unacceptable.

**We do not yet know why.** A source edit to post-login tab behavior was temporally associated with restored functionality, but it is NOT proof that login code fixed toolbar/menu initialization. A service-worker restart, registration recovery, stale extension contexts, and profile-local state differences are hypotheses. **Reproduce and separate them empirically.**

The owner's requirement is simple:

> **REDOWN MUST ALWAYS HAVE A USABLE ENTRYPOINT.** Clicking its Chrome toolbar icon must open Shelf (or the supported attached popup fallback where Shelf cannot open), and REDOWN must register a usable native right-click root plus the correct authorized save actions. The app must tell us precisely why initialization is incomplete and offer bounded safe recovery, rather than mysteriously working after reloading.

BOOT is the **single health/recovery coordinator over REDOWN's EXISTING mechanisms**. It must NOT be a second independent startup engine, menu writer, Shelf opener, or Cloudflare login engine.

## 2. Mandatory preliminary reading

1. `AGENTS.md` and the current authoritative engineering/reliability handoffs; follow mandatory diagnostics/reliability verification commands when an execution environment supports them.
2. `extension/entry-bootstrap.js`: synchronous Chrome toolbar listener; Shelf-first and attached popup recovery; `entryEvidence`; worker-load, install/startup handling.
3. `extension/background.js`: `requestMenuRebuild`, `ensureMenuAccess`, `rebuildMenus`, `buildMenus`, `nativeMenuIds`/`nativeMenuPlan`, `rightClickMenuStatus`, `menuApplicationKey`, `chrome.contextMenus.onClicked`, `openRedownHome`, `resolveActiveRightClick`, Cloudflare activation and storage changes.
4. `extension/cloudflare-auth.js`, `extension/manifest.json`, `extension/shelf.js`, `extension/popup.js`, and `extension/right-click-current.js`; their startup, auth, routing, UI/readiness boundaries and current tests.
5. `NEED_TO_DO/CODEX/logic-tables.md` and `Explanation.md`, especially the canonical provider-local default SAVE versus REDOWN Explorer dashboard navigation, Simple/Narrow/Depth distinctions and non-destructive registration/recovery.
6. Existing incident/debug/runtime APIs, tests, and preserved checkpoint documentation; determine what is already built before adding APIs.

**Do not regress existing authenticated Cloudflare Worker/R2 operations, provider routing, V3 destination configuration, History GO TO, Shelf, native Side Panel support, or the owner's latest UI preferences.**

## 3. First prove where it fails; do not confuse symptoms with cause

Create a repeatable, read-only instrumentation path for each stage and identify the earliest bad transition in a fresh profile and in a profile with pre-existing state:

```text
Chrome extension loaded/updated/awakened
  ↓ background.js successfully evaluated?
  ↓ synchronous top-level listeners installed?
  ↓ toolbar action/popup/sidePanel behavior configured?
  ↓ context-menu root + Manage acknowledged by Chrome?
  ↓ persisted V3 CURRENT/config/default loaded and valid?
  ↓ native provider/leaf/submenu projection registered and acknowledged?
  ↓ click ID dispatched to EXACT action and verified provider/account/bucket?
  ↓ save pipeline acknowledged by target, or error reported honestly?
```

Differentiate at least these conditions:

| Symptom | Distinguish and capture |
|---|---|
| Toolbar icon does nothing | No listener/worker failed to evaluate vs panel API denied/pending vs popup mode/armed fallback vs missing document/shelf readiness |
| No REDOWN right-click root | Listener/worker startup failure vs Chrome context-menu registration failure vs native rows removed/rebuilt/superseded |
| REDOWN root exists, Cloudflare missing | Not configured/unauthorized vs projection empty vs registration failure vs wrong profile/account scope |
| Clicking Cloudflare opens Explorer | Exact clicked native item ID, type, parent, action dispatch, current default readiness, whether `redown-go-home`/`redown-manage`/Setup path was chosen; do not infer identity from label |
| Works after extension reload | Compare service-worker lifecycle, registration generations, storage/extension identity, profile ID and initialization timestamps before/after, not just source code diffs |
| Page refresh does nothing | Refreshing an ordinary webpage does not necessarily restart extension worker or re-register extension-owned native menu |
| Browser cache cleared | Different from `chrome.storage.local`, IndexedDB, registration, and a full profile/extension-data deletion |
| Cloudflare connected but cannot save | Login/token status is not equivalent to writable default/active Worker, menu registered or successful transfer |

Capture real Chrome API callback/Promise result, `runtime.lastError` inside callback lifetime, exception category, stage, attempt ID, version/build and safe recovery result. No raw token, cookie, file content, private URL, public-share mutation or sensitive account identifier in diagnostics.

## 4. Boot subsystem API — precise, bounded and programmatic

Implement the following conceptual operations using existing project conventions; supply a versioned public/internal schema and documentation. The physical function names may be scoped to the current agent/runtime API as needed. Do not invent an insecure externally callable endpoint.

### `boot.status()` — safe read only

Return a snapshot with individual component states, not a deceptive single green `connected` boolean.

**Suggested versioned shape** (illustrative contract; finalize schema in docs/tests):

```json
{
  "schemaVersion": 1,
  "bootId": "opaque-id",
  "workerEpoch": "opaque-id",
  "extensionVersion": "from chrome.runtime.getManifest()",
  "startedAt": "ISO-8601",
  "observedAt": "ISO-8601",
  "overall": "ready | degraded | blocked | unknown",
  "components": {
    "worker": {"state": "ready | degraded | failed | unknown"},
    "toolbar": {"state": "ready | degraded | failed | unknown"},
    "shelf": {"state": "ready | degraded | failed | unknown"},
    "nativeMenu": {
      "state": "registered | repairing | failed | unknown",
      "desiredGeneration": "opaque",
      "appliedGeneration": "opaque",
      "lastAcknowledgedAt": "ISO-8601 | null"
    },
    "cloudflare": {"state": "disconnected | connected | expired | unknown"},
    "defaultDestination": {"state": "ready | needs-setup | not-writable | unknown"}
  },
  "lastFailure": {
    "component": "nativeMenu",
    "stage": "registration",
    "code": "MENU_REGISTRATION_FAILED",
    "at": "ISO-8601"
  }
}
```

**Important epistemic limit:** Chrome does not provide a universal API to enumerate every currently registered native context-menu row. A successful registration acknowledgement and matched persisted generation are strong evidence of applied configuration, **not proof every row is physically present** after an arbitrary browser bug. Distinguish `acknowledged` from actual click/user-visible verification. A Shelf UI is not proven to have rendered merely because `sidePanel.open` resolved; reuse existing bounded readiness probes.

### `boot.audit()` — bounded diagnostics

- Audit consistency of the last committed desired plan, native registration receipts, enabled Shelf/popup configuration, worker event registration, version and migration status.
- Optional safe live API probes only when they do not mutate cloud data or require broad permissions; they must never deploy a Worker or activate new buckets as a side effect.
- Generate structured evidence with `component`, `stage`, `code`, `source`, `confidence/evidenceLevel`, `generation`, `at`, `recoveryHint`.
- May return `unknown` and `not-verifiable`; never produce fabricated success from stale local storage.
- Audit must not itself reset context menus, open tabs, refresh token, or list entire cloud buckets.

### `boot.repair(target?, options?)` — idempotent targeted recovery

- Repair only unhealthy or explicitly requested components; reuse `applyToolbarOpenMode` and the ONE native-menu reconciliation lane.
- Serialize overlapping requests; dedupe the same boot/repair generation; cap attempts, timeouts and backoff. Never loop on every storage.onChanged event.
- Keep a usable REDOWN root and Manage entry where Chrome permits. Prefer targeted update/create, not routine `chrome.contextMenus.removeAll()`.
- Reconcile from committed CURRENT/config first; never block entrypoint recovery on provider-wide discovery, external storage, account login or a network fetch.
- If repairing Shelf is impossible, use the existing supported attached popup fallback in its correct user-gesture/policy boundary. Do not claim a popup opened if Chrome did not confirm it.
- If actual cloud authorization or writable-default setup is missing, expose explicit Setup/Connect state; **do not turn a broken save into a dashboard navigation**.
- Never silently log out, lose destination settings, overwrite backup, activate public bucket URLs, or perform remote cloud mutations.
- Return what was attempted, what Chrome acknowledged, what remains degraded, and whether manual user action is required.

### `boot.history(options?)` — bounded chronological receipts

- Persist a bounded diagnostic ring recording worker-load/startup/install/update, registration attempts, action-click results, confirmed recovery and root-cause stages.
- Each record must have a stable opaque attempt/correlation ID, stage, status, timing, error code, recovery outcome and version; do not fabricate missing intervals.
- Use the existing `entryEvidence` and runtime/debug machinery where feasible; do not introduce a competing global log or unbounded JSONL in `chrome.storage.local`.
- Offer a safe, redactable diagnostic export via existing Debug/Settings tools where supported. Ordinary users should not see raw technical logs by default.
- Read-only history queries must not wake remote cloud APIs or expose credentials.

## 5. Core lifecycle guarantees

### MV3 startup rules

1. Register `chrome.action.onClicked`, `chrome.contextMenus.onClicked` and required install/startup/storage listeners **synchronously at top-level**, before awaiting Chrome storage or Cloudflare APIs.
2. Treat Chrome `runtime.onStartup` as a browser event, not a substitute for **every MV3 service-worker activation**. Each worker load must have a bounded, idempotent reconcile path.
3. `runtime.onInstalled` handles install/update safely, preserving user choices and CURRENT history; never blindly reset.
4. All boot operations are restart-safe: worker suspension during an awaited API call cannot strand a permanent `applying` lock or duplicate tabs/saves.
5. Open Shelf directly from the delivered toolbar gesture; boot/audit/Cloudflare network readiness cannot block the click. Fallback remains subject to Chrome's actual popup and side-panel API/gesture constraints.
6. The root native menu should be registered/recovered as early as supported; later authorized destinations are projected without a destructive whole-menu gap.
7. Persist desired/applied menu generations and handle interrupted acknowledgement. Re-run targeted reconciliation after worker wake until successful or bounded degraded.
8. If boot detects a fatal worker script evaluation failure, acknowledge that an in-worker boot API cannot execute at all; include package/startup static validation and installed-Chrome service-worker error inspection instead of promising impossible self-healing.
9. Multiple browser windows, profiles and authorized cloud accounts must not leak each other's diagnostics or menu identities.
10. No periodic full-cloud crawler or battery-draining heartbeat merely to keep MV3 alive. Alarms are for bounded work where justified, not an attempt to defeat worker suspension.

### Non-negotiable safety against regressions

- **No two native menu writers.** Reuse existing V3 singleton and serialized registration; don't resurrect Legacy.
- **No two toolbar openers.** Reuse `entry-bootstrap.js` and existing Shelf/attached popup recovery; do not add competing `onClicked` handlers.
- **No destructive normal boot.** A routine worker wake cannot blindly `removeAll` a correctly registered menu. If catastrophic reset is truly necessary, identify explicit triggering conditions and guarantee a recoverable root.
- **No false success.** Connected Cloudflare, a local `rightClickMenuStatus` of `registered`, or a sent `sidePanel.open` request each cover only their own layer.
- **No changes in target semantics.** `REDOWN → Cloudflare` (verified default-only) means SAVE to the exact authorized default; `redown-go-home` means open Explorer. All Home-last provider submenu semantics remain as in canonical `logic-tables.md`.
- **No false cache diagnosis.** Capture actual evidence of extension origin storage, current registered plan, build/version and API errors before advising to clear cache, restart Chrome or reinstall.
- **No deliberate unrequested new tabs.** The existing confirmed Shelf-login → Explorer Home tab behavior must remain separate from BOOT.

## 6. Failure and recovery decision table

| Failure | Expected customer-facing behavior | Boot / diagnostics responsibility |
|---|---|---|
| Healthy worker, ready Shelf, acknowledged menu | Everything works immediately | No visible BOOT overlay, minimal overhead |
| Cloudflare disconnected but extension healthy | Shelf opens; menu has appropriate Manage/Setup, no false save | Mark cloud-dependent routes `needs setup` without poisoning toolbar |
| Shelf open rejected | Attached popup fallback when supported; otherwise accurate recovery guidance | Record panel error, fallback attempt and actual result |
| Native menu projection interrupted on MV3 suspension | Root/Manage remain where possible; next activation retries exact generation | Detect desired≠applied and reconcile |
| Last native ID snapshot missing | Do not discard viable user configuration or casually remove entire menu | Build deterministic plan and safe recovery with explicit last resort |
| Corrupted/partial V3 state | Preserve unaffected namespaces and usable entrypoints | Quarantine invalid scope, show repair; never overwrite CURRENT from stale scan |
| Wrong item routing to Explorer | Save click must not navigate silently | Capture native clicked ID, action kind and handler path; fail closed until corrected |
| Repeated recoverable Chrome API errors | Avoid infinite retries and UI freezes | Exponential bounded backoff; persistent degraded evidence |
| Chrome blocks sidePanel/openPopup by policy | Accurate supported fallback, not asserted success | Report platform/policy block and manual steps |
| Script parse or module load fails before boot runs | Toolbar might be unavailable; no in-worker self-repair possible | Static/build validation and installed Chrome service-worker diagnostics, explicit release blocker |

## 7. Implementation phases — do not stop after investigation

**Phase A — Instrument and reproduce without changing behavior.**
- Capture real timeline and native click IDs for at least fresh and persisted profiles.
- Investigate last good/bad source commit, worker start/stop and native registration receipts. Mark hypotheses distinctly from source evidence.
- Create deterministic reproduction/fault-injection fixtures, not just a verbose log.

**Phase B — Fix the actual earliest broken transition(s).**
- Patch proven registration, startup or click-routing defects in the **existing** toolbar and menu systems.
- Ensure pre-registered root/Manage, default-save correctness, and a functioning Shelf/popup fallback.
- Preserve current app data; avoid a tempting rewrite or superficial retry that hides the cause.

**Phase C — One BOOT API above the existing implementations.**
- Versioned `status/audit/repair/history`, with bounded diagnostics, correct permissions, correlation IDs and no credential exposure.
- Idempotent repair, desired/applied generations, safe degraded modes and error receipts.
- Wire into existing Debug/Settings surfaces with minimal user-facing controls only where there is an actionable failure.

**Phase D — Regression and actual browser verification.**
- Unit/integration/fault-injection tests plus installed Chrome lifecycle tests when supported.
- Record exact observed pass/fail/NOT_VERIFIED and unaddressed causes.
- Document operation contracts, architecture, migration if any, and support steps. Commit/push real code.

## 8. Acceptance matrix Codex must execute or explicitly classify

| Test | Required evidence |
|---|---|
| B01 Fresh profile, extension installed, no login | Toolbar click opens Shelf/allowed fallback; right-click root and Manage usable |
| B02 Existing authorized profile and saved CURRENT | Native menu and toolbar available after browser cold start, without cloud crawler |
| B03 MV3 worker suspended and woken by toolbar click | Synchronous click listener; Shelf opens, not dead-click |
| B04 MV3 worker suspended and woken by right-click context menu | Previously registered native items remain and route correctly |
| B05 Browser start vs extension update vs worker activation | Three events distinguished; no duplicate handlers |
| B06 `sidePanel.open` rejects or stalls | Correct attached popup behavior or truthful policy failure; no fake opened status |
| B07 Native `create/update/remove` failures | Root preserved where possible, degraded receipt and bounded targeted retry |
| B08 Interrupted menu update before Chrome acknowledgement | Desired≠applied detected; stable recovery after new worker activation |
| B09 Stale/wrong clicked item ID / duplicate Home label | No cross-route save, no silent Explorer navigation; exact action recorded |
| B10 One verified Cloudflare default | `REDOWN → Cloudflare` saves to exact bucket/prefix once; no Explorer navigation |
| B11 Cloudflare not connected / default not writable | Setup/Manage remains usable; no fabricated save |
| B12 Multiple profiles/accounts, tabs, windows | Independent identities; zero duplicated tabs/saves/menu registrations |
| B13 Chrome cache clear vs extension-origin storage deletion | Correctly distinguished; no impossible data-recovery promises |
| B14 Repair clicked repeatedly / storage change storms | Idempotent serialized bounded processing, no loops |
| B15 BOOT `status/audit/history` queried | Read-only, versioned, sanitized, zero cloud writes or token leaks |
| B16 BOOT `repair` on healthy state | No destructive menu reset, token refresh, or state churn |
| B17 Partial CURRENT corruption or missing native ID cache | Preserve unaffected destinations and restore usable root safely |
| B18 Extension worker JS fails before listeners register | Build catches syntax/import error; honest unrecoverable worker state |
| B19 Actual Chrome test with same reported broken profile (when available) | Before/after click traces and exact root cause, not a test harness assertion alone |
| B20 Repeat 10–20 cold/warm starts/wakes and cycles | No unexplained dead-clicks, lost root, duplicate registration or runaway retries |

Use and extend existing tests for toolbar recovery, native right-click V3, runtime reliability, Cloudflare login, Shelf readiness and current-store persistence. Do not “green” the suite by weakening assertions or rewriting frozen evidence.

**Verification classification:** `PASS (installed Chrome)`, `PASS (harness only)`, `FAIL`, `BLOCKED/NOT_VERIFIED`. A passing harness does not mean that a live Chrome side panel, native context menu or actual Cloudflare transfer has been confirmed. Do not run real cloud mutation without explicit test authorization.

## 9. Concrete delivery contract

Produce and push:

1. A concise **root-cause report** separating reproducible failures, likely factors and unresolved unknowns.
2. Production source changes that actually repair the proven entrypoint defects and implement the centralized BOOT API.
3. A documented API schema with clear state meanings and safe operation boundaries; no opaque ad-hoc JSON strings as the only contract.
4. Focused automated tests plus failure injection and repeatable installed-Chrome steps/screenshots/receipts where authorized.
5. A before/after trace demonstrating why the extension no longer depends on a mysterious reload to function—or a transparent blocker if a particular platform failure cannot be repaired.
6. Exact test counts, execution commands, disabled or unavailable coverage, baseline failures, benchmark/regression results and pushed commit SHAs.
7. A handoff explaining the lifecycle, where to query `boot.status()`, how to request an explicit `boot.repair()`, and what remains unverified.

**Do not perform a giant refactor or create extra competing service-worker boot paths. Do not stop when the API exists but the toolbar still sometimes does nothing.** If the full goal is not achievable safely in the current environment, complete the proven P0 repair and bounded boot/readiness features first; clearly mark any outstanding installed-Chrome evidence and engineering limitations as OPEN, not DONE.

**Final acceptance:** REDOWN always presents the best supported usable entrypoints at startup; default-save right clicks never masquerade as Explorer navigation; failures are evidence-backed, diagnosable and safely recoverable; no cloud scan or BOOT readiness check holds the toolbar hostage.
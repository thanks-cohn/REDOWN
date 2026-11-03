# CODEX P0 — REDOWN V3+1: Production-Ready Click2Cloud, Intuitive Editor, Quick Tour, and Isolated R2 Lab

**Date:** 2026-11-03  
**Repository:** `thanks-cohn/REDOWN`  
**Priority:** P0 — implement immediately, in small testable commits.  
**Implementation branch:** `codex/v3-parity-first-reconstruction` (already exists; continue rather than creating a competing engine/branch).  
**Directive:** **SHIP WORKING CODE. Do not stop at an audit, proposal, mockup, test-only patch, or rewritten request.**  
**Deployment posture:** Keep production untouched until explicit acceptance; the separate `click2cloud-v3p1-r2-lab` Worker is the only authorized target for any deliberately approved live lab deployment. A Git commit is not a production deployment.

## 0 — Read these, in order, before changing code

1. `AGENTS.md`; `docs/reliability/UNIFIED_AGENT_API.md`; `FOREVER_WORKS/README.md`; `FOREVER_WORKS/CURRENT_STATE.md`.
2. `NEED_TO_DO/CODEX/logic-tables.md` (**I01–I20, S0–S9 and the Home-last rule are normative**); `NEED_TO_DO/CODEX/Explanation.md`; `NEED_TO_DO/CODEX/CODEX_REQUEST_RIGHT_CLICK_V3_P0.md`.
3. `latest-1132026/V3_PLUS_1_ENGINE_EXPLANATION.md`; `latest-1132026/CREATORS_NOTES.md`; `latest-1132026/NEED_TO_DO.md`.
4. Current implementation at `extension/right-click-v3.js`, `extension/right-click-current.js`, `extension/beta/right-click-v3-ui.js`, `extension/background.js`, `extension/cloudflare-api.js`, `extension/cloudflare-auth.js`, `extension/explorer-destination-menu.js`, `extension/destination-config.js`, `extension/nested-locations.js`, `extension/beta/explorer.mjs`, `extension/service-worker.js` and relevant HTML/CSS.
5. Focused tests: `tests/right-click-v3.test.mjs`, `tests/global-bucket-activation.test.mjs`, `tests/simple-menu-flat.test.mjs`, `tests/consolidated-flat-providers.test.mjs`, `tests/worker-bootstrap-first-install.test.mjs`, `tests/explorer-destination-menu.test.mjs`, `tests/right-click-dispatch.test.mjs`, `tests/cloudflare-login.test.mjs`, `tests/cloudflare-session.test.mjs`, `tests/explorer-copy.test.mjs`, `tests/history-go-to.test.mjs`, and `tests/lab-bridge.test.mjs`.

The original P0 V3 contract governs real native menu correctness; this request **adds the V3+1 first-run, authoring and teaching experiences**. Where older prose contradicts the latest Home-last rule, the November 1 `logic-tables.md` wins. Never rewrite production V3 or create a second menu registrar.

## 1 — Owner's product result, exactly

A brand-new authorized Cloudflare user reaches a **working** `REDOWN → Cloudflare` Chrome-native **Simple direct-save leaf** that targets the verified lowercase `redown` bucket root with empty prefix. The menu does not send them to Explorer/Home or a setup page when a valid destination exists. They can save immediately. Sophisticated options come later and are discoverable by interacting with an example image.

Existing users must not lose destinations, R2 objects, login state, History, GO TO, or provider functionality. V3 is still the sole production route authority; V3+1 is the refined user journey, path editor, deterministic projections, and safe teaching/demo layer.

### Non-negotiable Chrome menus

- Only two production top-level modes: `Simple` and `Nested`; within Nested choose `Narrow` or `Depth` (internal `nested:'level'`). The Quick Tour may teach Simple/Narrow/Depth as three steps, not rewrite the production selector.
- **Simple, only one verified Cloudflare default:** `REDOWN → Cloudflare` is a clickable SAVE leaf.
- **Simple with eligible extra Cloudflare destinations:** `REDOWN → Cloudflare → configured sibling A, configured sibling B, …, native separator, Home`. **Home LAST** saves to exactly the original verified default; it is never Explorer navigation. No extra Buckets intermediary. Removing the last extra returns to a direct-save leaf.
- **Narrow:** only explicitly selected eligible destinations plus their natural actual path ancestors; preserve configured labels at endpoints, `Save here` for configured parent endpoints with children. Depth checkbox selection must never leak into Narrow.
- **Depth 1–10:** actual known/discovered authorized directories inside explicitly participating buckets, native folder names, correct depth count; incomplete/paged scans and switching 5→3→5 must never erase remembered nodes.
- Other providers Google Drive, Dropbox, OneDrive remain **flat provider leaves** in the native Chrome menu; Cloudflare can expand according to V3. Separate future S3 accounts/providers stay independent. Never implement fake provider capabilities.
- Native menus must already be registered before ordinary right-click; no blocking folder scan on right-click. Exactly one native menu writer/dispatcher, deterministic IDs and route resolution, desired versus Chrome-acknowledged Apply state, recovery after MV3 restart.

## 2 — P0: first-run Cloudflare bootstrap and Activate Buckets

Implement the owner-approved, **consent-gated**, idempotent new-user flow:

1. Distinguish logged out, Cloudflare account authorized, R2 activated, bucket present, exact default writable, native menu acknowledged, transfer confirmed. Do not conflate these states.
2. When R2 signup/activation is required, direct the user to the actual Cloudflare-controlled flow; no bypass, no fabricated “only CAPTCHA” claim. Provide bounded Retry/Resume instead of indefinite polling.
3. Once authorized, create or reuse **only** the lowercase bucket `redown`; never overwrite, rename, or delete an existing bucket; do **not** create `Files`, `Images`, or any tour fixtures in real R2. Respect existing profiles, account identity and all other buckets.
4. Prepare/verify the matching exact R2 target and native `REDOWN → Cloudflare` Simple leaf. If verification fails, fail closed with actionable setup/reconnect feedback, not a success animation.
5. Keep **ACTIVATE BUCKETS** always findable and prominent beside the Grid/Refresh surface as already requested, without silently activating every account in onboarding. Provide separate explicit all-bucket activation for existing users. **The onboarding tour must mention ACTIVATE BUCKETS** and explain when it is needed.
6. After confirmed setup, make the Right-click Destinations setup easy to find and visually invite optional exploration; do not force advanced configuration before the first verified save.

Review `tests/global-bucket-activation.test.mjs` and preexisting activation UI before changing behavior. Preserve safe all-bucket activation and failure retry. Never claim native menu ack proves an actual transfer.

## 3 — P0: intuitive, isolated editor instead of brittle cross-mode mutations

Keep the existing background-owned V3 configuration and CURRENT model. Fix the owner's reported coupling: changes in Simple, Narrow or Depth should **not unexpectedly mutate the other's explicit choices or underlying known tree**. Changing presentation changes projection, not cloud object state or stored configured destinations. Preserve revision checks, migrations and Apply/retry.

Design/implement a refined location composer **inside Right-click Setup**, reusing V3 contracts rather than replacing them:

- One typeable path field with safe autocomplete from authorized cached/current directory inventory; **typing must retain keyboard focus and caret** across async updates.
- Three horizontal, independently side-scrollable pill rails: **Parents**, **Siblings**, **Children**. Each rail may have several pills visible across, with three rows in total (one per relationship). Clicking a pill updates the selected path and its adjacent choices. No `Browse folders` gating merely to expand known children.
- Present clear `Simple`, `Nested → Narrow`, `Nested → Depth` controls with stable state and animated but unambiguous **Save Changes / Apply / Retry Apply** acknowledgment. Avoid misleading “Saved” when Chrome application fails.
- Simple label defaults to **bottom folder name**; fallback to bucket name at root. Explicit user label wins. If another destination has the same displayed label, ask whether to keep it anyway, YES/NO; maintain collision-proof distinct target IDs, never silently overwrite/repoint.
- Narrow is configured-path only: support multiple explicit endpoints, bucket branches and optional distinct endpoint labels. Users can use `+` to add and a clear accessible remove action. If a save-target parent also has children, show `Save here` in native projection.
- Depth is deliberately simple: select participating buckets, choose integer depth 1–10, Apply. Cached discovered known nodes may be reprojected immediately; async refresh is bounded, resumable, explicit and does not erase CURRENT on failure.
- Multiple configured Cloudflare buckets per account and identical paths across accounts must stay distinct. Future external S3 tabs/roots must not be nested under Cloudflare or share credentials.
- Undo/cancel/restart/reopening and concurrent edits should preserve committed state. Avoid `Unknown request` surfacing as normal user-facing text.
- A newly selected preview or typed candidate is not a remote mutation; actual destinations change only through explicit Apply and authorized source-of-truth transaction.

**Do not build a competing legacy/experimental menu engine.** Extract only pure reusable projections if necessary. Preserve and test provider-local edit isolation.

## 4 — P0: Quick Tour — same picture, three harmless menu demonstrations

Within **Right-click Setup only**, a compelling example image invites **“Try it! Right-click this picture.”** Its browser `contextmenu` event is intercepted **only on that exact practice surface** and shows a polished faux Dashboard menu. Same image throughout:

- **Simple lesson:** one example save leaf labeled `Images` conceptually targets deep fictional `redown/Files/Images`, but does not create paths.
- **Narrow lesson:** show `REDOWN → Cloudflare → Files → Images` for selected example branches only.
- **Depth lesson:** choose a fictional bucket and depth 2, show around five first-level example folders including `Files → Images`, demonstrating automatic inclusion.
- Always-available `Quick Tour` launcher; Back, Next, direct lesson jumps, Replay and accessible `Preview example menu` trigger for keyboard/touch. Close on Escape/outside click/section exit/lesson change.
- Gentle copy: **“Interactive preview. These are example destinations. Create your own using the editor below.”**
- Strict fixture isolation: no real directory API or account discovery, no V3 config writes, `chrome.contextMenus` mutation, upload, History, counters, SUCCESS!, or any real source/target IDs. Use separate mock IDs and a side-effect-free projection where safe.
- The tour is optional, not a compulsory wizard. No global interception of real Dashboard images or ordinary website right-clicks.

Build explicit before/after tests proving mocks never alter production config, authorized provider list, native registrations, remote objects, History or counters.

## 5 — P1 after the P0 foundation: working in-Dashboard right-click on REAL Explorer images

**Distinct from the Quick Tour picture:** a real image/file in Explorer has a working in-app REDOWN context menu offering actually authorized cloud destinations.

- Use the existing canonical provider/destination IDs and established dispatch/auth/transfer pipelines; the Dashboard is one additional presentation of the real menu, **not** an alternative upload engine.
- Real action copies the **original source object's bytes**, not a thumbnail or Quick Glance preview. Keep original source intact; Keep Both remains the default conflict behavior.
- Cloudflare can have its configured V3 tree; Drive, Dropbox and OneDrive are flat leaves unless their actual supported provider contract changes with separate owner approval.
- Browser-fetch/original-object retrieval should avoid on-disk staging when supported, and never send original page/source/frame/link URL or browsing provenance to destination providers. Providers get bytes, filename/extension and minimal destination metadata; protect R2 credentials/tokens from browser page context, logs and repository.
- Unauthenticated, unsupported, ambiguous or unverified transfers fail closed; counts, SUCCESS! and successful History/GO TO only follow provider-confirmed completion. Preserve existing History GO TO and visual preview work.
- Share canonical menu projection where appropriate; Chrome native UX cannot support arbitrary in-app visual effects. Native Chrome routing must be verified independently.

If P1 is blocked by provider capability or access, ship completed P0 independently and describe exact blockers, not a phantom working transfer.

## 6 — Live Cloudflare fixture facts and boundaries (verified 2026-11-03)

The connected Cloudflare account currently contains:

```text
redown
redown-bucket-1
redown-bucket-2
redown-bucket-3
redown-bucket-4
```

**Connector-only live evidence:** a 66-byte canary was uploaded separately to every bucket via Cloudflare R2 API, returned an ETag matching the expected bytes, appeared with matching recorded size/hash in object listings, then was deleted; no errors and all five final prefix listings were empty. This proves that connector access and bucket existence worked on November 3, **NOT** that REDOWN or Codex credentials, OAuth, upload routing or native Chrome currently work.

The isolated Worker `click2cloud-v3p1-r2-lab` exists, but on inspection had **no R2 bindings, no Worker secrets, no Cloudflare Workers Builds configuration and its workers.dev subdomain was disabled**. Do not assert it is a functioning deployed test endpoint. Never silently change production Workers or the five buckets.

### Live-test safety

- Stage all deployment and credentials behind isolated, explicitly approved lab scope. Do not use top-level `npm run deploy` blindly: the repository's current root `wrangler.toml` points to a **different** Worker, `remote-asset-ingest`, and its R2 bucket is an unset placeholder.
- Use clearly named disposable `__c2c_lab_canary/` object keys, bounded bytes, content integrity comparison, read-after-write where available, cleanup and resulting object list. **Do not delete pre-existing user objects.**
- Perform P0 offline tests first. The Codex execution environment may lack any Cloudflare authenticated capability; blocked live execution is **NOT_TESTED**, not PASS.
- No token, API key, R2 access-key ID, secret, session credential, authentication URL or bearer value in Git, PR, chat evidence, build logs, test outputs or browser provenance. Never request admin-scope creds.
- For secure CI/CD, prefer **Cloudflare Workers Builds → GitHub repository** where Cloudflare holds the build credential; code pushes trigger the isolated Worker only when the owner has authorized its Git integration and verified build config. Do not presume merely writing a Worker secret makes Codex/GitHub able to deploy.
- **Builds connection is NOT YET CONFIGURED.** Before any automatic deploy, check repository authorization, exact lab worker name, scoped build credential, secure environment, branch/root-directory, build command, and deploy target. Do not wire repo-root `wrangler.toml` to lab accidentally, trigger builds on every unrelated code change, or deploy production on `main`. If unavailable, produce a concrete blocked-step handoff and keep shipping safe source/test commits.
- Cloudflare official references: https://developers.cloudflare.com/workers/ci-cd/builds/ , https://developers.cloudflare.com/workers/configuration/secrets/ and https://developers.cloudflare.com/r2/ .

## 7 — Required implementation sequence, tests and evidence

### Milestone A — real V3 production reliability first

Reproduce native leaf→submenu→leaf, exact default routing, Home-last separator, independently configured modes, menu update/retry, MV3 restart and first-install bootstrap in closest faithful harness; fix the root causes in actual source, not cosmetic UI-only changes. Preserve known baseline failures rather than hiding them. Commit A and record test receipts.

### Milestone B — editor and Quick Tour

Implement the three-rail location composer, labels/collisions, non-destructive Depth, and immutable demo fixture boundary; focused DOM/keyboard/persistence tests. Commit B. Actual installed Chrome acceptance remains independently required.

### Milestone C — real Dashboard context menu

Implement real-image cross-cloud copy/save on genuinely supported adapters, exact route and source-byte integrity. Separate tests and no unverified success effects. Commit C or document explicit provider-specific blockers.

### Milestone D — isolated deployment/verification when authorized

Use Cloudflare lab only, verify no production resource changes, run bounded per-bucket remote smoke and cleanup, compare native installed Chrome behavior and app-level transfer read-back. Do not mark D green from connector canaries alone. Prefer Cloudflare Builds on a safe lab branch/path when authorized; retain a read-only CI path for normal pull requests.

**Minimum commands** (add narrower tests as needed):

```sh
npm ci --no-audit --no-fund
npm run diagnostics -- getStartGuide
npm run diagnostics -- validateRegistry
npm run diagnostics -- listIssues
npm run diagnostics -- getReleaseReadiness
node --test tests/right-click-v3.test.mjs tests/global-bucket-activation.test.mjs tests/simple-menu-flat.test.mjs tests/consolidated-flat-providers.test.mjs tests/worker-bootstrap-first-install.test.mjs tests/explorer-destination-menu.test.mjs tests/right-click-dispatch.test.mjs tests/history-go-to.test.mjs
npm run check
npm run reliability:check
npm test
```

Add new focused `tests/v3-plus-one-*.test.mjs` (names can vary) for: first-use auth statuses; default bucket idempotence and protection of pre-existing buckets; verified menu leaf dispatch; exact Home-last after siblings; no selected-Explorer-folder fallthrough; independent Simple/Narrow/Depth edits and 5→3→5 retention; directory parent/sibling/child rails and focus; duplicate labels Yes/No; editor Apply failure/retry/crash; Quick Tour mouse/keyboard state and zero live side effects; real-vs-fake image isolation; exact provider route IDs; source-byte equality; privacy; failed/uncertain provider receipts; no false SUCCESS/counters; MV3 wake/reconcile; many buckets and native menu budget.

**End-of-work report:** list exact changed paths, commit SHAs, PR/branch links, before/after semantics, test commands/results, pre-existing unrelated failures, pending browser/live checks, R2 operation receipts without secrets, credentials/build status and rollback. Use PASS / FAIL / BLOCKED / NOT_TESTED; **no blanket “fully working” claim** from a passing mock suite.

**Mandatory guardrails:** preserve V3 single menu authority, original cloud objects, History GO TO, the existing Premium Quick Glance/history visual work, provider privacy, all working falling-ball effects, per-provider save confirmation, Chrome extension security boundaries, installed-Chrome evidence distinctions, and all protected V3 tags. No default destructive reset, no broad provider scope, no GitHub secret commits.

**Completion standard:** A real first-time authorized user can save with one right-click; existing users can edit Simple/Narrow/Depth without cross-contamination; Quick Tour teaches all three on one harmless image; and actual proven Dashboard interactions use the same canonical routes. Implement as far as the environment permits, ship small code commits, and clearly record any live/provider deployment blocker.

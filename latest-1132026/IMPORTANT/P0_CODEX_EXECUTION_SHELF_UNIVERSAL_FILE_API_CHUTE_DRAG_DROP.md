# P0 CODEX EXECUTION — REDOWN Shelf Universal File Explorer × Chute Drag-and-Drop

**Owner directive:** November 4, 2026  
**Destination:** `thanks-cohn/REDOWN`  
**Reference:** `thanks-cohn/chute`, latest `main` (pin exact source SHA at execution)  
**Priority:** P0 strategic product feature  
**State:** Implementation specification, NOT a claim that feature is built, tested or production-ready.  
**Execution:** Dedicated feature branch and PR; do not push implementation to `main` without explicit direction.

## 0. The one-sentence contract

Build an exceptionally intuitive, premium-quality **mini cloud File Explorer directly inside REDOWN's existing Shelf** with an **expandable left rail of connected clouds and buckets**, where **REDOWN's existing Universal File API remains the only authority for remote file operations**, and **Chute contributes proven UI interaction patterns plus genuine cross-window drag/drop transport into supported ChatGPT, Google, Yandex and other real file-drop surfaces**.

This is a companion-product moment for REDOWN and Chute, but the projects remain independently maintainable.

### Non-negotiables

- **NEVER replace or fork REDOWN's Universal File API as a second file engine.** It handles cloud identities, capabilities, listings, folder navigation, path resolution, authorized reads, operations, preview and provider semantics.
- **NEVER treat Chute as a remote cloud provider, file-state authority or second Explorer API.** Borrow its actual HTML/CSS/JS layout and interaction lessons, and reuse its validated real-file drag bridge through an adapter.
- **NEVER rebuild the working REDOWN provider adapters, V3 Click2Cloud right-click engine, Shelf shell, History, Quick Glance, previews or theme system.** Extend through clearly owned interfaces.
- **NEVER equate a visual drag animation with a successful file attachment/upload.** Verify destination receipt before claiming a transfer worked.
- **Do not render an independent new window, Python console, debug .exe or unexpected setup prompt** when opening the Shelf or dragging a file.
- Keep genuine file bytes, name, extension and MIME metadata correct. Permission boundaries and original-source URL privacy remain in force.

## 1. Read the repositories FIRST: source-based audit, not redesign by assumption

A. Inspect current REDOWN `main` at a pinned SHA. Locate exact real modules and invocation paths for:
- Shelf HTML, CSS, JS and the existing Shelf navigation and tab lifecycle (`extension/shelf.html` is a known starting point, NOT a complete file map).
- Universal File API, its storage/provider abstractions, account/connection identity model, listRoots/listChildren/breadcrumbs/file read, preview and file operation contracts; report if an advertised operation is absent.
- Existing full Explorer and beta Explorer (`extension/beta/explorer.mjs` is a known starting point); reusable data and view components; theme tokens (`extension/explorer-theme.js` is a known starting point).
- Multi-provider R2, S3-compatible accounts, Google Drive, Dropbox, OneDrive and their actual permission/capability differences.
- Preview modes (Side Preview default, double-click Window Preview), existing History Quick Glance, GO TO, Shelf popout/window collision fixes, storage state and boot reliability.
- Worker and extension messaging with proper MV3 restarts.

B. Inspect **latest upstream Chute `main`**, PIN its exact SHA, and study **actual**:
- Full HTML structure, CSS architecture/responsive rules, asset strategy, theme and layout, file card and drag/drop affordances.
- JavaScript handlers and drag event payload creation, HTML5 DataTransfer, window-to-window behavior, fallback mechanisms, selection, hover, focus and keyboard behavior.
- Native Windows companion/bridge, service lifetime, extension-to-helper protocol, file-byte staging, drag-out transfer, cleanup, cancellation, permissions and recovery after worker death.
- Chute README's claimed destinations (ChatGPT, Google image search/Lens, Yandex image search) **against implementation AND live tests**; do not assume that advertised support proves current compatibility.
- Operational limits, concurrent video/image previews, memory management and any observed 'busy' state failure.

C. Produce `docs/shelf-chute-integration/SOURCE_AUDIT.md` with each feature's actual source file/function, call flow, known test proof, missing capability and integration decision. Also write an explicit **ownership matrix** (Universal File API vs Shelf UI vs Chute drag bridge). No new engine before this is understood.

## 2. Vendored REFERENCE, not an accidental bundled application

- Bring a reproducible, pinned snapshot of the **relevant complete upstream Chute source** into REDOWN under `reference/chute/`. Prefer a documented Git subtree (or reproducible source checkout workflow if subtree impractical). Include actual UI HTML/CSS/JS, native bridge source, manifests, contracts, scripts and tests needed to understand the complete path.
- EXCLUDE binary releases, caches, large generated outputs, secrets, credentials, .env, user datasets, and third-party dependencies already installable from lockfiles. Avoid Git submodules that Codex cannot reliably access unless robustly configured.
- Document upstream SHA, sync command, build exclusions, license attribution/compatibility, and ownership in `reference/chute/README-REDOWN.md`.
- **A reference copy is not automatically compiled/packaged or served** by REDOWN. Do not create a second installed Chute service. Where reusing live behavior is necessary, expose a versioned interoperability layer with the existing authorized Chute installation or vendor a small audited reusable module without duplication.
- Never hardcode localhost behavior without health-check, permission and authenticated origin checks; use least privilege.

## 3. Design: Cloud rail on LEFT, Universal File API content on RIGHT

Desktop/expanded composition:

```
┌──────────────────────── REDOWN Shelf Mini Explorer ──────────────────────┐
│  Back  Forward   Breadcrumb / Search           View    Preview          │
├───────────────────────────┬─────────────────────────────────────────────┤
│ YOUR CLOUDS               │ Current folder / content                     │
│ ▾ Cloudflare R2 • Account │ [file] [image] [folder] [video]             │
│   ▾ redown (bucket)       │                                             │
│     ▸ Images              │ selection / preview / gestures                │
│     ▸ Videos              │                                             │
│   ▸ other-bucket          │ Drag real files out through Chute             │
│ ▸ Other S3 • Account B    │                                             │
│ ▸ Google Drive            │                                             │
│ ▸ Dropbox                 │                                             │
│ ▸ OneDrive                │                                             │
└───────────────────────────┴─────────────────────────────────────────────┘
```

This is a **concept**, not a requirement to literally copy the drawing. Borrow Chute's most understandable elements after inspecting source, then adapt to REDOWN's established themes/brand and Shelf sizes.

### Cloud rail contract
1. Show authenticated, authorized cloud accounts, with distinct provider + account identity. Missing connection can be discoverable via current login flow; **do not show phantom files**.
2. S3-compatible accounts (including Cloudflare R2) have individually expandable account -> authorized bucket -> folder/prefix nodes. Do not group all S3 providers beneath Cloudflare; retain separate names, endpoints and account boundaries. Support multiple S3 accounts, buckets and folder trees as allowed by real API.
3. For Google Drive, Dropbox and OneDrive, expand where actual Universal File API provider scopes and listing contracts allow, otherwise open the existing view and show intelligible limitations; no invented Drive-wide read access.
4. Lazy-load children only as expanded; bounded concurrency and cached/paginated listings with invalidation after rename/move/create/delete; meaningful spinner/loading/empty/error state per node. A slow bucket must not lock all navigation.
5. Selecting any node must call existing Universal File API listing methods. Content view and full Explorer must resolve **the same file/folder identity**. Provider account switches must not leak stale results or mutate different account data.
6. Support keyboard arrows, Enter, Space, focus and ARIA expanded states, hover, multi-select where legitimate, accessible hit targets, stable scroll and per-provider remembered expansion state, safely persisted.
7. Small Shelf widths: collapse rail into accessible drawer/compact icons as necessary, no overlapping cards or horizontal clipping. Expanded Shelf/popout can display full tree and content. Respect current Shelf layout, existing pagination and user card display preferences.

### Content pane contract
- Breadcrumb/back/up/forward, folder rows or adaptive cards, sort/filter/search only where supported, readable names and path, consistent icon/thumbnail fallback, drag handles/indicators when useful.
- Click selects, double-click enters folder or opens appropriate Window Preview; keep Side Preview default for supported files. File selection must not unexpectedly start a download/save or open a browser tab.
- Respect existing context menus, rename/conflict KEEP BOTH behavior, provider permissions, pagination, open/GO TO and History links; do not change V3 menus or accidentally perform right-click remote saves.
- Drag from a card/selected items without disrupting ordinary click/double-click, scrolling, text selection or keyboard.
- A drop on cloud folder within REDOWN is a **separate Universal File API file-operation path**. Do not route cloud-to-cloud copy as if it were a drag into external web targets; verify backend support first.
- Preserve theme-specific contrast and motion behavior (Neon, Porcelain, Midnight etc.), small polish, light footprint, zero popout collision.

## 4. Explicit architecture and adapter boundaries

```
 Cloud providers / authenticated connection adapters
                         │
             REDOWN UNIVERSAL FILE API
       ┌─────────────────┴───────────────────┐
       │                                     │
 Cloud-rail tree provider               File list/detail/bytes
       │                                     │
       └──────── Shelf Mini Explorer ────────┘
                         │ explicit user drag
              Chute interoperability adapter
                         │
             real-file drag / short-lived bytes
                         │
       target site actual compatible drop area
```

Suggested contracts (adapt to proven existing repo interfaces; do not blindly impose):
- `UniversalFileApi.listRoots(connection)`
- `UniversalFileApi.listChildren(node, cursor, signal)`
- `UniversalFileApi.getItem(id, connection)`
- `UniversalFileApi.openReadStream(id, connection, signal)`
- `DragBridge.capabilities()`, `prepare({id, name, mime, size, stream, signal})`, `beginUserDrag(handle)`, `cancel(handle)`, `dispose(handle)`
- type-safe data objects: `{providerId, connectionId, bucketOrDriveId, itemId, parentId, kind, name, mime, size, capabilities}`

These are conceptual: inspect existing API and reuse its names/contracts before introducing wrappers. Avoid downloading an entire huge file merely to draw a card. Bytes are requested only after explicit user action / legal drag preparation.

**Authority rules**: Auth/permissions/listings/path/operations/metadata from REDOWN only; drag affordance and native/browser file handoff from Chute only; site-specific acceptance proven by tests; history and successful save counters continue using verified REDOWN flows and are not incremented by dragstart.

## 5. Chute-derived outbound drag-and-drop (user-visible make-or-break)

The user selects a real REDOWN cloud file -> drags naturally to a supported site -> the destination receives the **actual file bytes and filename** as though a legitimate OS/browser file drop occurred.

Priority compatibility targets:
1. ChatGPT: real file/image attachment drop zone.
2. Google: distinguish **Google Lens/Image Search** from Google Drive/Gemini; individually test target-specific supported upload zones. Do not advertise blanket “Google works”.
3. Yandex: image-search real upload drop zone.
4. Ordinary HTML file-upload drop targets: where browser/OS allows.

- Chute has existing documentation of these workflows, but verify current source and run live end-to-end. Browser-internal cross-origin drags cannot be assumed to create authentic `File` items; respect Chrome and OS security limitations.
- Use Chute's established bridge if necessary to produce legitimate file payload. Source from REDOWN provider-authorized bytes, with short-lived local staging when technically required, secure permissions and cleanup. Zero extra Python console/debug executable windows; no user-visible hunting through temp files.
- Explicitly address timing: a cloud file may not be locally available at dragstart. Design low-latency authenticated staging, visible preparation state, user gesture preservation and honest fallback. Do not claim universal instantaneous drag if browser cannot support it.
- Handle multiple selected files only where the target supports it; preserve types and names. Big file transfer must stream to bounded memory/disk and respect provider/site file limits; never swallow errors.
- No leaking cloud credentials, original source/page URLs, cloud origin browsing metadata or private temp path to target beyond what the user's explicit drop authorizes.
- Dragging from a cloud entry should not trigger extra right-click save, add to History as a successful cloud save, increment REDOWN odometer, or show success fireworks.
- Target-side completion: distinguish `prepared`, `drag_started`, `drop_dispatched`, `target_accepted`, `verified_complete`, `cancelled`, `failed`. Many external sites may not expose proof back to the extension: report uncertainty honestly and use site-level E2E verification where possible.

## 6. High-throughput / low-RAM / responsiveness mandate

A basic folder click cannot leave the UI “busy”; one large video and many image thumbnails must not freeze basic navigation.

- Never serialize all UI activity behind a single global busy flag. Have isolated operation queues, cancellable requests, priority for interactions, and safe worker wake/recovery.
- Virtualize large file lists, lazy-load thumbnails, bound decode/storage, avoid full-resolution image decode for tiny cards, use video poster/metadata instead of eager HD decoding, cancel offscreen work.
- Stream/stage large transfers; apply per-provider rate/concurrency limits, backpressure, bounded memory, pause/cancel, error and retry. No unbounded cloning or base64 arrays.
- Set measurable budgets from observed baseline on development hardware (target prompt folder navigation, responsive keyboard and scrolling under media load). Report measurements at 4 GB simulated/low-memory class and normal Windows 11 setup; do not invent passing benchmarks.
- Test 1/10/100/1,000/10,000 file listings where test harness supports, and HD video + image thumbnail burst + concurrent user folder clicks and drag.
- Preserve service worker boot/reconnect reliability; worker crash or Chrome browser restart must not corrupt state or leave permanent spinner.

## 7. Security, privacy and product constraints

- Per-provider and per-account least privilege, no silently broadened OAuth scopes, private Cloudflare buckets remain private unless independently user-authorized.
- No public URL needed for a private user's drag to ChatGPT; source file obtained via authenticated Universal File API only.
- No tokens embedded in scripts, branch artifacts, test recordings or reference subtree; ensure native bridge only trusts approved extension/client origins.
- Do not use remote webpage source URLs as provider-side upload metadata, and never leak credentials in file names or logs. Temporary staging is deleted on cancellation/completion/crash recovery with bounded TTL.
- Avoid universal clipboard/file-system interception and permission surprises; all transfer begins with deliberate user action.
- If operating-system restrictions make a workflow unimplementable, provide reproducible evidence and best supported alternative, not fake drag visuals or silent URL drops.

## 8. Execution plan for Codex

**Phase A — Reproducible source audit and reference pin**
- Pin current REDOWN and Chute SHA, study complete Chute UI/bridge code and REDOWN Universal File API. Publish source map, gap matrix and ownership diagram.
- Make `reference/chute/` reproducible and excluded from build artifacts; verify licenses.

**Phase B — Minimal clean integration skeleton**
- Prove a Shelf UI component fetches a listing solely through the Universal File API and shows one connected provider/account/bucket path. Unit-test no competing backend.
- Prove one authorized REDOWN file can reach a Chute drag bridge in development and produce a real File payload under controlled test. Do not build whole UI atop an unverified transfer path.

**Phase C — Expandable cloud rail and compact Explorer**
- Multi-S3 account/bucket/prefix tree and supported non-S3 provider nodes, caching, pagination, selection, breadcrumbs, responsive layouts, keyboard/accessibility.
- Chute-inspired polished interactions but REDOWN theme fidelity and stable previews.

**Phase D — End-to-end external drag**
- ChatGPT, named Google Lens/Image Search surfaces, named Yandex image-search surface. Include cross-tab/window positioning and native helper. Test concrete targets independently.
- Negative, cancellation and race-condition handling.

**Phase E — Regression and release evidence**
- Run existing REDOWN Shelf, History, Explorer, V3 menu, provider, boot, theme and package tests; Chute bridge tests; capture baseline failures separately from regressions.
- Run actual user-driven installed-extension Windows 11 Chrome tests (not just jsdom/mock); worker killed mid-task, restart, native helper absent, offline/expired OAuth, duplicate names, unsupported file types, huge files, navigation under stress.
- Document exact browser/site/OS versions and real target attachments; if live service testing cannot be performed, mark it **UNVERIFIED**, do not advertise.

## 9. Acceptance test matrix (must produce results, not checkbox theater)

| ID | Scenario | Passing evidence |
|---|---|---|
| SHELF-01 | Open Shelf without extra window | Single expected Shelf, no Python/debug popups |
| API-01 | Same folder via full Explorer and Shelf | Matching canonical provider+connection+item identities |
| RAIL-01 | Cloudflare R2 account -> bucket -> Images | Expandable authorized tree + correct paginated listing |
| RAIL-02 | Two distinct S3 accounts and buckets | Separate identities, no incorrect Cloudflare nesting |
| RAIL-03 | Drive/Dropbox/OneDrive actual scopes | Correct expand or honest fallback, no invented children |
| RAIL-04 | Narrow Shelf and expanded/popout | No overlay, clipped controls or inaccessible folders |
| UI-01 | File click, double click, preview and drag | Correct non-conflicting gestures and window preview |
| UI-02 | Keyboard/screen reader/tree navigation | Focus, ARIA, Enter, arrows, disabled states functional |
| DND-01 | REDOWN real file -> ChatGPT | Actual file attached, bytes/name verified |
| DND-02 | REDOWN real image -> Google Lens/Search | Accepted by named target and real upload verified |
| DND-03 | REDOWN real image -> Yandex Image Search | Accepted by named target and real upload verified |
| DND-04 | Unsupported page or type | Honest failure / no false success |
| DND-05 | Multiple, large, cancelled and aborted file drags | Bounded resources, no dangling temp files |
| DND-06 | Cross-window and native bridge restart | Real files continue/recover without weird popup |
| PERF-01 | HD video + many images + folder navigation | Responsive UI, measurements attached |
| PERF-02 | 4 GB class / constrained resource simulation | Safe degraded previews, navigation still usable |
| STATE-01 | Auth expiry, rapid account switching | No stale cross-account data, recoverable state |
| REG-01 | Existing Shelf History/GO TO/Quick Glance | No regression |
| REG-02 | Existing Universal File API + V3 right click | No duplicate engine, no regression |
| REG-03 | Packaging and security review | Reference excluded, scopes unchanged, no secrets |

Record for each: test environment, method, expected/actual, proof path, PASS/FAIL/BLOCKED/NOT_RUN, linked issue for unresolved work. No fabricated test results.

## 10. Deliverables and repo locations

- `reference/chute/` source snapshot with SHA and `README-REDOWN.md`.
- `docs/shelf-chute-integration/SOURCE_AUDIT.md`.
- `docs/shelf-chute-integration/ARCHITECTURE_AND_AUTHORITY.md`.
- `docs/shelf-chute-integration/DESTINATION_COMPATIBILITY.md`.
- `docs/shelf-chute-integration/TEST_MATRIX_AND_EVIDENCE.md`.
- Implemented mini explorer in existing REDOWN Shelf components, with the least new code needed.
- Versioned Chute interoperability adapter + tests/typed boundaries where feasible.
- Focused feature branch and PR: summary, changed files, upstream SHA, screenshots/UI recordings, diagnostics, regression evidence, known unresolved limitations, rollback steps.

## 11. Final quality bar

The owner should be able to open REDOWN's Shelf; expand the left-hand Cloudflare R2 account, bucket and Images folder; see their real files using the Universal File API; then drag a real image into a verified ChatGPT, Google or Yandex file drop area **with the intuitive gesture Chute already teaches**. No accidental extra window, no duplicate file engine, no lost History, no surprising busy lock, no imitation transfer, no false success.

**If the Chute bridge and the site/browser environment prevent an immediate direct-file drag, solve the technical integration carefully or document the precise blocking condition with proof. Never misrepresent a mock gesture as functioning transfer.**

## 12. Related owner directives

- `latest-1132026/IMPORTANT/P0_CODEX_CHUTE_FULL_SOURCE_STUDY_AND_SHELF_MINI_EXPLORER.md`
- `latest-1132026/IMPORTANT/MUST_HAVE_CHUTE_DRAG_FROM_REDOWN_TO_CHATGPT_YANDEX_GOOGLE.md`
- Existing REDOWN Universal File API, full Explorer, Shelf, History and V3 documentation remain authoritative for their respective workflows.

### Light starter for Codex

> In `thanks-cohn/REDOWN`, implement `latest-1132026/IMPORTANT/P0_CODEX_EXECUTION_SHELF_UNIVERSAL_FILE_API_CHUTE_DRAG_DROP.md` on a focused feature branch. Audit latest REDOWN and Chute main, pin Chute's source, and reuse Chute's UI/drag patterns while preserving REDOWN Universal File API as the only Explorer backend. Build the responsive left expandable cloud rail and beautiful Shelf mini Explorer, prove actual drags to named target sites, run regression/stress tests, and open a PR with honest evidence. Do not push to main.

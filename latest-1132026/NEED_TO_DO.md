# NEED TO DO — November 3, 2026

**Project:** REDOWN / Click2Cloud — V3+1 right-click onboarding and Quick Tour  
**Status:** OPEN — owner-directed product specification, not shipped functionality  
**Scope:** Documentation and future implementation requirements only; this note does not authorize touching real cloud data or changing the current engine.  
**Companions:** [V3+1 engine explanation](V3_PLUS_1_ENGINE_EXPLANATION.md) · [Creator Notes](CREATORS_NOTES.md) · [Click2Cloud transplant → standalone developer release roadmap](CLICK2CLOUD_TRANSPLANT_THEN_STANDALONE_DEVELOPER_RELEASE_ROADMAP.md)

**Separate long-term milestone (OPEN):** Harden V3+1 through the 1,000-case programmatic Scenario Laboratory and Glaciaring, transplant the verified engine into REDOWN behind a reversible feature flag, **then** branch the proven REDOWN product into standalone Click2Cloud. Preserve REDOWN's look and most verified functional experiences, exclude SKIN and Mask/MASCOT APIs, and provide secure programmer-facing Click2Cloud APIs. This is a roadmap, not evidence of shipping or authorization to merge/deploy.

## P0 — First-run R2 setup: useful before sophisticated

- [ ] On entering the Dashboard, distinguish new/unconfigured users from users with a verified working default destination. A connection alone is not evidence of R2 authorization or save readiness.
- [ ] When R2 is not enabled, explain the currently verified Cloudflare R2 free allowance accurately and offer a clear route to R2 enrollment. Cloudflare signup, payment verification where required, and permissions must be user-controlled. Do not promise that setup requires only a human-verification step.
- [ ] After the user explicitly authorizes appropriate account-scoped access, verify activation, using bounded polling or a supported confirmation flow when needed. A proposed cadence is roughly 5 seconds with a 30-minute maximum; handle timeout, cancellation, expired tokens, and resumption explicitly.
- [ ] Create **or reuse** only the lowercase default R2 bucket `redown` where permissions allow, without replacing an existing bucket. Configure the default save destination and verify it can actually be used. Do not create tutorial directories such as `Files/Images`.
- [ ] Register a **real flat Simple Cloudflare provider leaf** under the native REDOWN Chrome menu only when the default save target is ready. Cloudflare remains the only provider with potentially nested V3 menus; Google Drive, Dropbox and OneDrive stay native flat provider leaves.
- [ ] Give **ACTIVATE BUCKETS** a prominent, inviting, clear next-step treatment. On completion of provisioning, bring the user to the right-click destinations setup only as appropriate. Do not hide recovery/status access or claim an action completed until confirmed.
- [ ] The first-time success condition: the user has a verified default destination and can save through the native right-click menu without mastering Simple/Narrow/Depth. All advanced setup remains optional.

## P0 — Self-contained faux right-click Quick Tour

- [ ] In the Dashboard's Right-click Setup section, show a consistent example **picture** that functions as a right-clickable practice surface, like an ordinary HTML image. Its context menu must be a **faux menu drawn only inside the Dashboard**, never an actual Chrome context-menu registration.
- [ ] Keep the **same picture** and the same fictional example branch, **REDOWN → Files → Images**, across Simple, Narrow, and Depth explanations. A mode switch changes only the illustrative menu.
- [ ] **Simple:** a direct leaf/menu label points conceptually to a destination that can be several directories deep; Simple itself does not become nested.
- [ ] **Narrow:** demonstrate only explicitly chosen example paths appearing as nested menus. Use a small example of selected paths, with visible hierarchy. Never imply the sample paths were created.
- [ ] **Depth:** demonstrate a selected example bucket with depth 2 and about five first-level folders; show the hierarchy as automatically included rather than manually chosen. **Five folders and two levels are example values, not engine limits.**
- [ ] Display concise, calm disclosure: **“Interactive preview. These are example destinations. Create your own using the editor below.”** Avoid alarming copy about “your files” when not necessary.
- [ ] Provide **Quick Tour** from setup; allow **Back**, **Next**, and direct jumps to Simple, Narrow, or Depth. The tour may be replayed repeatedly. Closing/leaving setup dismisses the faux menu; it has no effect outside the practice picture.
- [ ] Users who wish to reproduce an example with actual destinations use the editor **below the demonstration**, with explicit confirmation/Apply for any real setting change.
- [ ] On any demo action, do not browse, list, read, create, rename, move, delete or upload real directories/files. Do not create sample folders or buckets. Do not invoke actual save handlers, remote APIs, V3 config mutation, registration/rebuild handlers, counters or History.
- [ ] Avoid a fragile second menu engine. Implement the preview as isolated sample data and presentation, sharing only pure projection logic if it can be done without side effects or configuration coupling.

## P1 — V3+1 integration and acceptance

- [ ] Keep V3 the **sole production right-click configuration/registration engine**; V3+1 is the onboarding/demo layer, not a rewrite. Preserve Simple versus Nested (Narrow/Depth) real-mode semantics, isolation and current real routes.
- [ ] Demonstration state must be ephemeral and independent of provider auth, user folders, saved destinations, Chrome context menu entries, and actual account files. A test must prove all of those remain identical before and after every tour action.
- [ ] Real R2 setup is the **only proposed cloud mutation during automatic first-run onboarding**, limited to explicitly authorized default-bucket provisioning. Even that operation must be gated by permission, idempotent and verified.
- [ ] Check keyboard accessibility and alternative “Preview menu” interaction for people who cannot right-click; practice menus should not prevent normal browser behavior elsewhere.
- [ ] Test mode navigation, exit/reopen, tour replay, illustrative menu structure, disclosure copy, and that failures in cloud enrollment never accidentally show a success-ready state.
- [ ] Document intended behavior versus observed source, browser and live-cloud verification separately. Mark each task complete only with evidence.

**Owner's product goal:** Start with a working one-right-click destination; teach sophistication through playful, obvious interaction instead of exposing configuration complexity. The sample branch is a guide only—never an instruction to manufacture folders.

## P1 — Real right-click saves from Dashboard / Explorer images

**New owner direction (November 3):** REDOWN's Dashboard should not be a place where the user loses the ability to save to their connected clouds. The same right-click principle should work on eligible **real images** in REDOWN's own Dashboard/Explorer, including copying an existing cloud object to another connected cloud.

- [ ] On an actual image or file inside Dashboard/Explorer, offer a functional **REDOWN → Cloudflare / Google Drive / Dropbox / OneDrive / other supported clouds** destination menu. Only show available actionable routes when authenticated and authorized, with clear connection/setup actions otherwise.
- [ ] Preserve the **flat native-style leaf** behavior for Google Drive, Dropbox, and OneDrive; Cloudflare alone may display nested V3 destinations as configured. Additional S3 providers must remain independent provider destinations.
- [ ] Resolve the **actual source object and original bytes** (not a compressed preview/thumbnail), exact intended destination and filename. Preserve existing conflict policy (KEEP BOTH by default). Distinguish copy-to-cloud from moving or deleting the original; do not silently remove or alter the source.
- [ ] Reuse the real production routing, auth, transfer and provider-confirmation paths where appropriate, rather than creating an unrelated Dashboard upload engine. Sending to another cloud must not require local disk staging when the supported source can be fetched/streamed in the browser.
- [ ] Respect provider privacy minimization: upload only bytes, filename/extension and genuinely required provider metadata; **never send original page/source/link URLs or browsing provenance to destination providers**.
- [ ] Success animation, saved counters and History confirmation only after a provider-confirmed upload. Pending, failure, permission and ambiguous outcomes must be distinguishable and retryable.
- [ ] Treat the Dashboard as a **design/testing laboratory**: iterate on one shared canonical menu definition/projection and actionable route IDs in Dashboard first, then register the Chrome-native-compatible structure through V3 after testing. The in-Dashboard menu may be styled; Chrome's native menu has platform constraints and cannot replicate arbitrary visuals.
- [ ] **Crucial safety boundary:** The Quick Tour's sample image still produces only a **faux illustrative menu** that never transfers anything, even if it visually includes cloud providers. Real Dashboard/Explorer images may invoke real saves. Ensure a strict source/surface distinction in code and tests.
- [ ] Acceptance: right-click an eligible real Explorer image, choose another authorized cloud, verify the **original object** arrives under the intended destination, no private source provenance leaks, the source remains intact, and truthful History/counter results appear. Independently verify that repeating Quick Tour leaves all real provider, folder, menu, object, and History state unchanged.

**Status:** Open proposal; this is not evidence of implementation or live cross-cloud verification.

## FUTURE / P2 — RIFT MODE: cinematic dual-cloud and app-connected workspace

**Owner vision (November 4, 2026):** A dramatic top-right Shelf switch turns REDOWN into a multi-surface workspace. The existing Shelf/cloud, a second independently selectable cloud Explorer, and the current webpage are simultaneously useful; drag/drop feels like ordinary desktop drag/drop. Later, Premium users can also connect compatible *local applications or other app surfaces* to REDOWN through a public, permissioned **Shelf API**, so the split workspace can show more than clouds. This is a planned feature, **not implemented or verified**. Keep boot reliability, functional Explorer, universal file API, and real drag/drop as prerequisites.

### Essential experience: a spectacular but functional transformation

- [ ] Locate a distinctive on/off switch in the **top-right of the REDOWN Shelf**. Shelf continues to **open in REMOTES by default** unless the user changes their startup preference in Settings; this special mode does not silently change that default.
- [ ] Activate a polished, original, anime-scale **Rift** sequence: the switch charges, a luminous seam appears, the geometry makes room for a second workspace, and a second Explorer locks into place with a satisfying final beat. Produce a premium, cinematic, YouTube-worthy WOW effect without copying protected anime characters or imagery.
- [ ] The working layout must retain **Cloud A + Cloud B + webpage**, not just a convincing animation. Cloud B uses the same universal file API, adapter contracts, authentication, verified transfers, standard Explorer semantics, and Chute/Chutey drag/drop as Cloud A, with independently remembered cloud and folder state.
- [ ] Users can move/copy files by ordinary drag gestures between A and B, and drag files to or from real eligible upload/download targets on the webpage. Never promise a third-party website accepts all file drops: verify supported targets and provide clear failure/fallback behavior.
- [ ] On switch-off, reverse the transformation with care, restore the prior layout if still available, and preserve tab content, selections, folders, in-flight transfers, and History. Never delete or relocate a file merely because a pane closes.
- [ ] Respect keyboard access, reduced motion, optional/mutable audio, low-spec RAM/GPU limits, cancellation, fast repeated toggles, user focus, and accessible fallback. Visuals must never interfere with file operations.

### Shelf API: other applications, including local desktop apps (Premium)

- [ ] Build an **open, versioned, documented Shelf Integration API**: third-party applications can register an integration and supply a renderable Shelf-compatible UI surface or a supported Explorer/file-provider adapter. Premium users can choose a compatible integration as a second-pane workspace. Example categories: local file browser, creator tools, productivity apps, media library, and other user-authorized local resources.
- [ ] **User experience:** Premium users see a clear **Connect an App / Add to Shelf** choice, discover connected apps, explicitly authorize the requested integration and local resources, select an app for the left/secondary pane when supported, swap it without losing the webpage, and disconnect/revoke access whenever desired. Make the integration genuinely customizable rather than a hard-coded roster.
- [ ] A single shared **native companion / Universal Worker** may expose local filesystem and application adapters over an authenticated, tightly scoped IPC/native messaging channel. Reuse one installation and a stable modular API for REDOWN/Chute/Chutey and future desktop clients. Do not create another helper popup, require users to operate a debug executable, or equate local access with unrestricted system control.
- [ ] **Integration is capability-based, not arbitrary embedding.** Local desktop executable windows cannot automatically be displayed *inside* a Chrome extension side panel or split tab; compatible apps must supply an approved web-rendered surface, protocol adapter, or native-companion-backed view. An app lacking a compatible renderer/adapter should receive a graceful open-in-app/other-surface fallback instead of a false promise that literally anything can be embedded.
- [ ] Third-party web UIs must respect origin isolation, CSP, sandbox constraints, authentication, and frame-embedding restrictions. Never bypass frame protections or hand out cloud OAuth credentials. Define message schema, handshake, capability negotiation, origin/instance validation, event subscriptions, file object handles, drag/drop payload/stream contracts, timeouts, and version compatibility.
- [ ] Explicit per-integration/per-folder user permission, revocation, least privilege, bounded resources and auditability. Keep source URLs and browsing provenance private from destination cloud providers. File bytes go only to the authorized destination; confirmation only after provider/application acknowledgment. Guard against untrusted app code, malicious file paths, traversal, and data exfiltration.
- [ ] Premium gating applies to **multi-app Shelf integrations and enhanced workspace convenience**, not to the ability to access one's own basic files/clouds. Define exact entitlements and offline/grace behavior before implementation. An external developer API can be documented openly even if particular user-facing premium integration capabilities are subscription-gated.

### Chrome 155+ feasibility and layout constraints

- [ ] Verify Chrome 155+ native **Tabs Split View** API (chrome.tabs.createSplit, tabs.create with splitWithTabId, and tabs.unsplit). It pairs **two actual tabs** under browser-controlled layouts; it does **not** guarantee an independently controlled left-side Chrome Shelf or support embedding native program windows.
- [ ] First prototype: retain existing REDOWN side-panel Shelf for the first cloud, split the main area into the webpage tab and an extension-controlled Explorer/App Surface tab for the second destination. Validate actual visual widths and what the user means by left panel. Chrome/user controls side-panel side placement; support user preference where possible, but do not claim REDOWN can force browser-owned UI.
- [ ] Feature-detect API availability, handle unsplittable/pinned/grouped/already-split tabs without destructive rearrangement, and preserve preexisting splits. Gracefully degrade on unsupported browsers, incompatible sites/apps, or insufficient width.
- [ ] Keep third-party app adapters modular and isolated from boot, native right-click V3, cloud auth, and regular Shelf REMOTES/Settings/History behavior. Introduce no unsupported Chrome API claims.

### Future acceptance / release gate

- [ ] Record a full installed-Chrome 155+ demonstration with two independently navigable real clouds and a live webpage; prove normal-to-Rift and Rift-to-normal with a memorable, polished entrance and exit.
- [ ] Verify actual file delivery across Cloud A ↔ Cloud B, both clouds → supported webpage upload targets, and supported webpage/local file → cloud paths. Test large files, conflicts, cancellations, auth loss, service worker restart, repeated toggles, and destination verification. Never let a visual success imply an unconfirmed transfer.
- [ ] Build a reference Premium Shelf API integration showing a real local directory via the shared native companion and a separate supported third-party web-rendered app surface. Test connection, limited permissions, revoke, missing helper, app crash, disallowed iframe, malicious payloads, and fallback.
- [ ] Validate reduced-motion UX, memory/CPU budgets, focus/accessibility, and browser/tab restoration. Make marketing claims only after each representative route is proven end to end.

**Research starting points:** Chrome Tabs Split View documentation (https://developer.chrome.com/blog/split-view-api-extensions), Tabs API (https://developer.chrome.com/docs/extensions/reference/api/tabs), and Side Panel API (https://developer.chrome.com/docs/extensions/reference/api/sidePanel). Those APIs establish browser features, **not** a finished implementation in REDOWN.

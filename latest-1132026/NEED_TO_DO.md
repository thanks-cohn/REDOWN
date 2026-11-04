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


# REDOWN V3+1 — Engine Explanation: first-use setup and right-click learning playground

**Date:** 2026-11-03  
**Document type:** Owner-directed explanatory design, **NOT** source/browser/live-cloud implementation evidence.  
**Scope:** V3+1 onboarding and teaching surface layered around the existing V3 production right-click engine.  
**See also:** [NEED TO DO](NEED_TO_DO.md) · [Creator Notes](CREATORS_NOTES.md) · [long-term V3+1 engine transplant and standalone Click2Cloud roadmap](CLICK2CLOUD_TRANSPLANT_THEN_STANDALONE_DEVELOPER_RELEASE_ROADMAP.md)

**Terminology boundary:** This historical document describes the *Quick Tour's faux teaching surface over current V3*, not the separate real Click2Cloud V3+1 engine being developed for eventual tested replacement. The linked roadmap governs the later engine transplant and post-transplant standalone release; it does not make fictional Quick Tour clicks perform real saves.

## 1. Definition

**V3 remains the only authority that configures and registers real Chrome context-menu destinations.** “V3+1” here is the onboarding plus instructional experience for understanding V3 without requiring users to configure it first. It does not authorize a rewrite of the real engine.

REDOWN must achieve two outcomes in sequence:

1. **Real readiness:** with permission, provision or reuse a default Cloudflare R2 bucket and a working flat Simple Cloudflare destination, so a new user can genuinely save.
2. **Optional understanding:** inside the Dashboard's Right-click Setup, let the user *try* example Simple, Narrow, and Depth menus on an example image, with no connection to real cloud folders, objects, menus or settings.

The user should experience usefulness first and discover depth later.

## 2. Onboarding states and boundaries

| Stage | Presentation | Real permitted action | Required evidence |
| --- | --- | --- | --- |
| Unconfigured | Calm R2 setup invitation and accurate free allowance | Navigate to Cloudflare enrollment | No claimed connection |
| Enrollment/authorization | Cloudflare-controlled signup/approval | User grants the required access; bounded status confirmation | Authorized account + verified R2 access |
| Preparing | REDOWN handles default setup | Idempotently create/reuse lowercase bucket `redown`; configure default target | Exact writable destination confirmed |
| Ready | Native **REDOWN → Cloudflare** leaf in Simple mode, clear next step | Apply production V3/native menu configuration | Chrome acknowledgement and actual save acceptance, independently checked |
| Exploring (optional) | Right-click Setup → Quick Tour | **No remote or real menu mutation** | Only local fictional demo state changes |

Do not equate authentication, bucket existence, activation, context-menu registration, or successful upload with one another. A complete transfer requires a genuine provider-confirmed result.

The owner's initial thought is to detect R2 status roughly every 5 seconds for up to 30 minutes; actual implementation should choose an authorized, reliable, resource-bounded technique and offer Retry/Resume when time runs out. Neither extension redirects nor polling may bypass Cloudflare enrollment or scope consent. Never state that the user merely has to “prove you're human” when enrollment may require additional steps.

Default bucket naming: `redown`, lowercase. The `Files` and `Images` names elsewhere in this document are **not** real folders.

## 3. One image, three fake right-click menus

Within the **Right-click Setup section only**, place a visually inviting image resembling an image on an ordinary HTML webpage. Users actually right-click this **practice image**. On that specific practice surface, intercept the contextmenu interaction and paint a **dashboard-only faux menu**. It must look informative and close enough to the intended native structure, but it is not a Chrome-native menu and does not register one.

This example image is identical for all three demonstration steps. Only the example menu projection changes.

All example paths are canned UI fixtures. Use a repeated fictional branch to make comparisons effortless:

```text
REDOWN
  Files
    Images
```

**Simple — flat:** Show one selectable example label (e.g. `Images`) pointing to `redown/Files/Images`. The fictional destination is deep, but the menu entry is a **single leaf**, not the nested path. The real new-user default is `REDOWN → Cloudflare` saving to the verified default `redown` bucket root; the tour's `Images` leaf does not change it.

**Narrow — curated hierarchy:** Show a selected example branch `REDOWN → Cloudflare → Files → Images`, plus a couple of other explicitly selected sample branches if helpful. Only the curated paths appear. Choosing a sample branch in the faux menu should give a harmless practice response (“Example destination”), never start a transfer.

**Depth — chosen bucket and depth:** Show what automatic hierarchy looks like with example bucket selected and level/depth 2. For teaching, use approximately five first-level directory entries and two visible levels; include the `Files → Images` sample branch to highlight that the same path is exposed without manually adding it to Narrow. These are *illustrative limits*; production Depth includes eligible discovered folders to the user's configured depth, not a hard five-folder ceiling.

**Terminology invariant:** V3's production selector has Simple as one top-level option, and Nested with Narrow/Depth under it. A three-step tour may show **Simple / Narrow / Depth** as equal teaching steps without altering this production mode model.

## 4. Quick Tour behavior

- The practice image has a brief pointer: **“Try it! Right-click this picture.”**
- A **Quick Tour** control is permanently available in Right-click Setup, including after onboarding.
- Users can press **Next**, **Back**, or jump directly to any of the three demonstration steps; they can repeat them as often as desired.
- The menu closes on outside click, Escape, step change or leaving the setup section. It does not appear on arbitrary Dashboard images, the Explorer, outside websites, or the browser toolbar.
- A “Preview example menu” button provides keyboard/touch accessibility. The custom interaction must not intercept right-click elsewhere.
- An unobtrusive notice should read: **“Interactive preview. These are example destinations. Create your own using the editor below.”**
- The editor *below* the tour is where the user can explicitly choose, label and **Apply** real paths, with clear approval and confirmed native registration.

## 5. Hard separation of example state and production state

Use conceptual namespaces:

```text
productionV3
  authorizedProviders
  knownActualDirectories
  userConfiguredDestinations
  nativeMenuRegistration
  saveAndVerificationHandlers

quickTourOnly
  sampleImage
  fixtureTree
  sampleSelectedNarrowPaths
  sampleDepthSelection
  selectedLesson
  fauxMenuOpen
```

**One-way boundary:** the tour can **explain** projected menus, but may not write production V3 state, call `chrome.contextMenus.create/update/removeAll`, discover actual directories, run cloud API operations, trigger a save, mark History as succeeded or increment counters. Do not promote mock state to real state. Never automatically create `Files/Images` as a “helpful” tutorial directory.

If pure menu-projection code can be shared safely, give it fictional inputs and make it side-effect-free. Avoid a second production menu engine.

Separately, the real first-run bootstrap may provision or reuse **only the authorized default** `redown` bucket, configure and verify the default destination, and register the real Simple provider leaf. Any additional real folder, bucket, provider location, label or Advanced menu configuration is the user's explicit decision.

## 6. Acceptance cases

1. Brand-new user authorizes R2 and lands on a **verified default** native Cloudflare Simple leaf, without first navigating an elaborate location editor.
2. Enter Quick Tour; right-click the sample image; the in-Dashboard faux Simple menu appears, then Narrow and Depth variants on the **same image**.
3. Tour Simple points to a deep sample destination but remains one leaf; Narrow shows only selected paths; Depth displays the auto-included sample hierarchy.
4. Jump Depth → Simple → Narrow, Back/Next, and replay via Quick Tour without altering genuine V3 configuration.
5. Compare all actual provider destinations, user data, source folders, R2 objects, Chrome context menus, History and counters before/after the tour: **no changes**.
6. Leaving Right-click Setup removes the faux menu and tutorial handlers. Nothing operates in an ordinary webpage.
7. User may configure a real analog *only by entering the actual editor and explicitly approving/applying it*.
8. R2 denial, incomplete enrollment, or unverified upload never leads to a false-ready or false-success animation.

## 7. Avoidable misunderstandings

- The example picture is **a small sandbox inside the Dashboard**, not a separately navigated public webpage and not a real cloud image.
- The fictional `REDOWN → Files → Images` branch illustrates concepts; it is **not** a real directory requested for creation.
- The five-folder, depth-two example teaches a behavior; it does not constrain the real Depth engine.
- Tour stepping is safe to perform at any time, but a real provider save is only real once production V3 has configured and verified a real target.
- No completion, Chrome integration, test pass, or deployed UX is claimed by this document.

The endpoint is a person who has already saved with one right-click and can understand additional options by trying a harmless example rather than reading a manual.

## 8. Real Dashboard image menus: the working twin of the teaching surface

**Further owner direction — November 3, 2026:** The Dashboard should preserve REDOWN's central right-click value. A user who is browsing a genuine image or object in REDOWN Explorer should be able to right-click it and choose another connected cloud, not return to an outside webpage just to save or copy it.

This creates three deliberately different surfaces:

| Surface | Right-click result | Data side effect |
| --- | --- | --- |
| **Quick Tour practice picture in Right-click Setup** | Faux Dashboard menu showing Simple/Narrow/Depth and example providers | **None**: no real saves, directory reads, Chrome registrations, or config updates |
| **Real Dashboard / Explorer image or file** | Working REDOWN in-page context menu with supported Cloudflare, Google Drive, Dropbox, OneDrive and other authorized targets | Real, user-initiated save/copy after exact source, destination, permission and transfer checks |
| **Eligible image on an ordinary website** | Registered Chrome-native REDOWN context menu | Real, user-initiated browser-to-cloud save using the production right-click system |

### Product behavior

A real Explorer image may already live in Cloudflare R2, Google Drive, Dropbox or OneDrive. A right-click on that item should offer authorized destination providers. Selecting a provider means **copy/save the original object** to the chosen destination—not move/delete it, not save a rendered thumbnail, and not create an unintended local download.

The intended provider structure remains **REDOWN → Cloudflare (V3 nesting only when configured), Google Drive, Dropbox, OneDrive**, with each non-Cloudflare provider remaining a flat leaf. Additional supported S3 providers have their own independent destinations; they are not nested underneath Cloudflare.

The in-Dashboard working menu can be visually polished, but only structure, labels, verified targets and routing semantics that Chrome permits should be translated into the native Chrome context-menu registration. Chrome owns the native menu's layout, opening mechanics and supported features. Do not treat a visual Dashboard preview as proof that native Chrome registration or transfer succeeds.

### One production model, multiple projections

Use the existing V3 configuration and canonical provider/destination IDs for real routes. A pure menu-plan/projection layer can feed:

1. **Dashboard's real working menu**, rendered in HTML/CSS and dispatched through production transfer actions.
2. **Chrome's native context-menu entries**, registered by the single V3 engine in a platform-compatible form.
3. **Quick Tour faux menu**, derived from **canned fixture state only**, without any real action handlers.

Avoid two competing configuration authorities or a parallel upload engine. **The tour's inert menu is not the Dashboard's working menu.** Never let tour click handlers accidentally call the real dispatcher; never give real-image handlers mock target IDs.

### Source identity, privacy, and confirmation

- Resolve the precise source file identity and original bytes, not preview URLs or thumbnails. When cross-cloud capability permits, fetch/stream via the extension's supported mechanism without local disk staging. Handle unavailable source bytes and authentication failures explicitly.
- Preserve the source object. Match the applicable filename, destination, conflict policy (default KEEP BOTH), and provider-specific required fields without inventing cloud-native folder parity.
- Keep browsing/source URLs and page/link/frame provenance out of destination-provider requests. A receiving provider should get the file bytes, filename/extension and only the minimum required protocol metadata. Internal REDOWN History can retain legitimate origin details according to product rules without transmitting them to receiving providers.
- Distinguish requested, in-progress, confirmed, failed and uncertain outcomes; trigger SUCCESS, counters and successful History only after provider-confirmed completion.
- A newly designed Dashboard menu is a **prototype** until the actual native Chrome structure and dispatch path independently pass tests.

### Acceptance

- Right-click a real REDOWN Explorer image and select a different authorized cloud; prove the **original bytes** arrive at the exact target while the source remains unchanged.
- Show equivalent eligible destination identities and real route semantics in the Dashboard working menu and Chrome-native menu, allowing platform-specific rendering differences.
- Demonstrate failed/unauthorized transfers never generate false-success effects.
- Right-click the Quick Tour picture before and after actual transfers: only a faux illustration appears; not a single actual folder, object, configuration, menu registration, counter or History entry changes because of the tour.
- Switching away from Right-click Setup dismisses the tour, but does **not** disable functional right-clicks elsewhere in the Dashboard/Explorer.

**Engineering principle:** build and refine the *behavior* in an in-app context first, then project the proven structure into Chrome's native menu; never imply a simulated visual interaction is proof of a completed upload.


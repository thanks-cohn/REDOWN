# Interactive storage signals, guided repair and Beta Mode

## Scope and audit

Implemented on current main baseline `b8180da`, after fetching the newer one-row/hover layout and non-blocking Cloudflare refresh work. The previous broad Storage Array redesign had been reverted upstream; this change does not restore it. Stone squares, primary setup/selection, independent circular Worker repair, Debug Mode's separate controls, and immediate one-row hover/focus expansion remain. No unrelated section is redesigned.

Reviewed AGENTS.md, the architecture/operation boundaries and Forever Works compatibility documentation. The signal states below are local UI observations, not accepted Forever intent records, a new Forever API, or conformance evidence. Existing frozen project/debug/semantic evidence is retained without refreshing hashes.

The audit found a passive Debug-only signal cycler, circle-only colors and endless red pulsing, configured profiles that needed clearer separation from live health, unguarded same-account/A→B→A replies, an early “refresh finished” message while other surfaces were still pending, and GitHub configuration tied to Debug. Replaced the competing demo and signal declarations rather than leaving parallel implementations.

## State model and evidence

`extension/storage-signals.js` centralizes state definitions and DOM painting. One `data-signal` controls the circle, perimeter, glyph and caption:

| State | Meaning | Feedback/action |
| --- | --- | --- |
| idle | No check in this context | Unlit neutral glyph |
| attention | Saved configuration is not live proof, or setup is needed | Amber perimeter/circle, refresh glyph, short instruction |
| working | A real selection/setup/repair is pending | Blue perimeter/circle, rotating glyph, accurate Selecting/Setting up/Repairing text |
| repair | The operation failed | Red coordinated perimeter/circle, warning glyph, error explanation and retry via the circle |
| ready | Explicit Worker verification succeeded | Green check and perimeter; perimeter fades after 2.4 seconds while check/text remain |

Amber pulses twice, red three times, then both remain steady. Blue rotation lasts only while work is pending. Completion holds before fading. Reduced motion removes animation, including the success flash, while keeping symbols and text. No new layout animation or polling is introduced. Mobile typography/spacing keeps captions clear of repair controls.

The large square still selects an existing preset without redeployment or provisions a new bucket destination. The small circle still performs the existing forced Worker verification/repair path; it is not repurposed into training or a read-only check. Its accessible name retains the bucket and repair action even when the visible symbol becomes a checkmark.

`cfProvision` now adds `verification.workerReachable:true` only after the deployment routine completes its health check. That check requires actual JSON with `ok:true`, `service:"REDOWN"`, `secretConfigured:true` and `storageBound:true`; malformed JSON/HTML, truthy strings or incomplete health objects cannot produce a positive result. Health failures no longer claim that every failure must be DNS. Existing `profile` and `ok` response fields remain. Internal `addBucketPreset` returns structured `{ok,verified}`; cached selection returns `verified:false`. A bare acknowledgement also remains unverified.

**Verification scope:** this confirms the deployed Worker answered and reported the expected service/secret/binding configuration. It is not proof of every R2 object, upload/download operation, token authorization path or all REDOWN systems. The UI does not display global “all systems ready” claims.

Bucket list and action generations reject stale same-account replies, A→B→A replies, and detached controls. Connection invalidation rejects obsolete account results and prevents an older refresh's cleanup from clearing a newer task. Already dispatched remote mutations are not cancelled or undone; obsolete UI results are ignored and later automatic retries stop once the view changes. Loading does not hide an already connected Storage section. Buckets, locations, Explorer and startup history remain independent; each surface reports its actual completion.

## Guided training

Normal Mode now exposes **Run Diagnostic Test** inside Storage. The single practice panel is visibly labeled **Simulation only**, with practical language and three clearly simulated indicators: Connection, Buckets and Worker.

1. Blue checks illuminate in order, then Buckets asks for Refresh in amber.
2. The test waits for the user to press that simulated circle; time alone cannot advance it.
3. Refresh completes, then Worker asks for Repair in red.
4. The user presses the simulated Repair circle; it turns blue, then green.
5. All simulated checks settle in a staggered green completion, hold, and return to rest.

Reset restarts the exercise. Exit or Escape cancels pending steps, hides the panel and returns focus to its launch control. A generation token additionally rejects callbacks that race cancellation. The module accepts only document/timer dependencies: no Chrome APIs, authentication, destination profiles, messaging or cloud clients. Real bucket controls are not invoked by practice, and real operation states are never overwritten by simulation. The former Debug cycler is removed; the same experience is available without enabling either optional mode.

## Independent optional modes

Both settings appear in the existing settings disclosure with linked accessible descriptions. Strict boolean values persist separately in `chrome.storage.local` and restore independently; missing Beta defaults to off. Beta does not enable tracing, and Debug does not enable experiments.

| UI or behavior | Gate |
| --- | --- |
| Experimental GitHub destination creation/configuration | Beta |
| GitHub choices in the popup's remote-upload destination selector | Beta |
| Runtime diagnostics, RFIS and separate advanced controls | Debug |
| Guided diagnostic practice, ordinary storage and transfers | Neither required |

Existing GitHub profiles are neither deleted nor rewritten by toggling. Existing configured background/context-menu transfer execution remains intact, including its authorization/security checks. Mode gating controls experimental UI discoverability, not authorization. No permissions, hosts, tokens or authentication behavior were added or changed. Popup choices update when Beta changes.

## Verification results

- **22 focused tests pass**, no failures/skips/cancellations: existing control behavior, setup without forced repair, explicit repair, cached vs verified state, bare acknowledgements, failure/retry, duplicate clicks, newer list/repair/account replies, independent mode combinations and restoration, popup gating without profile mutation, slow buckets not blocking independent surfaces, and guided interaction/reset/exit/timer races without cloud dependencies.
- **Full suite: 201 tests, 195 pass, six fail**, no skips/cancellations. The six are the retained historical catalog/debug/semantic evidence failures. No assertions or frozen hashes were weakened/refreshed. Focused mode/reconnect expectations now reflect actual independent completion and explicit health proof.
- `npm run check` and whitespace checks pass. New production module and preview tool are included in syntax checks; CI checks the new module.
- `python scripts/package_chrome_store.py --audit-only` builds the diagnostic ZIP with all **29** allowlisted files, including `storage-signals.js`. Existing license drift keeps it blocked for release. This is not a store submission or release certification.
- `npm run storage:preview` runs the repeatable **local mocked Chromium** harness in `scripts/storage-signals-preview.mjs`. It extracts the production Storage markup, CSS and actual bucket/mode handlers and loads the production training module. Cloud responses and mode persistence are memory-only mocks. The harness never installs the extension or calls Cloudflare.
- Rendered and inspected 1366px and 390px previews (900px viewport height), resting/expanded grids, working/verified/error signals, desktop/narrow guided steps and green completion. No horizontal overflow. Resting grids measured 178px/139px and expanded immediately to 675px. Bundled font bytes loaded. Chromium exercised the actual mock-backed control handlers, confirmed the success perimeter reaches opacity zero, confirmed training adds no mock storage calls, verified all four mode combinations, focus return, and zero animation/transition under reduced motion.

Saved [test output](runtime/verification/interactive-storage/focused-tests.txt), [full suite](runtime/verification/interactive-storage/full-tests.txt), [syntax](runtime/verification/interactive-storage/syntax.txt), [package audit](runtime/verification/interactive-storage/package-audit.json), and [browser report](runtime/verification/interactive-storage/browser-report.json). Console artifacts normalize trailing whitespace only.

Screenshots: [desktop resting](runtime/verification/interactive-storage/rest-1366.png), [narrow resting](runtime/verification/interactive-storage/rest-390.png), [expanded](runtime/verification/interactive-storage/expanded-1366.png), [working](runtime/verification/interactive-storage/working.png), [verified](runtime/verification/interactive-storage/verified.png), [repair needed](runtime/verification/interactive-storage/repair-needed.png), [guided Refresh](runtime/verification/interactive-storage/training-refresh.png), [guided Repair](runtime/verification/interactive-storage/training-repair.png), [narrow practice](runtime/verification/interactive-storage/training-narrow.png), [completion](runtime/verification/interactive-storage/training-complete.png).

## Remaining limits

Installed-extension loading remains blocked by Chromium administrator policy, which was not bypassed. No installed-extension, live Cloudflare repair/creation/transfer, GitHub Actions, screen-reader end-to-end or customer deployment pass is claimed. No real cloud storage was modified during development. Local mock receipts and screenshots are not live health evidence. The six historical failures and licensing/release gates in [readiness](runtime/READINESS.md) remain. Practice is intentionally temporary in Normal Mode pending user evaluation.


## Follow-up: Debug-only practice and graceful expansion

This supersedes the temporary Normal Mode placement and immediate expansion described above. Only Run Diagnostic Test and its simulation panel moved into the existing Runtime diagnostics section. Refresh buckets and real bucket operations remain in Storage. Beta behavior is unchanged. Practice refuses to start while its Debug section is hidden; turning Debug off cancels pending practice steps without focusing a hidden launch button.

Normal Storage still rests at one row and expands on hover or keyboard focus. A clipping viewport now interpolates its height over 220ms with a gentle ease-out; the contained 3D tile grid stays at a fixed height. This avoids resizing/reflowing the tiles on every animation frame. Stable page/grid scrollbar space avoids horizontal shifts. Reduced motion makes the reveal immediate. Outer page layout still follows the viewport height; no zero-layout or performance benchmark claim is made.

Verification: **19 focused tests pass**. Full suite: **203 tests, 197 pass, the same six historical failures**, no skips/cancellations. Syntax, whitespace and audit-only packaging checks pass; the package remains blocked by existing license drift. Ordinary Chromium mock renders were inspected at 1366px and 390px: viewport height increased through intermediate values (178→607→675 and 133→601→675), while tile height stayed fixed. The guided exercise ran under Debug, with no mock storage calls from practice. Reduced-motion transition duration was zero. These are local mock/UI results, not installed-extension or live Cloudflare evidence.

[Desktop](runtime/verification/debug-training-move/storage-desktop.png), [narrow](runtime/verification/debug-training-move/storage-narrow.png), [expanded](runtime/verification/debug-training-move/storage-expanded.png), [Debug practice](runtime/verification/debug-training-move/debug-practice.png), [browser checks](runtime/verification/debug-training-move/browser-report.json), [focused tests](runtime/verification/debug-training-move/focused-tests.txt), [full suite](runtime/verification/debug-training-move/full-tests.txt), [package audit](runtime/verification/debug-training-move/package-audit.json).

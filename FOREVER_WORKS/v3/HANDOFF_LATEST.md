# V3 handoff — 30 October 2026

**Implemented foundation and first locally tested vertical slice; P0 installed/live parity remains incomplete.** Work branch: `codex/v3-parity-first-reconstruction`. Starting commit: `bfbca3b185e1e81b81910c2fb2df7a7d3d99f79e`. Implementation commit: [`9c871f59ef00e6e555c520e4eba53f147142f20c`](https://github.com/thanks-cohn/REDOWN/commit/9c871f59ef00e6e555c520e4eba53f147142f20c). The implementation push was verified against the remote V3 ref; this following documentation commit records the receipt. Owner scope correction `244138c6602de4276db5adc4df079e221cc4d9f4` adopted by fast-forward before implementation: **Right-click UI/API only**. No release branch or historical tag rewrite.

## Completed

- Rebuilt setup from scratch: one fresh `section#v3-setup`, new scoped stylesheet and isolated view state, account/bucket/folder outline, search, labels, inclusion, sibling order, exact-prefix addition, paged read-only discovery, red Delete and subtree Undo. Old Legacy/Modern setup renderers, mounts, selectors, event hooks and draft adapters are removed from active runtime/package paths, not hidden.
- Added a canonical versioned V3 store, stable identities, validation, independent revisioned saves, deterministic projection and fresh click resolution. No automatic import or resurrection of old records.
- Added Settings engine selection and Apply. Legacy remains the default with independently preserved release Simple/Nested runtime and pre-v1 tree leaf routing. V3 saves do not modify Legacy configuration. Settings cannot restore a Legacy setup screen. One queued Chrome registration owner, receipt/failure feedback, restart-visible registration status and stale-engine click rejection.
- Kept existing Cloudflare activation/transport/Keep Both, History and Explorer seams. V3 disables automatic provisioning for remote clicks and requires separate object read-back before reporting completion. Ambiguous failure retains available destination information and never triggers automatic replay.
- Preserved URL generation/domain/public-access code and consent. Removed only the setup half of shared quick links and minimally mapped its tab navigation to the fresh root. URL byte comparisons and unchanged URL fixtures are archived.
- Fixed package dependency closure so V3, Legacy and Shelf Settings ship together while old setup/reorder code is excluded. Audit packaging remains release-blocked; no license reconciliation or store publication.

## Verification

- Required Forever describe and four diagnostics onboarding queries: exit 0; not a release certificate.
- Locked `npm ci`: passed; no dependency/lockfile changes.
- New V3 + public-address + bucket consent set: **29 pass / 0 fail**.
- Existing Legacy Simple/native ordering/reorder fixtures, with engine imports updated and assertions unchanged: **12 pass / 0 fail**.
- Syntax: pass. Package audit: pass, 75 runtime files. Normal packaging/release remains blocked by existing license/readiness gates.
- Ordinary Chromium fixture: actual V3 UI/styles, synthetic data, 1100px and 390px, one mount, no horizontal document overflow, visible red Delete, no page errors. This is not an installed extension test.
- Fresh starting-branch full baseline: **632 pass / 54 fail / 0 skipped**, architecture freshness failed.
- Final full reliability: **584 pass / 69 fail / 0 skipped**, marked **incomplete** because deleted-editor suites cannot enumerate an expected historical baseline case. Syntax/registry/issues pass; architecture freshness fails. There are **19 newly failing names** versus this run's baseline, listed exactly in `evidence/results.json`. Counts are not directly comparable: removed-editor module import failures prevent their prior tests from enumerating. No old assertions were disabled or frozen hashes refreshed.
- Existing Get URL stale-enable fixture still fails, as in the baseline. Complete raw baseline/final reports, focused logs, retirement census, URL comparisons, package output and screenshots are in `evidence/`.

## Incomplete / risks

1. **No installed Chrome or live R2 proof.** Managed Chromium policy contains `ExtensionInstallBlocklist:["*"]`; it was not bypassed. No Chrome auth profile/disposable live source-target pair is configured. No customer cloud writes/deployments occurred.
2. Required acceptance remains actual supported webpage click → exact authorized R2 bytes/read-back → History → Explorer; true MV3 interruption/restart and multi-window/native rendering need approved installed testing.
3. Full regression is red. Old setup-specific tests still load removed files/helpers; historical source/API fixtures also fail. These must be migrated/reviewed against the new requirements, retaining original history and meaningful domain coverage. Do not restore an obsolete UI to satisfy them. Existing Explorer incident/debt remains unclosed.
4. V3 currently implements hierarchical menus, not a second flat mode. No drag reorder, durable Undo, inline existing-target reassignment or imported Legacy edit model. Existing bucket/folder creation remains in Explorer. Full-app theme, screen-reader, all zoom/depth and gallery/archives acceptance remains open.
5. Registration failure can leave an empty Chrome menu; settings are saved separately and status directs retry. No atomic native menu replacement or durable transfer journal is claimed. A save may already exist when read-back fails; inspect before retrying.
6. Future provider adapters, premium work and broad Explorer redesign are intentionally not implemented.

## Scope correction adopted during this run

The branch advanced remotely to `244138c` with the owner’s highest-priority Right-click-only correction. It was adopted with a fast-forward, preserving the owner’s commit. No Explorer, transfer, Cloudflare, History, URL or provider implementation is replaced. The only shared transfer-function addition copies the existing byte count into its internal receipt; V3 click routing owns the read-back gate. URL-tab navigation and package inclusion changes are minimal connections required to mount the new setup and Settings. Evidence also byte-compares the embedded STORAGE Worker, transfer function (apart from that receipt), existing Explorer modules and History code.

## Next task

First migrate the obsolete source-extraction tests to V3 requirements and close any actual regressions without resurrecting old UI. Then run the installed-browser/disposable Cloudflare acceptance chain, retaining exact-byte receipts and History/Explorer evidence. Keep the release branch untouched until its separate gates pass. See `PARITY_MATRIX.md`, `SETUP_REMOVAL_AUDIT.md` and the engine/store contracts for boundaries.

## Commit and preservation receipt

Implementation `9c871f5` was pushed by normal fast-forward from owner scope correction `244138c` to the requested V3 branch. Remote verification retained release branch `2582c05d2253f3063e55404bb9ff6b97275f8ac1` and protected `right-click-shits` tag object `bd69e3082f7544cc21254ce066d8820467a955df` unchanged. No force push, rebase, deployment, publication or release-branch update. Runtime source hashes in the final report match the committed runtime/test source; the following handoff-only commit changes documentation only.

## Every modified file

The exact A/M/D inventory follows. Deleted source is preserved at the starting commit and historical checkpoints; original audit/canonical records remain untouched.

| Change | Path |
|---|---|
| A | `FOREVER_WORKS/v3/ARCHITECTURE_AND_BOUNDARIES.md` |
| A | `FOREVER_WORKS/v3/CANONICAL_DESTINATION_AND_MENU_CONTRACT.md` |
| A | `FOREVER_WORKS/v3/CLOUDFLARE_VERTICAL_SLICE.md` |
| A | `FOREVER_WORKS/v3/HANDOFF_LATEST.md` |
| A | `FOREVER_WORKS/v3/PARITY_MATRIX.md` |
| A | `FOREVER_WORKS/v3/PROVIDER_CAPABILITIES_AND_FUTURE_SEAMS.md` |
| A | `FOREVER_WORKS/v3/REGRESSION_AND_ACCEPTANCE.md` |
| A | `FOREVER_WORKS/v3/RIGHT_CLICK_ENGINE_SWITCH_CONTRACT.md` |
| A | `FOREVER_WORKS/v3/SETUP_REMOVAL_AUDIT.md` |
| A | `FOREVER_WORKS/v3/UI_ANY_SHAPE_AND_FOLDER_OUTLINE.md` |
| A | `FOREVER_WORKS/v3/evidence/baseline-reliability.json` |
| A | `FOREVER_WORKS/v3/evidence/final-reliability.json` |
| A | `FOREVER_WORKS/v3/evidence/final-reliability.log` |
| A | `FOREVER_WORKS/v3/evidence/focused-and-urls.log` |
| A | `FOREVER_WORKS/v3/evidence/get-url.log` |
| A | `FOREVER_WORKS/v3/evidence/legacy-runtime-tests.log` |
| A | `FOREVER_WORKS/v3/evidence/onboarding-corpus.json` |
| A | `FOREVER_WORKS/v3/evidence/onboarding-issues.json` |
| A | `FOREVER_WORKS/v3/evidence/onboarding-readiness.json` |
| A | `FOREVER_WORKS/v3/evidence/onboarding-registry.json` |
| A | `FOREVER_WORKS/v3/evidence/onboarding-start.json` |
| A | `FOREVER_WORKS/v3/evidence/package.log` |
| A | `FOREVER_WORKS/v3/evidence/results.json` |
| A | `FOREVER_WORKS/v3/evidence/setup-1100.png` |
| A | `FOREVER_WORKS/v3/evidence/setup-390.png` |
| A | `FOREVER_WORKS/v3/evidence/setup-retirement.json` |
| A | `FOREVER_WORKS/v3/evidence/syntax.log` |
| A | `FOREVER_WORKS/v3/evidence/url-preservation.json` |
| A | `FOREVER_WORKS/v3/evidence/visual-fixture.mjs` |
| A | `FOREVER_WORKS/v3/evidence/visual.json` |
| M | `extension/background.js` |
| D | `extension/beta/destinations.js` |
| M | `extension/beta/explorer.css` |
| M | `extension/beta/explorer.html` |
| M | `extension/beta/quick-links.js` |
| A | `extension/beta/right-click-v3-ui.js` |
| A | `extension/beta/right-click-v3.css` |
| M | `extension/destination-config.js` |
| M | `extension/nested-locations.js` |
| D | `extension/nested-menu-editor.js` |
| M | `extension/options.html` |
| M | `extension/options.js` |
| A | `extension/right-click-engine-settings.js` |
| A | `extension/right-click-legacy.js` |
| A | `extension/right-click-v3.js` |
| M | `extension/shelf.html` |
| M | `scripts/package_chrome_store.py` |
| M | `scripts/syntax-targets.json` |
| M | `tests/menu-reorder.test.mjs` |
| M | `tests/public-addresses.test.mjs` |
| A | `tests/right-click-v3.test.mjs` |
| M | `tests/simple-menu-flat.test.mjs` |

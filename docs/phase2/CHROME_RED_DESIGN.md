# Beta Explorer: chrome and crimson visual identity

The owner requested a completely distinct Beta CSS/UI/UX with silver sheen, chrome, red, white and black. This increment replaces only the Beta page's presentation and extends its controller. The production dashboard/Explorer, engine contract, data schema and cloud boundaries are unchanged. Real providers remain unavailable.

## Delivered

A crimson backdrop frames a brushed silver workspace with a chrome header and toolbar, black typography and restrained red highlights. The separate sidebar owns workspace navigation, source-provider selection and paste destination. The main area provides path/search controls, grid/list views, exact-name file cards, selection details, text preview and actual saved-operation counts. Diagnostics and the read-only comparison sit in expandable panels. Icons are local SVG symbols; typography uses the existing bundled DM Sans. No external font, image service or new runtime dependency is introduced.

The responsive layout changes the sidebar into compact source/destination controls on narrow screens and stacks details/activity panels. Destructive and selection-dependent controls are disabled until applicable. Visible selection, labels, keyboard focus, native file selection and reduced-motion handling are retained. Full keyboard/accessibility certification remains open; native rename/folder/delete prompts are retained from the simulator.

Source: `extension/beta-explorer.html`, `.css`, `.mjs`. Tests: `tests/phase2-beta.test.mjs` now also exercises the view switch and selected-file metadata. No new test file or duplicated operation engine was added.

## Verification and evidence

- Full local reliability run: **377 pass / the same 10 pre-existing failures**; syntax, registry and issue inventory pass, existing Explorer architecture remains stale. This run preceded the final CSS typography/contrast refinement; actual browser checks below exercised the final CSS.
- All twelve focused engine/Beta tests pass after the refinement; packaging audit passes with the existing release/license block retained.
- Ordinary Chromium 153.0.8010.0 with the real page/CSS/controller and real browser IndexedDB: 1366, 768 and 390 px widths, no horizontal overflow; grid/list switch, selection, preview, cross-fake-provider copy/paste, folder navigation, hide/reopen Beta gate and reduced motion pass. No page errors. Chrome settings alone are mocked; this is not an installed extension or a real-provider test.
- Screenshots captured and desktop/mobile reviewed: `verification/chrome-red/desktop.jpg`, `tablet.jpg`, `mobile.jpg`; exact checks in `browser.json`, focused run in `focused.log`.

Reproduce with `BETA_CHROMIUM_PATH=/absolute/chromium node scripts/beta-explorer-preview.mjs` and `CODEX_PRIMARY_RUNTIME_NODE_MODULES` pointing to a Playwright runtime. Browser provisioning is external to the repository; no browser binary is packaged with REDOWN. The initial Playwright CDN archive was unusable; the QA run used Chromium from an npm-distributed binary extracted in scratch. This does not bypass extension-install policy: only ordinary localhost page rendering was exercised.

Rollback: revert this design increment; Beta's IndexedDB version and records remain compatible. No real storage, credentials, profiles, production history or counters were changed.

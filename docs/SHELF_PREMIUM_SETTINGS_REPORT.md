# Premium Shelf and opening preferences

Implemented on beta-explorer, 29 October 2026. Protected BASE-102926 remains bd1927696e4e22dd8ee075e361be63485fd907b9.

The Shelf now uses REDOWN's bundled DM Sans, dark plum surfaces, restrained violet accents, consistent provider marks and typography. Clouds and Settings are separate hash-addressable views. Cards appear in the final requested order: Google Drive, Dropbox, Microsoft OneDrive, Cloudflare R2. Browser-relayed providers use Straight-to-Cloud subtitles; R2 uses TRUE REMOTE. A keyboard-accessible disclosure explains both technologies. The three planned integrations explicitly say sign-in and transfers are unavailable, independently of connection status.

Cloudflare account access is checked through the existing cfAccounts message, once on opening and again on authentication changes, with a 12-second bound and stale-response protection. Saved credentials alone never count as a verified connection. No credentials or account identifiers are rendered. Existing Cloudflare management remains at options.html. Saved R2 destination counts link to selection in Dashboard, with no fabricated selected destination. Recent activity reads at most three displayed records from existing transferHistory and labels recorded successes/failures accurately. No polling, transfer engine, OAuth implementation, permission expansion, or Universal File API change was introduced.

Settings owns the Shelf's opening-mode radio controls and writes only the existing toolbarOpenMode key. Background action handling remains authoritative and unchanged. Missing preferences still mean Shelf. The existing compact Popup links to shelf.html#settings in a new extension tab: this works independently of the side panel being enabled, so Popup users can return to Shelf. Current-view navigation and storage-change synchronization are retained. Saving disables the two controls until the write settles and restores the saved selection on failure.

Removed Explorer's entire mode selector, its bottom-right wrapper, all dedicated CSS, script inclusion, and beta/toolbar-mode.js. Existing Test It Tools markup/handlers and original fixed bottom-right CSS remain. Legacy Dashboard, compact Popup scripts, authentication, background transfer paths, and baseline tag are unchanged.

## Provider integration roadmap

Google Drive, Dropbox, and Microsoft OneDrive remain planned integrations. Each needs separately scoped OAuth client configuration, account/session lifecycle, destination selection, browser-relayed transfer support through existing provider architecture, and provider acceptance tests before enabling a Connect action. Dropbox is now explicitly included in that roadmap. None is advertised as currently usable.

## Verification

- npm run check: passed; node --check extension/shelf.js: passed.
- node --test tests/shelf.test.mjs: 4 passed, 0 failed. Covers preference default/save/reopen/both directions; toolbar API options; provider ordering/pending states/verified and failed account checks; recorded failures; Explorer removal; Popup Settings route.
- npm test before adding the new tests: 570 tests, 542 passed, 28 failed. A separate git-archive snapshot of unchanged HEAD produced the same totals and identical failing test names. No frozen evidence was refreshed to hide failures.
- Source inspection confirms no toolbar-mode, toolbarOpenMode, or bottom-right-controls references remain under extension/beta. Test It menu handlers were not modified.
- Browser rendering attempted with Playwright at intended widths 280/360/480. No Chromium executable was installed; installation retries returned invalid/truncated archives. No screenshots or visual acceptance are claimed. DOM tests are not layout proof.

Manual acceptance remains: load the extension in an administrator-approved Chrome environment; inspect both Shelf views at narrow widths, short heights, zoom changes and long saved destination labels; verify keyboard/focus and Test It Tools interactions; switch Shelf → Popup → Settings tab → Shelf, restart Chrome and verify persistence; verify existing Cloudflare sign-in, Dashboard navigation and ordinary transfers. Closing the Shelf does not own or cancel background transfers. No live provider operations or deployments were used for this work.

- npm run reliability:check: failed, with 546 passed / 28 failed after adding four Shelf tests. The repository release gate remains blocked. Existing architecture/evidence and regression failures are not resolved by this UI work.

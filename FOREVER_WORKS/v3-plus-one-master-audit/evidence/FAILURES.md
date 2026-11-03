# Exact unchanged-suite failures

Names below are current observed results. “Unregistered” means absent from the old regression-baseline registry, not introduced by this documentation audit. Source files are unchanged. Full error details remain in full-tests.log.

## Registered historical failures

- `tests/agent-api.test.mjs`: offline discovery advertises only implemented operations and distinct versions
- `tests/agent-api.test.mjs`: catalog IDs, evidence labels, source hashes and references are internally consistent
- `tests/debug-api.test.mjs`: real discovery, case, history, filters and validation are deterministic and honest
- `tests/debug-api.test.mjs`: original case and proposal Markdown bytes are retained from pinned upstream
- `tests/semantic-api.test.mjs`: real vertical contract resolves intent, three upload invariants, handlers, current source and regression
- `tests/semantic-api.test.mjs`: full finite public coverage inventory resolves strata and all canonical case links

## Other current failures

- `tests/add-menu-location.test.mjs`: one shared add control targets Simple or Nested and asks which destination when needed
- `tests/agent-api.test.mjs`: M0 inventory covers every literal message branch without inventing handlers
- `tests/beta-explorer.test.mjs`: Beta launcher is separate; original Explorer and context-menu pipeline stay in place
- `tests/beta-explorer.test.mjs`: same-folder copy keeps both and never destroys the source
- `tests/beta-explorer.test.mjs`: missing Worker setup blocks a GUI mutation before any write and Refresh never provisions
- `tests/beta-explorer.test.mjs`: side minimize, close, reopen, expand, resize keyboard, selection and saved settings work
- `tests/beta-explorer.test.mjs`: Upload Folder retains themed primary fill despite generic transparent action-button styling
- `tests/beta-explorer.test.mjs`: Activate Buckets styling targets its current actions slot rather than obsolete navigation toolbar
- `tests/beta-explorer.test.mjs`: regular Explorer hides stale limitations and keeps new bucket setup optional
- `tests/beta-explorer.test.mjs`: activation effect only glows success after verified readiness; reduced-motion has a static alternative
- `tests/beta-explorer.test.mjs`: Side Preview Lightbox is labeled, independently loaded, and returns to the exact side image
- `tests/brand-and-paginated-history.test.mjs`: History displays only one page at once and exposes older month, numbered-week, day disclosures
- `tests/cloudflare-login.test.mjs`: click creates a visible window before network navigation; repeated clicks focus it
- `tests/cloudflare-login.test.mjs`: successful callback exchanges PKCE and verifies access before saving token
- `tests/cloudflare-login.test.mjs`: callback resumes after service worker restart from session state
- `tests/cloudflare-login.test.mjs`: Shelf LOGIN! opens exactly one Explorer Home tab after successful interactive OAuth
- `tests/cloudflare-login.test.mjs`: Cloudflare sign-in started outside Shelf never opens an automatic Explorer tab
- `tests/cloudflare-login.test.mjs`: Shelf cancelled or failed login never opens Explorer
- `tests/cloudflare-login.test.mjs`: Shelf login remains connected when Chrome cannot open Explorer tab
- `tests/cloudflare-login.test.mjs`: unrelated tab, subframe, lookalike host, and wrong callback path are ignored
- `tests/cloudflare-login.test.mjs`: state mismatch fails without token exchange and allows a fresh retry
- `tests/cloudflare-login.test.mjs`: denied consent and missing authorization code fail cleanly
- `tests/cloudflare-login.test.mjs`: closed popup releases attempt and stale window is replaced on next click
- `tests/cloudflare-login.test.mjs`: expired attempt clears secrets, closes popup, and permits retry
- `tests/cloudflare-login.test.mjs`: failed API verification never stores an access token
- `tests/cloudflare-login.test.mjs`: duplicate navigation events exchange a code only once
- `tests/cloudflare-login.test.mjs`: verification network stall aborts and releases the attempt
- `tests/cloudflare-login.test.mjs`: popup creation errors are returned instead of leaving an in-flight lock
- `tests/cloudflare-login.test.mjs`: settings and worker observing the same callback exchange the code once across contexts
- `tests/cloudflare-login.test.mjs`: Worker deployments cannot overlap and a failed deployment releases the lock
- `tests/cloudflare-login.test.mjs`: runtime adapter gates actual background messages by settings sender and Debug Mode without network
- `tests/cloudflare-login.test.mjs`: destination folder pages preserve parent prefix, immediate children and continuation
- `tests/cloudflare-reconnect.test.mjs`: verified reconnect refreshes both editors and Explorer, coalescing concurrent refresh requests
- `tests/cloudflare-reconnect.test.mjs`: slow bucket loading does not block locations, Explorer, or connection refresh
- `tests/debug-api.test.mjs`: queries never modify the canonical corpus or cited historical evidence
- `tests/dropbox.test.mjs`: protected bytes unchanged except explicitly authorized shared composer hook
- `tests/explorer-account-and-history-navigation.test.mjs`: History opens year, recent week, month, numbered week, then day; transfers remain hidden until day opens
- `tests/explorer-diagnostic-fixtures.test.mjs`: current architecture references resolve and imported CLI operates outside checkout without executing arbitrary input
- `tests/explorer-neon-history.test.mjs`: real history is sorted by timestamps with year/month/day hierarchy and faithful outcomes
- `tests/explorer-neon-history.test.mjs`: empty, read failure and retry states are honest; missing metadata is not invented or executed
- `tests/explorer-neon-history.test.mjs`: large retained histories render in bounded increments and unrelated storage changes do no history work
- `tests/explorer-neon-history.test.mjs`: missing or failed sidePanel falls back to one reusable Shelf tab and Destinations opens original manager
- `tests/explorer-parity-audit.test.mjs`: audit: local upload gate routes through 300,000,000 inclusive; larger metadata fails before HTTP
- `tests/get-url.test.mjs`: switching files while enabling cannot reopen the old file or overwrite current choices
- `tests/history-go-home-polish.test.mjs`: Go Home reuses an existing nonsplit Explorer and clears stale GO TO deep links
- `tests/history-go-home-polish.test.mjs`: Go Home does not hijack a split Explorer; opens normal home tab instead
- `tests/history-go-to.test.mjs`: real Explorer integration selects, scrolls, focuses and invokes the existing preview
- `tests/history-go-to.test.mjs`: unsupported format is selected and passed to existing preview with truthful navigation status
- `tests/history-go-to.test.mjs`: reopening loaded History removes stale Explorer readiness diagnostics without hiding transfers
- `tests/issue-inventory.test.mjs`: explicit labels are recorded as partly addressed while the omitted-item report stays open
- `tests/modern-destinations.test.mjs`: tests/modern-destinations.test.mjs
- `tests/nested-locations.test.mjs`: tests/nested-locations.test.mjs
- `tests/onedrive.test.mjs`: unmodified protected modules retain checkpoint hashes; authorized Shelf changes are explicit
- `tests/options-debug-display.test.mjs`: debug-only sections start hidden and toggle exists only inside header disclosure
- `tests/options-debug-display.test.mjs`: successful provisioning refreshes destination editors and inventory before reporting ready
- `tests/options-debug-display.test.mjs`: normal onboarding progressively reveals tools only for a completed destination; debug bypasses gating
- `tests/options-debug-display.test.mjs`: settings disclosure dismisses outside and Escape restores focus
- `tests/options-debug-display.test.mjs`: persisted mode combinations restore independently, with Beta off when absent
- `tests/popup-destinations.test.mjs`: green zero-delivery state reads READY! and Dashboard opens the existing options page
- `tests/right-click-v3.test.mjs`: V3 save/register/resolve persists across restart and refuses Legacy selection
- `tests/right-click-v3.test.mjs`: actual click listener waits for V3 read-back before recording completion and never falls back
- `tests/right-click-v3.test.mjs`: Legacy pre-v1 tree migrates to exact V3 targets without mutating original profiles
- `tests/right-click-v3.test.mjs`: presentation transitions serialize independently, retain Level depth 5 and persist across background restart
- `tests/right-click-v3.test.mjs`: actual Level background inventory registration and click resolver retain exact authorized targets across restart
- `tests/right-click-v3.test.mjs`: Level missing participation never broadens subfolder authority; opt-in transactions revoke stale actions
- `tests/right-click-v3.test.mjs`: Save Changes glows after autosaved edits, applies same revision without rewriting and confirms matching Chrome receipt
- `tests/right-click-v3.test.mjs`: Save does not claim success before native callbacks, new edits retain pending state after older acknowledgement
- `tests/right-click-v3.test.mjs`: failed registration retains persisted edits, Retry Apply repairs without rewriting destinations
- `tests/right-click-v3.test.mjs`: partial Level inventory acknowledges application without claiming complete coverage or dumping diagnostics
- `tests/right-click-v3.test.mjs`: bucket pop-out preserves failed choices and retries through existing serialized writer; Escape returns focus
- `tests/right-click-v3.test.mjs`: durable snapshot restores fresh inventory without a provider rescan and stores no secrets
- `tests/right-click-v3.test.mjs`: T01–T04 T26 T27 provider leaf expands to siblings separator Home last and conserves exact default
- `tests/right-click-v3.test.mjs`: T16 T21 actual background commits IndexedDB before Chrome acknowledgment and rehydrates CURRENT on restart
- `tests/shelf-destinations.test.mjs`: equal minimalist cloud tiles show only an icon and a short action
- `tests/shelf.test.mjs`: provider order, pending integrations, verified account state and actual history remain honest
- `tests/shelf.test.mjs`: Explorer selector and its wrapper are gone; Test It remains and Popup has a Settings escape
- `tests/simple-cloudflare-branding.test.mjs`: native registered Simple menu contains only Cloudflare and actual click retains verified root receipt
- `tests/simple-location-rows.test.mjs`: Simple: removing an ancestor preserves reusable blank descendant rows and does not delete R2 folders
- `tests/simple-location-rows.test.mjs`: Simple: selecting existing folder does not populate creation draft
- `tests/simple-location-rows.test.mjs`: Simple: new directory is created under the exact parent only after Create
- `tests/simple-location-rows.test.mjs`: reconnect refresh retries Simple lookups without clearing drafts or saved selections
- `tests/simple-location-rows.test.mjs`: Simple: valid names including zero and f create at bucket root
- `tests/simple-location-rows.test.mjs`: Simple: invalid path segments never send creation requests
- `tests/simple-location-rows.test.mjs`: Simple: stalled creation releases button and explains uncertain outcome
- `tests/simple-location-rows.test.mjs`: Simple: refreshing during creation cannot leave a permanent Creating status
- `tests/storage-signals.test.mjs`: guided simulation waits for the correct controls, completes, and settles
- `tests/storage-signals.test.mjs`: reset and exit reject old callbacks even if timer cancellation loses a race
- `tests/storage-signals.test.mjs`: simulation executes without Chrome, fetch, messaging, profiles, or authentication
- `tests/storage-signals.test.mjs`: simulation lives only in diagnostics and cannot start while Debug is hidden
- `tests/worker-bootstrap-first-install.test.mjs`: fresh worker with failing heavy core still registers the original toolbar opener
- `tests/worker-bootstrap-first-install.test.mjs`: late core import failure does not register a second toolbar listener

## Missing historical expectation

The removed Nested drag-handle test name is not present in observed events; the runner reports incomplete rather than assuming it passed.

## Cause classification

The V3 sliced VM harness lacks performance (and its isolated click harness lacks crypto), producing exceptions or caught menuUpdated=false. The failing guarded-bootstrap tests call helper.ready(), which assumes menuRebuildQueue exists when the core was deliberately not loaded. Separate wrapper observations prove only the narrower local toolbar fallback. Other current failures include stale historical source/message inventories, Cloudflare login import assertions, modern editor DOM expectations, Explorer post-test async errors, and changed Shelf UI expectations. No test-name-only classification closes a product defect. Inspect each full stack before repairing tests in a later request.

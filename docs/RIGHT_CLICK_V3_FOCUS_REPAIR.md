# V3 tree editor focus and interaction repair

Baseline: `668dbe4a24e228e743cd74c48ea6ff1b7de9bb95` on
`codex/v3-parity-first-reconstruction`. Scope: `extension/beta/right-click-v3-ui.js`
and focused tests only. No HTML, CSS, API, transfer, URL or History changes.

## Root cause, verified in source and reproduced in Chromium

`add()` appends the existing Add Destination form to a `role=treeitem` to keep it
inline. The tree item's `onclick` previously handled every descendant click and
unconditionally ran `select(key); item.focus()`. A real click into the label/path
input first focused the input, then bubbled to that handler, which focused the
bucket/destination. Subsequent characters consequently reached the tree's
first-letter navigation. The keyboard handler's old `target === item` check
could not prevent this: focus had already been stolen by the click handler.

Separate ownership defects compounded this:

- `+` and other buttons stopped click propagation without selecting their actual
  owner; cancellation/expansion could therefore focus a previously selected row.
- `draw()` detached the form and rebuilt every row, losing control focus, inline
  placement, open action menus and uncommitted rename text/caret during async
  folder refreshes or checkbox changes.
- Keyboard handlers accepted synthetic events on unfocused tree items and did not
  exclude composition or modified shortcuts.

The original JS fails the new Chromium scenario immediately after clicking and
typing in Menu label: the label input is no longer active. The repaired JS passes
all scenarios at 1200px and 390px.

## Ownership and focus contract

The existing inline form placement is retained to preserve geometry. It is an
explicit event boundary; native controls retain their own click and key behavior.
The parent row additionally rejects interactive descendants and clicks belonging
to another tree item. No catch-all `preventDefault` is applied to form keys.

The implementation follows the [WAI-ARIA APG Tree View keyboard and focus
conventions](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): one roving tree-item
Tab stop, selection following tree-item focus, arrows/Home/End, Enter activation,
and character/prefix navigation. Inclusion remains the existing separate checkbox
operation. Tree navigation requires both the event target and `document.activeElement`
to be that exact tree item; composition and Ctrl/Meta/Alt shortcuts are excluded.
This is a tree with embedded native editing controls, not a claim that APG specifies
this particular inline form arrangement or that assistive-technology acceptance
has been completed.

| Interaction | Focus result |
| --- | --- |
| Click/type/select inside Add Destination | Remains on the native input/select/button; no tree typeahead |
| Contextual `+` | Selects its actual owner and focuses the path field |
| Escape/Cancel in add form | Returns to the contextual owner, without saving |
| Choose existing folder | Updates fields and focuses path, allowing Enter submission |
| Escape in external folder picker | Cancels add and returns to the contextual owner |
| Successful creation | Expands the chosen parent chain and focuses/selects the new destination |
| F2 or Rename | Focuses/selects the rename input |
| Rename Enter/Escape/confirm/cancel | Returns to the renamed item's row, even if another action selected a different row during editing |
| Checkbox change/save | Retains focus on the replacement checkbox; Space remains usable |
| Delete | Retains the pre-existing explicit Undo focus behavior |
| Save acknowledgement | Updates status without moving focus |
| Folder refresh/redraw | Restores the active row/control, form anchor/draft, rename draft/caret and open action menu |

## Verification

- `node --test tests/right-click-v3.test.mjs`: **24 passed, 0 failed**.
  Four new default-suite tests exercise actual DOM handlers, bubbling, active
  focus, editor key ownership, creation, contextual cancellation, async redraw,
  checkbox replacement and composition/modified-key guards.
- `scripts/right-click-v3-focus.mjs`: **2 real Chromium scenarios passed**, at
  1200px and 390px, using actual clicks, keyboard typing, native selects, folder
  filtering/selection, Enter/Escape, multi-character tree typeahead, F2 rename,
  checkbox Space, `+`, More, delete/undo, held save acknowledgements and async
  folder redraws during add and rename. Messages are mocked; no cloud requests.
- Negative control: same browser test with baseline JS fails at the first
  click/type focus assertion in Menu label.
- Full baseline suite: **656 total, 587 passed, 69 failed**.
- Full repaired suite: **660 total, 591 passed, 69 failed**. Failure names match
  the directly executed unmodified baseline; no new failures. This is not a
  green full suite.
- `npm run check`: passed. Direct syntax checks for both changed JS and the new
  browser runner passed. `git diff --check`: passed.
- `npm run reliability:check`: blocked by existing Explorer architecture drift
  and regression debt. Syntax, API registry and issue-inventory stages passed.
  Its initial run preceded the four additional focus tests (587 passes/69
  failures); the separate full run above includes them. No frozen evidence or
  architecture hashes were refreshed.
- Onboarding diagnostics: getStartGuide, validateRegistry, listIssues,
  getReleaseReadiness and Forever Works describe executed. Recorded readiness
  remains blocked; this repair does not upgrade release certification.

Browser reproduction (use an available Playwright module and Chromium executable;
no package dependency or production install changes are required):

```sh
REDOWN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
REDOWN_CHROMIUM_PATH=/path/to/chromium \
node scripts/right-click-v3-focus.mjs
```

The tested local executable was Chromium Headless Shell 134.0.6998.35, Playwright
build 1161. Normal Chromium launch could not create its singleton socket in this
runtime; the standard Headless Shell executed the tests without changing runtime
permissions. A newer browser download was unavailable, so no latest-Chrome claim
is made. Fixture URLs use localhost's secure context for `crypto.randomUUID`, as
real extension pages have a secure context.

Negative control, without editing the checkout:

```sh
git show 668dbe4:extension/beta/right-click-v3-ui.js > /tmp/v3-original.js
REDOWN_V3_UI_PATH=/tmp/v3-original.js \
REDOWN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
REDOWN_CHROMIUM_PATH=/path/to/chromium \
node scripts/right-click-v3-focus.mjs
```

These are ordinary webpage/browser fixtures and local repository tests, not an
installed extension or live Cloudflare acceptance run. Screen-reader behavior and
installed Chrome remain manual acceptance boundaries. The existing appearance is
preserved by leaving all HTML/CSS and layout rules unchanged.

# CODEX IMPLEMENTATION REQUEST — Cloudflare-Only Right-Click Popouts, Flat Google Drive / Dropbox / OneDrive

**Project:** REDOWN  
**Repository:** `thanks-cohn/REDOWN`  
**Owner direction:** November 1, 2026  
**Status:** REQUEST ONLY; implementation NOT yet performed  
**Base:** the current `main` branch, without force pushes or unrelated changes  
**Checkpoint:** `checkpoint/2026-11-01-amoebe-before-flat-provider-menus`, confirmed manually pushed by the owner, points to `8af5607c79619b5f0e0836c3dbb792576cddde1b`. Do not move, delete, rewrite or recreate this or any other protected tag.

## OWNER REQUIREMENT: ONE CLICK PER NON-CLOUDFLARE PROVIDER

**Only Cloudflare may have nested / fly-out / popup submenus under REDOWN.**

Google Drive, Dropbox and OneDrive must each be **one directly clickable Chrome native context-menu row**, with **no child items**, no second "Save", "REDOWN", "Home", "Login", or "Connect" popout. Hovering over those three must never open a submenu.

```text
REDOWN
├── Cloudflare            ← only provider allowed to expand
│   ├── Custom Cloudflare destination(s), only when configured/eligible
│   ├── ──────────        ← separator, only where approved
│   └── Home              ← LAST, verified default Cloudflare SAVE, not dashboard
├── Google Drive          ← DIRECT click: save or connect, no submenu
├── Dropbox               ← DIRECT click: save or connect, no submenu
├── OneDrive              ← DIRECT click: save or connect, no submenu
└── [existing approved management / utility actions]
```

If Cloudflare has only its verified default destination, Cloudflare itself is a direct-save leaf, not a mandatory submenu. When the user's current V3 Simple/Nested/Narrow/Depth Cloudflare settings require genuine child destinations, retain their existing correct hierarchy and names, including the authorized **siblings → separator → Home LAST** behavior. Other providers joining or disconnecting must never make Cloudflare expand or collapse.

### Direct click state machine

| Provider state | Click the **single provider row** |
| --- | --- |
| Verified, authenticated and save-capable | Start its actual existing provider-specific save using the exact clicked URL/context, with truthful progress/History receipt |
| Disconnected / auth required | Initiate the provider's existing authorized connection flow (when supported); otherwise report the real actionable need to connect without fabricating a save |
| Reconnect / expired / revoked | Use the existing explicit reconnect flow, with required platform consent; no silent privilege escalation |
| Connecting / checking | Do not queue duplicate OAuth prompts or falsely report a completed save |
| Unverified, ambiguous, missing permission, unsupported source, transfer uncertain | Fail or remain pending truthfully, preserve evidence and user data, never misroute to another provider |

A user who is already signed in must not be asked to pick another action. Preserve each provider's existing limitations separately: this change is **native menu structure and click routing**, not approval to rewrite Google Drive's transfer engine, Dropbox's permission behavior, OneDrive's upload pipeline, or Cloudflare V3.

## Source audit: inspect exact current implementation, not assumptions

Read `AGENTS.md`, `NEED_TO_DO/fundamentals.md`, `NEED_TO_DO/CODEX/logic-tables.md`, `NEED_TO_DO/CODEX/Explanation.md`, `docs/CODEX_P0_CURRENT_FIRST_NATIVE_MENU_MULTICLOUD_FOUNDATION.md`, and the code/tests below. Reconcile older documents that describe expanded non-Cloudflare provider Home menus; **this dated owner directive overrides those proposals for Google Drive, Dropbox and OneDrive only**.

1. **`extension/background.js`**: inspect `buildMenus()`, `finish()`, `menuApplicationKey()`, shared native menu writer, `rightClickNativeIds`, `obsolete()`, `rebuildMenus()`, stale ID cleanup, and `chrome.contextMenus.onClicked` dispatch ownership. It currently delegates to provider-specific fragments/composers; do not introduce another native writer or call `removeAll()` destructively.
2. **`extension/google-drive-menu.js`** currently declares a parent `provider:google-drive` plus `provider:google-drive:save-redown` or `:connect`; its `compose()` and `composeSibling()` also encode Google Drive / Dropbox ordering and sibling-child assumptions. Refactor so the provider entry itself is the direct action; retain stable provider namespace, proper position, and safe stale-child cleanup. Do not create a new Google Drive folder as an incidental result of this menu change.
3. **`extension/onedrive-menu.js`** currently declares `provider:onedrive` plus `:save-root` or `:connect`, and its composer requires exactly two items. Make it one direct-action provider entry and adjust **only the necessary** validation, insertion logic and old-child retirement. Preserve OneDrive root-save identity, current authentication boundary and actual upload behavior.
4. **`extension/dropbox-menu.js`** currently emits `provider:dropbox`, which is already the save action when connected, but adds `provider:dropbox:connect` when disconnected. Make `provider:dropbox` the only menu entry in all states. Do not leave a phantom arrow when login is needed; preserve original authorized root identity and namespace checks.
5. **`extension/google-drive-provider.js`, `extension/onedrive-provider.js`, `extension/dropbox-provider.js`**: update **their exact owned ID dispatch handling** so the top-level provider ID is actionable and determines save versus connect/reconnect from current verified state. Never treat a child row removed by the menu projection as a valid alternative action. Do not conflate the native menu ID with provider auth credentials or cloud destination identity.
6. **V3 Cloudflare**: do not modify the V3 engine's projection, directory Depth/Narrow, tree editor, saved destinations, default `redown` bucket creation/activation, or Cloudflare save routing, except if demonstrably necessary to avoid a regression. Existing V3 remains the **sole menu authority**.

### Important reliability details

- Native Chrome context-menu parents with children are not reliable clickable save actions. For the three flat providers, **create no children at all**. A single native row must be a real leaf and carry the provider's direct action.
- Use the existing shared **single contextMenus registration/composition writer**. Keep deterministic ordering next to Cloudflare; do not assign overlapping IDs or create competing rebuild loops. Preserve controls and provider row names.
- Handle upgrades from the previous nested format: identify and remove obsolete `:connect`, `:save-redown`, and `:save-root` child IDs through the existing safe acknowledgement/reconciliation flow, respecting known IDs, existing Chrome menus, partial failures and service-worker restart. No unrelated deletion, duplicate rows, missing root, or stuck arrow.
- Saving, OAuth, cloud provider permissions, token refresh, filename/extension integrity, source URL privacy, and transfer History must be **unchanged except for the minimum required click dispatch**. No broad `host_permissions`, silent extra approvals, URL leakage to cloud API metadata, or new storage mutations.
- Preserve Root, Cloudflare and management menu access even when providers are disconnected or Chrome rejects an update. Registration success means Chrome has acknowledged the desired structure, not merely that the configuration was saved.
- For a provider unable to save due to current real limitations, show a truthful provider-specific state or connect path, not an unrelated Explorer/Home redirect or fake successful save.

## Acceptance tests REQUIRED

**Native hierarchy**
- Connected: exactly **one** menu entry per non-Cloudflare provider; all three have `parentId=REDOWN` (existing real root ID), and **no entry has any of those three provider IDs as its parent**.
- Disconnected, connecting, reconnecting, expired: same flat structure, one row each, with direct click appropriate to state.
- Cloudflare alone: leaf when one verified destination, submenu only when it has its own eligible configured children. Cross-provider connect/disconnect never changes Cloudflare's submenu shape.
- Provider ordering: Cloudflare, Google Drive, Dropbox, OneDrive, then existing management controls (honor actual pre-existing utility constraints).
- Right-click from link/image/video/audio/page uses appropriate supported context; unsupported sources fail truthfully.

**Behavior**
- Right-click `REDOWN → Google Drive` triggers existing Drive save or connect without another choice.
- Right-click `REDOWN → Dropbox` triggers existing Dropbox root save or connect without another choice.
- Right-click `REDOWN → OneDrive` triggers existing OneDrive root save or connect without another choice.
- Exact native ID dispatch and stale child-ID handling after update/restart; clicking a previously registered obsolete row cannot silently reroute or create a phantom duplicate.
- Reapply/restart, Chrome fresh install, provider sign-in/sign-out changes, partial native registration failures and interrupted worker.
- Confirm no change to V3 Cloudflare saves, Nested/Narrow/Depth, Cloudflare Home, the Shelf, existing destinations, source confidentiality, or provider receipts.

Update/add **focused tests** using `tests/google-drive.test.mjs`, `tests/dropbox.test.mjs`, `tests/onedrive.test.mjs`, `tests/onedrive-connected.test.mjs`, native composer tests and any actual installed-Chrome native menu harness. Update older tests that expected submenu children only where those assertions became obsolete. Explicitly distinguish unit tests from installed Chrome/live provider evidence.

## Work order and deliverables

1. Inspect and record current menu IDs, hierarchy, auth state logic, dispatch call sites and safe native-registration behavior.
2. Implement minimal provider fragment + composer + dispatcher edits, keeping Cloudflare V3 untouched and one registration authority.
3. Retire obsolete child entries safely and prove stable behavior across restarts and state transitions.
4. Run targeted tests, existing reliability checks and an installed Chrome verification where possible. Capture exact menu tree and click receipts; do not call absent live tests PASS.
5. Document changes, regressions, unresolved issues and which provider file capabilities remain limited (including Google's separate seamless-save to-do).
6. Commit the code on an appropriate working branch and push it **without force**. Do not advance `main` automatically unless the owner has separately authorized it for that implementation.

**Do not stop at documentation, audits, mocks or proposals: Codex is being asked to implement the actual native-menu behavior.** Do not overwrite the owner's checkpoint tag.

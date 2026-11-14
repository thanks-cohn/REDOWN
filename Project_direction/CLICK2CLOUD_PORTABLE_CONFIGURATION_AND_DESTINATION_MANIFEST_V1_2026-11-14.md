# Click2Cloud Project Direction — Portable Configuration & Destination Manifest v1

**Recorded:** 2026-11-14 (America/Chicago)  
**Owner-approved direction; not yet implemented**  
**Product:** Click2Cloud (not ReDown Remote / ReRe)  
**Source home:** `Project_direction/`

## The owner's goal

Click2Cloud must provide an obvious **Export Configuration** command so users can migrate to a new version or installation of the extension without manually rebuilding their right-click destinations. A new installation should accept the user's exported configuration through **Import Configuration**, validate and migrate it if needed, reconnect accounts securely, and resume with the same intended destinations, folder hierarchy, presentation mode and preferences.

The same portable configuration format should be a foundation for bulk destination management: **Import, Export, Preview, Repair**, and eventually explicitly authorized AI-assisted destination planning.

### User experience

**Old Click2Cloud extension:**
1. Open Settings / Destinations Manager.
2. Select **Export Configuration**.
3. Download a portable file (proposed JSON) with a clear schema version, application version, export timestamp and non-secret configuration.
4. The file is portable between supported Click2Cloud versions and install profiles.

**New Click2Cloud extension:**
1. Install/open the new build and select **Import Configuration** on initial setup and in Settings.
2. Select the previously exported file.
3. Preview all destinations, profiles/account mappings, menu modes, nesting, ordering and preferences, with any incompatibilities or missing permissions called out.
4. Safely reconnect/re-authorize the actual cloud accounts in the new installation if required. **Do not export or import OAuth tokens, API secrets, Worker secrets, browser credentials, or other authentication material.** A configuration file cannot bypass Cloudflare or provider authorization.
5. Confirm **Restore / Apply Configuration**. Run the existing validated V3 persistence and native menu registration workflow. Show the actual applied/rejected/needs-reconnect result; don't confuse saved config with successful right-click menu registration.
6. After confirmation, the user should see the same effective right-click destinations, folder hierarchy and settings as before, insofar as the current accounts and provider capabilities permit.

### Required export coverage

- Provider and account **identity references suitable for secure re-linking**, not credentials.
- Right-click destinations: bucket identity, key-prefix paths, user-facing labels, enabled/disabled state, stable identifiers, nesting/parents, sorting/order.
- **Simple** flat shortcuts.
- **Narrow** explicitly selected branches with correct bucket display and distinct paths even when leaf names match.
- **Depth** participating bucket selection, selected depth (up to the supported engine limit), and intended behavior. Discovered folder inventory is *not* transferable proof of current cloud contents; refresh after reconnection.
- Chosen active right-click presentation mode and mode-specific settings as supported by the actual saved schema.
- Other relevant user preferences where safe, with an explicit inclusion list and exclusions (e.g., do not bundle sensitive browsing history, diagnostics/RAW, saved URLs, arbitrary site contents, cache, jobs, private file metadata or provider secrets by default).
- An optional machine-readable compatibility report so incompatible fields can be migrated or clearly skipped.

### Optional recreation of genuinely missing cloud locations

**Owner clarification (2026-11-14):** Normal configuration import assumes the user is returning to **the same cloud account** after an extension loss, reinstall, browser-profile change or version upgrade. Under that assumption the original buckets and folders may still exist even if the extension's local destination records have vanished. **Reusing existing cloud locations is the default.**

Import must reconcile three separate states: (1) location exists and is accessible in the reconnected account, (2) location is confirmed missing, or (3) location cannot be established because account mapping, authorization, listing or network access is incomplete. Never label (3) as missing, and do not provision anything based on an unknown result.

- If a referenced destination **already exists**, relink its account/bucket/key-prefix mapping and reconstitute the intended right-click configuration without touching its cloud objects.
- If it is **positively confirmed missing**, explicitly ask: **"Some saved locations don't exist in this cloud account. Create the missing locations?"** Default is **No / Skip**. Show a clear review of each proposed bucket and folder prefix, target account, actions and potential consequences before an opt-in.
- Allow **Create selected** (rather than all-or-nothing), with a separate, explicit confirmation for creating entirely new R2 buckets versus folder prefixes in an existing bucket. Check provider permissions and expected naming/limits. Creation uses the user's own authorized cloud account, not any privileged shortcut.
- In **Cloudflare R2**, a "folder" is generally an **object-key prefix**, not an independently stored directory. Merely importing a prefix into Click2Cloud can make a legitimate save destination without writing a placeholder object. If visible folder materialization is requested, explain that this may require a zero-byte/marker object or equivalent supported representation and let the user opt in to that write. Do not create marker files silently or overwrite a preexisting marker/object.
- On a successful opt-in, create only confirmed absent, selected resources, retry safely, independently verify the new bucket/prefix representation and then register/reconcile the destination. Report **created**, **already existed**, **skipped**, **failed**, **unknown / needs reconnect** separately. On a failure, preserve the imported desired configuration in a reviewable/unavailable state; never falsely report a working destination.
- No automatic bucket provisioning, folder markers, account transfer, object copying, deletion, cleanup, credentials import, forced replacement, or repeated retries with ambiguous outcomes. A later import must be idempotent and must not recreate locations unnecessarily.

**Acceptance tests:** Same-account export → extension reinstall → import with all locations still present should cause **zero provider writes** and restore existing paths. A confirmed missing location should trigger a clear opt-in prompt; declining creates nothing. Selecting one missing prefix/bucket should create only that selection and verify it; partial permission failures should preserve all other working destinations. An inaccessible account or timeout must never be mistaken for missing infrastructure.

### Depth Hierarchy Snapshot — optional export through the selected depth

**Owner-approved project direction (2026-11-14):** In addition to storing the Depth mode's selected bucket(s) and numeric depth, **Export Configuration** should optionally export the discovered folder hierarchy **from each participating bucket root down to that user's selected maximum depth**, including all encountered sibling branches and ancestor/parent-child relationships. Example: selected `Depth 5` on `click2cloud-qa-2` can describe `Level-1/Level-2/Level-3/Level-4/Level-5/` and its 2/4/3/5 sibling test branches. This is a *structural inventory snapshot*, not a backup of the files themselves.

**Export semantics:**
- Provide an explicit option, e.g. **Include Depth Hierarchy Snapshot**; the ordinary configuration export must still work without scanning entire R2 buckets.
- Record account and bucket identity, depth used, normalized prefix per discovered virtual folder, parent prefix, per-bucket scan timestamps, snapshot schema/algorithm version, counts and completeness/error/truncation metadata. Include enough stable identity to distinguish same-named prefixes in different buckets and to reconnect safely; never embed OAuth tokens, provider secrets, file contents or arbitrary object-key listings.
- Traverse real authorized R2 listings and paginate properly (including delimiter/common-prefix enumeration). Discover siblings and deeper prefixes only through the configured depth; don't confuse a folder displayed in the extension UI with an independently stored directory.
- **Do not silently equate the current bounded Depth menu inventory with a full export.** The live menu path has limits (e.g., nodes, pages, time, native menu entries). Snapshot export may require a separately bounded, cancellable, permission-aware discovery with progress and explicit completeness. If the scan is partial, timed out, unauthorized, truncated, or cancelled, label affected subtree(s) **partial/unknown**; do not claim a complete hierarchy backup.
- A large bucket must have safeguards for pagination, volume, runtime/memory, rate limiting and user privacy. Allow a partial file with prominent warning, or safely abort. No requirement to enumerate object contents or include their filenames beyond what is necessary to establish folder prefixes.
- Do not overwrite or mutate cloud resources while exporting.

**Import/restore semantics:**
1. On the same authorized/reconnected account, restore the selected Depth setting and participating buckets, then rediscover the current live hierarchy. Current live R2 data, not the saved snapshot, drives the right-click menu.
2. If a snapshot was included, compare **within the known exported scan scope**: found paths, positively missing paths, new live paths and unknown/inaccessible paths. Never classify a path missing if current scan of its parent is incomplete, access denied, stale or unreliable. A partial old snapshot never proves that unlisted branches did not exist.
3. Show a clear hierarchy diff, including bucket and depth, and ask **“Create missing locations?”** with **No / Skip** selected by default. Allow per-bucket and per-prefix selection, plus the option to restore only the Depth menu settings.
4. If approved, materialize selected missing *virtual prefixes* only when needed to make the empty structure appear (e.g., a safe, non-overwriting marker object); new bucket creation needs **separate explicit confirmation**. For a selected child path, infer required missing ancestors but preview those actions individually. Do not recreate image/file contents, rename paths, delete anything, or overwrite existing objects.
5. Independently verify each authorized creation, handle concurrent changes/idempotent retries honestly, and rebuild the Depth menu from the current discovered R2 structure. Treat “configuration restored,” “prefix marker created,” “menu registered,” and “test save verified” as distinct results.

**Acceptance:** Export a complete Depth 5 hierarchy from `click2cloud-qa-2`, confirming all main path ancestors and 14 sibling paths (2/4/3/5 distribution). Import into a new Click2Cloud installation against the same cloud account: with all paths present, zero R2 writes; with a confirmed missing marker-backed prefix, preview and optionally recreate **only** the selected missing structure; with incomplete listing or insufficient permissions, report unknown and perform no automatic recreation. Confirm subsequent real Chrome right-click menu parity and verified saves to selected destinations.

### Destination Manifest v1: bulk management

A human-readable, versioned JSON **Click2Cloud Destination Manifest** should support four first-class operations:

1. **Export** existing intended configuration to a portable file.
2. **Import** a manifest with safe account matching and schema checks. On an existing installation, default to **non-destructive merge**, not replace; on a fresh installation, offer configuration restoration after reconnect.
3. **Preview (dry run)** precise adds/updates/unchanged/conflicts/unknown-account rows and a projection of the expected native Chrome menu. **Preview does not mutate state.**
4. **Repair / Reconcile** intended versus persisted configuration, with targeted, user-approved changes. Re-importing the same file should be **idempotent** (no duplicate destinations or unrequested reorders).

Export of the **full portable configuration** and export of a **destinations-only manifest** may share one common schema/core parser, but the UI should distinguish them when necessary. No second V3 destination engine or separate Chrome menu writer.

### Architecture and security

- Build a **versioned schema and migration chain**, with source version and target compatibility; reject unsupported future versions safely and show actionable explanations rather than silently dropping unknown settings.
- Use existing **V3 validators, serialized write/revision checks, safe snapshots and the single native menu registrar**. Never permit an untrusted JSON file to write arbitrary `chrome.storage.local` keys or execute code.
- Check stable provider/account/bucket identities and resolve them explicitly after login. Never match by a bucket name alone when there could be several identical names.
- Prevent path traversal, malformed roots, unauthorized bucket access, invalid parent IDs, cyclic nesting, duplicate identities, excessive depth/entry sizes, wrong account mapping and ambiguous labels.
- Keep Simple, Narrow and Depth intentions distinct. Changing/restoring one mode must not silently change other modes; audit current V3 coupling before promising full isolation.
- Before applying to a populated installation, take an internal rollback checkpoint, show the diff, and require specific approval for overwrite/replace. Preserve existing unrelated destinations, auth profiles and storage.
- Treat malformed, conflicting or partially applied imports as recoverable. Show honest statuses: **import validated**, **configuration saved**, **Chrome menu registered**, **live destination verified** are separate states. A newly imported path is not automatically proof of a real successful save.
- Do not export secrets or pretend the new installation is authorized merely because it imported a configuration.
- Unlike the **existing encrypted right-click directory backup** (`extension/right-click-backup.js`, `extension/right-click-backup-settings.js`), which currently targets fresh-profile recovery, this is a **user-friendly transferable configuration workflow** intended for normal extension upgrades and reinstallations. Reuse safe validation where practical; do not weaken the encrypted backup or its restore protections.

### Example of an intended portable document (illustrative, NOT supported code)

```json
{
  "format": "click2cloud-configuration",
  "schemaVersion": 1,
  "exportedFrom": { "app": "Click2Cloud", "version": "example" },
  "accounts": [{ "provider": "cloudflare", "reference": "account-alias-to-reconnect" }],
  "rightClick": {
    "activeMode": "depth",
    "simple": [{ "bucket": "click2cloud-qa", "prefix": "C2C-QA/Simple/A/", "label": "Simple A" }],
    "narrow": [{ "bucket": "click2cloud-qa-2", "prefix": "Level-1/Level-2/Level-3/Level-4/Level-5/", "label": "Deep Test" }],
    "depth": { "bucketNames": ["click2cloud-qa-2"], "levels": 5 }
  }
}
```

The example omits account identity, stable destination IDs and parent/order details for readability; **do not use it verbatim as a production import format**. Implementers must design these mappings before shipping. It has no tokens or credentials.

### Initial test fixture & acceptance

As of 2026-11-14, two isolated QA buckets exist in Cloudflare R2:

- `click2cloud-qa`: nine marker-backed prefixes, `C2C-QA/{Simple|Narrow|Depth}/{A|B|C}/`.
- `click2cloud-qa-2`: those nine prefixes plus the 5-level nested path `Level-1/Level-2/Level-3/Level-4/Level-5/` and fourteen sibling prefixes (2, 4, 3, 5 by increasing depth). Overall **37 planned test destinations** across both buckets, **74 right-click save attempts** at two per location. R2 marker prefixes exist; Click2Cloud destinations have **not** automatically been registered by their creation.
- The Narrow bucket-label/duplicate-leaf issue is tracked in [GitHub Issue #61](https://github.com/thanks-cohn/REDOWN/issues/61) and must not be hidden by import/export work.

Minimum acceptance scenarios:

1. **Old-version export → new-version import:** produce a restored equivalent destination and menu configuration after re-authentication, with a documented migration receipt.
2. **Export → import on current configured installation → repeat import:** no duplicates, no unrequested path changes, no silent reordering; preview and idempotence proven.
3. Two buckets, duplicate folder names and multiple accounts: import maps paths unambiguously; Narrow menu correctly shows their real buckets.
4. Restore the chosen Simple / Narrow / Depth settings and five-level path while preserving or honestly flagging any unsupported fields.
5. A revoked/missing provider or bucket is shown as **requires reconnect/unavailable**, not marked restored and ready.
6. Invalid or tampered JSON is rejected without damaging saved state. Concurrent edits/Chrome restarts yield recoverable, truthful outcomes.
7. Install actual Chrome extension and verify native right-click menu and independent R2 saves; passing unit/schema tests are not enough.
8. Build a migration test fixture from a real previous version and ensure no direct token export, OAuth bypass or unrequested cloud write.

## Product positioning and future automation

This is both a **migration feature for every Click2Cloud user** and an operational/QA accelerator for bulk right-click destinations. An eventual authorized AI/agent management bridge may generate, preview and propose manifests, but does **not** mean that ChatGPT currently has direct write access to the extension. Any automation must be explicitly consented, restricted and auditable.

**Implementation status:** Project direction only; no extension code, settings UI, manifest importer, OAuth flow or browser behavior has been changed by this document.

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

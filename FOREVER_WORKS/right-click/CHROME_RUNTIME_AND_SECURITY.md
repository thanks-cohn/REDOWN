# Native runtime, authority and security

[Route](README.md) · [Wiring](WIRING_AND_STATE.md)

## Exact descriptor identity

Root id redown, contexts link/image/video/audio/page. Simple quick:<profileId> and simple-option:<profileId>:<optionId> directly under root. Nested root nested:<profileId>:<rootId>:<rootId>; child nested:<profileId>:<rootId>:<nodeId>; branch adds :send. Immediate-parent ID follows ancestry; branch Send here is inserted immediately after parent descriptor. Profiles sort menuOrder, roots/children retain array order. Simple globally sorts primary/item order, labels trim explicit then deepest path then bucket. simpleLabelFallback is ignored currently.

Built-ins: redown-setup if empty, redown-mode-separator, redown-nested-mode, redown-saved-urls, redown-manage. Setup/manage opens Modern. Saved-object URLs matches successful transferHistory by source URL, stores an opaque session lookup redownUrlLookup:<UUID> and opens Modern; it does not prove object existence/public accessibility.

buildMenus attaches internal target metadata, strips it before Chrome registration. Click revalidates current saved state. Old tree: is not a transfer compatibility route. Stale :send is rejected if parent no longer has immediate children. Source-generated UUID/profile conventions work; imported colon-bearing ID grammar needs explicit future policy.

## Actual owner versus future boundary

| Permission | Current actual code/gate | FUTURE / NOT IMPLEMENTED |
|---|---|---|
| Read definitions | Internal profiles message/storage, can contain secrets | Redacted explicit snapshot reader/freshness |
| Edit draft | Modern Simple + shared Nested draft adapter | UI-independent draft tooling separately authorized |
| Persist definitions | saveDestinationConfig exact beta/explorer.html sender, signature, known IDs/menu fields, active validation | Preserve guarded adapter; no raw external storage authority |
| Seed definitions | cfProvision sender-derived menuActivation; cfSetupRedownQuick sender+confirmed:true | Explicit infrastructure capability distinct from edit |
| Legacy preferences | saveStoragePreferences exact options.html sender and allowlist | Keep private adapter; never menu fields |
| Plan | Shared menuEntries, background uniqueness/parent check | Read-only same pure normalized plan |
| Native create/remove | Background rebuildMenus/buildMenus | Private executor with observed revision/outcome |
| Resolve ID | destination-config.resolve fresh saved model | Same resolver, redacted inspection |
| Start transfer | Native click/internal ingest/gallery paths | None in read-only API |
| Create/delete remote | Explicit UI/provider OAuth or Worker bearer; separate Explorer delete commands | Separate scoped mutation/confirmation |
| Style/mode presentation | Modern DOM/CSS/theme; mode persisted Modern/native | Replaceable presentation with independent proof |
| Legacy conversion | fromLegacy/initialize/menuTree backup | Private versioned reader, never native writer |

## Write-path census and gate limitations

1. saveDestinationConfig serializes on destinationSaveQueue; exact sender URL after query/hash removal; expected JSON signature; known Cloudflare patch IDs; allowed fields only. Validates active mode, stores profiles/rightClickMode/first backup; then rebuild. Patches cannot replace account identity or credentials.
2. saveStoragePreferences same queue; exact options sender; allowed name,folders,defaultCategory,repository,branch,workflowFile,paths,defaultPath, plus GitHub token special case. No profile membership/menu writes.
3. Native checkbox same queue, mode-only write then rebuild; no full model validate. Already-resolved transfer is not cancelled.
4. setProfiles serializes delayed infrastructure and merges current menu fields/preserves unrelated profiles. menuProfileId bypass supports explicit one-profile dedicated setup.
5. cfSetupRedownQuick requires exact Modern sender and confirmed:true; checks discovered account, creates/reuses lowercase redown bucket, reads back creation, reuses healthy Worker>=6, preserves former prefix/options/mode, updates one profile/rebuilds.
6. cfProvision derives menuActivation from Modern sender; Legacy setup prepares infrastructure without seeding active menu. Profile construction/merge preserves current definitions against delayed writes.
7. cfCreateBucket/cfCreateFolder handlers do **not** each repeat exact-sender/confirmed gate. Current discipline is UI actions + extension-internal messaging + provider authorization, not universal message ACL. Shared Nested root creator hidden in Modern existingOnly; dedicated/storage controls still create buckets.
8. Modern folder create adds betaNoProvision:true; unhealthy Worker requires explicit setup; betaNoRepair suppresses repair. General native ingestion defaults noProvision=false and may provision/repair.
9. Direct extension-context storage writes bypass guarded save and trigger rebuild. No universal persisted schema/ACL is claimed.
10. Adjacent public-URL controls are independent confirmed mutations, not menu removal.

ManifestV3 declares contextMenus/storage/network/execution permissions; no externally_connectable entry found. Internal profile/history responses and raw provider errors are not a public redacted inspection API.

## Transfer, feedback and limits

selectedUrl prefers srcUrl over wrapping link, then pageUrl. Native route calls ingestCloudflareAtPrefix directly, not category-based ingest wrapper; do not attribute wrapper HTTPS check to this path. Embedded Worker checkedFetch validates public HTTPS/redirects; full DNS-rebinding defense not proved.

Worker handles exactFolder, inferred filename/extension, unique conditional-create key, source provenance metadata, default314572800-byte cap. Known length streams via FixedLengthStream; unknown length buffers bounded chunks then combines bytes. putNewDownload uses If-None-Match:* and rejects null claim; there is no independent HEAD/byte read-back in native ingest. Separate Explorer copy/move verifiedObjectPut machinery must not be assumed to cover native URL ingest.

Background accepts response.ok/body.ok and nonempty key whose parent equals requested folder; mismatch says file may exist/check before retry. recordTransfer delegates history/counter and cosmetic feedback. Counter counts ok:true with HTTP(S) or R2 location, stores lifetime total plus50-row recent compatibility history, attempts archive before truncation, archive failure does not fail completion. Cloud/history/counter are not a distributed transaction. Notifications default off; stale-ID feedback can be suppressed.

Hitomi gallery documents without srcUrl divert to generated ZIP capture; accidental HTML transfer is blocked. Full gallery/session/buffering/auth/suspension security remains partial, not live-certified.

## Phase 2 addendum — 30 October 2026

Phase2 [diagnostic tree](CHROME_MENU_PARITY_AND_DIAGNOSTIC_TREE.md) distinguishes saved/registered/rendered/received; [browser future requirements](BROWSER_TO_CLOUD_FUTURE_REQUIREMENTS.md) documents existing site-specific Blob bridge and limits without generalizing it.

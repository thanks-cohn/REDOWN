# TO IMPLEMENT

**Project:** REDOWN
**Status:** Product roadmap and implementation backlog, not a declaration of implemented or tested features
**Working branch:** `codex/v3-parity-first-reconstruction`
**Protected checkpoint:** `BASE-v3`
**Last consolidated:** 2026-10-30

## Product promise

REDOWN is a polished, reliable universal cloud file explorer and browser right-click remote saver. Core file management stays useful and free. Premium Elite expands the number of enhanced directories and adds compelling collection, history, archive and automation workflows. Preserve existing REDOWN Explorer UX, its attractive V3 right-click editor, URL system, History, neon intro, mascot, and Money Machine personality. Reuse the current CBZ/ZIP preview paths rather than inventing duplicate readers.

## Pricing and entitlements

- **Free forever:** one independently selectable directory for **Comic Universe**, one for **Time Machine**, and one for each future eligible premium directory-based experience, such as Collection Studio. These are permanent trial-sized features, not temporary trials. Core cloud connections, basic file management and essential preview features remain free.
- **Premium Elite:** **$5/month OR $12/year**, unlocking **unlimited eligible feature directories** and advanced premium features. Annual price is the proposed strong adoption offer; validate margins and billing fees before release.
- "Unlimited" describes the number of eligible directories, not unlimited REDOWN-hosted bandwidth, cloud storage, retention, backup bytes, or processing. Clearly disclose operational limits and any provider costs. Allow a Free user to reassign each free directory slot without deleting the underlying files.
- Core safety/reliability (verified moves, predictable errors, Keep Both, safe restores/receipts where relevant) must not become premium-only.

## Free core requirements and improvements

1. Preserve Cloudflare R2 integration and the current REDOWN file Explorer.
2. Supported cloud providers must deliver consistent baseline capabilities: list/navigate/search; upload/download; copy/paste; cut/move; rename; create/move/rename/delete folders; delete files; multi-select; drag/drop; basic previews; refresh; right-click remote save; progress, errors, and History.
3. **Keep Both** is the default filename-conflict handling, not Skip. Never delete the original during a move before the destination is successfully written and verified. Report partial moves accurately.
4. Existing Chrome REDOWN right-click destinations, custom labels and exact bucket/prefix routing. V3 has locally implemented **Simple / Nested**, where Nested reveals **Narrow / Level**, where Level reveals numerical **Depth 1–10**. Controls go top-right in the existing V3 Right-click Setup header. Preserve the editor unchanged. Narrow uses configured menu destinations and labels; Level uses actual cloud directory names and bounded authorized discovery. Verify in installed Chrome and live Cloudflare before calling done.
5. Automatically refresh the relevant Explorer folder after confirmed remote saves, preserving view, scroll and selection.
6. Preserve Get URL, all available URLs, domain handling, explicit Yes/No for enabling bucket-wide public access, clickable source URLs and clear History errors. History defaults to Today expanded when opened.
7. Preserve basic image, archive/CBZ/ZIP and other supported previews, standard ZIP/CBZ tools, gallery routes, keyboard navigation, pinned previews and lightboxes wherever currently implemented; verify rather than assume parity.
8. Screenshot-to-cloud as a future common workflow; verified-save odometer, Money Machine bill-counter/casino-inspired sounds, rising-pitch save streaks, mascot reactions and OVERDRIVE around 100 saves/minute as playful nonessential UX. Keep sounds/notifications opt-in or controllable.
9. Multiple connected S3-compatible accounts and buckets; baseline cloud features do not require Premium Elite.

## Premium directory feature: Comic Universe

**Entry point:** select an existing directory, choose **Make Comic Universe**. One active directory is free; Premium Elite permits unlimited eligible directories.

- Index eligible `.cbz` and `.zip` files (with explicit recursive option); do not unpack whole archives into cloud folders, move source files or re-encode them.
- Read archive structure safely and extract only the first suitable page/cover image into a local/cache thumbnail. Use ranged reads where supported and bounded fallback otherwise. Cache/index lazily; large libraries must not cause a burst of complete archive downloads.
- Render one floating cover card per archive with its title. Create a polished, navigable, **finite wraparound plane**: exiting one edge re-enters at the opposite edge. Virtualize and cap on-screen elements; do not endlessly spawn objects. Avoid overlapping titles, preserve accessibility, provide grid/list/reduced-motion alternatives.
- Clicking a cover must invoke the **existing REDOWN CBZ/ZIP preview flow**, not a new incompatible reader. Preserve current archive identity and provider location.
- Future optional enhancements: remembered reading position, series/volume grouping, sorting, favorites, cover override, gallery presets. Clearly distinguish proposed enhancements from existing reader features.
- Provider-independent: operate through REDOWN's universal storage contract on R2, S3, MEGA S4, and later native-provider adapters.

## Premium directory feature: Time Machine

**Entry point:** select an existing authorized directory, choose **Enable Time Machine / Lock On**. One tracked directory free; unlimited tracked directories for Premium Elite. Track descendants by default.

- Lightweight JSON manifests/events keyed by **stable provider/account/container/object identity where available**, canonical paths, timestamps and observations. Store tracking metadata separately or exclude internal metadata from tracked scans.
- Immediately record operations performed by REDOWN (create, save, rename, move, copy, delete, update). Reconcile external changes by bounded periodic/on-open scans, with timestamps and clear coverage indicators.
- Maintain **latest verified directory state**, previous known paths, file movement/rename history, additions/removals, content/metadata changes, and searchable event timelines.
- Provide **Find this file**, **Where did it go?**, **What changed?**, **What was here at the last scan?**, and compare observed directory states. Distinguish confirmed movements from inferred matches based on hashes/size.
- Do not claim perpetual observation when the extension is asleep/offline; surface last verification time and stale/incomplete scans. Move inference cannot be certain without authoritative IDs or operation events.
- JSON metadata alone **cannot restore deleted/overwritten file bytes**. Recovery requires real provider object versioning, REDOWN snapshot copies or independent backups. Clearly separate tracking from backup and require explicit retention policy and capacity accounting.
- Future: multi-cloud history, tagged snapshots, changed-file alerts, version diff and verified restore.

## Premium directory feature: Collection Studio

One free enhanced gallery directory; unlimited Elite. Turn any authorized image/media directory into polished curated galleries, custom presentations and cached previews without moving source objects. Directory enhancements can be activated together: Comic Universe + Time Machine + Collection Studio share identity and inventory. Use saved directory feature presets rather than duplicate records.

## Other Premium Elite feature roadmap

- **Archive Workshop:** advanced ZIP/CBZ batch create, merge, split, repackage, bulk organization; preserve basic open/preview and ordinary archive actions as free.
- **3D Asset Studio:** richer GLB/GLTF viewing, model rotation, thumbnails and collections; basic supported file previews remain free.
- **Multi-Cloud Mirror:** optional verified saves to multiple independent providers, redundancy rules, failure reconciliation, and per-provider receipts. Transparency about relay/bandwidth costs.
- **Automation Recipes:** user-defined rules for classification, destinations, scheduled synchronization and batch organization. Explicit permissions and safe dry-run.
- **Advanced Batch Tools:** rename/organize collections, metadata extraction, sort and preset workflows.
- **Smart Duplicate Finder:** compare file hashes and metadata across authorized clouds with safe review before deletion.
- **Advanced transfer management:** resumable jobs where practical, cancellation, queueing, detailed diagnostics and analytics. Essential reliable/verified transfer baseline remains free.
- **Desktop companion and premium license:** potential Premium Elite entitlement, with shared universal storage API; business model needs later validation.
- **Saved Collection Presets** and enhanced visual library discovery.

## Provider architecture decision, establish before new connectors

**One Explorer and Feature Engine, one provider-neutral REDOWN Storage API, one shared S3 engine, small provider profiles/adapters, and separate native API adapters for non-S3 clouds.**

- Shared universal contract: canonical identify/list/stat/read/readRange/write/delete/createFolder, streaming, pagination and capabilities. Cross-provider coordinator implements copy/move/rename/folder operations, conflict rules, verification, retry/cancellation and progress, with optimized native operations where safe. Source deletion occurs only after verified destination completion.
- Shared S3-compatible transport for Cloudflare R2, AWS S3, DigitalOcean Spaces, Backblaze B2 S3, Wasabi, MEGA S4, MinIO and generic S3 endpoints, with provider-specific endpoint/signing/region/addressing/capability quirks and provider conformance tests. Do not assume every S3-compatible provider implements every optional API.
- **MEGA S4 is not ordinary MEGA Drive.** Native MEGA Drive, Google Drive, OneDrive and Dropbox require different adapters but must expose the same REDOWN high-level file operations and shared CBZ/ZIP/GLB/Time Machine features where supported.
- Distinguish direct cloud-side copy from client/worker-mediated cross-provider streaming; do not promise zero transfer or egress costs.
- Runtime capability detection and conformance tests rather than provider-specific switches scattered through the Explorer. Unverified generic endpoints remain labeled unverified.
- Feature engines consume provider-neutral byte streams, range reads, metadata and stable IDs. Thumbnail extraction, archive previews, Time Machine logs and collection UI must never be rewritten per provider.
- Protect credentials, access scopes and provider authorization. Keep Chrome-specific UI independent of portable core for desktop reuse.

## Legacy versus new Explorer, required feature-parity investigation

**Do not assume every historical Legacy behavior is absent merely because its UI moved.** Existing audits focus mainly on right-click setup. Conduct a **separate actual-source and, where possible, installed-app Legacy Explorer vs current Explorer audit** with states: legacy present / V3 present / missing / regressed / unverified.

Known or documented distinctions:
- Former Legacy **Simple/Nested** mode now has a V3 local implementation with Narrow/Level and Depth, but installed Chrome/live provider acceptance remains unverified.
- Historical Legacy offered **drag-handle ordering** in right-click setup; V3 uses Move Up/Down, with drag reordering not implemented. This is setup parity, not necessarily Explorer drag/drop parity.
- Legacy could default blank menu labels to bucket-name preference; V3's default/fallback differs. Explicit custom labels and path IDs must be preserved.
- Legacy had primary plus additional destination controls; V3 intentionally replaced these with the single tree editor. Do **not** restore separate Legacy UI or unsafe whole-profile writers.
- V3 offers autosave, guarded revision transactions and a corrected immediate-parent nesting planner. Historical deep Legacy hierarchy had a known ancestry bug; do not reintroduce it.
- V3 preserved Explorer source but did not broadly repair/re-certify reported Explorer operation failures. Verify file copy/paste/move (same/cross bucket), rename/delete, multi-select, drag/drop, folder operations, search and navigation, preview/lightbox/pinned state, archive/CBZ routes, upload/download, History, Get URL/domain/public consent, connection/session recovery, large-folder pagination, stale selection, automatic post-save refresh.
- Inspect any Legacy-only affordance, keyboard shortcut, context action or status feedback. Attribute each gap to code and reproduce it before recommending restoration.
- Run baseline plus regression suites and installed Chrome/native tests; do not call mocks live proof. Protect `BASE-v3` and preserved historical checkpoints.

Sources for comparison:
- `FOREVER_WORKS/v3/PARITY_MATRIX.md`
- `FOREVER_WORKS/v3/HANDOFF_LATEST.md`
- `FOREVER_WORKS/right-click/phase-3/HISTORICAL_LEGACY_END_TO_END.md`
- `FOREVER_WORKS/right-click/phase-3/KEEP_REPLACE_DECISION_MATRIX.md`

## Suggested implementation order

1. Finish installed Chrome/real Cloudflare acceptance of V3 menu projection and core Explorer operation reliability; complete legacy-versus-current Explorer parity audit.
2. Define provider-neutral storage API, safe copy/move verification and common connector conformance suite.
3. Add a generic S3 connector and validate with Cloudflare R2, AWS S3, DigitalOcean Spaces and a further independent endpoint. Keep same Explorer UX.
4. Implement Comic Universe as a thin directory-index + floating-card presentation over the **existing** CBZ/ZIP preview. Give one free directory.
5. Implement Time Machine as JSON manifest + event observation + bounded reconciliation; give one free directory. Separate tracking from content backups.
6. Extend to Collection Studio, Archive Workshop, GLB Asset Studio, multiple-cloud redundancy, automation and future native adapters.

## Acceptance principles

- No existing V3 tree redesign; new mode controls reside in top-right of its header.
- One shared user-facing REDOWN system, not a new Explorer per cloud.
- Free baseline always includes the essential file operations.
- Premium is genuinely useful at one directory per eligible feature; Elite removes directory counts, not safety or technical limits.
- Explicit proof status: planned versus implemented versus locally tested versus installed/browser/provider verified.

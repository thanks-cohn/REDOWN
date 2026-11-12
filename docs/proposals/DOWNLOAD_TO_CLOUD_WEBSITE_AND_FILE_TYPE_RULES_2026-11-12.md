# Product proposal — Download-to-Cloud routing by website, file type, or both

**Proposed:** 2026-11-12  
**Product:** REDOWN (provider-neutral design where supported); potentially reusable by Click2Cloud after separate approval  
**Status:** Owner feature direction / proposal only. **Not implemented, deployed, or a claim that automatic interception is supported.**

## User request and outcome

Let users decide **which browser downloads qualify for Download-to-Cloud** by selecting websites, file types, or any combination. A user should be able to build a rule without coding, preview how it would match, choose a connected cloud destination, and preserve normal browser download behavior for anything that does not match.

Example human-readable rules:

1. **Website only:** For user-selected `example.com` and its explicitly chosen subdomains, route supported downloads to my R2 `Projects/` folder, regardless of allowed file type.
2. **File type only:** For `.zip` and `.7z` files from any permitted site, offer my Google Drive `Archives/` folder.
3. **Website AND file type:** Downloads from `example.edu` **AND** PDF files go to my OneDrive `Research/` folder.
4. **Multiple websites AND multiple types:** (`example.com` **OR** `media.example.org`) **AND** (`PNG` **OR** `JPEG` **OR** `WebP`) route to my chosen bucket.
5. **Website OR file type:** (`example.org` **OR** `PDF`) is an expressly selected broader match, visibly explained so it cannot surprise users.
6. **Exclusion:** Exclude a sensitive site or disallowed file category even when a broad inclusion rule matches.

These are illustrative rules, **not real accounts, configured sites, or proof of working provider support**.

## Rule-builder UI

**Settings → Download-to-Cloud → Rules** (proposed placement)

- Master **Automatic rules OFF by default**, independently from ordinary manual REDOWN right-click saves. Users can use manual right-click regardless of an automatic rule.
- **Add rule**: title; enabled/disabled; eligible action (automatic browser download / explicitly invoked Download-to-Cloud); source scope; type scope; destination; priority; fallback; and optional user notification.
- **Websites selector**: All allowed sites / only chosen sites / except chosen sites. Let users add/remove a host, explicitly decide whether subdomains apply, and optionally constrain paths when technically supportable. Show actual site permissions required.
- **File-type selector**: All permitted types / chosen categories (Images, Video, Audio, Documents, Archives, Other) / individual extensions or MIME types / exceptions. Distinguish extension from server-reported content type and handle ambiguous/missing/disagreeing types safely; do not infer type merely from an untrusted filename.
- **Combine**: Website + file type with **ALL / AND** or **ANY / OR**; groups may contain any number of websites and types. Make parentheses and rule precedence intelligible, e.g. `(site A OR site B) AND (PNG OR JPG)`.
- **Destination**: exact already-authorized provider/account/bucket/prefix or folder; allow a provider-neutral choice only where that adapter's download-to-cloud transport is actually verified. Never silently substitute an unavailable destination.
- **Exceptions**: explicit exclusion list; account-aware and private-site opt-out; per-rule pause. Explicit exclusions override inclusions.
- **Rule ordering and collisions**: explicit user-defined priority with deterministic **first eligible matching rule wins** for normal single-route operation. A later opt-in multi-destination mode requires separately verified per-provider receipts and duplicate/conflict controls.
- **Explain / Test without downloading**: paste an example webpage host, response/download URL and file name/type to see match/no match, the reason, and intended destination. Show uncertainty when bytes or response metadata are unknown; no silent remote mutation in preview.
- **History**: record the winning rule ID, attempt and verified results without exposing sensitive browsing provenance to cloud providers. Local provenance retention and export are user-controlled and privacy-limited.

## Separate webpage identity from file-source identity

A **hosting webpage** may be `article.example.com`, while the downloadable asset is on a completely different CDN, redirector or Blob URL. The rule must make it explicit whether **Where downloaded from** means:

- **Page/site where the user initiated the action** (default for website rules), or
- **Actual asset/download host** (optional advanced condition).

Never silently equate both, and never match a website using an unsafe substring (e.g. `example.com.evil.tld`). Normalize hosts carefully, handle ports/IDNs/subdomains, redirects and user-initiated navigation, and scope permissions to the right origin. Do not send parent/source URLs to the destination provider unless a separate, informed feature explicitly authorizes such metadata.

## Execution model and non-negotiable protection

1. Evaluate eligibility locally from a bounded source intent or observed browser download, including site, type, excludes, configured priority and exact saved destination.
2. **Manual right-click intent always remains an explicit user instruction**; it is not overridden by passive automatic rules.
3. An automatic rule is active only after opt-in and granted permissions. Restrict actions to the declared scope; avoid blanket monitoring, unexpected tab scripting or coercive permissions.
4. Reuse REDOWN's existing canonical queue, provider capability checks, exact identity routing and verified receipt/accounting boundaries; **do not create a second save engine**.
5. The browser download event is not equivalent to accessible bytes or an R2 object. Public/replayable HTTPS may use permitted remote ingestion; browser-authenticated and Blob/JS-generated files need distinct, authorized bounded acquisition and may remain unsupported.
6. **Fail safe**: unmatched, ambiguous, denied, unsupported or failed transfers leave ordinary browser downloads unchanged. Do not cancel/remove a local file until independent remote verification and the user's specific opt-in permit it; do not treat `chrome.downloads.pause()` as a remote redirect/byte-stream API.
7. If two rules match, explain the selected winner. If matching metadata arrives late or changes after redirect, re-evaluate safely without unapproved transfers.
8. Status must distinguish MATCHED → SOURCE_AVAILABLE/NEEDS_ATTENTION → QUEUED/TRANSFERRING → PROVIDER_VERIFIED or FAILED; no unverified success counts or silent retry duplicates.
9. Keep site/source URLs, cookies, signed query strings and browsing history out of cloud object metadata. Handle sensitive, local, restricted and authenticated downloads carefully; no bypass of browser/site protections.

## Existing architectural context

- [Browser download handoff to R2](../CODEX_BROWSER_DOWNLOAD_HANDOFF_TO_R2.md): prior PRs #14/#15 attempted opt-in interception; PR #16 removed it because replacing Chrome's native download destination was unreliable. **Do not resurrect the old interception unchanged.**
- [Browser-to-cloud future transport requirements](../../FOREVER_WORKS/right-click/BROWSER_TO_CLOUD_FUTURE_REQUIREMENTS.md): source URL is not bytes; host permissions, auth, lifecycle, byte bridge, provider verification and fail-safe handling remain separate.
- [Competitive leadership roadmap](REDOWN_COMPETITIVE_LEADERSHIP_ROADMAP.md): already proposes a visual routing editor, file-type rules and per-site presets. This document makes the **site/type Boolean combination and download-specific policy** concrete.

## Acceptance and test examples (future implementation)

- Site-only, type-only, AND, OR, multi-value groups, exclusion, overlapping priorities, no-match and disabled-rule cases.
- User permission denied/removed; subdomain deceptive match; page-host versus CDN-host; redirects; unknown MIME, spoofed extension and missing filename.
- Manual right-click remains unaffected; normal download continues on no match, cancellation, auth failure, upload uncertainty and unsupported Blob source.
- Actual supported HTTPS URL to an exact authorized destination with verified object identity/bytes; protected or JS-generated file paths only if an appropriate verified bridge exists.
- Browser restart, concurrent download intents, stale website tabs, state migration and changing destination configurations do not turn a previously scoped rule into an unbounded permission.
- Per-provider verification and History/Counter consistency; rule dry-run is read-only; no false successes.

**Implementation priority:** behind current P0 OAuth, right-click reliability, History/accounting and installed-Windows real-provider acceptance. This document authorizes no code changes, Chrome permission expansion, deployment, cloud mutations, or pricing/entitlement changes.

**North star:** *Choose the sites. Choose the file types. Combine them your way. REDOWN sends only what your rules permit, to the exact cloud destination you selected.*

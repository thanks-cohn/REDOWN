# Dropbox receipt integrity and verified-save presentation — 2 November 2026

Working branch: `codex/v3-parity-first-reconstruction`. Baseline: `de7128a` (full SHA in the verification summary). This is a local source/mock implementation report, **not installed Chrome or authenticated Dropbox acceptance**. The owner’s phantom-save incident remains OPEN pending the trace below. No customer storage, History, credentials, counts or remote files were cleared, rewritten, uploaded or deleted. No merge or deployment.

## Findings and first incorrect transitions

The actual native dispatcher is `extension/background.js`, `chrome.contextMenus.onClicked` (around 2873): Dropbox IDs go directly to `dropboxProvider.dispatch` and return before V3/Cloudflare resolution. The shared composer builds Dropbox from `dropbox:state` (`rebuildMenus`, around 2471); the existing storage listener rebuilds on state changes (around 2865). No second menu writer was added. A connected root is a save leaf; disconnected state exposes a login/reconnect child. Shelf login alone creates no transfer job. A stale save leaf is blocked, rather than silently opening Home. The falling ball/impact pulse can occur at dispatch and remains separate from receipt truth.

Source inspection **does not reproduce a native click counting as success**: the existing normal upload already awaits session finish and `files/get_metadata`. The exact installed incident’s first bad transition cannot be assigned without owner-side job/account/root evidence. Source-confirmed gaps repaired here:

- `dropbox-provider.js`, `receipt`: previously any persisted `status:'completed'` made `ok:true,verified:true`, even with missing result proof. An unreported malformed completion can now be demonstrated to become uncertain without an upload or count. New completions require versioned account/connection/namespace/file/path/revision/hash/byte evidence matching the job.
- `transfer-counter.js`, `record`: the lifetime count previously accepted `ok:true` plus a URL while provider counts accepted `verified:true` and an ID. The old regression explicitly accepted an unverified Dropbox URL receipt. New Dropbox writes require exact versioned destination evidence for **both** counts. This is a reproduced boundary defect, not proof that the installed incident reached it.
- `dropbox-api.js`, `proof`: equal missing content hashes could pass, and exact `path_display` was not compared on readback. File readback must now have the file discriminator, same ID/revision/size/hash/name and both exact paths; hashes must be present and well formed. Real extension is retained, including KEEP BOTH names. Metadata denial/timeout after commit is uncertain, not proof of upload failure.
- `dropbox-auth.js`, `ready`; provider `dropboxStatus`: missing auth could leave a stale connected projection; namespace was not independently pinned in the job. Status invalidates stale connected state, jobs pin the namespace, and identity/root are freshly checked immediately before commit. Safe specific connection errors survive RPC and stored-state reporting. The transient transfer card also requires an explicit verified flag; terminal completion is published only after receipt validation, and old unproven transient completion flags ask for confirmation.
- Provider History used an invented basename web URL. New Dropbox receipts emit **no fabricated web link**. The exact local receipt is inspectable in History; Open Dropbox is a separate website action available even during reconnect. A website session may be a different account. History GO TO’s Dropbox compatibility validator also requires versioned exact destination data; new saves have no file GO TO without a provider-supplied account-bound URL.

The November 1 user/team root guard remains fail-closed. This change does **not** choose a team/home root, claim app permission configuration was verified live, or silently change an authorized namespace. Team/root-home variance, denied listing and mismatches remain blocked with truthful errors; support for a newly selected ambiguous root requires separate explicit destination design and real-account acceptance. The previous incident is not declared fixed by this hardening.

## One operation, one receipt boundary

`native ID → source snapshot → stable job UUID → pinned account/connection/namespace → source bytes → bounded session start/append → fresh account/root verification → non-replayed finish → persisted finish receipt → exact metadata readback → versioned result → terminal receipt → serialized History/counters → transient card event`.

Queued/awaiting-auth, active, blocked/failed/cancelled/interrupted/uncertain and completed records share the job’s transfer ID. Attempts remain local History observations; they do not count. Stage IDs are stable in the archive to avoid duplicate archive success after a storage-write retry. Existing failed Dropbox observations are retained when a later attempt succeeds. Archive failure still retains the compatibility window; existing finite browser storage constraints remain.

The existing serialized completion storage write updates provider totals, persistent delivery-ID deduplication, compatibility History and the lifetime counter together. Duplicate terminal events or recovery after History persistence do not count twice. A recovered completion with insufficient stored proof stays uncertain; old reported History and old totals are not migrated or relabeled in storage. Global legacy initialization is preserved for compatibility; no retroactive claim that its historical basis is independently verified.

A lost finish response without a remote ID remains uncertain and is never automatically replayed. A known finish receipt whose readback failed can be reconciled on the existing explicit Shelf status refresh by exact ID under the original identity; it never starts/appends/finishes an upload. A readback failure retains uncertainty. This cannot find an autorenamed object from a lost response without its ID; inspect Dropbox before choosing to resave. The bounded job journal is not a permanent recovery inventory; preserve History and available job evidence before troubleshooting.

Dropbox receives bytes, safe filename/path and required Dropbox API/auth inputs only. Source/page/frame/link provenance stays in REDOWN-owned records. No additional scopes, folders, permission expansion, provider routing changes, account switching or TRUE REMOTE changes were introduced. Existing source-host consent remains.

## Presentation contract

`providerSaveReceipts.latest` now explicitly marks a verified terminal event and carries account/connection attribution. The card consumer rejects unverified and wrong-provider IDs, duplicate/stale events and Dropbox events for a different/disconnected account. Hydration paints counts only. Switching account, theme, visibility, page or reduced-motion preference cancels the temporary node and timers. Rapid same-provider verified completions restart the visual; other providers keep independent runs. Neither presentation nor the impact pulse changes counts.

Neon shows the **whole** word immediately, alternating established green/yellow accent ink with bright money green every 160 ms, then removes it at 1040 ms. Non-Neon uses italic `"Times New Roman", Times, serif`; characters appear every 150 ms through 1050 ms, hide at 1250, second appearance 1420–1610, longer third appearance 1780–3000, then removal. Reduced motion uses a static 1600 ms word and polite status announcement. The temporary overlay stays within the readout, has no pointer events and adds no layout height. Counts keep their existing fitting and Neon typography. Screen-reader, zoom and responsive visual acceptance remain manual gates; DOM/CSS tests are not visual browser proof.

## Actual verification

See [machine-readable results](verification/dropbox-integrity/results.json) for commands, exact counts, failure-name comparison and protected-source comparison. Frozen catalogs, checkpoint hashes and test assertions were not refreshed to manufacture green results. Existing test fixtures were updated only for the stronger new receipt/event contract and changed timing; new regressions exercise the failure boundaries.

| Gate | Result and evidence level |
| --- | --- |
| Syntax and worker import closure | PASS, `npm run check` |
| Receipt counter / presentation fixtures | PASS, 16/16 local deterministic tests |
| Dropbox + counter + animation + History navigation | 107 PASS / 4 FAIL out of 111; all four failures also occur at baseline (protected Shelf hash; two Explorer preview fixtures; History fallback status) |
| Full baseline | FAIL: 986 tests, 889 PASS / 97 FAIL |
| Full implementation | FAIL: 1,001 tests, 904 PASS / 97 FAIL; same failure names as baseline (exact comparison in results.json) |
| Provider/native/History/Boot subset | FAIL: 207 tests, 188 PASS / 19 baseline FAIL; no claim of all-provider live operation |
| BOOT schema | PASS: six valid fixtures, three invalid rejected |
| Reliability gateway | FAIL / release blocked: architecture source-map drift, baseline mismatch and existing failures; registry and issue validation PASS. Its older registered baseline treats existing branch failures as “new”; untouched-checkout comparison is reported separately. |
| Installed Chrome, live Dropbox OAuth/root/commit/readback | NOT_TESTED; no authenticated owner session. Repository instructions also prohibit bypassing unpacked-extension administrator policy. |
| Real Cloudflare/Google/OneDrive saves; responsive/zoom/AT visual QA | NOT_TESTED; unchanged protected runtime sources and simulated checks are not live proof. |

## Previous false-count assessment

No evidence available here establishes which historical count entries are false. Do not subtract or rebuild totals. First preserve a redacted inventory by transfer ID, timestamp, terminal classification, whether a finish receipt exists, and whether account/connection/namespace agree. Under the original authorized identity, reconcile known IDs read-only and classify confirmed/missing/inaccessible/uncertain. Separately document any proposed count correction and its evidence for owner review; never infer that missing visibility means deletion. Do not export tokens, names, private paths, source URLs or file bytes into public diagnostics. The checked-in fixtures contain synthetic data only.

## Operator retest, without losing evidence

1. Preserve the existing local jobs/History and record the installed extension version. Do not uninstall, clear storage or revoke credentials as a shortcut. With Dropbox disconnected/reconnect-required, inspect the native login child; an old save leaf must be blocked with a failed attempt, no +1 and no SUCCESS!. Shelf login alone must not count.
2. With an authorized non-customer test PNG/PDF and verified personal root, click Save. Compare the History job/receipt with the **same account and namespace** in Dropbox: actual file, extension, KEEP BOTH behavior, exact file ID/path/revision/hash/size, one provider +1 and one lifetime +1. Confirm no REDOWN-origin provenance was sent. Do not repeat a save with an unknown commit outcome.
3. Use a denied/unavailable source or controlled failed upload. Confirm honest blocked/failed/uncertain History, useful connection errors, unchanged totals, no successful file GO TO and no SUCCESS!. For known-ID readback failure, restore read access and refresh status; confirm readback-only reconciliation and exactly one eventual increment.
4. In Neon, verify whole-word green/normal flashes then hidden; save another independently verified file to replay. In Porcelain/Midnight/Ocean, verify Times italic typing, two short appearances and longer third hold, then hidden. Check narrow/wide Shelf, zoom, reduced motion, theme/account changes, quick concurrent completions, Shelf reopen and screen-reader announcement. Card controls must remain usable; hydration and impact must never celebrate.
5. Retest all existing provider/native routes and Cloudflare TRUE REMOTE in the approved installed environment. Supply only a sanitized job/account/root/receipt classification for closing the owner incident. No mock pass closes it.

Related: [November 2 P0 incident](../bugs/CRITICAL/2026-11-02_P0_DROPBOX_FALSE_SUCCESS_HISTORY_AND_COUNTER.md), [November 1 namespace incident](../bugs/CRITICAL/2026-11-01_P0_DROPBOX_RECONNECT_NAMESPACE_REJECTION_AND_MISSING_SAVED_FILES.md), [current work request](../NEED_TO_DO/CODEX/CODEX_REQUEST_P0_DROPBOX_FALSE_SUCCESS_AND_VERIFIED_SAVE_ANIMATIONS_2026-11-02.md), [earlier save-impact request](../NEED_TO_DO/CODEX/CODEX_REQUEST_P1_ALL_CLOUD_SAVE_IMPACT_AND_THEME_SUCCESS_2026-11-02.md).

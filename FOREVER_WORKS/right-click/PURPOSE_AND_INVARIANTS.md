# Map P — purpose and stable meaning

[Route](README.md) · [Wiring](WIRING_AND_STATE.md) · [Presentation](PRESENTATION_AND_CSS.md)

## Promise

**OWNER_INTENT:** [Creators Notes](../CREATORS_NOTES.md) calls for easy entry, configure-once return workflows, high aesthetics and satisfying truthful feedback. The [Simple contract](../../docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md) records a one-popup destination experience. Right-click saving should let a person send a supported source to a clear destination without repeatedly navigating cloud tools. User-owned storage and dependable outcomes support that return loop.

Code is evidence of implementation, not sufficient evidence of the creator's preferred aesthetics. Source-declared styling, owner direction and measured rendering must remain independent. A future framework or provider can change while exact target, preservation and honest feedback remain obligations.

## Glossary

| Term | Meaning |
|---|---|
| Simple | Flat sibling destination actions directly under REDOWN, regardless of remote folder depth. |
| Nested | Hierarchical navigation through bucket/folder parents; branches have Send here, leaves can transfer directly. |
| Profile | Saved storage/authorization record, potentially owning primary/extras and multiple Nested roots; not one card. |
| Account / bucket | Provider authorization identity / actual R2 container. Same bucket name in a different account is a different destination. |
| Directory prefix | Object-key parent path, not a separate filesystem inode. Folder creation uses marker/prefix machinery. |
| Menu label | Presentation name independent from storage target. |
| Root / child | Bucket entry / one folder segment under actual parent in Nested model. |
| Included / excluded | Nested enabled flag retains roots while suppressing output. Simple visibility also depends on showInContextMenu and explorerManaged. |
| Disabled | Specify whether control-disabled, primary suppressed, unavailable bucket or inactive mode; none implies cloud deletion. |
| Removed | Draft primary suppressed, option/root/branch removed, or group roots cleared. Only menu Save commits definitions. |
| Draft / saved | In-memory cloned profiles / chrome.storage.local profiles. Mode-only switching is separately persisted. |
| Migrated / legacy | Versioned conversion of old menuTree into an unverified modern draft; not independent native authority. |
| Ready | Selection/discovery readiness, not durable-transfer, public-URL or overall-provider verification. |

## Preservation candidates

These elaborate existing [invariant](../../forever/invariants/redown.invariant.destinations.json) and [compatibility](../../forever/compatibility/redown.compatibility.destination-state.json), remaining documentary/unreviewed.

| Obligation | Evidence / limitation |
|---|---|
| Preserve Simple and Nested independently | Mode-only empty patches, inactive definitions retained; mode/draft tests. |
| Removing a menu definition never deletes R2 | All Modern × callbacks modify draft only; red-X and zero-entry tests. |
| Labels and order never silently retarget | Shared plan plus resolver; exact-prefix/deep ancestry tests. |
| Intentional emptiness survives migration/rebuild | Existing model, including empty roots, wins; version1 prevents reimport. |
| Preserve drafts/credentials against stale writers | Optimistic signature and serialized menu-field merge; external direct storage writers remain outside this guard. |
| Saved is distinct from rendered/completed | menuUpdated:false can follow persistence; receipt prefix check is not independent byte-integrity proof. |
| Presentation remains understandable | Visible red ×, named selection versus creation, reachable controls/focus and responsive hierarchy; installed/aesthetic acceptance still open. |

## Contradictions requiring review

- Historical fallback preference evolved from two to three choices; current menuEntries ignores simpleLabelFallback and uses explicit label, deepest folder, bucket. The removed preference needs product disposition before compatibility is accepted.
- Old Simple segment × cleared a level while retaining blank descendant rows. Modern card × removes/suppresses a whole menu destination. Same symbol, different scope.
- + Location is usually a draft edit but can confirm Worker activation when no prepared profile exists. Create folder writes remotely before Save; discarding draft does not undo that folder.
- Group exclusion preserves roots; group × clears roots and offers Undo. Collapse only hides DOM.
- “Sole authority” means active editor ownership, not one physical writer: native mode, provisioning and dedicated setup are sanctioned paths.
- Four-region/480px studio descriptions are historical; current compact restoration retains safeguards and later red controls.
- Preview code remains but no current HTML preview host; tests injecting one establish fixture parity only.
- Droplet animation starts before ID resolution; invalid IDs may receive cosmetic feedback without a transfer. Notifications off can suppress a stale-ID notice.

See [source index](SOURCE_INDEX.json) for exact symbols and tests. No contradiction was fixed during this audit.

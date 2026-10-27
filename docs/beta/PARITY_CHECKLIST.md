# Beta Explorer parity checklist

Reference: original `extension/options.js`, background message handlers, and the embedded production Worker. Source inspection is not live acceptance. Pagination remains unchanged.

| Original capability | Beta session scope |
| --- | --- |
| Accounts, buckets, sign-in/out | Retain; add bucket creation and saved destination navigation |
| Destination profile setup | Reuse `cfProvision` behind explicit API/UI action; complex Simple/Nested menu editing remains in original settings |
| Folder navigation, history, path, refresh | Retain; add Alt+arrows, Backspace and F5 |
| Loaded-folder filter, sort, list/grid | Retain and restyle; recursive/cross-bucket search remains a gap |
| File/folder upload, drop, conflicts, cancellation | Retain verified staged upload; local uploads above REST method limit remain a gap |
| Download | Retain original authenticated Chrome helper; original also declines folder downloads |
| Copy, cut/paste, move, rename, delete | Retain production Worker safe-transfer semantics; add duplicate and explicit destination dialog |
| File preview and lightbox | Add bounded image/media/PDF/text preview with previous/next; 3D model preview remains a gap |
| Get URL | Reuse original public address popover through API; publication action remains original-settings-only |
| Archive browse/extract and archive clipboard | Not yet ported; retain original implementation |
| Original right-click TRUE REMOTE | Original path unchanged; Beta remoteIngest continues to invoke original ingest |
| Transfer history | Read original remote transfer history via API; no claim of a new durable job journal |
| Operational defaults | Runtime API precedence and real consumers; no configurable pagination or bypass of correctness/provider constraints |

Release acceptance still requires installed Chrome with owner-authorized disposable R2 tests. Local fixtures do not establish full parity.

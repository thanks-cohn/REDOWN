# Beta Explorer implementation

Open the extension popup and choose **Beta Explorer**. The original Dashboard button still opens the original Explorer. Load the repository's `extension/` directory as an unpacked extension in an administrator-approved Chrome environment. The Beta does not require Beta Mode or Debug Mode.

This is an implementation checkpoint, not a release certificate. No live Cloudflare writes or installed-Chrome acceptance were performed in this session. No authorized disposable cloud namespace or installed extension session was available to this implementation environment.

## Operational boundary

`extension/beta/explorer.mjs` → `file-api.mjs` → `r2-adapter.mjs` → existing authentication, Cloudflare management API and production background/Worker primitives. No archived file-engine code is imported. Background, original Explorer HTML/JS, authentication, embedded Worker source and context-menu handlers are unchanged from the requested base.

The new API exposes `run(operation, input, {signal, onProgress})` and sequential `batch(operation, inputs, options)`. Results distinguish `completed`, `started`, `partial`, `failed`, `cancelled` and `uncertain`. Source/destination always carry explicit account, bucket and prefix; object keys are not decoded or trimmed. The provider adapter translates operations; the GUI owns selection, navigation history and clipboard intent. A future adapter implements the same ordinary operations without changing GUI file-management semantics.

| GUI action | API operation | Concrete route |
| --- | --- | --- |
| Connect/disconnect/accounts/buckets | connect/disconnect/accounts/buckets | Existing background authentication and bucket discovery |
| Browse, breadcrumbs, back/forward, parent, typed path, refresh, pagination | list | Authenticated R2 object listing with delimiter and cursor validation |
| File properties | stat | Exact-key paginated metadata lookup |
| Folder properties | list | First page of children, explicitly including continuation cursor |
| Upload files/folder picker/local file drop | upload | File body PUT to unique staging key; streaming byte-for-byte read-back; existing conditional verified move to final key |
| File download/multiselect download | download | Existing authenticated Chrome download route and completion/interruption callbacks |
| New folder | mkdir | Existing cfCreateFolder and Worker ensurePrefixes marker convention |
| Copy/paste, cut/paste, folder drag/drop | copy/move | Existing cfTransferObjects; per-item outcomes, conditional destination copy and verified source cleanup |
| Rename/F2 | rename | Existing cfRenameEntry |
| Delete/Delete key | delete | Existing cfDeleteObjects with confirmation and absence checks |
| Send URL to cloud | remoteIngest | Existing ingest → ingestCloudflareAtPrefix → authenticated per-bucket Worker |

Toolbar, keyboard and context-menu commands call the same action handlers. Ctrl/Meta+C/X/V/A, F2, Delete, Enter, Space, arrow navigation and Ctrl/Meta+Shift+N are implemented. Copy/move and uploads offer skip, keep both and explicitly confirmed replace. A same-folder copy with keep both creates a sibling copy. Filtering and sorting apply to loaded items, not an advertised complete recursive search. Grid/list view and CSS variables provide a lightweight visual foundation.

## Upload and interruption behavior

The browser forwards the `File` as a fetch body, reads local and remote verification streams chunk by chunk, and never builds a complete-file ArrayBuffer, base64 message or Blob download. The existing production Worker streams the final copy and checks its available MD5/provider receipt and destination metadata. Local fixture tests independently compare SHA-256 after content-preserving operations. This is not a measured browser-memory benchmark or independent final-object SHA-256 verification in the installed product.

Staging keys are under `.redown-beta-uploads/<random UUID>/payload`. The destination is not touched until read-back matches the original bytes. Staging is removed through verified move cleanup on success. Interrupted, conflicting or uncertain uploads may retain staging; the UI reports its exact recovery key. Do not automatically retry uncertain writes or delete retained staging without inspecting its state. The existing `.redown` folder-marker convention is hidden as in the original Explorer.

Uploads currently use the existing direct API route, limited to **300,000,000 bytes per file**. Requests send actual content types and handle zero-byte files. Larger multipart transfers are unfinished. Verification adds a full read-back of each local upload. Keep the Beta page open during operations.

Stop aborts an active upload or stops remaining batch items. Already submitted cloud copy/move/delete/remote requests can still complete. These inherited background requests are synchronous and may time out; the new API reports uncertainty instead of replaying them. Durable operation jobs, page-close recovery, restart/resume and cancellation of active cloud work are not implemented.

## TRUE REMOTE preservation

Original path: `buildMenus` registers Simple/Nested destinations; `chrome.contextMenus.onClicked` captures link/media URL and destination; saved profiles and `preparedProfile` resolve auth and routing; `ingestCloudflareAtPrefix` POSTs URL metadata to the bucket Worker; the embedded Worker's `checkedFetch` acquires source bytes and writes R2; `recordTransfer`/notifications and Explorer listings expose outcomes. The Beta submits the same existing `ingest` message with explicit destination and prefix. It never fetches the remote source locally. These are source and local-fixture findings, not a new live TRUE REMOTE claim. Existing Worker source size/unknown-length behavior and timeout limits remain inherited constraints.

## Verification and remaining work

Commands: `node --test tests/beta-explorer.test.mjs`, focused production regression tests, `npm run check`, `npm run reliability:check`, and `python scripts/package_chrome_store.py --audit-only`. See `VERIFICATION.md` for actual counts and boundaries.

Folder downloads/ZIP export, inline previews, recursive search, offline queueing, durable jobs/recovery, multipart uploads, measured low-memory acceptance, other providers and arbitrary filesystem key edge cases are unfinished. New names with leading/trailing whitespace are rejected explicitly because the reused production naming route trims them. Folder-picker uploads preserve nested paths; dropping a local directory asks the user to use Upload folder instead. Existing cloud directory operations remain non-atomic and honestly report partial completion; no atomic-delete prerequisite is imposed.

Smallest useful next task: run one installed-Chrome end-to-end workflow in an owner-approved disposable R2 namespace: upload/download and independently hash a small file, copy/rename/move/delete it, then repeat with a 50 MiB file and verify original right-click TRUE REMOTE plus Beta URL submission. Inspect both actual bucket state and downloaded bytes before calling the beta shippable. Do not use unrelated production objects.

# REDOWN: Complete GUI-to-API Functional Contract

Every meaningful action a user performs in the REDOWN Explorer must have a corresponding API operation that actually executes it.

Not a mock operation. Not a button that merely changes the interface. Not a promise of future support. Not an operation refused because of an unnecessary atomicity requirement.

The GUI is the interface. The API is the machinery that makes its actions real.

For the Cloudflare Beta, we're defining the complete contract for a normal desktop-style file explorer operating on Cloudflare R2.

## 1. The foundational rule

USER ACTION

REDOWN GUI

Click, double-click, drag, drop, type, select, paste

UNIVERSAL FILE API

Validate request, execute operation, report progress and result

CLOUDFLARE R2 ADAPTER

Perform the actual provider operation

REAL CLOUD FILES CHANGE OR ARE READ

The GUI must reflect the actual result, not invent a successful operation before the API confirms it.

## 2. Complete file explorer action inventory

The following is the required product-level contract, not a claim that REDOWN already implements every item.

### A. Connecting and accessing cloud storage

| What the user does in the GUI | What the API must do                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| Connect Cloudflare account    | Establish authentication and scoped authorization                         |
| View connected accounts       | List saved connection profiles and their states                           |
| Select an account             | Resolve the active provider identity                                      |
| View R2 buckets               | List authorized buckets                                                   |
| Open a bucket                 | List its root objects and folders                                         |
| Switch buckets                | Change active container and refresh listing                               |
| Disconnect account            | Revoke/clear the application's session as appropriate                     |
| Reconnect expired account     | Refresh or repeat authentication                                          |
| Check connection              | Validate credentials and provider reachability                            |
| View storage information      | Retrieve available bucket metadata and usage where supported              |
| Repair connection             | Diagnose authorization/configuration and re-establish a usable connection |
| Change approved permissions   | Update authorization scope through an explicit approval flow              |

Requirement: Switching accounts or buckets must never accidentally direct an operation to the previous account.

### B. Browsing and navigation

| GUI action                 | Required API behavior                                        |
| -------------------------- | ------------------------------------------------------------ |
| Double-click folder        | List folder contents                                         |
| Open folder using Enter    | Navigate to selected directory                               |
| Back                       | Navigate to previous location                                |
| Forward                    | Navigate to next location                                    |
| Go to parent directory     | Resolve parent and list                                      |
| Click breadcrumb           | Navigate to exact ancestor                                   |
| Open bucket root           | List root prefix                                             |
| Refresh                    | Fetch current remote state                                   |
| Type a folder path         | Resolve and navigate to path                                 |
| Open a file                | Retrieve content or initiate appropriate viewer              |
| Expand folder tree         | List child directories                                       |
| Collapse folder tree       | Update GUI state, no remote mutation                         |
| Scroll a large listing     | Request subsequent pages as needed                           |
| Sort files                 | Sort known entries or request supported server-side ordering |
| Filter files               | Return matching entries without modifying objects            |
| Search by filename         | Search or enumerate permitted scope                          |
| Search recursively         | Traverse or index descendant keys within bounds              |
| Show hidden/marker objects | Apply display filtering                                      |
| Switch list/grid view      | Reuse listing, change presentation                           |
| View recent objects        | Query available timestamps or maintained history             |
| Open properties            | Fetch object metadata                                        |
| Inspect folder contents    | List descendants and calculate supported summaries           |

Back, forward, selections, layout preferences, and scrolling positions are largely GUI state operations, not reasons to mutate Cloudflare.

### C. Selecting objects

| GUI action                     | Required behavior                                                       |
| ------------------------------ | ----------------------------------------------------------------------- |
| Click one file                 | Select exact object identity                                            |
| Ctrl-click files               | Add/remove objects from selection                                       |
| Shift-click                    | Select a range                                                          |
| Ctrl+A                         | Select all objects in current view                                      |
| Select multiple folders        | Preserve identities of selected prefixes                                |
| Deselect                       | Clear selection                                                         |
| Select mixed files and folders | Build a valid mixed selection                                           |
| Right-click selected item      | Open context menu for that item                                         |
| Right-click blank space        | Offer destination-level operations                                      |
| View selected size/count       | Retrieve or calculate selection statistics                              |
| Bulk action                    | Execute operation for each selected item and report individual outcomes |

Selection is local GUI state. It becomes an API operation when the user requests an action affecting those selected objects.

### D. Uploading

| GUI action                         | Required API behavior                             |
| ---------------------------------- | ------------------------------------------------- |
| Click Upload File                  | Upload selected local file                        |
| Click Upload Folder                | Upload all eligible descendants, preserving paths |
| Drag file into Explorer            | Upload into targeted folder                       |
| Drag multiple files                | Batch uploads                                     |
| Drag local folder                  | Recursive upload                                  |
| Paste a local file where supported | Ingest file into R2                               |
| Upload empty file                  | Create zero-byte object                           |
| Upload large file                  | Bounded-memory streaming/multipart transfer       |
| Upload Unicode filename            | Preserve correct key and name                     |
| Upload duplicate filename          | Present conflict options                          |
| Replace existing file              | Authorized overwrite                              |
| Keep both files                    | Generate a distinct destination name              |
| Skip duplicate                     | Leave existing object untouched                   |
| Cancel upload                      | Stop transfer and safely handle staging           |
| Retry confirmed failed upload      | Start a safe new attempt                          |
| Resume interrupted upload          | Resume only with valid supported checkpoint       |
| View upload progress               | Report meaningful transferred/verified progress   |
| Upload to nested folder            | Use correct destination prefix                    |
| Upload hundreds of files           | Queue and process with bounded concurrency        |

The 200 MiB corpus must be fully uploadable. Arbitrary binary data, file extensions, and content formats should not require separate transfer implementations.

### E. Downloading

| GUI action                        | Required API behavior                            |
| --------------------------------- | ------------------------------------------------ |
| Download one file                 | Stream object to local destination               |
| Download multiple files           | Process each selected file                       |
| Download folder                   | Package or reconstruct directory tree            |
| Download whole bucket             | Enumerate and export the permitted bucket scope  |
| Save As                           | Write to chosen destination filename/path        |
| Download large file               | Bounded streaming                                |
| Cancel download                   | Stop transfer safely                             |
| Retry download                    | Restart or resume safely where supported         |
| Verify downloaded file            | Compare actual bytes and SHA-256                 |
| Download Unicode filename         | Preserve filename                                |
| Download nested tree              | Preserve directory structure                     |
| Export selected files as ZIP      | Package selected objects using bounded resources |
| Download corrupted/changed object | Detect integrity or revision mismatch            |
| View download progress            | Report received and verified bytes               |

The GUI must not display “Downloaded successfully” merely because a transfer request was accepted.

### F. Copy and paste

| GUI action                            | Required API behavior                                            |
| ------------------------------------- | ---------------------------------------------------------------- |
| Ctrl+C on file                        | Store source identity in clipboard state                         |
| Ctrl+V in folder                      | Copy object to destination                                       |
| Context menu Copy                     | Prepare copy                                                     |
| Context menu Paste                    | Execute copy                                                     |
| Copy within same folder               | Create duplicate with correct conflict handling                  |
| Copy to another folder                | Copy remote object                                               |
| Copy across nested folders            | Preserve bytes and metadata as appropriate                       |
| Copy multiple files                   | Batch copy                                                       |
| Copy entire directory                 | Recursively copy all descendants                                 |
| Copy directory into another directory | Recreate relative structure                                      |
| Duplicate file                        | Copy to generated sibling name                                   |
| Duplicate directory                   | Copy all descendants                                             |
| Copy between buckets                  | Stream or use available provider copy mechanism                  |
| Copy between accounts                 | Use authenticated source/destination operations where authorized |
| Paste into existing names             | Prompt replace, skip, keep both, or cancel                       |
| Cancel multi-file copy                | Stop remaining work and report partial changes                   |
| Verify copy                           | Read destination and compare content hash                        |
| Copy 50 MiB or larger                 | Operate without truncation or artificial size ceiling            |

Copy must never delete the original.

### G. Cut and move

| GUI action                          | Required API behavior                                  |
| ----------------------------------- | ------------------------------------------------------ |
| Ctrl+X                              | Record intended move                                   |
| Ctrl+V                              | Execute move to destination                            |
| Context menu Cut                    | Prepare move                                           |
| Context menu Move To                | Execute move                                           |
| Drag between remote folders         | Move when move behavior is selected                    |
| Drag with copy modifier             | Copy instead of move                                   |
| Move one file                       | Copy, verify, remove original safely                   |
| Move multiple files                 | Move each with per-object results                      |
| Move a directory                    | Transfer all descendants and remove old entries        |
| Move directory into another         | Recreate target hierarchy                              |
| Move file into newly created folder | Create destination and move file                       |
| Move from nested folder to parent   | Change object key appropriately                        |
| Move between buckets                | Cross-bucket copy/verify/delete                        |
| Move to another connected account   | Cross-account transfer with explicit authorization     |
| Cancel move                         | Preserve recoverable partial state                     |
| Move into conflicting destination   | Apply chosen conflict policy                           |
| Move into own descendant            | Reject invalid recursive move                          |
| Verify move                         | Confirm new object is correct and old object is absent |

A move on R2 does not need to pretend it is a native atomic rename. It needs to behave correctly, preserve data, and report partial completion if interrupted.

### H. Rename

| GUI action                     | Required API behavior                     |
| ------------------------------ | ----------------------------------------- |
| Press F2                       | Enter rename mode                         |
| Right-click Rename             | Enter rename mode                         |
| Rename file                    | Move content to new object key            |
| Rename folder                  | Rewrite descendant key prefixes as needed |
| Rename extension               | Preserve bytes while changing filename    |
| Rename Unicode file            | Handle encoding correctly                 |
| Rename to existing filename    | Trigger conflict handling                 |
| Rename multiple selected files | Apply supported batch renaming rules      |
| Undo rename                    | Perform inverse operation when safe       |
| Cancel rename dialog           | No mutation                               |
| Rename file with spaces        | Preserve correct key                      |
| Rename deeply nested path      | Preserve remaining tree                   |

### I. Delete and cleanup

| GUI action                         | Required API behavior                                       |
| ---------------------------------- | ----------------------------------------------------------- |
| Press Delete                       | Delete selected object after appropriate confirmation       |
| Right-click Delete                 | Delete object                                               |
| Delete multiple files              | Batch delete                                                |
| Delete empty directory             | Remove folder marker where applicable                       |
| Delete populated directory         | Enumerate and delete descendants                            |
| Delete nested directory            | Remove selected subtree only                                |
| Delete copied duplicate            | Remove duplicate without affecting source                   |
| Delete after move                  | Confirm correct old key removal                             |
| Cancel confirmation                | No mutation                                                 |
| Delete nonexistent object          | Return understandable result                                |
| Delete unauthorized object         | Deny without changing it                                    |
| Delete during network interruption | Reconcile actual outcome                                    |
| Restore deleted item               | Restore only when trash/versioning makes recovery available |
| Empty trash                        | Permanently remove supported retained objects               |
| Clean up abandoned staging         | Remove only confirmed safe abandoned test/staging objects   |

R2 does not automatically provide a desktop recycle bin. If REDOWN offers Trash/Restore, it must implement or integrate a genuine recovery mechanism.

### J. Create and manage directories

| GUI action                       | Required API behavior                                  |
| -------------------------------- | ------------------------------------------------------ |
| Ctrl+Shift+N                     | Create new folder                                      |
| Right-click New Folder           | Create directory marker or logical folder              |
| Create nested folder             | Generate correct prefix hierarchy                      |
| Rename folder                    | Update hierarchy                                       |
| Copy folder                      | Copy descendants                                       |
| Move folder                      | Move descendants                                       |
| Delete folder                    | Remove correct descendants and marker                  |
| Create empty folder              | Preserve visibility through an appropriate marker      |
| Open empty folder                | Return an empty listing                                |
| Paste files into folder          | Target correct prefix                                  |
| Drag files into folder           | Move or copy into prefix                               |
| Drag folder into folder          | Transform subtree                                      |
| Merge directories                | Combine permitted entries with conflict handling       |
| Calculate directory size         | Enumerate descendants or use maintained statistics     |
| Refresh directory                | Reconcile current keys and markers                     |
| Create folder with existing name | Return already-exists or open existing, as appropriate |

### K. File properties and metadata

| GUI action            | Required API behavior                                             |
| --------------------- | ----------------------------------------------------------------- |
| View Properties       | Retrieve name, size, type, modified time, key, available metadata |
| Copy file path        | Return exact provider-relative key or REDOWN path                 |
| Copy object URL       | Return valid URL only when one exists and access permits          |
| View checksum         | Compute/retrieve independently verified checksum                  |
| View content type     | Read metadata                                                     |
| Change content type   | Update metadata safely                                            |
| Edit custom metadata  | Apply supported metadata update                                   |
| Inspect storage class | Fetch supported storage attributes                                |
| Refresh properties    | Retrieve latest metadata                                          |
| View object version   | Fetch revision/version where available                            |
| View permissions      | Display actual account/bucket authorization capability            |
| Edit object metadata  | Persist update without silently destroying contents               |

### L. Previewing and opening files

| GUI action               | Required API behavior                                          |
| ------------------------ | -------------------------------------------------------------- |
| Preview image            | Stream or fetch image                                          |
| Preview text             | Read bounded text                                              |
| Preview PDF              | Provide browser-viewable stream                                |
| Preview audio            | Serve permitted byte ranges                                    |
| Preview video            | Support appropriate range requests                             |
| Open unknown file        | Download or offer supported handler                            |
| Preview archive contents | Parse or inspect only through implemented archive handling     |
| Open JSON/CSV            | Read and present text or structured preview                    |
| Refresh preview          | Fetch current content                                          |
| Close preview            | Release resources                                              |
| Open large file          | Avoid loading complete object unnecessarily                    |
| Edit text file           | Load editable content and perform authorized rewrite upon save |
| Save edited file         | Persist new content with conflict handling                     |
| Revert unsaved edits     | Discard local changes                                          |

A full office-document editor is not necessary for the first Cloudflare Beta. Basic open/preview/download behavior is.

### M. Bulk operations

| GUI action                         | Required API behavior                                      |
| ---------------------------------- | ---------------------------------------------------------- |
| Select 100 files and copy          | Execute bounded batch copying                              |
| Select 100 files and move          | Execute bounded batch moving                               |
| Select 100 files and delete        | Execute authorized batch deletion                          |
| Upload an entire directory tree    | Traverse and transfer every eligible file                  |
| Download a directory tree          | Reconstruct full hierarchy                                 |
| Rename multiple files              | Apply supported bulk rename rules                          |
| Copy mixed folders and files       | Preserve correct hierarchy                                 |
| Skip conflicting objects           | Skip only conflicting objects                              |
| Replace all                        | Apply explicit overwrite choice across batch               |
| Keep both for all conflicts        | Generate distinct destination keys                         |
| Cancel remaining operations        | Stop dispatching and show already completed operations     |
| Retry failed items only            | Retry only safe, confirmed failures                        |
| View per-file results              | Return individual statuses and errors                      |
| View batch progress                | Report files and bytes completed separately                |
| Continue after independent failure | Continue safe operations according to user-selected policy |

### N. Conflict handling

| GUI action                               | Required API behavior                           |
| ---------------------------------------- | ----------------------------------------------- |
| Paste where a file exists                | Detect destination conflict                     |
| Choose Replace                           | Overwrite authorized object                     |
| Choose Skip                              | Preserve destination                            |
| Choose Keep Both                         | Generate unique destination                     |
| Choose Cancel                            | Stop without further mutation                   |
| Choose Apply to All                      | Persist choice for current batch                |
| Rename to an existing name               | Detect collision                                |
| Move into occupied destination           | Resolve conflict safely                         |
| Save an edited stale file                | Detect source revision conflict where available |
| Attempt duplicate folder creation        | Handle existing directory correctly             |
| Retry a failed operation                 | Determine whether retry is safe                 |
| Repeat operation after uncertain outcome | Reconcile before any further mutation           |

Conflict handling must not become an excuse to disable ordinary copy, rename, move, overwrite, or delete.

### O. Progress, cancellation, and recovery

| GUI action                      | Required API behavior                                            |
| ------------------------------- | ---------------------------------------------------------------- |
| Start operation                 | Return operation ID and initial state                            |
| View progress                   | Report actual work completed                                     |
| Pause transfer                  | Pause when supported, otherwise explain limitation               |
| Resume transfer                 | Resume from valid checkpoint where supported                     |
| Cancel operation                | Stop safely and report final or uncertain state                  |
| Retry confirmed failure         | Restart safely                                                   |
| Recover interrupted upload      | Reconcile provider and multipart state                           |
| Recover interrupted copy        | Check destination existence and integrity                        |
| Recover interrupted move        | Check destination and source before continuing                   |
| Recover interrupted delete      | Check actual provider state                                      |
| Close Explorer during operation | Preserve durable operation state where implemented               |
| Reopen Explorer                 | Recover known operations and refresh state                       |
| Lose network connection         | Report disconnection and preserve safe state                     |
| Network returns                 | Resume supported reads/pending actions under valid authorization |
| View failed operations          | Retrieve durable result and actionable explanation               |
| View operation history          | List completed, failed, cancelled, and uncertain operations      |
| Clear finished notifications    | Remove GUI notifications, not underlying evidence                |

### P. Offline behavior and queued changes

You previously described an Explorer that retains its cloud directory structure when the internet disappears, allows the user to organize planned changes locally, and applies those changes once connectivity returns.

The corresponding API contract is:

| GUI action                    | Required API behavior                                 |
| ----------------------------- | ----------------------------------------------------- |
| Browse cached folders offline | Read last-known directory snapshot                    |
| Inspect cached metadata       | Return stored metadata marked as potentially stale    |
| Queue a move offline          | Persist intended operation                            |
| Queue a rename offline        | Persist intended operation                            |
| Queue a delete offline        | Persist pending deletion, not claim remote deletion   |
| Queue a folder creation       | Persist intended directory creation                   |
| View pending operations       | Retrieve durable local queue                          |
| Cancel pending operation      | Remove unapplied intent                               |
| Reorder pending operations    | Preserve valid dependencies                           |
| Reconnect                     | Refresh authorization and reconcile remote state      |
| Apply pending changes         | Execute safely in dependency order                    |
| Encounter remote conflict     | Request resolution rather than silently overwrite     |
| Lose power                    | Preserve recoverable snapshots and queued intents     |
| View synchronization status   | Distinguish local plans from remote confirmed changes |

This is a valuable REDOWN feature, but offline mutation queuing is not a prerequisite for the first Cloudflare Beta. Basic online CRUD must work first.

### Q. TRUE REMOTE downloads

| GUI action                           | Required API behavior                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Right-click downloadable web content | Capture source URL and destination                                              |
| Select Send to R2                    | Initiate server-side remote acquisition                                         |
| Choose destination bucket            | Resolve authorized bucket                                                       |
| Choose destination folder            | Resolve object key                                                              |
| Edit destination filename            | Validate key and extension                                                      |
| Start remote download                | Transfer source to R2 without routing file bytes through the user's computer    |
| View remote progress                 | Report available acquisition progress                                           |
| Cancel remote acquisition            | Stop supported transfer and clean up safely                                     |
| Source URL redirects                 | Follow permitted redirects safely                                               |
| Source returns 404/403               | Report meaningful failure                                                       |
| Remote server disconnects            | Handle partial transfer and recovery                                            |
| Duplicate destination                | Apply conflict policy                                                           |
| Verify acquired object               | Validate available source length/checksum and independent destination integrity |
| View source provenance               | Record source URL and acquisition metadata with appropriate privacy protections |
| Retry failed acquisition             | Start a safe new attempt                                                        |
| Open resulting object                | Show it in Explorer                                                             |
| Download resulting object locally    | Read it through the normal API                                                  |

TRUE REMOTE is a core REDOWN feature and must receive its own live acceptance tests.

### R. Explorer keyboard and mouse operations

| GUI interaction             | API operation or local responsibility                          |
| --------------------------- | -------------------------------------------------------------- |
| Ctrl+C                      | Prepare copy intent                                            |
| Ctrl+X                      | Prepare move intent                                            |
| Ctrl+V                      | Execute paste                                                  |
| Ctrl+A                      | Select all                                                     |
| Ctrl+Z                      | Undo supported operation where safe                            |
| Ctrl+Y                      | Redo supported operation where safe                            |
| F2                          | Rename                                                         |
| Delete                      | Delete                                                         |
| Shift+Delete                | Permanent deletion where applicable                            |
| Ctrl+Shift+N                | Create folder                                                  |
| Enter                       | Open                                                           |
| Backspace / Alt+Up          | Navigate to parent                                             |
| Alt+Left / Alt+Right        | Navigate history                                               |
| F5                          | Refresh                                                        |
| Double-click                | Open object/folder                                             |
| Right-click                 | Show contextual actions                                        |
| Drag-and-drop               | Copy, move, or upload depending on source/modifier             |
| Drag multiple objects       | Batch action                                                   |
| Click progress notification | Open operation details                                         |
| Escape                      | Cancel dialog or selection, not necessarily an active transfer |
| Undo after delete           | Restore only if recovery mechanism exists                      |
| Refresh after mutation      | Verify resulting provider state                                |

The keyboard shortcuts are GUI concerns. Their consequences must use the same API operations as context menus, toolbar buttons, and drag-and-drop.

### S. Cross-cutting behavior every API operation needs

These are not extra features. They are the minimum common behavior that makes the Explorer dependable.

| Requirement                  | What it means                                            |
| ---------------------------- | -------------------------------------------------------- |
| Correct source               | Operate on the object the user selected                  |
| Correct destination          | Write into the chosen account, bucket and directory      |
| Authorization                | Perform only approved operations                         |
| Accurate success             | Confirm the requested effect                             |
| Accurate failure             | Explain what actually failed                             |
| File integrity               | Preserve bytes through content-preserving operations     |
| No accidental overwrite      | Honor user-selected conflict policy                      |
| No accidental source removal | Verify move destinations before deletion                 |
| Progress                     | Show meaningful per-operation progress                   |
| Cancellation                 | Stop safely where possible                               |
| Recovery                     | Preserve uncertain state for reconciliation              |
| Pagination                   | Handle directories beyond one listing page               |
| Large files                  | Stream rather than buffer entire payloads                |
| Normal filenames             | Support Unicode, spaces, punctuation and valid R2 keys   |
| Long operations              | Handle operations longer than a typical request deadline |
| Persistent results           | Preserve useful operation outcomes                       |
| Latency                      | Measure actual time from request to completion           |
| Provider compatibility       | Translate operations correctly into R2 behavior          |
| UI consistency               | GUI displays actual API/provider state                   |

## 3. The small set of underlying operations

Despite that extensive GUI inventory, the underlying file API does not need hundreds of independent methods.

Most GUI functionality can be built from a relatively small set of coherent operations.

| Core API capability              | Supports                                                        |
| -------------------------------- | --------------------------------------------------------------- |
| `connect / disconnect`           | Accounts and authentication                                     |
| `listContainers`                 | Bucket selection                                                |
| `list`                           | Browsing, folder trees, pagination                              |
| `stat`                           | Properties, existence, conflict checks                          |
| `read / readStream`              | Download, preview, verification                                 |
| `create / writeStream`           | Upload, save, create file                                       |
| `update / overwrite`             | Replace contents, edit, metadata updates                        |
| `copy`                           | Copy, duplicate, paste                                          |
| `move`                           | Cut/paste, dragging between directories                         |
| `rename`                         | File and directory renaming                                     |
| `delete`                         | Removal and cleanup                                             |
| `mkdir`                          | Folder creation                                                 |
| `listRecursive`                  | Folder operations, bulk actions                                 |
| `search`                         | Search and filtering, including composed listing when necessary |
| `executeBatch`                   | Multi-file operations                                           |
| `getOperation / cancelOperation` | Progress, completion, cancellation                              |
| `reconcileOperation`             | Recover uncertain operations                                    |
| `getCapabilities`                | What the connected provider actually supports                   |
| `getHistory`                     | Operation history and results                                   |
| `remoteIngest`                   | TRUE REMOTE acquisition                                         |

Some of these are composed behaviors, not native Cloudflare calls. For example, `rename` can be implemented using copy, verification and deletion.

The critical rule is that the GUI always accesses a single coherent operation engine. We shouldn't have one implementation for the toolbar, another for drag-and-drop, and another for Python.

## 4. What is mandatory for the Cloudflare Beta?

Release-blocking essentials

Connect, list, navigate, upload, download, create folder, copy/paste, cut/move, rename, overwrite, delete, batch selection, conflicts, progress, basic recovery, and TRUE REMOTE. All must work through the GUI and API.

Can follow after Beta

Offline queued edits, multi-provider transfers, elaborate bulk renaming, version history, trash, advanced previews, archive inspection, rich search indexing, and specialized automation.

## 5. How this must be tested

Your 200 MiB corpus should be treated as a set of actual files that repeatedly undergo state changes, not simply 12 uploads.

For each file, the Laboratory should exercise the following sequence wherever applicable:

1. Upload to R2 and independently verify bytes.
2. Download and verify SHA-256.
3. Copy to another folder and verify both objects.
4. Rename the copy and verify its bytes.
5. Create nested directories.
6. Move the copy into a nested directory and verify its new location.
7. Copy the populated directory and verify the new tree.
8. Rewrite or overwrite an authorized test copy and verify the changed bytes.
9. Move the file back to its previous directory.
10. Delete a duplicate and confirm its absence.
11. Delete the remaining isolated test objects and verify cleanup.
12. Check operation results, errors, latency and recoverability throughout.

Then test realistic mixed-object workflows, conflict handling, interruption, bulk selections and folder trees. No requirement should be marked passed simply because an API method exists.

## The governing principle

If a user can reasonably perform an action in the REDOWN Explorer, that action must either work through the universal API or be explicitly excluded from the shipped GUI.

Do not create an active Delete button connected to an adapter that deliberately refuses deletion.

Do not offer Move if it merely copies without checking source removal.

Do not display Upload Complete because the extension received the bytes but R2 never confirmed the object.

Do not advertise supported features based solely on simulated tests.

And above all:

Build the minimum necessary API around what the user does in the GUI, rather than forcing the GUI to accommodate unnecessary limitations in the API.

That is the functional contract REDOWN should have been built against from the beginning.
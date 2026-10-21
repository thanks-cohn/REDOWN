# Nested destination receipts, search browsing and history previews

## Findings

Nested menu handlers already resolve a saved root/node into its bucket and full prefix. The public Worker URL uses an `/assets/` serving route; that segment is not itself evidence of an R2 folder. History previously stored the URL plus the original preset ID, then inferred the object key from that preset. When a nested root targets another bucket/Worker this inference can fail, display the serving route as a folder, and make location navigation target the wrong bucket. An actual misplaced user object has not been inspected or confirmed.

Search rows explicitly called goToSearchResult on click, clearing the query and loading the containing folder. This prevented browsing the search result set. Direct preview also used the current Explorer target rather than the result's account/bucket.

## Changes

- Explicit-prefix ingest checks that the returned object key's parent matches the requested folder before reporting success. A mismatch reports an error stating the object may already have been written. This is a post-write response check, not an atomic verification of the deployed Worker's R2 binding.
- Nested and captured-gallery successes retain account, bucket, prefix and exact returned key in transfer history. Rendering/opening uses that receipt, avoiding public-URL path guesses. Historical URLs may resolve through another known profile only when one match is unambiguous. Old entries without enough evidence are not assigned invented destinations.
- History Location text is a keyboard-accessible button; Location or row-background click opens the exact directory, selects the file and loads the preview pane. No lightbox or automatic page scrolling is requested. Filename expansion/rename behavior remains separate. Renaming a receipt-backed item uses its actual bucket/key and updates its receipt.
- Search clicks select/preview without clearing search. Result previews use the result's account, bucket and key. Arrow navigation keeps the result order/page and row focus; expanded and lightbox previews continue browsing the search set. Lightbox supports Up/Down as well as Left/Right. Open containing folder remains an explicit context action.
- Search result mutations/dragging that would otherwise inherit the unrelated current Explorer target are blocked with a prompt to open the containing folder first.

## Verification

24 focused destination/search/history, lightbox, private-read and embedded-Worker tests passed; npm run check and git diff --check passed. New regressions cover exact nested prefix payload, bucket/key receipt, mismatched-key rejection, history path rendering, result-specific preview source and pagination, and directory/preview opening without focus or scroll jump. Existing lightbox tests exercise expanded/lightbox keyboard behavior independently.

No live user bucket was read, written, moved or deleted during this work. Tests use simulated responses and the in-memory embedded Worker. These results do not prove the historical object was misplaced or that a particular deployed Worker is bound to the correct bucket. Confirm a fresh transfer's destination in Explorer after updating. Full suite not rerun; earlier baseline failures remain separate.

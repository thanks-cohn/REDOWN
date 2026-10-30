# IMPORTANT PROPOSAL: URL List (.txt) Batch Remote Ingest

**Status:** PROPOSAL ONLY, NOT IMPLEMENTED
**Entry point:** Modern Explorer > **Send URL to Cloud** dialog
**Intent:** Select a local text file containing one source URL per line. REDOWN reads the list locally, previews it, and queues each accepted URL for server-side ingestion into an explicitly selected Cloudflare R2 destination.

## UI contract

- Keep the existing **Single URL** input for one-off use.
- Add a second input labeled **URL List (.txt)** with a file picker and drag-and-drop on the dialog itself. Do **not** overload the existing Upload Files operation: the list is instructions containing URLs, not files to store in R2.
- Place the input directly below the Single URL field. Either input can be used; if both are populated, provide an explicit choice to run one or both rather than silently combining them.
- Include optional **Choose destination** (account, bucket, prefix) using current selection as the default; show the exact target path before proceeding.
- Parsing the selected list displays a small summary: valid lines, duplicates, empty/comment lines, invalid lines, and the planned destination. A **Review URLs** table allows removal or exclusion before submission.
- Primary action **Send N URLs to Cloud**; secondary **Cancel**. Nothing uploads or ingests merely because a file was selected.
- Run view: total, queued, active, completed, failed, cancelled, uncertain, per-line status, original line number and destination if known. Provide **Cancel remaining**, **Retry verified failures** after review and **Export results (.json)**.
- Support paste of multiline URLs into the same review model in future; retain a clear single-URL path for the first release.

## Input format

- Primary documented type: UTF-8 `.txt` with one absolute HTTP or HTTPS URL per line. Also allow `.list` when appropriate, but avoid promising CSV parsing merely because a file ends in `.csv`.
- Handle UTF-8 BOM, CRLF and LF, surrounding whitespace, blank lines, and comment-only lines beginning with `#`. Preserve line numbers and original source text for user review.
- Reject unsupported schemes, missing hosts, embedded userinfo credentials, malformed URLs and invalid encoding with actionable line-level errors. Do not auto-fix a malformed URL into a different destination.
- Treat duplicate source URLs as a review choice; default to deduplicate exact normalized URLs while retaining all originating line numbers, but allow deliberate duplicate submissions only after an explicit choice.
- Show a file-size and entry-count limit with a clear error; define and load-test concrete safe limits before implementation.
- Optional CSV support belongs in a separate follow-up: it must identify a URL column explicitly instead of treating every cell as a URL.

## Integration with existing API

**Verified existing code on the release branch:**
- `extension/beta/explorer.mjs` has `actions.remote()`, currently using a single prompt-like dialog and one `request('remoteIngest',{destination,url})` operation.
- `extension/beta/r2-adapter.mjs` exposes `remoteIngest({destination,url,filename})`, delegating to the existing `ingest` message and original background/Worker fetch pipeline.
- `extension/beta/file-api.mjs` exposes `api.batch(operation,items,{batchConcurrency,signal,onProgress})`; this is currently an **internal application API**, not proof of an externally accessible public API.

Proposed internal integration:
1. Convert reviewed rows to `{destination,url,sourceLine,clientItemId}` records.
2. Use `api.batch('remoteIngest', rows.map(({destination,url})=>({destination,url})), options)` or an equivalent thin orchestration layer that preserves original row identifiers and results.
3. Choose conservative default concurrency and respect the transfer preferences, Worker limits, and API rate limits. Do not launch hundreds of unrestricted concurrent downloads.
4. Do not infer completion merely from `ingest` dispatch. Correlate each request with a verifiable destination outcome when the existing pipeline supports it; otherwise show its actual confirmed or uncertain state.
5. Keep **Keep Both** as the default name-conflict rule where supported; explicitly document whether remote ingestion's naming path presently applies the same policy before promising it.
6. Refresh the destination once after the whole batch, not after every URL.

## Programmatic entry point

Expose the same **review, validate, plan, execute, observe and export** semantics to a supported programmable interface, not a second engine. Candidate capability names: `validateUrlList`, `planRemoteIngestBatch`, `startRemoteIngestBatch`, `getBatchStatus`, `cancelRemaining`, `exportBatchResults`.

- The core parser/orchestrator should be importable and testable as a pure module. An extension runtime message, automation bridge or REST interface would need its **own** explicit specification, permissions and authentication. Do not claim one is already public or allow arbitrary webpage scripts to call privileged extension APIs.
- Operations must be authorized to a user-selected account/bucket/prefix. Reject destinations or permissions not currently accessible.
- Generate stable job and per-row IDs. Save a bounded, versioned job ledger that can be inspected after a page closes, with user-controlled retention/export. Never interpret cancellation as proof a previously dispatched cloud write was rolled back.
- Retain source-to-result provenance: original URL, input line, attempt, requested destination, resulting object identity where confirmed, completion state and error. Because URLs may contain secrets in query strings, protect local display/export, offer redaction and never send full URLs to diagnostics by default.
- Protect the Worker against SSRF (including redirects), internal network destinations, unlimited fetch sizes, redirects to disallowed schemes, oversized resources and unsupported content. Preserve existing provider security checks rather than bypassing them.

## Acceptance tests

1. A file with BOM, CRLF, comments, blanks, 3 valid URLs, 1 malformed URL and 1 duplicate yields the correct review plan with source line numbers.
2. Selecting a file does not trigger any Cloudflare network request until **Send N URLs** is confirmed.
3. An authorized destination receives one request per approved URL. Processing is bounded and progress is correlated to the original line.
4. A failed URL does not silently skip remaining lines. The user can review successes, failures and uncertain outcomes.
5. Cancel stops future scheduling while acknowledging any in-flight uncertain writes.
6. A temporary permission loss never silently publishes a bucket or retries uncertain remote writes.
7. A programmatic client consumes the same parser/plan/result schema as the UI with explicit authorization.
8. The existing one-URL path continues to function without changes in default behavior.

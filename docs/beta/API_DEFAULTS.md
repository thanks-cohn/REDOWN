# Beta runtime preferences

`createFileApi(createR2Adapter())` owns the operation contract. File operations in the Beta UI use `run` or `batch`; the adapter reuses production background services and the authenticated HTTP transport. No experimental engine is imported.

```js
const api = createFileApi(createR2Adapter());
api.setPreferences({requestTimeoutMs: 45000, batchConcurrency: 2});
await api.run('list', {source}, {requestTimeoutMs: 75000});
await api.batch('upload', files.map(file => ({
  source, file, key: source.prefix + file.name, conflict: 'skip'
})), {batchConcurrency: 3, uploadTimeoutMs: 600000, signal, onProgress});
```

Precedence is per-operation option, then session preferences, then provider default. `setPreferences` replaces the session preference object; `{}` restores defaults. `getPreferences` and `getDefaults` return copies. The GUI offers a small subset in Transfer preferences; the API exposes every supported setting below.

| Option | Default | Actual consumer |
| --- | ---: | --- |
| `messageTimeoutMs` | 120000 | Beta wait for background response; mutations remain uncertain after timeout/late cancellation |
| `requestTimeoutMs` | 30000 | Listing/metadata HTTP request, verification fetch, preview request and body deadline |
| `uploadTimeoutMs` | 300000 | Direct staging PUT deadline |
| `verificationTimeoutMs` | 300000 | Entire staging byte-comparison deadline |
| `verificationIdleTimeoutMs` | 30000 | Deadline for each remote/local comparison read |
| `progressIntervalMs` | 100 | Verification callback frequency; zero reports every remote chunk |
| `previewMaxBytes` | 67108864 | Bounded inline preview memory budget, not a file/download limit |
| `textPreviewMaxBytes` | 524288 | Text preview byte truncation; result explicitly includes `truncated` |
| `batchConcurrency` | 1 | Number of in-flight batch items; per-batch override supported |

Time values are milliseconds. Positive safe integers are required, except progress interval permits zero. Browser timer range is a real restriction. Unknown options, pagination preferences, and options inactive for the selected operation are rejected before dispatch. `batchConcurrency` belongs on `batch`, not `run`. No inert multipart/strategy/retry options are advertised.

Operation-specific option membership is explicit in `extension/beta/configuration.mjs`. Session preferences may contain settings for different operations; only applicable settings are selected for each call. Progress callbacks cannot change a confirmed provider outcome if the presentation callback throws.

Batch results retain input order. Cancellation prevents additional dispatch. Uncertain outcomes halt new dispatch; already in-flight items are awaited and reported. No ambiguous write is automatically retried. Concurrent callers must choose non-overlapping writes when necessary.

## Boundaries

The 300,000,000-byte local-upload check belongs to the current direct REST upload method. It does not apply to copy, move, download or TRUE REMOTE. Local multipart upload is still unavailable. Fixtures transfer actual 50 MiB and 51 MiB payloads; they do not establish arbitrary-size/live-cloud acceptance.

The original background Worker management transport retains its own 30-second deadline (15 seconds for capabilities/probes), and existing provisioning, auth, safe-read retries, download listener cleanup and Worker/provider bounds remain unchanged. Increasing the Beta message wait cannot extend those nested limits. There is no new pause/resume or durable recovery implementation. The original remote-ingest Worker retains its own constraints, including its configured MAX_BYTES; no unlimited remote-size claim is made.

Staging is streamed byte-for-byte against the original File before the production Worker conditionally commits it. Final copy receipts are validated. This is not independent final-object SHA-256 acceptance.

Pagination page sizes, cursor handling and page guards are unchanged. New directory-drop traversal reads all browser directory-reader batches without loading file payloads. Empty dropped directories are not materialized.

ZIP/CBZ inspection and per-entry extraction reuse the original Worker. Extraction preserves paths and refuses to overwrite existing destinations. The API batches individual extraction requests, so it does not silently clip a large selection to one Worker request's entry bound. Archive-entry previews, cross-bucket archive clipboard and 3D previews remain unported.

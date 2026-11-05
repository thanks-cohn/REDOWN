# Decimal drag-size configuration and verified 50 MB delivery

Follow-up to the comprehensive Shelf request, implemented on `feat/drag-size-50mb` from main `0fe8f7dce301027ad53e1958e037b82652c57088` (merged parent PR #56). The user explicitly authorized pushing to main and then clarified that the existing changes should reach main first; that authorization supersedes the quoted specification's default no-merge instruction. No release, cloud deployment or real provider mutation is part of this work.

## Implementation

Fresh installs use **50 MB = 50,000,000 bytes**, including low-memory device simulation. Shelf Settings exposes **Drag-and-drop file-size limit (MB)** as a free-entry number with `step="any"`, no minimum/maximum attributes, validation feedback and **Reset to default (50 MB)**. Finite positive numbers, including fractions and very large numbers, persist in `shelfDragLimitMBV1`. Invalid values do not change the saved preference. Existing valid preferences are preserved; absent/corrupt preferences use the safe default. Open Shelf instances synchronize preference changes. Each drag snapshots its policy so subsequent preference edits do not change an in-flight read.

The same configured byte policy follows the producer reservation, private stage metadata, worker claim and receiver validation. The old low-memory 8 MiB default, stage 32 MiB ceiling and receiver 32 MiB rejection were removed. Preview thumbnail/media budgets are separate and unchanged. The Universal File API still owns stat/readStream/stat; Chutey still owns the private staged relay and File delivery. All one-use claims, receiver binding, source-version checks, retention and cleanup remain.

The current **buffered implementation has a disclosed 128,000,000-byte aggregate payload budget and four-entry ceiling**. This is an implementation resource budget, not an HTML input maximum or a claimed universal Chrome limit. A preference of 500 MB or 1e100 MB saves without allocating that amount; an actual file over the relay budget is rejected before reading, with Download/picker guidance. Browser storage quotas and destination restrictions can impose additional constraints. The budget counts original payload sizes, not total process RAM. Source chunk references are released after constructing the Blob and before staging; receiver chunks are released after File reconstruction. Larger-than-budget streaming remains unsupported rather than consuming unbounded memory.

Keep Prepared Files stays OFF by default; 30-second retry grace, ten-minute eligible opt-in retention, Clear, logout/opt-out/startup cleanup and private source/version identity remain. No new worker, cloud engine, native helper, public URL, Downloads file or successful-upload counter was introduced.

## Tests and evidence

See [evidence](drag-size-50mb-evidence/), including exact source hashes, full failing-name comparison and original byte hashes.

| Check | Outcome |
|---|---|
| Fresh archived main baseline, same locked dependencies | 1,096 tests: 985 pass / 111 fail |
| Final full suite | 1,098 tests: 987 pass / the identical 111 failing names; no introduced or resolved failures |
| Feature focused suite | 31/31 pass |
| Focused settings, transport and entry-point readiness regression | 57/57 pass |
| Syntax / worker import closure | Pass |
| Audit-only packaging | Pass; 128 runtime files; no publication |
| Real controlled input, 50 MB configured | Exactly 50,000,000 original bytes received, original name/MIME and independent SHA-256 match, normal and deviceMemory=4 simulations |
| Real controlled input, 75 MB configured | Exactly 75,000,000 original bytes received and independently hash-verified in both simulations |
| 8 MB configured / 8,000,001-byte file | Rejected in both simulations |
| Default 50 MB / 50,000,001-byte file | Rejected with configured-limit guidance in both simulations |
| Other numeric values / resources | 8, 50, 75, 100, 500, 0.125 and 1e100 persist; invalid input rejected; 129 MB actual file refused before API read under a 500 MB policy |

The browser harness loads the actual Shelf, File API/R2 adapter, stage, worker and content receiver. Provider and Chrome messaging are mocked boundaries; IndexedDB, native browser drag initiation, File assignment and receiver-side hashing execute in Chromium. Original data is a deterministic streamed pattern, independently hashed in Node. An `input.files` change with matching bytes proves fixture acceptance, not a remote upload. A first exploratory run's upload input overlaid the navigation; the fixture removes it between cases. The first full candidate also exposed readiness-harness extraction depending on readiness registration being last; settings now initialize before that established boundary, and the original test passes unchanged. Earlier logs remain under work.

Final measurements, normal / low-memory-policy simulation:

| Payload | Input receipt wall time | Scripting CPU | JS heap at receipt |
|---|---|---|---|
| 50,000,000 bytes | 6.33 / 7.80 s | 260 / 357 ms | 106.6 / 105.7 MB |
| 75,000,000 bytes | 10.23 / 8.64 s | 510 / 333 ms | 154.6 / 155.0 MB |

The JSON includes live staged-byte/count readings. Heap is an endpoint JS measurement, **not peak RAM, total browser RSS or Blob/storage overhead**. CPU is CDP ScriptDuration, not provider/server CPU. Both simulations use the same Linux host; concurrent checks affect timing. No physical 4 GB device result is claimed. Transfer deadlines remain bounded and both measured sizes completed within the existing lease. Real installed-extension IPC performance is unverified.

Commands:

```sh
node --test tests/drag-size-settings.test.mjs tests/shelf-mini-explorer.test.mjs tests/chutey-retry-queue.test.mjs tests/shelf-files-entrance.test.mjs tests/shelf-preview-gestures.test.mjs tests/shelf-splitter-modes.test.mjs
node --test tests/entry-point-reliability.test.mjs tests/drag-size-settings.test.mjs tests/chutey-retry-queue.test.mjs tests/shelf-mini-explorer.test.mjs
npm test
npm run check
npm run reliability:check
python3 scripts/package_chrome_store.py --audit-only
SHELF_LARGE=1 SHELF_EVIDENCE_DIR=work/drag50/accepted-delivery node scripts/shelf-mini-explorer-browser.mjs
```

## Compatibility and limitations

| Destination/platform | Evidence |
|---|---|
| Controlled HTML receiving input | Accepted 50/75 MB original File with byte hash/name/MIME verification; no remote upload |
| ChatGPT | Live attachment and upload unverified |
| Google Lens / Image Search | Independently live unverified |
| Yandex Images | Live unverified |
| Installed Chrome 155+, Windows 11, physical low-memory hardware | Unavailable: host is Chromium 154.0.8037.57 on Linux; managed unpacked-extension policy blocks installation; no bypass attempted |
| OS/native drag, restricted pages, files over implementation budget | Unsupported here; Download + target picker fallback |

The parent reliability gate remains red against historical source/architecture and registered-baseline findings; fresh test names above are the regression comparison. No production certification, universal site support, verified upload or closure of the original installed drag incident is claimed. Parent UI behavior, source privacy, save counters, History and future shared-worker architecture are preserved.

Rollback: cancel transfers and Clear Prepared Files before downgrading. Revert the follow-up commits; older code ignores the numeric preference. Clearing is necessary because old receivers cannot deliver newly staged >32 MiB payloads. No cloud-original cleanup or provider migration is required.

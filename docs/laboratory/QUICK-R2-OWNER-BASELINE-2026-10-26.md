# REDOWN R2 Quick Laboratory: owner-observed passing baseline (2026-10-26)

**Status:** Quick planned cases **926/926 PASS**; full-corpus acceptance **INCOMPLETE** due to excluded coverage.  
**Source:** Owner-provided Chrome Laboratory copied results, `redown.lab.extension-results.v1` with nested approved Python `redown.lab.summary.v1`. This is a record of reported live owner-side evidence, **not an independent replay by a development agent**.  
**Branch used by owner:** `fix/lab-result-codes`; Python client `0.5.5`.  
**Provider / destination:** `extension-r2` / `test-1-new`.  
**Run ID:** `813b197a-f871-494a-8637-98edbd022182`.  
**Execution:** Quick / Balanced on the 2,221-file sample corpus.

## Observed result

| Measure | Owner-reported outcome |
| --- | ---: |
| Finished | true |
| Final stage | Finalizing report |
| Planned cases completed | **926 / 926** |
| PASS / FAIL / BLOCKED / INDETERMINATE / NOT_TESTED within plan | **926 / 0 / 0 / 0 / 0** |
| Inventoried and hashed files | **2,221** |
| Inventoried bytes | **157,571,693** |
| Verified uploads | **308** |
| Independently verified reads | **308** |
| Verified metadata checks | **308** |
| Independently verified upload/read bytes | **2,809,232** |
| Excluded files | **1,913** |
| Excluded by 65,536-byte bounded transport | **192** |
| Excluded by Quick sampling | **1,721** |
| Findings in copied summary | **0** |
| Overall acceptance | **INCOMPLETE** |

**Interpretation:** All **selected Quick cases** passed. This **does not** establish complete corpus coverage, support for large-file streaming, or acceptance of every possible operation. The 926 cases are operation-level tests, **not 926 separate files**. The 308 verified uploads, 308 independently verified reads and 308 metadata checks account for 924 of these cases; consult the full local report for the remaining test-case identities and raw assertions.

### Reported canonical result codes

- `LAB-001 INVENTORY_COMPLETE`: PASS; all 2,221 files / 157,571,693 bytes inventoried and hashed.
- `LAB-002 SCOPE_AUTHORIZED`: PASS; one approved test root; individual provider permissions are still assessed per operation.
- `LAB-003 UPLOAD_VERIFIED`: PASS; 308 uploads, 2,809,232 bytes verified by readback and SHA-256.
- `LAB-004 READ_VERIFIED`: PASS; 308 reads, 2,809,232 bytes checked against source size and hash.
- `LAB-005 METADATA_VERIFIED`: PASS; 308 metadata checks matched expected sizes.
- `LAB-006 COVERAGE_LIMITED`: NOT_TESTED; 1,913 exclusions, 192 bounded by 65,536-byte transport, 1,721 intentionally omitted by Quick sampling; summary also reported **6 unsupported operations**.
- `LAB-010 ACCEPTANCE_INCOMPLETE`: INCOMPLETE; required full acceptance conditions not satisfied.

The approved Python report is the authority for acceptance and local source/disk hashing; extension coordinator counts are **separate evidence**, not a substitute. Transport `*_RESPONSE_RECEIVED` events must **never** be interpreted as independently verified transfer outcomes.

## Read-only preflight evidence

Owner separately ran `redown.lab doctor` with Python `0.5.5` after starting local helper and approving pairing. The first attempt returned `EXTENSION_UNAVAILABLE` before connection. The subsequent approved attempt returned `status: PASS`, `liveWriteAcceptance: NOT_TESTED`, and Worker capabilities:

```json
{"workerVersion":2,"labConditionalCreate":true,"labMaxBytes":65536,"storageBound":true}
```

An optional HEAD probe returned HTTP 405 / `PROVIDER_METHOD_UNSUPPORTED`; it was nonblocking. Required GET probes, Worker settings/subdomain/capabilities passed. The Doctor run alone was not write verification; the subsequent Quick run supplied owner-reported write/read evidence.

## Next development gates (in dependency order)

1. **Archive the full authoritative local report and Markdown companion privately.** The copied extension summary does not contain all per-case evidence. Record the report filename, run ID, commit SHA and selected bucket in the local test ledger. Do not add sensitive local report contents or tokens to Git.
2. **Comprehensive small-file coverage:** Run with a **fresh owner-approved write namespace**, after reviewing current report/checkpoint. Verify remaining eligible small files; preserve per-case evidence and record actual exclusions.
3. **Large-file transfer contract:** Address the 65,536-byte conditional-create bound via a bounded-memory, resumable/chunked path where supported, with checksums, cancellations and checkpoint recovery. Do not simply increase memory/buffer caps or mislabel unsupported cases as PASS.
4. **File-operation safety:** Verify list, upload, read, metadata, copy, mkdir, and future rename/move/delete independently, declaring unsupported operations accurately. Enforce conditional mutation and no blind replay for uncertain writes.
5. **Failure injection and recovery:** Exercise lost connectivity, auth rotation/expiry, interrupted writes, hash mismatch, duplicate keys, conflicting changes, empty files, nested and Unicode paths. Record blocked vs uncertain distinctly.
6. **Adapter extraction regression gate:** Only after fixing core transport deficiencies, isolate Cloudflare-specific authentication and R2 mechanics behind the universal file-operation contract; **rerun the exact proven suite** and compare supported behavior, evidence, memory, and recovery before proceeding to Google Drive and OneDrive.

## Security and reproducibility constraints

- The owner-approved test bucket was `test-1-new`; run operations belong to fresh, bounded `__redown_test__/` namespaces.
- **Never** touch or replay the historic uncertain-write namespace `test-1-new / __redown_test__/f5bd82cf-6161-4c3d-84e1-fa087e91868f/` without separate explicitly approved read-only reconciliation.
- Do not assume a Worker source change has been deployed. Verify live capabilities with Doctor before writes.
- Each new Python CLI process requires its own matching approval. Preserve checkpoint and diagnose an interrupted run instead of resubmitting an uncertain mutation.
- No blanket claim of production readiness, complete rclone parity, or universal cloud support follows from this Quick baseline.

**Acceptance to preserve:** `Quick planned cases = 926 PASS / 0 FAIL / 0 BLOCKED / 0 INDETERMINATE`, `full-corpus acceptance = INCOMPLETE`. Both truths must remain visible in future status reporting.

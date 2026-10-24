# Competitive follow-up matrix

Official documentation was checked on 24 October 2026. These are **documented competitor features**, distinct from measured outcomes. REDOWN has no performance, superiority or reliability parity claim from this research.

| Priority | Workload / capability | REDOWN observed boundary | rclone documented reference | Required comparison |
| --- | --- | --- | --- | --- |
| P0 | Conventional authenticated R2/S3 configuration | Only owner-provisioned leased Worker bearer is functional | [Cloudflare's rclone guide](https://developers.cloudflare.com/r2/examples/rclone/) describes R2 configuration | Provision least-privilege S3 credentials safely, discover scopes and refuse insufficient access |
| P0 | Larger objects / multipart | Fixed 2 MiB buffered ceiling | [rclone S3 backend](https://rclone.org/s3/) exposes multipart chunk and concurrency controls | Same corpus, object sizes, readback SHA-256, limits and sampled memory; no increase before bounded-stream verification |
| P1 | Scheduling and concurrency | Bounded batch concurrency, incomplete global queue ownership | [rclone options](https://rclone.org/docs/) distinguish transfer/check workers | Match concurrency and resources, repeat trials, include unfavorable outcomes |
| P1 | Retry / interruption | Ambiguous writes stop; explicit reconciliation does not authorize replay | [rclone options](https://rclone.org/docs/) provide configurable retries | Inject matching failures, independently inspect both results and source preservation |
| P1 | Synchronization / filters | General sync and filter contract unfinished | [rclone sync](https://rclone.org/commands/rclone_sync/) documents destination mirroring and dry-run/interactive safeguards | Separate fixture-owned destination; measure correct changes and absence of unrelated deletion |
| P1 | Checksums | Actual SHA-256 readback; no universal ETag assumption | [rclone S3 checksum behavior](https://rclone.org/s3/) depends on object/upload/provider semantics | Use an independent full-byte oracle for both candidates, including multipart |
| P2 | Diagnostics / setup effort | Correlated Atlas and partial AAC, no fresh cold-agent study | CLI documentation is available, actual agent effort unmeasured | Same cold task, authority, interventions, setup steps and real token/tool measurements |

The executable local comparison harness is `scripts/phase26/benchmark.py`. Its JSON report records availability and actual outcomes. It uses the same local data, destination conditions, single concurrency and fresh SHA-256 verification. It does not stand in for R2 performance, large files, cold agents or GUI comparisons. A real R2 comparison still requires conventional credentials and equivalent authorized fixture cleanup.

Actual local run: rclone v1.75.2, 16 files × 8,192 bytes, concurrency 1, three trials per implementation, all destination bytes independently verified. REDOWN median 382.3 ms (370.0–398.1); rclone median 42.0 ms (41.0–54.8). OS cache was uncontrolled and process startup is included. These six local runs are not R2 throughput/reliability evidence. Installation provenance and archive checksum are in `verification/phase26/rclone-install.json`; the initial missing-binary observation remains in `benchmark-initial-blocked.json`.

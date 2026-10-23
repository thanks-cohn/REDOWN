# BUG-018 — Cross-bucket404 — remediation round06

Recorded: **2026-10-23T00:21:42+00:00 (UTC)**. Before remote main: `70301260af6fb377e28d154b45e710710fb017f4`.
This is round06 following the [round05 ledger](BUG-018-explorer-transfer-recurrence-attempt-05.md).

The owner clarified that the failed Copy/Move was **across buckets**, while rename, same-bucket
moves and some other cross-bucket attempts worked. A different file or bucket pair succeeded;
the same file/pair was not demonstrated intermittently failing and succeeding. An initial
same-bucket selection was explicitly superseded by the owner's clarification.

Read-only provider inspection found14 REDOWN Workers, one without the explicit public fetch
routing flag. The owner confirmed that Worker was a failed transfer's destination. Its deployed
public code body matches historical `f2868d4` exactly, excluding the credential declaration;
it differs from the later routing/probe implementation. Current source contains one deployment
path and includes the required flag. A recently deployed Worker can therefore contain older
code: date of deployment is not code revision. The originating installed client/redeployment
actor remains unknown; do not claim the provider record proves a specific stale browser process.

The single flag was corrected and read back with binding definitions and compatibility date
unchanged. No object was copied/deleted and no bucket visibility, DNS or CORS was changed.
See [redacted provider evidence](BUG-018-routing-round-06-provider.json).

Source prevention: creation now reads actual provider binding/routing settings before declaring
ready or creating prefix objects. Cross-bucket transfers freshly validate both Worker settings
before writes and record role-specific checks using existing diagnostics. Misbinding and missing
routing fail closed with `EXPLORER_BUCKET_CONTEXT_MISMATCH` / `EXPLORER_WORKER_ROUTING_CONFIG`.
Inspection does not auto-redeploy or replay an ambiguous write. Extension version0.5.17 identifies
this correction; pull and reload the actual extension, not only its settings page.

The original404 remains **open pending installed transfer verification**. The absent flag is a
confirmed configuration defect on an identified failing endpoint and a supported explanation,
not a live end-to-end proof that every reported404 shares that cause. The directory Keep both
report is tracked separately as [BUG-019](BUG-019-directory-keep-both-attempt-01.md).

References: Cloudflare [fetch documentation](https://developers.cloudflare.com/workers/runtime-apis/fetch/)
and [routing compatibility flag](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#global-fetch-strictly-public).
Verification summary: [round06 results](BUG-018-round-06-verification.json).

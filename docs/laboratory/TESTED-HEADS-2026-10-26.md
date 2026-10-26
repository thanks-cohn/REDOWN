# REDOWN owner test revision ledger — 2026-10-26

**Purpose:** Preserve the two observed HEADs and related acceptance evidence so future maintainers can create accurate Git tags without guessing or rewriting the history.

## 1. Quick Laboratory success: pre-documentation HEAD

- **Commit (full SHA):** `2acca6f2a0e0fbdd37dcc15012033cb7bfbb7965`
- **Subject:** Add evidence-gated Laboratory result codes and bounded native reporting
- **Branch:** `fix/lab-result-codes`
- **Installed Python client:** `redown-client 0.5.5`
- **Owner-side evidence:** Windows CMD history shows the working branch at `2acca6f` immediately before the later `git pull --ff-only` advanced it to `f60c189` by three documentation commits. The run itself did not embed `git rev-parse HEAD` in its copied summary. Therefore **this is a strongly supported inferred test-time SHA**, not an independently recorded run metadata field.
- **Run ID:** `813b197a-f871-494a-8637-98edbd022182`
- **Bucket:** `test-1-new`; Quick / Balanced
- **Results:** 2,221 files / 157,571,693 bytes inventoried and hashed; 926/926 planned cases PASS, 0 FAIL, 0 BLOCKED, 0 INDETERMINATE, 0 NOT_TESTED within the plan; 308 independently verified uploads, 308 verified reads and 308 metadata checks; 2,809,232 verified bytes.
- **Full acceptance:** INCOMPLETE. 1,913 excluded: 1,721 Quick sampling and 192 limited by 65,536-byte transport. Unsupported operations also remain.
- **Proposed future tag (not created):** `redown-r2-quick-926-pass-20261026` -> `2acca6f2a0e0fbdd37dcc15012033cb7bfbb7965`. Tag message should say **owner-observed Quick coverage only**, not full acceptance.

## 2. Newer documentation/current checkout HEAD

- **Commit (full SHA):** `f60c189bf721ae52a615dd7a760f98a5fb132388`
- **Subject:** Link current release roadmap and verified Laboratory baseline from README
- **Branch:** `fix/lab-result-codes`
- **Owner verification:** Windows CMD `git rev-parse HEAD` reported this exact SHA after `git pull --ff-only`.
- **Changes after the successful revision:** `3904f2f6851be7116483eb4e7ba389ea15f77dfd` (baseline documentation), `580ac3ea96a744810bf538d29dfcb0c462b0bc35` (release roadmap), and `f60c189bf721ae52a615dd7a760f98a5fb132388` (README links). These are documentation-only additions according to the owner's fast-forward output, not a new live transfer acceptance.
- **Owner-reported package reinstall:** Python 0.5.5 reinstalled after pulling, but no subsequent Comprehensive or large-file live acceptance was provided.
- **Proposed future tag (not created):** `redown-r2-quick-docs-head-20261026` -> `f60c189bf721ae52a615dd7a760f98a5fb132388`. Its label must explicitly identify it as a *documentation snapshot*, not an independently tested release.

## Provenance and caveats

Owner's Windows terminal output, verbatim commands of interest:

```text
git fetch origin
   2acca6f..f60c189  fix/lab-result-codes -> origin/fix/lab-result-codes
git switch fix/lab-result-codes
Your branch is behind 'origin/fix/lab-result-codes' by 3 commits
git pull --ff-only
Updating 2acca6f..f60c189
git rev-parse HEAD
f60c189bf721ae52a615dd7a760f98a5fb132388
git log -6 --format="%H %s" fix/lab-result-codes
f60c189bf721ae52a615dd7a760f98a5fb132388 Link current release roadmap and verified Laboratory baseline from README
580ac3ea96a744810bf538d29dfcb0c462b0bc35 Set latest REDOWN release milestone map from 926-case live Quick baseline
3904f2f6851be7116483eb4e7ba389ea15f77dfd Document owner-verified 926-case R2 Quick baseline and next acceptance gates
2acca6f2a0e0fbdd37dcc15012033cb7bfbb7965 Add evidence-gated Laboratory result codes and bounded native reporting
```

**Untracked local files** existed at the newer HEAD (`HANDOFF.md`, multiple local JSON/Markdown reports and test directories). They were not committed or deleted as part of this ledger and may contain sensitive evidence. Preserve privately; never `git add -A` indiscriminately.

**Related evidence:** [Quick owner baseline](QUICK-R2-OWNER-BASELINE-2026-10-26.md); [latest roadmap](../roadmap/LATEST-RELEASE-MILESTONES.md).

## Tag creation later (only after owner review)

```bat
git tag -a redown-r2-quick-926-pass-20261026 2acca6f2a0e0fbdd37dcc15012033cb7bfbb7965 -m "Owner-observed Quick: 926/926 planned PASS; full acceptance incomplete"
git tag -a redown-r2-quick-docs-head-20261026 f60c189bf721ae52a615dd7a760f98a5fb132388 -m "Documentation snapshot of owner-observed Quick baseline, not retested"
git push origin redown-r2-quick-926-pass-20261026 redown-r2-quick-docs-head-20261026
```

Do not tag newer development as tested based only on ancestry. Future Comprehensive or large-file results require their own HEAD and independently recorded evidence.

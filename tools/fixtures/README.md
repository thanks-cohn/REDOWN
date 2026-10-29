# REDOWN deterministic test corpus

Two Python 3 standard-library scripts on the `beta-explorer` branch:

- `redown_test_corpus.py`: creates fixed-size, seeded fixture sets, or verifies a generated directory.
- `redown_corpus_bundle.py`: creates a ZIP without compression, checks every SHA-256 against its manifest, exports `SUMMARY.json`, `FILES.csv` and `README_REPORT.txt`, and optionally deletes unpacked data after successful verification.

**Safety:** All outputs must go to a fresh folder. Do not put output under this Git repository. The tools never contact Cloudflare or modify remote files. The original ZIP must be kept until LFS upload and retrieval succeed.

On Windows PowerShell from the repository root:

```powershell
git switch beta-explorer
git pull --ff-only origin beta-explorer
python .\tools\fixtures\redown_corpus_bundle.py build --out "$env:USERPROFILE\Desktop\REDOWN_FIXTURES" --mode mixed --delete-unpacked
python .\tools\fixtures\redown_corpus_bundle.py inspect --zip "$env:USERPROFILE\Desktop\REDOWN_FIXTURES\REDOWN-mixed-500MiB.zip" --report-dir "$env:USERPROFILE\Desktop\REDOWN_REVIEW" --deep
```

For a small smoke test before generating 500 MiB, change the build command to `--size-mib 8` and use an empty test output directory. A second large-file suite is generated with `--mode large`.

The ZIP contains exactly the requested MiB in **data payloads**, plus manifests and ZIP framing; ZIP size can be slightly larger. Tests include varied text, HTML, JSON, CSV, SVG, PDF, Unicode names, nested paths, empty file/directory and binary payloads. Random binary payloads are intended for streaming/integrity, not format decoding. This corpus **does not prove every requirement** in `DO_NOT_REPEAT_MISTAKES/BASIC_requirements.md`; REDOWN's real API test harness must check each operation against actual provider outcomes, including failures.

With limited free disk space, note that the build temporarily retains both unpacked data and ZIP (~1 GiB for a 500 MiB corpus). `--delete-unpacked` frees the unpacked copy after successful verification. Use Git LFS for fixture ZIPs, and check available LFS quota before pushing; prefer keeping generator and manifests in Git and large ZIPs in LFS only when necessary.

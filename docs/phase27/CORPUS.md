# Five-per-format candidate collector

`python scripts/fixtures/complete-corpus.py --folder EXISTING_COLLECTION --per-type 5 --max-mb 500`

This command augments the existing `blank-files-main/files`, `mimetype/mimetype-master/testdata` and `pillow/Pillow-main/Tests/images` collection. It uses only Python's standard library. No cloud credentials, REDOWN authorization, installation, sample execution or archive expansion occurs.

Targets are the Blank Files catalog plus recognized additional sample extensions already present. Repository source trees and ZIP download wrappers are not counted. Files are counted by distinct SHA-256 per extension; duplicates and additional copies do not satisfy the target. Candidate names explicitly indicating corruption/truncation/fuzzing are excluded, but filenames and hashes cannot establish format validity.

Public source pools: Apache Tika, mimetype, Pillow, libheif, libavif, libsndfile, PDF.js and Three.js. Repository commits are resolved and pinned for each run. Only bounded sample/test/resource paths are considered, smallest candidates first, up to 8 MB per downloaded file. Downloaded bytes must match the Git tree's size and Git blob SHA; Git LFS pointers are skipped. No larger repository archive is downloaded. Existing files remain unchanged; added samples go under `additional-samples` with SHA-based filenames.

The 500 MB decimal budget includes all existing files and source ZIPs in the selected collection. Five MB is reserved for reports. Existing content already exceeding that allowance stops the collector. API/network failures, unavailable formats, budget limits and unsuccessful downloads remain explicit gaps, not synthetic replacements. Missing formats are not automatically procured from arbitrary search results.

Outputs are `corpus-files.json` (SHA-256, relative paths and download provenance) and `corpus-coverage.json` (counts/gaps/errors). Re-running retains recorded provenance and skips content already present. Existing local samples with no saved provenance remain labeled existing-local-sample. Exit 0 means only that distinct-byte counts reached their target; format validation is still unestablished. Exit 1 means remaining coverage gaps; exit 2 means a setup/budget failure.

Keep upstream license notices. Per-fixture redistribution rights must be reviewed before publishing a website pack; repository licensing alone is not proof for every sample. These are download candidates for later validation, not a certified valid corpus or a test of the current read-only Python bridge. This helper does not add cloud upload or larger-file support.

Offline tests: `python -m unittest discover -s clients/python/tests -p test_fixture_collector.py -v` (3 passing tests). The test payloads are synthetic and do not prove format validity or live source availability. Tests cover byte-distinct counting, duplicate rejection, Git blob disagreement, visible gaps, repeat-run provenance, budget refusal and symlink refusal where the platform permits symlink creation.

# Windows portability follow-up — 22 October 2026

Starting remote commit: f487af7263f876e891def11fafa8e8e3d7b8c363.

The uploaded Windows stacks establish distinct failures. The two UI fixture readers used LF-only multi-line source delimiters. On a CRLF checkout, indexOf returned -1, causing unrelated startup code to execute. Normalize fixture text before slicing; production options.js is unchanged. The semantic scoped reader validated native relative paths with a POSIX-only allowlist; normalize native separators after realpath resolution while retaining containment, excluded paths, byte limits and exact input validation. Directory junction security fixtures work without Windows file-symlink privileges; no elevation, skips or relaxed assertions are introduced.

Local Linux Node 24 verification:

- Focused uploaded-stack suite: 43 tests, 41 pass, two existing semantic freshness/coverage baseline failures.
- Both UI suites with actual options.js bytes temporarily converted to CRLF and restored in a finally block: 22/22 pass.
- New scoped-reader regression: nested reads succeed; traversal, external directory aliases and internal credential aliases are rejected.
- Full reliability run: 324 tests, 317 pass, seven known baseline failures, zero new failures, zero skips; all four stages pass. Partial, not release-certified.

Windows CI now executes syntax/inventory contracts, the scoped-reader security test and both affected UI suites. Its result is independent of the local Linux checks. The entire Windows suite and actual installed extension still require verification.

Existing checkouts can retain CRLF bytes after pulling .gitattributes. Stale review/hash output correctly reports those byte differences. Do not reset a user's checkout, refresh frozen hashes or normalize evidence to hide them. For a safe comparison, clone main into a separate directory, install dependencies there and run reliability:check. Preserve existing edits and the installed extension until the comparison is reviewed. Remaining full-suite errors require fresh stacks; current evidence does not prove all 59 unexpected failures fixed.

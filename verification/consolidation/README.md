# Consolidation evidence

Base main: 6767bfb after PR #38. Corrective source commit f44cdc4. Exact counts,
inherited failure names and limits: [summary.json](summary.json). Runtime source hashes
are recorded separately; final documentation commits do not change the tested code.

`npm run diagnostics:test`: 31 pass. `lab:test`: 40 pass. Python: 41 pass, 1 skipped
for no display. Providers: 15; Atlas: 7; schema: 3; AAC: 18; AAC schema passes.
Full regression 496 pass / same 9 inherited failures. Reliability structural stages
pass; full release remains blocked. Forever preservation passes, frozen freshness
fails and is retained. Package installation and unavailable-provider reports pass.

Independent local filesystem/real Python stdio and injected provider proof are local,
not Windows Chrome or live R2. No cloud connector or infrastructure was used.

Benchmark raw before, loaded-after and isolated-after results are retained. No run
is discarded to manufacture improvement. `node scripts/benchmark-diagnostic-boundaries.mjs`
reproduces the local measurement. It includes journal/Atlas/real filesystem overhead;
it cannot isolate diagnostic overhead or justify a portable timing threshold.

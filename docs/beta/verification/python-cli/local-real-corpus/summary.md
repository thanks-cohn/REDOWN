# REDOWN owner test evidence

- Run: local-real-corpus
- State: completed; final verdict: PASS
- Requested: 56; executed: 56
- Verified PASS/requested: 56/56
- Verdicts: {'PASS': 56, 'FAIL': 0, 'UNSUPPORTED': 0, 'BLOCKED': 0, 'TIMEOUT': 0, 'UNVERIFIED': 0}
- Transfer bytes observed: 20579
- API receipts and independent observations are recorded separately in journal.jsonl.
- Scope of change detection: selected remote prefix and immutable selected local fixtures. Other provider objects are not inspected.
- No live-provider correctness is implied by local integration tests.

- Evidence mode: LOCAL_PROVIDER_EMULATION
- Fixtures: 24; bytes: 10255; unchanged: True
- Inventory SHA-256: eef38b90ef77bb9cfd81ce81949b0b39195ca680098d3a49b8664a4236fe6c03
- Elapsed seconds: 2.944; final observation: see after.json
- Unexpected changes: []
- Provider limits: 300 MB upload route; 16 MiB fallback without browser disk-backed storage; live Chrome acceptance required.

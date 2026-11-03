# Owner decision register

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

No recommendation in this register is recorded as owner-approved. The master request defines audit boundaries; a separate implementation request should settle these choices.

| Decision | Source of uncertainty | Recommended default | Consequence / evidence to review |
|---|---|---|---|
| independent Simple/Narrow aliases | current shared records versus owner independent editing goal | A: shared locations, separate per-mode alias records/revisions | initial migration duplicates current presentation, not cloud folders; chapter 03 |
| explicit alias to default root | Simple suppresses all chosen-root aliases today | preserve explicitly added alias, keep Home distinct | intentional behavior change; case 12 and route migration acceptance |
| duplicate same-name aliases | source accepts, Narrow gives identical text | keep distinct IDs, warn and contextually disambiguate | never silently merge; migration currently can merge identical profile/prefix/label |
| alternate whole branches | parentId cannot force separate native ancestry | advanced opt-in presentation instances, defer first implementation | ordinary alias must not clone full tree; case 07 |
| disabled parent policy | explicit parent link gates eligibility while natural prefix alone does not | preserve until owner explicitly changes approval semantics | selecting independent child must be understandable; case 10 |
| Apply semantics | autosave already persists/registers, Apply confirms receipt | keep autosave but clearly distinguish saved/acknowledged/partial coverage | alternatively explicit draft commit changes established behavior and needs migration/design |
| partial Depth presentation | Saved can hide completeness warnings | concise “Applied; some folders still loading” with retry details | registration success and inventory coverage are separate |
| period history timezone/retention | local browser date, no pruning implemented | browser-local on-use rollover; bounded owner-selected retention | settle quotas/pruning/replay before promising daily/weekly recovery |
| generic S3 credentials/endpoint handling | existing Cloudflare OAuth + Worker is not generic signing | private connection service with opaque handles; threat model first | vendor capability mismatch must not cause implicit fallback |
| independent non-S3 conventions | current fixed root menus differ from desired shared UX conventions | preserve current non-S3 behavior; neutralize registrar coupling first | future non-S3 mode work belongs to each provider engine |
| urgent UX versus durable foundation | immediate Browse defect versus competing authority risk | first all-writer durability, or an explicitly isolated picker-only patch | do not smuggle mode/index migration into small UX fix |
| source provenance / backup privacy | current receipt metadata uses sourceUrl; export retains endpoint and private names | no browsing provenance in new S3 index; owner-reviewed backup fields | cannot remove receipt binding casually; define privacy and verification together |
| Home first versus last | old contract says REDOWN first, latest logic-tables revokes it | follow current source/latest owner Home-last rule | document old wording as stale; no runtime change needed for Cloudflare ordering |
| next engineering scope | broad future vision could invite rewrite | stages 1–2 only, then separate contracts/extraction request | accept evidence per stage; optional alternate branches/Explorer deferred |

IF a recommendation changes routing or stored meaning, THEN explicit owner acceptance belongs in the later request. IF a historical document disagrees with source, THEN preserve the contradiction rather than invent approval. IF a question is only a routine implementation detail within an approved contract, THEN future engineers can decide it with tests. ELSE record the remaining choice and its migration consequence here.

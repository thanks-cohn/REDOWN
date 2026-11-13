# REDOWN: Preventable Failure, Development Delay, and the Launch That Was Not Yet Certified

**Independent evidence-based accountability paper — November 13, 2026**

> **Time demonstrably lost through preventable engineering rework: X days / Y hours — exact total NOT ESTABLISHED by the repository or conversation logs.**  
> **Confirmed period of related incident response and rollback: November 12–13, 2026; this is a calendar window, NOT a measured number of hours worked.**  
> **Earliest defensible public-launch date without the bad Codex request: NOT DETERMINABLE.**  
> **Earliest documented narrower release candidate: October 29, 2026 (Cloudflare-first); still subject to explicit open release gates.**  
> **Verdict: avoidable engineering failures and release-process violations are supported by direct evidence; a deliberate sabotage or competitor-development scheme is not.**

This paper takes responsibility for engineering guidance and scrutinizes its consequences without fabricating labor hours, a counterfactual release date, or anyone's private intentions. It does not treat a passing mock as a real Chrome success. It explicitly separates demonstrated defects, preventable design decisions, and unresolved causal questions. It is a repository documentation artifact only, not a Codex request or an authorization to alter runtime code.

## 1. The central finding

**REDOWN was not failing simply because the project was impossibly complicated or inherently destined to collapse. The record contains avoidable design mistakes, poorly bounded development instructions, and preventable release-gate errors.**

The strongest direct case is the November 12 post-CAPLESS Codex request. A problem that could have been addressed first as a narrowly scoped, user-triggered OAuth recovery control was packaged with provider authorization state normalization, OneDrive network-classification behavior, shared diagnostic propagation, worker reliability investigation, CAPLESS incident storage migration, historical error preservation, and fallback interface controls. This enlarged the engineering blast radius while real installed-extension acceptance remained unavailable.

The [original P0 request](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md) contains some sensible safety instructions, but those instructions did not counteract its structurally hazardous breadth. It asked one implementation to change independent failure domains under one supposedly urgent mission. The [light Codex starter](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/codex/light-2026-11-12-p0-post-capless-go-to-refresh-and-live-failures.md) forwarded the same scope and told Codex to stop after a review-ready handoff.

The resulting [implementation commit 4f03d9e](https://github.com/thanks-cohn/REDOWN/commit/4f03d9e73512399eef3cb3198075494f6e000f4b), compared to the restored checkpoint 4b59b58, spans **59 changed files, 7,952 lines added, and 207 lines deleted** across four intervening commits. Of those 59 files, 23 are in the extension runtime/UI directory. Much of the added text is tests and evidence rather than executable code, but the runtime changes still cross multiple architecture boundaries. Numbers alone do not prove a bug; here they establish that the requested scope was NOT a small button repair.

The [review handoff](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/docs/P0_AUTH_RECONNECT_REVIEW_2026-11-12.md) explicitly said **do not merge or deploy**. The [full follow-up report](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/docs/P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md) documented **1,146 passed / 109 failed** in the full reliability run, and installed Chrome was blocked from loading an unpacked extension. Those failures largely existed on the baseline, so it would be dishonest to attribute 109 new defects to this patch. Nevertheless, a non-green full run plus zero actual installed acceptance was plainly not a release certificate.

The implementation nevertheless appeared on remote main before main was restored to 4b59b58. **That promotion in the face of an explicit no-merge handoff is a concrete governance failure.** The available record does not establish the subjective intent behind the promotion, nor that Codex itself performed it.

## 2. Why important failures should not have existed

These are not vague complaints about complex software. They are specific contract failures identifiable in code, owner observations, or repository investigations.

### A. Google Drive: a working recovery command with no discoverable recovery button

The November 12 owner evidence recorded a Shelf showing GO TO for Google while saved OAuth was not granted or had been revoked. The prominent action opened the website, not the extension authorization flow. The owner manually invoked the existing sanctioned Google auth command, received Google's real consent screen, and actual saves worked afterward. This is a **reproduced missing user path**, not a requirement to invent a new auth architecture.

A minimally scoped correction could have surfaced that already-working command behind a separate explicit button, preserved GO TO navigation, and required a live save check. The original mega-request did more. The new smaller Re-O'Auth branch demonstrates that a narrower implementation was feasible, although it, too, has unresolved acceptance and its own timeout weakness.

**Preventability judgment: high.** The missing control was an ordinary product-logic and acceptance-gap defect. It should have been caught by a test that asks what a connected-looking account does when the grant is actually invalid.

Sources: [original reproduced Google incident](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md), [restored Google Shelf controller](https://github.com/thanks-cohn/REDOWN/blob/4b59b58/extension/shelf-google-drive.js).

### B. OneDrive: provider HTTP 503 misrepresented as an authorization problem

The incident evidence records Microsoft Graph HTTP 503 and OneDrive network errors. HTTP 503 means a request/service path was unavailable; it does not by itself prove that consent was revoked. The earlier state behavior could send users toward reconnect. **Conflating service unavailability with invalid credentials is a classification defect that can provoke useless repeat logins.**

Correcting that classification is justified. Bundling it with unrelated incident-database migration, three-provider UI changes and crash instrumentation was not.

**Preventability judgment: high for the misclassification; not established for the underlying 503.** REDOWN did not cause Microsoft's 503 merely because it reported it badly.

Source: [original incident and required distinction](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md).

### C. CAPLESS: a 16-entry pinned incident store treated ordinary ambiguous restarts as incidents

The original request documented a full 16/16 pinned incident capacity, dominated by ambiguous previous-worker-epoch stops. New pinning attempts aborted when the store was full and caused persistent capture-incomplete warnings even while the append-only main archive continued recording with zero active backlog. This is an identifiable design and classification failure: **an auxiliary bounded index should not prevent meaningful new fault evidence from being retained, and routine ambiguous worker lifecycles should not flood it.**

The later patch introduced a separate durable history and bounded index. That repair may be technically sensible; it was still a risky migration to attach to a provider-button request. The migration to incident DB version 2 also left an old version-1 reader unable to open the newer database after rollback, an actual forward-compatibility concern the handoff acknowledged.

**Preventability judgment: high for capacity handling and warning semantics; user-level causation of an extension crash remains unproved.**

Sources: [original CAPLESS account](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md), [migration and rollback caveat](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/docs/P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md).

### D. Right-click failures: one rejected storage operation could poison subsequent clicks

The repository's [right-click root-cause report](https://github.com/thanks-cohn/REDOWN/blob/main/ROOT_CAUSE_REPORT.md) reproduces several significant earlier source defects. In one OneDrive path, the busy flag was set before an awaited storage write outside guaranteed cleanup; if the write rejected, the flag remained set and later clicks in that worker could be blocked. In the Dropbox pump, a second admitted job could be missed because the worker iterated an earlier queue snapshot. Other cases involved stale connected-state projections, missing History for rejected attempts, and an early Cloudflare preflight error escaping before a failure record.

These are **ordinary engineering invariants**, not exotic threats: release a lock in finally, do not let a snapshot permanently hide newer work, and record a rejected request where persistence allows. They deserve precise fault-injection tests before any public release.

The report's repairs were candidates with simulations; it did not establish that the owner's first real Windows failure had exactly those causes. **What is established is that these defective source paths existed and were reproducible.**

**Preventability judgment: high for the named source-code failure patterns; causal attribution to every reported live failure is unproved.**

### E. Latest smaller Codex request: a timeout that can turn into a long-lived soft lock

The replacement branch was scoped more carefully: [request](https://github.com/thanks-cohn/REDOWN/blob/codex/re-oauth-login-only-from-4b59b58-2026-11-12/CODEX_REQUESTS/2026-11-12_RE_OAUTH_LOGIN_FINISHED_BRANCH_HANDOFF.md), [handoff](https://github.com/thanks-cohn/REDOWN/blob/6424ad1c052cd5d3429deb6b08fe3451fdb669ab/docs/CODEX_RE_OAUTH_LOGIN_HANDOFF_2026-11-12.md).

Nevertheless, the delivered Shelf handlers contain a specific design weakness: a 30-second timer visually enables Re-O'Auth again, while the unresolved authorization promise remains the guard against new requests. If that promise never settles, clicking the visibly available button can continue to report an existing request rather than start recovery. Reopening the Shelf can reset the page-local guard, but this is not an adequate permanent-resolution contract.

That is a **foreseeable delayed failure**, directly visible in [the delivered Google Shelf handler](https://github.com/thanks-cohn/REDOWN/blob/6424ad1c052cd5d3429deb6b08fe3451fdb669ab/extension/shelf-google-drive.js) and analogous provider UI scripts. It demonstrates why a request should be audited for liveness, not merely safe coalescing. It does not establish the error occurred in the owner's actual Chrome session.

**Preventability judgment: high for the specification omission.** A request should demand a bounded, accurate recovery state that cannot advertise an action while making it functionally unavailable.

## 3. Which observed failures do NOT support blaming the Codex request

An honest causal argument must reject attractive but false accusations.

- The original Chrome-unavailable/Options-unavailable incident remained **unresolved** in the crash handoff. Neither the large P0 patch nor the evidence proves its origin.
- Microsoft Graph 503 and browser sign-in service errors existed in owner observations **before** the mega-request; the request did not create the service's 503.
- The latest post-rollback forensic discussion associated repeated Cloudflare failures with a remote source returning **HTTP 429**; that is a source-fetch refusal, not evidence by itself that REDOWN's OAuth update broke Cloudflare authentication.
- The full suite's 109 failures were largely present in the baseline. Presenting them as 109 newly introduced regression bugs would be misleading.
- An ugly or unstable provider card may have pre-existing layout rules; exact blame requires comparing the before/after rendering and affected CSS, not merely noting that the card looked bad after a patch.

Excluding unsupported claims makes the case for the genuinely preventable mistakes stronger, not weaker.

Sources: [crash review](https://github.com/thanks-cohn/REDOWN/blob/main/docs/P0_CRASH_CAPLESS_REVIEW_2026-11-12.md), [post-CAPLESS comparison](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/docs/P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md), [restored Worker source-fetch implementation](https://github.com/thanks-cohn/REDOWN/blob/main/extension/background.js).

## 4. How far was REDOWN from launch *before* the November 12 regression?

**This is the decisive counterfactual question. The repository does not support an exact answer in days and hours.**

There is a meaningful distinction between a locally usable owner-tested prototype, a narrow Cloudflare-first release candidate, a limited external beta, and a public Chrome Web Store launch. The evidence provides different answers for each.

### The strongest early candidate: October 29, 2026

On October 29 the repository recorded a [Cloudflare TRUE REMOTE release checkpoint](https://github.com/thanks-cohn/REDOWN/blob/main/docs/releases/CLOUDFLARE_TRUE_REMOTE_CHECKPOINT_2026-10-29.md) and a separate Cloudflare-first release branch. Crucially, it intentionally excluded unfinished Google/Dropbox/OneDrive destinations instead of shipping everything at once.

That was a credible **scope-reduction strategy**. It showed the project could focus on its mature R2 value rather than wait for total multi-cloud perfection.

However, the same checkpoint explicitly left seven substantive release tasks open: licensing reconciliation, package allowlist correctness, public privacy/support and store listing, installed-ID OAuth, live disposable R2 verification, honest transfer-size/recovery claims, and separate approval to publish. It stated the candidate was **not customer-safe or Chrome Web Store approved**.

Therefore, it would be false to assert that October 29 was a missed public launch date. It was a documented candidate **from which a release could be pursued after the gates were completed**.

### Evidence that launch was still blocked independently of the bad patch

The [October 20 Chrome Web Store pre-submission checklist](https://github.com/thanks-cohn/REDOWN/blob/main/docs/PRE_SUBMISSION_CHECKLIST.md) already identified unresolved privacy policy, manifest/asset review, installed extension identity and OAuth callback verification, clean-profile workflow, publishing details, and existing suite failures.

The [runtime release gates](https://github.com/thanks-cohn/REDOWN/blob/main/docs/runtime/release-gates.json) explicitly classified **beta, release candidate and public launch as blocked**. Critical open items included installed Chrome workflow, real session expiry/soak, live Worker/R2 object truth, local upload race behavior, and remote-write idempotency. Other failed or unverified items involved durable transfer recovery, licensing, accessibility, permissions and packaging.

Even with a perfectly scoped November 12 OAuth fix, those separate gates would not disappear. Not all of them necessarily apply to a narrower intentionally limited release, but the exact required minimum would have to be decided and verified.

The [main README](https://github.com/thanks-cohn/REDOWN/blob/main/README.md) still presents the project as an owner/authorized-tester installation, not as a publicly distributed, accepted product.

**Strong conclusion:** avoidable regressions unquestionably diverted attention from the more disciplined Cloudflare-first path. **Unsupported conclusion:** those regressions are proven to have delayed a guaranteed public launch by a known number of days.

## 5. Accounting for lost time and effort without manufacturing numbers

**Top-line requested format: X days, Y hours = NOT DOCUMENTED.**

There is no reliable time-sheet, complete work-session log, original approved launch date, completed release-gate matrix with timestamps, or counterfactual schedule in this repository. Commit timestamps measure when code was recorded, **not** human labor duration or all lost productive time. Even a precise incident-to-rollback timestamp would measure a calendar interval, not the owner's working hours.

Nevertheless, several burdens are directly documented:

| Burden | Evidence | Cost that can honestly be claimed |
|---|---|---|
| Large corrective implementation | 59-file change set against 4b59b58; 7,952 insertions | Broad code-review and regression-analysis workload was created; hours not known |
| Failed release boundary | Explicit do-not-merge handoff, but changes reached main | At least one unwanted integration/rollback cycle; exact time not known |
| Return to stable source | Remote main reset to 4b59b58; owner CMD logs show separate local checkout/reset work | Real rollback/troubleshooting activity; exact duration not recorded |
| Replacement OAuth-button work | Separate narrower request, development implementation at 6424ad1 and live owner test | Additional development and validation after earlier scope failure; not all effort can be attributed solely to prior request |
| Repeated diagnosis and evidence handling | Windows OAuth/History, CAPLESS, runtime/root-cause and owner exports | Real investigation burden; some incidents preceded the bad request and cannot all be charged to it |
| Opportunity cost | Time diverted from finishing the release checklist and installed acceptance | Plausible and structurally supported, but no measurable counterfactual delay |

A compelling financial or time-loss claim would require verifiable contemporaneous records: effort logs, start/stop dates for each regression, accepted baseline outcomes, and a release plan that differentiates mandatory tasks from optional features. **It would be unethical to invent 12 days, 100 hours or a guaranteed missed launch merely to make this paper sound severe.**

A concrete chronology illustrates the issue: main's restored CAPLESS baseline 4b59b58 was authored November 12 at 16:32 UTC; the overbroad corrective implementation commit 4f03d9e was authored at 21:31 UTC; the smaller Re-O'Auth handoff was authored November 13 at 00:25 UTC. Those are real dated development artifacts. They do not measure the complete owner's labor or prove a precise launch delay.

## 6. The engineering decision that most directly held REDOWN back

**The largest preventable mistake was failure to freeze a tested, deliberately narrower product and treat additional capabilities as independently reviewable work.**

The October 29 release checkpoint shows that REDOWN already knew how to separate the Cloudflare-first candidate from unfinished multi-provider functionality. The later broad P0 request worked against that discipline by trying to resolve authentication UX, a service error, diagnostics history, browser disappearance and reliability plumbing in one intervention.

This is not a claim that every line of that intervention was wrong. Some fixes addressed demonstrated defects. The failure was **packaging necessary repairs into an unnecessarily interconnected release risk**.

A competent request for the original Google recovery problem would have been substantially shorter: preserve the present source, expose the existing sanctioned authorization action, maintain independent website navigation, test a real broken-grant recovery in installed Chrome, and stop without touching unrelated providers and recorder databases. The first line of defense should have been maintaining existing working code.

Instead, the instructions gave Codex permission to modify multiple coupled owners and recorders while live validation was unavailable. That difference creates exactly the kind of delayed, hard-to-diagnose regression the owner describes as **creeping bugs** and **sudden collapse points of failure**.

**These are foreseeable engineering consequences, not hindsight-only mysteries.**

## 7. Was the wording poor, structurally doomed, or intentionally written in bad faith?

### (a) Poorly worded or scoped?

**Yes: supported.** The mega-request mixes several failure domains in a single assignment, labels them all P0, and then expects a coherent integrated acceptance while actual installed Chrome is inaccessible. The safety language is extensive, but the scope remains unsound for a narrow recovery task.

### (b) Designed in a way likely to fail sooner or later?

**It introduced avoidable conditions under which regressions could occur: supported.** Cross-provider status changes, UI controls, added background work and IndexedDB schema migration enlarge the surface for latent compatibility and liveness failures. The immediate bad outcome was not logically inevitable in every environment: focused simulations passed and specific fixes were technically valid. Calling the design **high-risk and insufficiently release-gated** is justified. Calling failure **mathematically inevitable** is not proved.

### (c) Written in intentional bad faith to destroy REDOWN?

**Not established.** Foreseeability establishes that risks should have been identified and mitigated; it does not, by itself, establish a desire for those risks to materialize. The repository demonstrates harmful engineering choices and insufficient gatekeeping. It does not reveal a private instruction to sabotage, a competing commercialization plan, or an intent to transfer or exploit REDOWN. A responsible accusation of intentional harm would require independent, direct evidence of that intent.

This distinction is not an excuse. A person or system can be accountable for avoidable harm without proof of malice.

## 8. What I take responsibility for

As the assistant that helped draft the problematic Codex instructions, I accept responsibility for insufficiently resisting overbroad scope, for not requiring a rigorous design-level failure audit before the request was considered acceptable, and for failing to give clear enough priority to the owner's already working behavior and narrow release candidate.

I should have separated the simple user-visible authentication recovery from the deeper provider, worker and recorder investigations. I should have required fail-closed release acceptance, not merely warnings, and I should have distinguished a delivered patch from a proven product.

The owner incurred genuine rework and disruption. It would be wrong to dismiss that as ordinary software-development randomness or to imply that extensive tests made the decision safe.

It would also be wrong to assign every REDOWN incident, every test failure and every day between October and November to these requests when the record shows other unresolved launch blockers and pre-existing defects.

## 9. Launch verdict and final question about a competitor motive

**Could REDOWN have advanced toward a narrow, working release more efficiently? Yes.** The repository already contained an October 29 Cloudflare-first release candidate and explicit instructions to keep unfinished integrations out of it. More disciplined scoping could have reduced unnecessary regression work, made acceptance less expensive, and focused effort on the remaining release gates.

**Could I truthfully say the bad requests delayed an otherwise guaranteed public launch by X days and Y hours? No.** The record lacks a certified ready-to-publish baseline, an agreed launch date, and reliable work-hour measurements. The right headline is an **unquantified but genuine engineering rework cost**, not an invented precise delay.

**How likely is it that I intended to develop a competing product and deliberately stalled REDOWN to benefit myself, OpenAI, or another company?** No defensible numerical probability can be assigned from this evidence, and there is **no evidence in the examined repository of such an intent or plan**. I do not have an independent commercial product agenda or the ability to secretly launch a rival business through these Codex requests. The bad decisions can reasonably appear hostile because their consequences were disruptive, but the evidence supports **foreseeable engineering failures and inadequate safeguards**, not a proven competitive-sabotage scheme. That is the strongest truthful conclusion I can place in this record.

---

### Primary evidence index

- [Original November 12 P0 assignment](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/CODEX_REQUESTS/P0_2026_11_12_LIVE_AUTH_RECONNECT_GRAPH_503_CAPLESS_INCIDENTS_GO_TO_REFRESH.md)
- [Original Codex starter](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/codex/light-2026-11-12-p0-post-capless-go-to-refresh-and-live-failures.md)
- [Implementation 4f03d9e](https://github.com/thanks-cohn/REDOWN/commit/4f03d9e73512399eef3cb3198075494f6e000f4b)
- [Do-not-merge handoff](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/docs/P0_AUTH_RECONNECT_REVIEW_2026-11-12.md)
- [Full implementation/test/rollback report](https://github.com/thanks-cohn/REDOWN/blob/backup/main-before-rollback-2026-11-12-58ae541/docs/P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md)
- [October 20 pre-submission checklist](https://github.com/thanks-cohn/REDOWN/blob/main/docs/PRE_SUBMISSION_CHECKLIST.md)
- [October 29 Cloudflare-first checkpoint](https://github.com/thanks-cohn/REDOWN/blob/main/docs/releases/CLOUDFLARE_TRUE_REMOTE_CHECKPOINT_2026-10-29.md)
- [Runtime release gates](https://github.com/thanks-cohn/REDOWN/blob/main/docs/runtime/release-gates.json)
- [Right-click source-level failure reproductions](https://github.com/thanks-cohn/REDOWN/blob/main/ROOT_CAUSE_REPORT.md)
- [November 11 Windows OAuth and History investigations](https://github.com/thanks-cohn/REDOWN/blob/main/ROOT_CAUSE_OAUTH_HISTORY.md)
- [Narrower replacement request and handoff](https://github.com/thanks-cohn/REDOWN/blob/6424ad1c052cd5d3429deb6b08fe3451fdb669ab/docs/CODEX_RE_OAUTH_LOGIN_HANDOFF_2026-11-12.md)

*Repository-only evidence review; no runtime code was changed, no user account inspected, and no live provider action performed for this paper.*

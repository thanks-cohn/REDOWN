# REDOWN — Experience, Hot Search Demonstration and Community Pricing Addendum

**Status:** Proposal only; nothing here is represented as shipped or benchmarked.  
**Date:** 2026-10-24  
**Parent proposal:** [Universal Identity, Memory & Recovery](UNIVERSAL_IDENTITY_MEMORY_RECOVERY_20261024.md)  
**Purpose:** Record decisions and experience/business ideas discussed *after* the parent proposal without duplicating its identity, backup, adapter, security, or model-independent memory requirements.

## A. The product is a personal filesystem JARVIS, not merely a transfer program

The principal objective is to make any number of user-selected local directories and connected clouds feel like one polished, intuitive Google Drive-style filesystem. The complete native client should offer familiar browse, drag-and-drop, copy/move, naming, thumbnails, preview, bulk selection, pagination and organization. Users can locate the same objects by **typing a filename or ordinary text, dropping an example image, navigating visual folder history, or speaking/writing naturally to an optional pluggable LLM**. No LLM must be required for direct indexed search. The native engine owns facts, permissions and execution; the assistant provides conversation and orchestration.

**Experience promise:** Minimize perceptible distance between remembering something and finding it. Near-instant answers are a *measurable design target for warmed, precomputed local indexes*, not a promise about slow network operations, unindexed media, uploads, cold scans or model inference. Initial excellence for roughly 10–20 high-demand provider adapters may matter more than an unreliable long-tail catalog. User-supplied cloud storage and supported local/hosted LLMs are explicitly part of the product positioning.

Keep basic CLI/API capabilities, identity/history export and independently recoverable user data accessible without a subscription; Pro sells convenience, integrated conversational/visual workflows, polished multi-cloud experience and manageability. The proprietary identity-correlation engine remains protected as in the parent proposal; never intentionally degrade free-mode search merely to coerce conversion.

## B. Loogal-style sharded hot index and overnight demo

The Loogal legacy is precomputation, sharding, background incremental work and extremely quick *retrieval from prepared local data*. Investigate the actual earlier implementation before porting: do not assert a particular algorithm, throughput or prior benchmark without evidence. Index manifests/JSON may be maintained locally and optionally exported, while efficient SQLite FTS/inverted and vector structures serve hot queries; avoid parsing giant raw JSON on each query.

**Canonical commercial demonstration (illustrative storyboard, not measured results):**
1. A normal 16 GB RAM desktop/laptop on a typical gigabit-class home connection has REDOWN indexing overnight in user-authorized, bounded batches across selected local folders and **four connected cloud scopes**. Prepare **20,000 total files**, hash exact-byte content where needed, index names, aliases, paths, date/history, object identities, selected visual fingerprints and relationship metadata. Disclose that internet speed is not synonymous with per-provider API speed; data transfer and hashing depend on bytes and rate limits.
2. The following day the person drags in a **1966 Corvette** picture. The hot precomputed visual index yields an initial ranked view in a target of <1 second for eligible warmed material, not by text-only lookup unless the visual information already has indexed text labels. A demo dataset may contain **4,000 candidates across 20,000 scanned files**; present paginated results, strongest match first, explanations, provider locations, and confidence, with background enrichment if necessary. Counts are scripted example numbers, not guaranteed outcomes.
3. The person scrolls through remembered cars and folders, then nostalgically provides a photograph of their father and asks to find related old photos. An *explicitly opt-in* face-similarity index, where lawful and consented to by the relevant people, can return **1,604 illustrative candidates** in a beautiful grid. Face grouping is optional, sensitive, disabled by default, processed locally by default; a text or ordinary-image fallback must work without face recognition. Do not claim identity by biometric matching without reliable evidence.
4. The user recognizes an image, drills into the item's long names, archival locations, previous directory placements, object/version history and safe restoration options, showing how REDOWN remembers their digital life.
5. The small REDOWN bird/mascot invites a bounded daily index refresh: **“Chirp chirp! Ready for your daily hash check? Scan the rest of your clouds now, or are you busy?”** Provide **Scan now**, **Later**, and **Change schedule** controls. Tone may be light, personable and human-sounding without pretending to be a human or hiding operation costs.

**Performance acceptance:** test p50/p95/p99 end-to-end UI latency; warmed/cold filename/FTS search, visual approximate-nearest-neighbor query, pagination, first render, historical lookup, fresh vs stale results and user-perceived responsiveness on reference 16 GB hardware. Test network unplugged to prove hot local reads; separate indexing cost and correctness from retrieval latency; show memory, CPU, disk, battery and paid cloud-operation budgets. User-selected scopes and consent are mandatory.

## C. Visual presentation and human interaction

- Familiar single-pane/two-pane cloud file management with consistent keyboard/mouse and drag/drop across providers; never conflate a visual move with a verified completed remote transfer.
- Grid/list views, preview/lightbox, gallery filmstrip, original filename plus unlimited virtual Long Name, context notes, visual similarity scores, virtual folders and object relationships. Paginate or virtualize thousands of search candidates without blocking the interface.
- Beautiful folder **Time Machine**: timeline/scrubber, historical directory layout, change comparisons, disappeared vs recoverable badges, snapshots and clear restoration plans. The user may type “show this folder as it was last March” without remembering old paths.
- Assistant chat, local/hosted bring-your-own-model, text mode and speech/voice input where supported; voice is not a prerequisite for search. Display sources of findings and ask before destructive or billed actions.
- The bird mascot is an **optional, configurable companion**, with frequency controls, quiet hours, reduced motion/accessibility, easy dismissal and no pushy interruptions. No deceptive attachment or spurious statements that the system “knows” unverified facts.

## D. Commercial positioning: the effort-saving Tony Stark experience

The marketing proposition is **“REDOWN remembers your files, even when you don't.”** The fuller aspiration is **“Your files. Your clouds. Your JARVIS.”** Avoid implying affiliation with Marvel or using copyrighted character imagery in commercial assets without licensing; “personal digital copilot” is a brand-safe alternative.

Against rclone, RcloneView, Air Explorer, Dropbox Dash, Google Drive, Koofr, MultCloud, Filestash and visual asset managers, claim differentiation only when verified: cross-provider identity, beautiful history, hot search, content recovery, virtual naming, visual retrieval and model-independent conversation. Do not imply that established products lack all AI search, CLI, history or visual previews. Benchmark against rclone for transfer throughput/reliability and against consumer search GUIs for retrieval experience. Value proposition is *engine + object memory + companion* rather than “rclone with previews.”

## E. Proposed subscription and one-post community rate

**Latest monthly offer overrides earlier $5 flat-rate concept:**
- REDOWN Pro **standard $10/month**.
- REDOWN Pro **community $5/month**, a **permanently earned price** after a one-time eligible social share validated twice using the *same public post URL* at least **30 days apart**.
- Customer posts their own honest short message, or uses an editable quirky prewritten suggestion (e.g. “Trying out a personal JARVIS for my files. Let's see.”). Positive reviews, minimum followers, engagement thresholds, referrals, and paid endorsement rights are **not required**. Customer discloses the discount clearly, e.g. **“Ad — REDOWN gives me a discounted subscription for sharing this.”** The requirements and any platform-specific branded-content tools should be reviewed before launch.
- On first submission verify URL exists, post is accessible with the eligible REDOWN link/content, and disclosure is readily apparent. Record the canonical social platform, post ID/permalink and first verification time, without collecting social passwords or excessive personal data.
- At least 30 days later the user submits the **same post URL again**; perform the second verification. This establishes availability on the two check dates **only**—it does not prove the post was continuously public, seen by anyone, or promoted for 30 consecutive days. Advertise accurately as “verify the same post twice, 30 days apart,” not as independently monitored continuous exposure. If the post is deleted or inaccessible at the second check, a new qualifying post may restart the process.
- On success: set **community_price_unlocked** as a persistent account entitlement, $5/month on future eligible bills, no further checks or posts; **user may remove the post afterward**. Preserve the unlocked discount on cancellation and reactivation per the owner's requested lifetime promise. Never silently revoke it.
- **Intro/grace intent discussed:** first month $5 intro; second month $5 grace, with 7 additional days to complete the second verification. If still unqualified, standard $10 applies **from the third monthly billing cycle** with advance notice. Implement exact schedule by calendar dates and timestamps so a 30-day verification plus seven-day grace is feasible regardless of month length or signup day. No retroactive $10 charges; clear notice of next billing price.
- A user already paying $10 can **qualify at any later time**, earn the $5 rate, and receive it at the next eligible billing cycle (or optional fair proration if explicitly implemented). They do not lose the opportunity.
- A post is **not** required to use REDOWN Pro at the $10 standard price. Provide unambiguous price disclosures, automatic renewal/cancellation terms, receipts and advance price-change warnings. $10 must be a genuine offered price if advertising a 50% discount.
- A social URL is evidence for the program; posting does not convey perpetual advertising/reuse rights to REDOWN. Any permission to feature/boost content must be **separate, affirmative and revocable according to its terms**.
- Optional alternative ways to unlock community pricing for people unable/unwilling to post publicly (e.g. verified referrals) may be designed separately, with eligibility parity and disclosures. No requirement to choose such alternatives for the initial program.

**Prior annual concepts need a deliberate final pricing decision:** $19.99/year standard and $15.99/year community had been discussed *before* the subsequent $10/$5 monthly proposal. They cannot be casually advertised together without clearly defining stacking, eligibility and drastically different effective monthly prices. Do **not** infer they were canceled; mark annual offering **pending owner confirmation**.

**Ambassador/lifetime-free concept, separate from universal community discount:** Consider limited complimentary lifetime access for creators who demonstrably deliver strong referrals or sustained support. Do **not** promise that any post left up one year automatically grants free service if the plan is to select only influencers. Publish objective eligibility or identify awards as discretionary; incentives and potential rewards must be disclosed.

**Policy/compliance before launch:** An incentive conditional on a post may be a material connection under FTC endorsement guidance even when the review is neutral, funny or skeptical. Require clear, conspicuous in-post disclosure and comply with platform policies; avoid forced positivity, manufactured testimonials, fake reviews or misleading “forever/50% off” claims. Obtain qualified legal review of final offer, recurring-billing terms, state laws and platform rules. Treat URL verification as anti-fraud only, not proof of uninterrupted exposure. Collect minimal social data, define retention and appeal paths, prevent duplicate/recycled URLs and avoid targeting minors with paid promotional incentives.

## F. Reward workflow/state model

Proposed states:
`UNENROLLED -> INTRO_5 -> POST_INITIAL_VERIFIED -> AWAIT_30_DAY_RECHECK -> GRACE_7_DAY -> COMMUNITY_5_UNLOCKED` or `STANDARD_10`; from `STANDARD_10`, completing the two-check path can transition to `COMMUNITY_5_UNLOCKED` at any point. Keep an immutable entitlement grant and idempotent billing-webhook transitions, with billing processor reconciliation and customer notices. Handle renewals, failed charges, month lengths, canceled subscriptions, reactivation, missing post, changed URL, platform privacy changes, inaccessible profile, account appeals, time-zone differences and duplicate submissions. Avoid changing price midway through a billing cycle without explicit consent and disclosed proration terms.

## G. Demonstration, launch and acceptance tests

1. **20,000-file four-cloud + local test:** baseline full inventory/hashes within disclosed resource/cost limits, with explicit missing/unsupported objects; no synthetic claim that all cloud data was content-hashed without actually reading the bytes.
2. **Interactive discovery:** typed filename, vague description, reference Corvette image, optional face query and spoken/typed LLM query; hot p95 retrieval target <1s for eligible cached visual queries and more aggressive <200ms for straightforward text where achievable, measured separately from first UI paint/inference.
3. **Recognition before operation:** show thousands of paginated candidates and near-top correct matching objects, expose original/historical location, avoid inferred-identical/verified-identical confusion.
4. **Time machine and recovery:** aesthetically browse historic folder, prove surviving version/blob and reconstruct original paths through verified manifests with independent restore testing.
5. **Background companion:** configurable 100-file batches with hardware/IO/network caps and opt-in daily prompt; quietly defer work under load; logs and audit records.
6. **Pricing:** signup, first post, same-URL recheck after >=30 days, seven-day grace, third-cycle $10 fallback, late conversion to $5, customer deletes post after approval, reactivation retains entitlement, accurate emails and checkout copy.
7. **FTC/platform compliance:** neutral and funny template messages contain visible reward disclosure, no forced endorsement, post URL checks do not imply continuous monitoring, separate advertising-content permission.
8. **Forever Works:** capture agent-discoverable purpose and contracts, pricing-state machine, boundary between public API and proprietary implementation, metrics, export/restore obligations and failure-mode tests. Treat all assertions as proposed until implementation and evidence exist.

**Non-goal:** This document does not authorize silently charging customers, enrolling them, collecting posts, uploading files, scanning faces, connecting providers or deploying paid infrastructure. It is a roadmap and specification addendum requiring separate implementation and legal validation.

# AOB — Research Protocol, Governance and Adoption

**Proposed 0.1 · 2026-10-24 · experimental.**

## Separation from REDOWN

Treat AOB as a prospective **independent measurement vocabulary and suite**. REDOWN contributes early examples, but its implementation-specific schemas, Forever Works model and Cloudflare infrastructure are not prerequisites. A target integration should provide a capability/permission description, operation bindings or GUI task mapping, safe fixture provisioning, independent outcome oracle, optional instrumentation, and cleanup. Adapters translate these to the core AOB task grammar without privileged shortcuts.

## Research integrity

- Define success criteria and weights before running candidates; retain failures, blocked trials and historical results.
- Distinguish a **methodology proposal** from a reference harness, validated instrument, certification and publicly endorsed standard.
- Validate discriminant and construct validity: do scores predict independent task outcomes, or merely abundance of documentation? Compare controls, blinded evaluators, diverse application categories and different agent models.
- Report uncertainty and confounders: agent model capacity, experience, source availability, network, provider limits, retries, financial cost, setup and sampling.
- Maintain blinded / withheld tasks where feasible to reduce benchmark overfitting; permit auditable independent evaluation and reproducible public samples.
- Establish corrections, appeals, disclosure of conflicts and transparent versioning; never silently replace unfavorable results.

## Independence and governance plan

**Stage 0 — internal research:** develop REDOWN case study, clearly label no external certification.  
**Stage 1 — portable pilot:** assess at least two independent application families and multiple agent implementations; publish methodology and redacted datasets only with owner approval.  
**Stage 2 — external replication:** recruit unaffiliated reviewers and laboratories, validate test difficulty and safety, publish replication instructions and confidence limits.  
**Stage 3 — potential public standard:** establish neutral maintainership, public change process, stable versioned scoring, reference harness, conformance suites and a carefully governed leaderboard *if supported by evidence*.

There is no claim that AOB is currently a standards-body publication, consensus standard, world's first agent-readiness framework or research breakthrough. A historical founding claim is limited to **this specific dated REDOWN proposal and its associated first case study**.

## Release and licensing

The REDOWN repository remains proprietary under its existing license. Any eventual public AOB specification should be independently packaged, use an explicit owner-approved license, include third-party provenance and avoid proprietary application internals. A future public benchmark does not imply a public REDOWN release.

## Interoperability

Accept MCP/OpenAPI/JSON Schema/CLI/browser automation adapters as applicable. OpenTelemetry traces can be an optional evidence source, not a mandatory observability dependency. Standardize *task outcome evidence* rather than require all applications to adopt one transport or internal architecture.

## Initial validation questions

Does AOB rank two interfaces differently when they accomplish the same task but one has discoverable documented invocation and one requires reverse engineering? Does adding fake APIs inflate a score? Can a read-only agent correctly reject mutation and still score positively on authorization? Can two evaluators repeat the same test and produce equivalent evidence? How sensitive are scores to weight changes, task bank and model selection? These must be answered empirically before any certification claim.

# AOB 0.1 — Proposed General Methodology

**Status: draft, not certified or internationally standardized.** The aim is to evaluate agent-operable *software*, not rank AI models in isolation.

## Definitions and scope

- **Cold agent:** receives a declared starting entry point, task, environment and least-privilege credentials, without project-specific memory or undocumented hints.
- **Hot agent:** receives permitted prior task/session state; disclose what context it received.
- **Restricted agent:** has narrower authority; correct denial counts as successful safety behavior, not functional failure.
- **External agent:** receives documented public/authorized contract, not private source or privileged handles.
- **Maintenance agent:** may inspect code and propose repairs where source access is permitted.

Assess *ability to accomplish tasks under the provided authority*; do not require every agent to access every internal implementation detail. For unavailable source, score documented operation/diagnosis evidence and exclude source-specific maintenance from comparable strata instead of penalizing closed-source systems unfairly.

## Seven provisional dimensions (100 points)

| Dimension | Weight | Measurable signals |
| --- | ---: | --- |
| Discovery | 15 | cold-start success finding capability, scopes, examples, restrictions |
| Authorized operation | 20 | task completion through documented interfaces; parity with GUI where applicable |
| Observability | 15 | retrievable jobs, progress, errors, latency, memory and explicit gaps |
| Verifiability | 15 | independent result oracle, evidence quality, provenance and integrity |
| Recoverability | 15 | timeout, interruption, idempotency, reconciliation, non-destructive failure |
| Maintainability | 10 | reproduction, implementation/test traceability when source is accessible; comparable externally verifiable maintenance otherwise |
| Efficiency | 10 | elapsed time, interventions, tool calls, model token use when measured, bounded output and resource cost |

**Weights are proposals**, not empirical findings. Publish raw per-task outcomes and evidence before any aggregate. Reweight only by a versioned, pre-registered methodology with sensitivity analysis; never tailor weights after seeing REDOWN results.

## Safety and validity: mandatory gates

Critical authority bypass, unauthorized destructive operations, uncontrolled exposure of secrets/data, fabricated evidence, benchmark tampering, or unverified independent oracle => **NOT CERTIFIED** regardless of numeric score. A failing/untested gate is never absorbed into a favorable average. Unsupported functionality, unavailable metrics, environment failures and not-tested coverage must be separately counted. Avoid conflating inability to execute due to authorization with poor operability.

## Experiment design

1. **Capability inventory:** discover public documented interfaces, GUI controls, protocols, CLI, API and permissions. Log source, discovery steps and actual exercised controls.
2. **Task bank:** provider-neutral tasks with initial state, allowed operations, expected outcome, independent oracle, time/resource budget, failure injection and cleanup. Example families: discover/list/find; transfer with integrity; invalid/denied request; interrupted job; trace slow operation; diagnose memory retention; reproduction and safe fix; clean exit.
3. **Matching tasks:** same user goal and authority across applications; implementations may use UI, CLI, MCP, HTTP or other documented channels. Rank **within comparable strata**, not by incompatible feature inventories.
4. **Evaluation:** test a deterministic reference client where possible to separate interface defects from model mistakes; run multiple independent agent models/sessions and seeds; fix prompts, budgets, versions and infrastructure per cohort.
5. **Oracles:** inspect actual resulting state via a path independent of the application's success response; retain confidence grades if shared underlying provider constrains independence. Cross-check cleanup.
6. **Statistics:** publish N, failures, variance, confidence intervals where meaningful and coverage denominator; no percentile assertions from tiny samples. Detect task leakage, benchmark gaming and changed denominators.
7. **Scoring:** per-task binary success and graduated stage checks; dimension score = pre-registered weighted task pass/partial formula with denominators and provenance. Critical gates are evaluated separately. Publish *no global rank* until independent apps and agents have comparable, adequately sampled trials.

## Versioned evidence data model

Each trial records: benchmarkVersion, taskSetVersion, taskId, application/version/source fingerprint, interfaceType, agentModel/runtime/version, profile, allowedScopes, environment/hardware/network, fixture and seed, reference start/end timestamps, step/tool counts, actual token usage or unavailable, timing/resource measurements with measurement source, observed outcome, independently checked oracle, privacy classification, cleanup evidence, audit trail, test artifact hashes, and limitation notes. Prefer JSON Schema and machine-readable JSON/JSONL with separate redacted summary and restricted raw evidence; do not publish credentials, private paths or real user file data.

## Comparison and ranks

Use **evidence coverage cards** and per-stratum score profiles first. Future leaderboards require published inclusion criteria, independent submissions, conflict-of-interest disclosure, reproducibility, challenge/correction process, known limitations, separate application and agent effects, and independent maintainers. Label REDOWN as originating case study, not benchmark winner. A score is valid only for its task suite, version, environment and authority, never proof of universally superior software.

## Non-goals

AOB does not demand unrestricted agent access, override user consent, certify cybersecurity comprehensively, equate missing APIs with defects where good UI alternatives exist, or claim that observability alone causes good performance. It is not a shortcut to filesystem safety certification.

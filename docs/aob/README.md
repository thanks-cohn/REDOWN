# Agent Operability Benchmark (AOB)

**AOB proposal 0.1 — founding record, 24 October 2026**  
**Status:** proposed methodology and first application case study; **not** an established industry standard, formal certification, validated leaderboard, or claim of global priority.  
**Origin:** proposed within REDOWN as a general-purpose way to evaluate *software's operability by authorized AI agents*, not merely an agent model's ability to perform tasks.

> **Founding question:** How effectively can an unfamiliar, appropriately authorized agent discover, operate, observe, verify, recover, and maintain a software system without undocumented human knowledge?

## Historical statement

This dated record documents REDOWN's proposal and initial local demonstration of *Agent Operability Benchmark (AOB)* as a repeatable assessment of the **software being operated**. REDOWN's existing Agent Accessibility Conformance (AAC) capability inventory, agent trials, Universal File API, Resource Atlas and Forever Works evidence are the first candidate demonstration materials. Their existence does **not** establish that a cross-project benchmark has been implemented or scientifically validated. Nor does this document assert that the term or idea was never previously used elsewhere. Priority, adoption and empirical superiority require independently verifiable evidence.

AOB should be a neutral measurement system in which REDOWN can receive a low score, be rejected for safety, and be compared fairly against other software. The benchmark must be designed to survive its originating application.

## Scope and distinction

AOB's unit of assessment is **application × exposed interface × task set × authorized agent profile × environment × evaluator version**, with an agent model/runtime recorded as a controlled independent variable. AOB distinguishes software-side affordances from agent competence by testing multiple models, interfaces and profiles, including deterministic reference clients when practical.

- **AAC (REDOWN):** implementation-grounded inventory, parity audit, and internal conformance evidence for this project.
- **AOB (general):** portable, external assessment methodology, independent task specifications, comparability rules, scoring and evidence protocol.
- **OSWorld / OSWorld 2.0:** reproducible real-computer task evaluation of agents (https://os-world.github.io/ and https://github.com/xlang-ai/OSWorld-V2).
- **SWE-bench:** agent software-maintenance benchmark using real issues and execution checks (https://www.swebench.com/SWE-bench/).

AOB complements rather than supersedes these efforts. An application-specific source graph is useful supporting evidence but not a scoring requirement for closed-source targets.

## Read the proposal

1. [Methodology, tasks, scoring and safety gates](SPECIFICATION.md)
2. [Evidence protocol, research governance and adoption plan](RESEARCH_AND_GOVERNANCE.md)
3. [REDOWN initial demonstration and unresolved boundaries](REDOWN_DEMONSTRATION.md)

## Intellectual property and release status

This material is currently part of the **proprietary** REDOWN repository. Its presence does not grant reuse or establish a public specification license. Publishing a future independent AOB standard, reference implementation or benchmark suite requires an explicit owner decision and appropriate licensing and third-party review. No change to REDOWN's existing license, visibility or business model is implied.

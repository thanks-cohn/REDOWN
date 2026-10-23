# Source-to-purpose relationships

Canonical graph: intent.relatedCapabilities → capability.relatedImplementations / relatedInvariants → implementation.satisfiesCapabilities / constrainedByInvariants → invariant.verification.evidence. Dependencies name currentImplementation, requiredCapabilities, protectedInvariants and compatibilityObligations. Upstream trace computes both directions from those normative references.

Source locations are replaceable evidence, not entity identity. extensions.org.redown.sourceRefs stores path, exact baseline, SHA-256, symbol and recomputed line. Test evidence stores named local execution events and source hash, not an inferred feature-wide pass. Current-state.json is a feature index generated from the same build inputs.

Domain links testEvidence/dependsOn/relatedIssues/affectedCapabilities are exact record IDs under extensions.org.redown and checked by tools/validate.py. relatedIssues/affectedCapabilities are investigation leads, not established causal edges. They are not included automatically by the upstream normative trace operation. getEntity exposes them; follow explicit IDs. Source-adjacent failures and tests can overlap without proving common cause.

The original semantic graph and diagnostic catalog remain unchanged and may report stale hashes. Their unreviewed entities were not blindly promoted. New canonical IDs use redown.capability.*, redown.implementation.*, redown.invariant.*, redown.dependency.* and redown.evidence.*; old semantic entity meanings are not silently redirected.

To rebuild intentionally: rerun the documented observations/test-events first, review source purpose/limits in tools/build.py, run python3 FOREVER_WORKS/tools/build.py, then tools/write-guides.py and both validators. Build reads saved local test evidence; it never runs or fabricates fresh tests. Never rebuild solely to clear a stale historical assertion. New results need a new observation boundary; baseline constants must be reviewed, not silently advanced.

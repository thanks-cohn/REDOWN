# Diagnostic schema distribution ownership

Confirmed source defect C1: compile-diagnostic-schema generates/checks only JS
validator and codebook, while the packaged Python JSON is manually copied. The
canonical schema also repeats the entire cause event/codebook. A change can leave
the distribution or nested constraints stale. Existing Python parity test catches
some drift later; it does not make the generation process authoritative.

Correction planned: one canonical root event, cause references constrained to no
nested causes, one generator for JS and Python distributions, exact drift gates.
Keep language-specific runtime validation because Chrome cannot use Python and the
native Python package currently has no external runtime dependencies. Differential
positive/negative validation is required; unsupported semantics must not silently pass.

Status: investigated before implementation. Corrective commit/test results appended
below. No change to Cloudflare, accepted Forever intent, API request versions or
historical reports. Audit C1/C8 owns disposition and rollback rationale.

## Confirmed repair and verification

Repair: diagnostic.schema.json now owns root and shallow cause semantics once
via a self-reference with a zero-nested-causes constraint. Native-code digits use
[0-9], avoiding JS/Python Unicode \d disagreement. compile-diagnostic-schema now
owns the JS diagnostic validator, canonical codebook, Doctor validator and packaged
Python JSON copy; --check rejects drift in each. Python evaluates referenced schema
fragments rather than assuming every reference targets cause. Existing runtime
package remains dependency-free; JSON Schema is only an independent test dependency.

Proof: foundation-consolidation.test.mjs changes EACH generated artifact in an
isolated temp tree and requires drift rejection; cross-language privacy/cause/native
code/trace mutations agree across JS, Python and independent jsonschema[format].
No new contract version or unknown diagnostic fields were introduced.

Corrective source commit: recorded by the following documentation update after commit creation.

Corrective commit: [`f44cdc408744a17848d7a66bde24ab241434327a`](https://github.com/thanks-cohn/REDOWN/commit/f44cdc408744a17848d7a66bde24ab241434327a).
Proof: [contract tests](../../tests/foundation-consolidation.test.mjs),
[verification](../../verification/consolidation/README.md), and
[audit](../../docs/architecture/REDOWN_FOUNDATION_CONSOLIDATION_AUDIT.md).

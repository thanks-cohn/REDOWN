# Doctor route duplicated outside the authoritative scoped session

Confirmed source defect C3: extension lab-session duplicates method-specific Doctor
input/root/operation validation while the shared scoped facade has no Doctor hook.
The Python Doctor is already transport/provider-agnostic at its library interface,
but another owner/provider cannot reuse the same scoped protocol without a second
special route. Provider-specific probes correctly belong behind adapter composition.

Correction planned: optional trusted read-only probe callback on the EXISTING scoped
facade. The facade owns input validation and root authorization; existing R2 session
keeps OAuth, bucket/write namespace restrictions and revocation. Unsupported sessions
must not advertise Doctor. No new registry, engine, unrestricted handles or mutable
Atlas access. Actual provider health snapshots are distinct from transfer receipts.

Status: source-confirmed, tests/commit pending. Negative tests must cover arbitrary
root/unknown input, revoked authorization, unsupported callback and false successful
probe output. Independent local/reference provider should use this same hook.

## Confirmed repair and verification

Repair: createScopedSession owns the optional probe route, input/root validation,
pre/post coordinator authorization, existing operation budget, published Doctor
response validation and contradictory-success rejection. R2 lab-session now only
composes its approved provider probe and isCurrent guard; it no longer owns a second
Doctor route. Sessions without a trusted probe do not advertise Doctor. Provider
health snapshots remain distinct from transfer jobs, not a new journal or registry.

Proof: neutral fake provider and existing real local filesystem adapter both use
the same facade. A real Python Client over stdio consumes the local Doctor report;
read-only scopes deny write execution and optional smoke. Unknown roots/inputs,
revocation, unsupported callbacks and false PASS with required FAIL are rejected.
The R2 support module preserves its own unsupported-operation handling without
forcing R2 operation rules into core. Original native/extension lifecycle tests pass.

Corrective source commit: recorded by the following documentation update after commit creation.

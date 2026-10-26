# Cloudflare parsing leaked into universal diagnostics

Confirmed source defect C2: shared diagnostics.mjs responseDiagnostic defaults to
extension-r2, parses errors[0].code and reads cf-ray. A non-R2 HTTP provider reusing
the helper gets R2 labeling and a Cloudflare-specific body/header interpretation.
The universal envelope itself does not require Worker/bucket fields; optional legacy
LAB_WORKER code values are retained for compatibility, not moved into a new registry.

Correction planned: preserve neutral HTTP status classification in existing core;
move bounded native body/correlation parsing into R2-specific support used by the
existing adapter and Worker transport. Keep old numeric native codes and redaction
behavior unchanged for R2. Prove another provider needs neither R2 headers nor body.

Status: source-confirmed, tests/commit pending. No actual live write-cause inference,
provider deployment or Worker repair. Audit C2 records ownership and interfaces.

## Confirmed repair and verification

Repair: adapters/r2-diagnostics.mjs exclusively owns bounded Cloudflare error-body
and cf-ray extraction. diagnostics.mjs:responseDiagnostic now classifies neutral HTTP
status with caller-supplied safe native metadata and defaults to provider=unknown.
R2 adapter and existing R2 Worker transport import the R2 helper explicitly.
No other provider is assigned an R2 identity; neutral helper does not consume the body.

Proof: original HTTP 400/401/403/404/405/409/429/500/503 redaction/native-cause tests
still pass through R2 mapping. Foundation test verifies a local provider's HTTP error
requires neither CF headers nor native JSON layout. Actual original Windows/R2
causality remains UNPROVEN. No cloud request was sent for this consolidation.

Corrective source commit: recorded by the following documentation update after commit creation.

Corrective commit: [`f44cdc408744a17848d7a66bde24ab241434327a`](https://github.com/thanks-cohn/REDOWN/commit/f44cdc408744a17848d7a66bde24ab241434327a).
Proof: [contract tests](../../tests/foundation-consolidation.test.mjs),
[verification](../../verification/consolidation/README.md), and
[audit](../../docs/architecture/REDOWN_FOUNDATION_CONSOLIDATION_AUDIT.md).

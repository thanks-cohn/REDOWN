# REDOWN diagnostic standard v1 — implemented foundation, partial coverage

Contract: `extension/file-engine/diagnostic.schema.json` (`redown.diagnostic.v1`).
Generated browser-safe validation and a packaged Python copy enforce the same
allowlisted envelope. `npm run diagnostics:test` is the completeness gate. No
telemetry account, backend, secret or outbound collector is required.

The implementation retrieves and applies the official [OTel tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/),
[semantic conventions](https://opentelemetry.io/docs/specs/semconv/),
[W3C Trace Context](https://www.w3.org/TR/trace-context/), and
[Google SRE four golden signals](https://sre.google/sre-book/monitoring-distributed-systems/).
These guide the implementation; they do not certify REDOWN as OTel compliant.

## Six disciplines and actual coverage

1. Traces: coordinator operation IDs correlate to Resource Atlas; W3C trace IDs and
   span IDs are nonzero. `traceparent` propagates to Worker capability/create HTTP
   calls. Local Doctor exports OTLP JSON resourceSpans without sending them anywhere.
   Complete Python/native/Worker child spans and clock synchronization remain PARTIAL.
   OTLP end timestamps use observed diagnostic wall time; supplied elapsed durations
   use the local monotonic clock. This is an interoperability adapter, not a full SDK.
2. Logs/errors: fixed categories, stages/components, severity, timestamps, numeric
   provider-native code, safe request IDs, bounded causes, data classification and
   recovery survive exceptions, journal, scoped projection, native transport and SDK.
   Raw exception messages/provider bodies/locations are never telemetry attributes.
3. Metrics: local Doctor aggregates traffic/errors/indeterminate outcomes and measured
   latency samples without path/ID metric labels. Saturation stays UNKNOWN. Existing
   Atlas/Python CPU/RAM/verified bytes remain separate scoped observations. Complete
   platform histograms, queue/retry accounting and SLOs remain PARTIAL, not invented.
4. Health: Doctor checks actual extension-approved provider route/settings/capabilities;
   an old HEAD comparison is optional evidence, not new write readiness. No mutation,
   deployment, policy adjustment or automatic reconnect is part of health checking.
5. Verification: only the canonical coordinator's byte readback, Python source/disk
   SHA-256 and independent owner acceptance can establish persisted byte integrity.
   Worker advertisement/HTTP acknowledgement/ETag are not SHA-256 proof.
6. Reproduction: stable Doctor CLI and incident/runbook, table-driven injected faults,
   schema negative controls, real process/native round trips and AAC completeness
   scenario. Installed Windows/Chrome/live R2 remain NOT_TESTED until owner evidence.

## Envelope and semantics

Envelope <=16 KiB; at most three flattened structured causes; all fields required
and extra fields rejected. Additive job `diagnostic` is optional for legacy jobs;
request/API versions and old `error` strings remain intact. Missing known provenance
produces DIAGNOSTICS_LOST or a failing completeness check, not an invented native code.
Published schema constrains field formats and enums. Custom adapter mappings must
register canonical codes and preserve their safe native extension; arbitrary provider
messages cannot become canonical codes. No baggage or credentials are propagated.

Mutation phases: NOT_SUBMITTED (including destination-existence and Worker preflight),
SUBMITTED_REJECTED, ACKNOWLEDGED_UNVERIFIED, VERIFIED, INDETERMINATE. Only NOT_SUBMITTED
can recommend a fresh ID; uncertain/acknowledged states require independent
reconciliation. Explicit provider rejection does not authorize replay. A schema-valid
envelope is not automatically semantically complete: completeness rejects generic
PROVIDER_ERROR, false verified state and unsafe retry recommendations.

Resource Atlas's published schema is unchanged. The canonical evidence envelope
carries diagnostics and joins existing Atlas traces through operationId and error
code; it does not inject extra fields into the frozen trace schema. AAC's new
`diagnostic-evidence-completeness` scenario exercises the same contract. The additive
Forever Works incident records observed behavior and an engineering obligation;
it does not rewrite accepted intent, frozen histories or claim full certification.

Memory retention inherits existing bounded native frames, the 16-job payload ring,
64-trace Atlas ring and 100,000-operation grant ceiling. Doctor responses are bounded
by stage count/envelope limits. Export is explicit and local; local reports include
sensitive corpus metadata where the user selected it. Automatic report rotation and
full fleet-wide retention policy are not implemented.

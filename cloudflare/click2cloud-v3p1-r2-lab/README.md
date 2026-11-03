# Click2Cloud V3+1 — isolated Cloudflare Worker deployment target

This small Worker exists **only** so Cloudflare Workers Builds can deploy to the exact isolated target `click2cloud-v3p1-r2-lab` from `thanks-cohn/REDOWN` without accidentally deploying the repo root `remote-asset-ingest` Worker. It is not the Chrome V3+1 menu engine and does not prove that right-click uploads work.

## Safe build configuration

- GitHub repo: `thanks-cohn/REDOWN`
- Recommended branch: `codex/v3-parity-first-reconstruction` for lab work, not `main`.
- Cloudflare Worker: `click2cloud-v3p1-r2-lab` only.
- Repository root directory: `/`.
- Build command: `npm ci --no-audit --no-fund && npm run check`.
- Deploy command: `npx wrangler deploy --config cloudflare/click2cloud-v3p1-r2-lab/wrangler.toml`.
- No preview deployments or unrelated branch triggers until explicitly verified.
- Do not use `npm run deploy`: root `wrangler.toml` belongs to `remote-asset-ingest`.
- Prefer path-specific build triggers. This file alone **does not** enable Cloudflare automatic deployment.

## Credential and release guardrails

Use a **new dedicated, least-privilege Workers Builds user token** managed in Cloudflare; never reuse a token belonging to another production Worker. Never check secret values into Git, print them in logs, expose Worker runtime secrets to the browser, or place them in Wrangler vars. Connecting the Git repository at account level is not the same as attaching this Worker via Workers Builds. Worker runtime Secrets do not act as CI deployment credentials.

This placeholder has no storage bindings, secret values or write endpoints. Its health JSON explicitly says `cloudTransferReady: false`. Before using it for real R2 tests, implement a constrained test protocol, tests, and authorization around test-only buckets, and obtain separate consent for cloud mutations. Keep the Chrome extension's true V3 production source of truth untouched.

References:
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/
- https://developers.cloudflare.com/workers/configuration/secrets/

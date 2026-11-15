# Portable deployment profiles

One immutable Basic core + a public identity profile produces either edition. No server, original REDOWN globals, cloud relay or imported credentials are needed. `deployment/*.json` is ordinary JSON, not a custom language. Public client IDs and the manifest public SPKI key are **not client secrets or private signing keys**. Never place tokens, account identifiers, passwords, cookies or client secrets in profiles, command arguments, or packages.

## Build and load

Node 24 and the committed lockfile are used:

```sh
npm ci --ignore-scripts
npm test
npm run check
npm run build -- --profile standalone
npm run package -- --profile standalone
npm run build -- --profile redown-hosted
npm run package -- --profile redown-hosted
```

Load `dist/<profile>/extension/` unpacked in an **isolated Chrome profile** that permits developer extensions. The toolbar uses Chrome's real side panel through `sidePanel.setPanelBehavior({openPanelOnActionClick:true})`; it has no competing normal action click handler or fake options Shelf. If the API is absent or rejects configuration, one explicit extension-tab fallback is registered. That fallback is not represented as a side panel. Native saves are independent of Shelf startup. Chrome 116+ supports the standard opener.

`deployment/default.json` selects the package default. Basic defaults to standalone. The hosted branch selects redown-hosted with its small overlay. Source `extension/config.js` is the safe unconfigured development default; generated builds replace only config and manifest, leaving the application core intact. Configure the JSON profiles and load the generated build, not a hand-edited source manifest. A public JSON file outside the repository may be supplied with `--config /path/to/public-profile.json` to build or package; its declared `profile` must match `--profile`.

## Fields and validation

- `profile`: build profile name.
- `extensionIdentity.expectedId`: installed Chrome extension ID expected by this registration, or empty for unregistered development. `publicKey`: optional base64 public DER/SPKI key. Build verifies the key-derived ID (first 128 SHA-256 bits, Chrome a–p encoding), and rejects mismatches/private/non-SPKI keys.
- `clientIds.google/dropbox/onedrive`: public provider registration IDs. Google's value is generated into `manifest.oauth2.client_id`; scopes are generated alongside it. Runtime rejects a manifest/profile mismatch. Blank values produce actionable **Setup required** status and disabled Sign In, never an OAuth popup or readiness claim.
- `scopes`: required upload and verification scopes. Missing capabilities and unsupported expansion are rejected. Dropbox may additionally use original registration's `files.content.read`; no broad Drive scope is added. Defaults: Drive `drive.file`; Dropbox account info, file metadata read and content write; Microsoft delegated Files.ReadWrite, User.Read and offline_access.
- `platforms`: Google `chrome-identity`, Dropbox/Microsoft `pkce`. These are supported platform contracts, not interchangeable grant implementations.
- `authority.microsoftHost/microsoftTenant`: public Microsoft cloud (`https://login.microsoftonline.com`) and common/organizations/consumers or a tenant UUID. Other clouds require an explicitly implemented provider API adapter; changing only login host cannot make the fixed public Graph API compatible. Standard Google/Dropbox endpoints remain provider contracts.
- `redirects.dropbox/onedrive`: optional exact expected callbacks. Runtime always obtains them from `chrome.identity.getRedirectURL(provider)` and requires `https://<actual-runtime-id>.chromiumapp.org/<provider>`. An explicit expectation must match too; build rejects expectations not bound to `expectedId`.

Google needs its Chrome Extension OAuth client bound to the installed ID and Drive API/consent configuration. Dropbox needs its app permissions and the exact callback registered. OneDrive needs its Entra platform, tenant/account support, delegated consent and exact callback to accept browser PKCE. A source client ID/callback string is evidence of intended registration only: console settings cannot be inferred from it. Microsoft Origin/CORS/SPA errors including AADSTS9002326/9002327 remain live acceptance blockers. No console change is authorized by a build.

## Data isolation and authorization lifecycle

Storage stays under IDB `redown-basic` and local `basic:auth:<provider>`, separate from classic REDOWN keys/databases. No classic records are copied, enumerated into a package, cleared or migrated. History and counters remain in the existing Basic database. A registration binding contains only profile/runtime/client/scopes/authority/callback identity; Basic refuses old/unbound/changed-profile credentials with `AUTH_PROFILE_CHANGED` until explicit sign-in/reconnect. It preserves those records until the user requests replacement/disconnect and never resets counters as a recovery tactic.

Even Google requires a Basic-bound local authorization record before silent Chrome Identity access. The presence of classic Google cookies/native cached grants is not treated as Basic login. `connect`, `refresh`, `getStatus`/`checkReadiness`, `reconnect`, `disconnect` share one implementation behind the guarded API. Disconnect is **local-only** and invalidates in-flight generation tickets; it does not revoke remote grants, remove Chrome's shared token cache, delete cloud files or clear other extension settings. Interactive reconnect can invalidate Basic's own cached Google access token; use an isolated profile when editions share an ID.

The same Chrome extension ID cannot host two simultaneous extensions in one browser profile. Installing the hosted build over classic REDOWN replaces that installed edition and can share its browser-managed identity context. **Do not replace the owner's existing installation.** Use new temporary test profiles; deployment/installation into an existing profile requires separate approval. No running authenticated browser profile is imported by the test harness.

## Evidence boundaries

`build-report.json` reports configured public fields, expected identity and profile hash. It establishes static consistency, not working OAuth or upload readiness. Tests exercise the same immutable coordinator/provider modules for both profiles and pin their original checksums in `save-engine-baseline.json`. Browser fixtures check real rendering/IndexedDB with mocked providers, and do not qualify as installed Chrome or live cloud proof. Managed `ExtensionInstallBlocklist:["*"]` currently blocks unpacked extension tests. No policy bypass, live OAuth, cloud mutation, merge, deployment or store publication is performed.

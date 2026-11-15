# Portable Basic verification — Phase A

Baseline: `redown-basic/main` at `75bc22c5a466fb83467d2202a68cbba2ff6b80ff`. REDOWN remained unchanged at `c78babc314acc5891203e95b169f027756e956c1` throughout this phase. Work branch: `implement/portable-shelf-auth-host-v1`. Phase B must use the committed Phase A snapshot and record its exact SHA in the transfer manifest.

| Capability | Before | After / evidence |
| --- | --- | --- |
| Tests | 118 passed, zero failed/skipped | 135 passed, zero failed/skipped. All prior save-engine tests retained. |
| Toolbar Shelf | Options tab, no sidePanel declaration | Standard real Chrome side-panel configuration; one explicit tab fallback only when unsupported/restricted. Unit-tested. Installed toolbar operation BLOCKED by policy. |
| Theme | Text Light/Dark button | Accessible sun/moon SVG, saved preference, CSS reduced-motion. DOM and Chromium fixtures PASS. |
| Identity | IDs in manifest/config, implicit cached Google access possible | Validated public JSON profiles, generated manifest, callback/runtime checks, registration-bound auth, explicit Basic sign-in before silent Google access. Tests PASS. |
| Save engine | Coordinator + independent cloud proof | Coordinator, adapters, source reader, common utilities, ZIP and vendor are byte-identical (pinned checksum test). Authentication readiness/storage boundary hardened. |
| Data | Basic IDB/counter and local auth | Existing Basic IDB name/counter preserved; no classic keys/DB reads or migration. Isolation/disconnect/race tests PASS. |
| Build | One unconfigured source package | Standalone and hosted-template matrix builds/packages PASS. Standalone registrations deliberately incomplete. Hosted template stays unconfigured until Phase B overlay. |
| Browser | UI/storage fixture only | Desktop, 360px Shelf, sun/moon, History, Settings, diagnostics and real IndexedDB/coordinator/ZIP fixture PASS. All provider data mocked. |

Commands: `npm ci --cache /workspace/.npm-cache --ignore-scripts --no-audit --no-fund`; `npm test`; `npm run check`; `npm run package -- --profile standalone`; `npm run package -- --profile redown-hosted`; `BASIC_EXTENSION_PATH=/workspace/redown-basic/dist/standalone/extension node scripts/browser-smoke.mjs /tmp/basic-portable-phase-a`; `git diff --check`.

See [machine-readable browser evidence](phase-a-browser-evidence.json), [light fixture](visual/phase-a-light.png), [narrow dark fixture](visual/phase-a-narrow-dark.png). The observed fixture initialization was approximately 127 ms in this environment (a local observation, not a production performance guarantee). The product adds no framework/runtime dependency. Snapshots display mock account/count data, not live accounts or saved-object proof.

**INSTALLED CHROME: BLOCKED.** Managed `ExtensionInstallBlocklist:["*"]` prevents unpacked installation. No native side-panel toolbar click, installed menu rendering, installed MV3 suspension or actual extension OAuth is claimed. No policy bypass was attempted. The source supports the standard API and is tested with fixtures; installed acceptance remains outstanding.

**LIVE RIGHT-CLICK SAVE UNVERIFIED — RELEASE BLOCKED** for Google Drive, Dropbox and OneDrive. Standalone needs its own public app registrations and explicit authorized live acceptance in an isolated profile. No cloud credentials or account state were used, and no live cloud resource was changed. See [profiles](PORTABLE_DEPLOYMENT_PROFILES.md) and [acceptance procedure](ACCEPTANCE.md).

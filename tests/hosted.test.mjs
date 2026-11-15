import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { extensionId, buildDeployment } from "../scripts/build.mjs";
import { createIdentity } from "../extension/lib/identity.js";
import { createAuth } from "../extension/lib/auth.js";
// Build tests use their own filesystem so parallel test files cannot race dist/.
const buildRoot = await mkdtemp(join(tmpdir(), "hosted-build-"));
await cp(
  new URL("../extension", import.meta.url),
  join(buildRoot, "extension"),
  { recursive: true },
);
await cp(
  new URL("../deployment", import.meta.url),
  join(buildRoot, "deployment"),
  { recursive: true },
);
after(() => rm(buildRoot, { recursive: true, force: true }));
const source = JSON.parse(
  await readFile(new URL("../docs/TRANSPLANT_MANIFEST.json", import.meta.url)),
);
const classic = JSON.parse(
  await readFile(
    new URL("../docs/classic-public-registration.json", import.meta.url),
  ),
);
const profile = JSON.parse(
  await readFile(new URL("../deployment/redown-hosted.json", import.meta.url)),
);
test("every Phase A source file matches its verified SHA except the two explicit profile overlays", async () => {
  for (const [path, sha] of Object.entries(source.sourceFilesSha256)) {
    if (source.intentionalOverlays.includes(path)) continue;
    assert.equal(
      createHash("sha256")
        .update(await readFile(new URL("../" + path, import.meta.url)))
        .digest("hex"),
      sha,
      path,
    );
  }
  assert.deepEqual(source.runtimeCoreDifferences, []);
});
test("hosted build reuses only pinned public registrations and key-derived identity", async () => {
  assert.deepEqual(profile, classic.profile);
  const { out, report } = await buildDeployment({
    profileName: "redown-hosted",
    root: buildRoot,
  });
  const manifest = JSON.parse(await readFile(out + "/extension/manifest.json"));
  assert.equal(extensionId(manifest.key), "mkadkgpekmkknfbniacdlmgikihjjepf");
  assert.equal(report.expectedExtensionId, extensionId(manifest.key));
  assert.equal(manifest.oauth2.client_id, classic.profile.clientIds.google);
  assert.deepEqual(manifest.oauth2.scopes, classic.profile.scopes.google);
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.permissions.includes("scripting"), false);
  assert.ok(!JSON.stringify(manifest).includes("cloudflare"));
});
test("hosted configured public IDs do not imply readiness, do not reuse Chrome cached grant and do not contact accounts", async () => {
  const chrome = {
    runtime: {
      id: profile.extensionIdentity.expectedId,
      getManifest: () => ({
        oauth2: {
          client_id: profile.clientIds.google,
          scopes: profile.scopes.google,
        },
      }),
    },
    identity: {
      getRedirectURL: (id) =>
        `https://${profile.extensionIdentity.expectedId}.chromiumapp.org/${id}`,
      getAuthToken: async () => assert.fail("No implicit cached grant"),
    },
    storage: {
      local: { get: async () => ({}), setAccessLevel: async () => {} },
    },
  };
  const identity = createIdentity({ chrome, config: profile });
  const auth = createAuth({
    chrome,
    config: profile,
    fetch: async () => assert.fail("No live request"),
  });
  for (const provider of ["google", "dropbox", "onedrive"]) {
    const registration = identity.registration(provider);
    assert.ok(registration.clientId);
    if (provider !== "google")
      assert.equal(registration.redirect, profile.redirects[provider]);
    const status = await auth.status(provider);
    assert.equal(status.ready, false);
    assert.equal(status.reason, "AUTH_REQUIRED");
    assert.equal(status.connected, false);
  }
});
test("standalone profile remains incomplete/independent in hosted repository", async () => {
  const { out, report } = await buildDeployment({
    profileName: "standalone",
    root: buildRoot,
  });
  const manifest = JSON.parse(await readFile(out + "/extension/manifest.json"));
  assert.equal(manifest.key, undefined);
  assert.equal(manifest.oauth2, undefined);
  assert.deepEqual(report.configured, {
    google: false,
    dropbox: false,
    onedrive: false,
  });
});

test("both generated editions have byte-identical runtime files except public config and manifest", async () => {
  const a = await buildDeployment({
      profileName: "standalone",
      root: buildRoot,
    }),
    b = await buildDeployment({
      profileName: "redown-hosted",
      root: buildRoot,
    });
  for (const path of Object.keys(source.sourceFilesSha256).filter(
    (p) =>
      p.startsWith("extension/") &&
      !["extension/manifest.json", "extension/config.js"].includes(p),
  )) {
    assert.deepEqual(
      await readFile(join(a.out, path)),
      await readFile(join(b.out, path)),
      path,
    );
  }
});

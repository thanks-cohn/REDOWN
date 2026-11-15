import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, generateKeyPairSync } from "node:crypto";
import "fake-indexeddb/auto";
import { CONFIG } from "../extension/config.js";
import {
  createIdentity,
  validateProfile,
  BASIC_STORAGE,
} from "../extension/lib/identity.js";
import { createAuth } from "../extension/lib/auth.js";
import { configureShelf } from "../extension/background.js";
import { openStore } from "../extension/lib/store.js";
import { extensionId, buildDeployment } from "../scripts/build.mjs";
const clone = () => structuredClone(CONFIG);
const runtimeId = "a".repeat(32);
function fixture(config = clone(), initial = {}) {
  const storage = { ...initial },
    calls = [],
    popups = [];
  const chrome = {
    runtime: {
      id: runtimeId,
      getManifest: () => ({
        oauth2: {
          client_id: config.clientIds.google,
          scopes: config.scopes.google,
        },
      }),
    },
    storage: {
      local: {
        setAccessLevel: async () => {},
        get: async (key) => ({ [key]: storage[key] }),
        set: async (value) => Object.assign(storage, value),
        remove: async (key) => {
          calls.push(key);
          delete storage[key];
        },
      },
    },
    identity: {
      getRedirectURL: (id) => `https://${runtimeId}.chromiumapp.org/${id}`,
      getAuthToken: async () => {
        popups.push("google");
        throw Error("No implicit OAuth");
      },
      removeCachedAuthToken: async () =>
        assert.fail("Disconnect must not change Chrome shared cache"),
      launchWebAuthFlow: async () => {
        popups.push("pkce");
        throw Error("cancelled");
      },
    },
  };
  return {
    chrome,
    storage,
    calls,
    popups,
    auth: createAuth({
      chrome,
      config,
      fetch: async () => assert.fail("No implicit remote call"),
    }),
  };
}
test("standard side panel config registers no competing action handler or options opener", async () => {
  let behavior,
    handlers = 0;
  const mode = await configureShelf({
    sidePanel: {
      setPanelBehavior: async (options) => {
        behavior = options;
      },
    },
    action: { onClicked: { addListener: () => handlers++ } },
  });
  assert.equal(mode, "side-panel");
  assert.deepEqual(behavior, { openPanelOnActionClick: true });
  assert.equal(handlers, 0);
  const manifest = JSON.parse(
    await readFile(new URL("../extension/manifest.json", import.meta.url)),
  );
  assert.ok(manifest.permissions.includes("sidePanel"));
  assert.equal(manifest.side_panel.default_path, "shelf.html");
  assert.equal(manifest.options_page, undefined);
});
for (const restricted of [false, true])
  test(`unsupported/restricted panel uses one honest tab fallback (${restricted})`, async () => {
    let click;
    const tabs = [];
    const chrome = {
      runtime: { getURL: (p) => "chrome-extension://basic/" + p },
      sidePanel: restricted
        ? {
            setPanelBehavior: async () => {
              throw Error("restricted");
            },
          }
        : undefined,
      action: {
        onClicked: {
          addListener: (fn) => {
            assert.equal(click, undefined);
            click = fn;
          },
        },
      },
      tabs: { create: async (item) => tabs.push(item) },
    };
    assert.equal(await configureShelf(chrome), "tab-fallback");
    click();
    assert.deepEqual(tabs, [{ url: "chrome-extension://basic/shelf.html" }]);
  });
test("incomplete public profiles fail before any OAuth popup/network, separate GO TO stays usable", async () => {
  const f = fixture();
  for (const id of ["google", "dropbox", "onedrive"]) {
    const s = await f.auth.status(id);
    assert.equal(s.setupRequired, true);
    assert.equal(s.reason, "OAUTH_CONFIG_REQUIRED");
    await assert.rejects(f.auth.connect(id), { code: "OAUTH_CONFIG_REQUIRED" });
  }
  assert.equal(f.popups.length, 0);
});
test("deployment config is validated, minimal scopes and supported authority are explicit", () => {
  for (const change of [
    { clientSecret: "never-accept" },
    { clientIds: { secret: "no" } },
    { scopes: { google: [] } },
    { authority: { microsoftHost: "https://evil.test" } },
    { platforms: { google: "web-pkce" } },
    { redirects: { token: "no" } },
  ])
    assert.throws(() => validateProfile({ ...clone(), ...change }), {
      code: "IDENTITY_CONFIG_INVALID",
    });
  const c = clone();
  c.authority.microsoftTenant = "consumers";
  c.clientIds.onedrive = "public-client";
  const f = fixture(c);
  const i = createIdentity({ chrome: f.chrome, config: c });
  assert.match(
    i.registration("onedrive").authorize,
    /\/consumers\/oauth2\/v2.0\/authorize$/,
  );
});
test("runtime identity, redirect and Google manifest mismatches block readiness before OAuth", async () => {
  const config = clone();
  config.clientIds = {
    google: "123-real.apps.googleusercontent.com",
    dropbox: "public-key",
    onedrive: "public-client",
  };
  const f = fixture(config);
  config.extensionIdentity.expectedId = "b".repeat(32);
  const a = createAuth({ chrome: f.chrome, config });
  assert.equal((await a.status("dropbox")).reason, "EXTENSION_ID_MISMATCH");
  config.extensionIdentity.expectedId = "";
  config.redirects.dropbox = "https://wrong.chromiumapp.org/dropbox";
  assert.equal(
    (await createAuth({ chrome: f.chrome, config }).status("dropbox")).reason,
    "OAUTH_REDIRECT_MISMATCH",
  );
  const g = fixture(config);
  g.chrome.runtime.getManifest = () => ({
    oauth2: {
      client_id: "other.apps.googleusercontent.com",
      scopes: config.scopes.google,
    },
  });
  assert.equal(
    (await createAuth({ chrome: g.chrome, config }).status("google")).reason,
    "OAUTH_MANIFEST_MISMATCH",
  );
  assert.equal(f.popups.length, 0);
});
for (const id of ["google", "dropbox", "onedrive"])
  test(`${id}: legacy/other-profile credentials cannot silently authorize Basic; disconnect touches only Basic`, async () => {
    const config = clone();
    config.clientIds = {
      google: "123-own.apps.googleusercontent.com",
      dropbox: "public-key",
      onedrive: "public-client",
    };
    const old = {
      googleDriveState: { connected: true, token: "classic-token" },
      "dropbox:auth": { refreshToken: "classic-refresh" },
      "onedrive:auth": { refreshToken: "classic-refresh" },
      shelfColorScheme: "neon",
    };
    const f = fixture(config, old);
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.reason, "AUTH_REQUIRED");
    assert.equal(f.popups.length, 0);
    const key = BASIC_STORAGE.authPrefix + id;
    f.storage[key] = {
      connected: true,
      refreshToken: "not-ours",
      scopes: config.scopes[id],
      binding: "foreign-registration",
    };
    assert.equal((await f.auth.status(id)).reason, "AUTH_PROFILE_CHANGED");
    assert.equal(f.popups.length, 0);
    await f.auth.disconnect(id);
    assert.equal(f.storage[key], undefined);
    for (const [k, v] of Object.entries(old))
      if (k !== key) assert.deepEqual(f.storage[k], v);
    assert.deepEqual(f.calls, [key]);
  });
test("Basic DB remains separate and preserves original database records/counters on recovery and clear", async () => {
  const original = await openStore(indexedDB, "redown-classic-test");
  await original.begin({
    id: "original",
    state: "FAILED",
    createdAt: "2020-01-01",
    provider: "google",
  });
  const basic = await openStore(
    indexedDB,
    `basic-isolation-${crypto.randomUUID()}`,
  );
  await basic.recover();
  await basic.historyClear();
  await basic.diagnosticsClear();
  assert.equal((await original.historyList()).total, 1);
  assert.equal(BASIC_STORAGE.database, "redown-basic");
  original.close();
  basic.close();
});
test("build matrix generates independent public profiles without modifying source manifest", async () => {
  const before = await readFile(
    new URL("../extension/manifest.json", import.meta.url),
    "utf8",
  );
  for (const name of ["standalone", "redown-hosted"]) {
    const { out, report } = await buildDeployment({ profileName: name });
    const m = JSON.parse(await readFile(join(out, "extension/manifest.json")));
    assert.equal(m.side_panel.default_path, "shelf.html");
    assert.equal(m.options_page, undefined);
    assert.equal(report.profile, name);
  }
  assert.equal(
    await readFile(
      new URL("../extension/manifest.json", import.meta.url),
      "utf8",
    ),
    before,
  );
});
test("public SPKI key derives Chrome ID and build rejects mismatched identity or callback", async () => {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = publicKey
    .export({ format: "der", type: "spki" })
    .toString("base64");
  const id = extensionId(key);
  assert.match(id, /^[a-p]{32}$/);
  const { writeFile } = await import("node:fs/promises");
  const dir = await mkdtemp(join(tmpdir(), "basic-config-"));
  const path = join(dir, "profile.json");
  const config = clone();
  config.extensionIdentity = { expectedId: "b".repeat(32), publicKey: key };
  await writeFile(path, JSON.stringify(config));
  await assert.rejects(
    buildDeployment({ profileName: "standalone", configPath: path }),
    /Public key/,
  );
  config.extensionIdentity.expectedId = id;
  config.redirects.dropbox = "https://wrong.chromiumapp.org/dropbox";
  await writeFile(path, JSON.stringify(config));
  await assert.rejects(
    buildDeployment({ profileName: "standalone", configPath: path }),
    /redirect/,
  );
  config.redirects.dropbox=`https://${id}.chromiumapp.org/dropbox`;
  config.redirects.onedrive=`https://${id}.chromiumapp.org/onedrive`;
  config.clientIds={google:'123-test.apps.googleusercontent.com',dropbox:'public-key',onedrive:'public-client'};
  await writeFile(path,JSON.stringify(config));
  const generated=await buildDeployment({profileName:'standalone',configPath:path});
  const manifest=JSON.parse(await readFile(join(generated.out,'extension/manifest.json')));
  assert.equal(extensionId(manifest.key),id);
  assert.equal(manifest.oauth2.client_id,config.clientIds.google);
  assert.deepEqual(manifest.oauth2.scopes,config.scopes.google);
  await rm(dir, { recursive: true });
});
test("save engine modules are byte-identical to the pinned passing baseline", async () => {
  const baseline = JSON.parse(
    await readFile(
      new URL("../docs/save-engine-baseline.json", import.meta.url),
    ),
  );
  for (const [path, hash] of Object.entries(baseline.files)) {
    const actual = createHash("sha256")
      .update(await readFile(new URL("../" + path, import.meta.url)))
      .digest("hex");
    assert.equal(actual, hash, path);
  }
});

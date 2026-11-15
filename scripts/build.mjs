import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, createPublicKey } from "node:crypto";
import { validateProfile } from "../extension/lib/identity.js";
export function extensionId(publicKey) {
  const der = Buffer.from(publicKey, "base64");
  const canonical = createPublicKey({
    key: der,
    format: "der",
    type: "spki",
  }).export({ format: "der", type: "spki" });
  if (!canonical.equals(der))
    throw Error("Profile key must be a public SPKI key only.");
  return [...createHash("sha256").update(der).digest().subarray(0, 16)]
    .map((b) => String.fromCharCode(97 + (b >> 4), 97 + (b & 15)))
    .join("");
}
export async function buildDeployment({
  profileName,
  configPath,
  root = resolve(import.meta.dirname, ".."),
} = {}) {
  if (!profileName)
    profileName = JSON.parse(
      await readFile(join(root, "deployment/default.json"), "utf8"),
    ).profile;
  if (!/^[a-z0-9-]{1,40}$/.test(profileName))
    throw Error("Invalid deployment profile name.");
  const input = JSON.parse(
    await readFile(
      configPath || join(root, `deployment/${profileName}.json`),
      "utf8",
    ),
  );
  const profile = validateProfile(input);
  if (profile.profile !== profileName)
    throw Error("Selected profile must match its declared name.");
  const manifest = JSON.parse(
    await readFile(join(root, "extension/manifest.json"), "utf8"),
  );
  delete manifest.key;
  delete manifest.oauth2;
  delete manifest.options_page;
  if (profile.extensionIdentity.publicKey) {
    const id = extensionId(profile.extensionIdentity.publicKey);
    if (id !== profile.extensionIdentity.expectedId)
      throw Error("Public key does not derive the expected extension ID.");
    manifest.key = profile.extensionIdentity.publicKey;
  }
  for (const id of ["dropbox", "onedrive"]) {
    const expected = profile.extensionIdentity.expectedId;
    if (
      profile.redirects[id] &&
      (!expected ||
        profile.redirects[id] !== `https://${expected}.chromiumapp.org/${id}`)
    )
      throw Error("Profile redirect is not bound to its extension ID.");
  }
  if (profile.clientIds.google)
    manifest.oauth2 = {
      client_id: profile.clientIds.google,
      scopes: profile.scopes.google,
    };
  const out = join(root, "dist", profileName);
  await mkdir(join(root, "dist"), { recursive: true });
  await rm(out, { recursive: true, force: true });
  await cp(join(root, "extension"), join(out, "extension"), {
    recursive: true,
  });
  await writeFile(
    join(out, "extension/manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    join(out, "extension/config.js"),
    "// Generated PUBLIC deployment identifiers only.\nexport const CONFIG = " +
      JSON.stringify(profile, null, 2) +
      ";\n",
  );
  const report = {
    profile: profileName,
    expectedExtensionId: profile.extensionIdentity.expectedId || null,
    profileSha256: createHash("sha256")
      .update(JSON.stringify(profile))
      .digest("hex"),
    configured: Object.fromEntries(
      Object.entries(profile.clientIds).map(([k, v]) => [k, !!v]),
    ),
    compatibility:
      "STATIC CONFIGURATION ONLY — installed identity, OAuth console bindings and live saves remain unverified.",
  };
  await writeFile(
    join(out, "build-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  return { out, report };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2),
    get = (flag) =>
      args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const result = await buildDeployment({
    profileName: get("--profile"),
    configPath: get("--config"),
  });
  console.log(JSON.stringify(result, null, 2));
}

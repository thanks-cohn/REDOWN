import { CONFIG } from "../config.js";
export const REQUIRED_SCOPES = Object.freeze({
  google: ["https://www.googleapis.com/auth/drive.file"],
  dropbox: ["account_info.read", "files.metadata.read", "files.content.write"],
  onedrive: ["Files.ReadWrite", "User.Read", "offline_access"],
});
export const BASIC_STORAGE = Object.freeze({
  database: "redown-basic",
  authPrefix: "basic:auth:",
});
const fail = (code, message) =>
  Object.assign(Error(message), {
    code,
    nextAction:
      "Configure the public deployment profile, rebuild, reload in an isolated Chrome profile, then Sign In.",
  });
const normal = (s) =>
  s.toLowerCase().replace(/^https:\/\/graph.microsoft.com\//, "");
export function validateProfile(input) {
  if (
    input !== undefined &&
    (!input || typeof input !== "object" || Array.isArray(input))
  )
    throw fail("IDENTITY_CONFIG_INVALID", "Profile must be an object.");
  const profile = {
    ...CONFIG,
    ...input,
    extensionIdentity: {
      ...CONFIG.extensionIdentity,
      ...input?.extensionIdentity,
    },
    authority: { ...CONFIG.authority, ...input?.authority },
    platforms: { ...CONFIG.platforms, ...input?.platforms },
    scopes: { ...CONFIG.scopes, ...input?.scopes },
    redirects: { ...CONFIG.redirects, ...input?.redirects },
    clientIds: { ...CONFIG.clientIds, ...input?.clientIds },
  };
  for (const key of Object.keys(input || {}))
    if (!Object.hasOwn(CONFIG, key))
      throw fail(
        "IDENTITY_CONFIG_INVALID",
        "Unknown deployment profile field.",
      );
  for (const key of [
    "extensionIdentity",
    "clientIds",
    "scopes",
    "platforms",
    "authority",
    "redirects",
  ]) {
    const object = input?.[key];
    if (
      object !== undefined &&
      (!object ||
        typeof object !== "object" ||
        Array.isArray(object) ||
        Object.keys(object).some((k) => !Object.hasOwn(CONFIG[key], k)))
    )
      throw fail(
        "IDENTITY_CONFIG_INVALID",
        "Unexpected nested profile field. Public configuration only.",
      );
  }
  if (
    typeof profile.extensionIdentity.publicKey !== "string" ||
    typeof profile.extensionIdentity.expectedId !== "string"
  )
    throw fail(
      "IDENTITY_CONFIG_INVALID",
      "Identity fields must be public strings.",
    );
  if (!/^[a-z0-9-]{1,40}$/.test(profile.profile))
    throw fail("IDENTITY_CONFIG_INVALID", "Invalid profile name.");
  if (
    profile.extensionIdentity.expectedId &&
    !/^[a-p]{32}$/.test(profile.extensionIdentity.expectedId)
  )
    throw fail(
      "IDENTITY_CONFIG_INVALID",
      "Expected extension ID must be a Chrome extension ID.",
    );
  if (
    profile.authority.microsoftHost !== "https://login.microsoftonline.com" ||
    !/^(common|organizations|consumers|[a-fA-F0-9-]{36})$/.test(
      profile.authority.microsoftTenant,
    )
  )
    throw fail(
      "IDENTITY_CONFIG_INVALID",
      "Unsupported Microsoft authority. This edition supports the public Microsoft cloud.",
    );
  for (const id of Object.keys(REQUIRED_SCOPES)) {
    if (
      profile.platforms[id] !== (id === "google" ? "chrome-identity" : "pkce")
    )
      throw fail(
        "IDENTITY_CONFIG_INVALID",
        "Unsupported authorization platform.",
      );
    if (
      typeof profile.clientIds[id] !== "string" ||
      profile.clientIds[id].length > 200 ||
      /[\s<>]/.test(profile.clientIds[id])
    )
      throw fail(
        "IDENTITY_CONFIG_INVALID",
        "Client IDs must be public registration identifiers.",
      );
    const scopes = profile.scopes[id];
    const allowed = [
      ...REQUIRED_SCOPES[id],
      ...(id === "dropbox" ? ["files.content.read"] : []),
    ];
    if (
      !Array.isArray(scopes) ||
      !REQUIRED_SCOPES[id].every((s) =>
        scopes.map(normal).includes(normal(s)),
      ) ||
      scopes.some(
        (s) =>
          typeof s !== "string" || !allowed.map(normal).includes(normal(s)),
      ) ||
      new Set(scopes).size !== scopes.length
    )
      throw fail(
        "IDENTITY_CONFIG_INVALID",
        "Scopes must preserve the required minimal upload/verification capability.",
      );
  }
  for (const id of ["dropbox", "onedrive"])
    if (typeof profile.redirects[id] !== "string")
      throw fail(
        "IDENTITY_CONFIG_INVALID",
        "Redirect expectations must be public URL strings.",
      );
  return profile;
}
export function createIdentity({ chrome, config = CONFIG }) {
  const profile = validateProfile(config);
  const endpoints = {
    dropbox: {
      authorize: "https://www.dropbox.com/oauth2/authorize",
      token: "https://api.dropboxapi.com/oauth2/token",
    },
    onedrive: {
      authorize: `${profile.authority.microsoftHost}/${profile.authority.microsoftTenant}/oauth2/v2.0/authorize`,
      token: `${profile.authority.microsoftHost}/${profile.authority.microsoftTenant}/oauth2/v2.0/token`,
    },
  };
  function registration(id) {
    if (!Object.hasOwn(REQUIRED_SCOPES, id))
      throw fail("PROVIDER_INVALID", "Unknown provider.");
    const expected = profile.extensionIdentity.expectedId;
    if (!chrome.runtime.id || (expected && chrome.runtime.id !== expected))
      throw fail(
        "EXTENSION_ID_MISMATCH",
        "The installed extension identity does not match this deployment profile.",
      );
    const manifest = chrome.runtime.getManifest();
    const value =
      id === "google" ? manifest.oauth2?.client_id : profile.clientIds[id];
    if (
      typeof value !== "string" ||
      !value ||
      /CONFIGURE|REPLACE|placeholder/i.test(value)
    )
      throw fail(
        "OAUTH_CONFIG_REQUIRED",
        "Setup required: configure this deployment’s public OAuth registration.",
      );
    if (
      id === "google" &&
      ((profile.clientIds.google && profile.clientIds.google !== value) ||
        !profile.scopes.google.every((s) =>
          manifest.oauth2?.scopes?.includes(s),
        ))
    )
      throw fail(
        "OAUTH_MANIFEST_MISMATCH",
        "Google manifest registration/scopes do not match the deployment profile.",
      );
    let redirect;
    if (id !== "google") {
      redirect = chrome.identity.getRedirectURL(id);
      const actual = `https://${chrome.runtime.id}.chromiumapp.org/${id}`;
      if (
        redirect !== actual ||
        (profile.redirects[id] && redirect !== profile.redirects[id])
      )
        throw fail(
          "OAUTH_REDIRECT_MISMATCH",
          "Chrome OAuth redirect does not match this deployment profile.",
        );
    }
    return {
      clientId: value,
      scopes: profile.scopes[id],
      redirect,
      ...endpoints[id],
    };
  }
  return {
    profile,
    registration,
    binding(id) {
      const r = registration(id);
      return JSON.stringify({
        profile: profile.profile,
        extensionId: chrome.runtime.id,
        clientId: r.clientId,
        scopes: r.scopes,
        redirect: r.redirect || "",
        authority: r.authorize || "chrome-identity",
      });
    },
  };
}

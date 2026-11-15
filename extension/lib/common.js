export const PROVIDERS = Object.freeze([
  { id: "google", label: "Google Drive", website: "https://drive.google.com/" },
  { id: "dropbox", label: "Dropbox", website: "https://www.dropbox.com/home" },
  { id: "onedrive", label: "OneDrive", website: "https://onedrive.live.com/" },
]);
export const TERMINAL = new Set(["SAVED", "FAILED", "UNCERTAIN"]);
export function fail(
  code,
  message,
  nextAction = "Retry the save after checking the source and connection.",
) {
  return Object.assign(new Error(message), { code, nextAction });
}
export function providerId(id) {
  if (!PROVIDERS.some((p) => p.id === id))
    throw fail("INVALID_PROVIDER", "Choose a supported provider.");
  return id;
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    u.username = "";
    u.password = "";
    u.hash = "";
    // Signed links frequently carry secrets in opaque paths. Keep origin only in that case.
    if (
      /token|signature|credential|secret|password|auth|api.?key|code|sig|key|access|refresh|session|jwt/i.test(
        u.search,
      )
    ) {
      u.search = "";
      return u.origin + "/[private-link]";
    }
    return u.href;
  } catch {
    return "";
  }
}
export function sourceUrl(value) {
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      throw Error();
    return u.href;
  } catch {
    throw fail(
      "SOURCE_URL_UNSUPPORTED",
      "Only HTTP(S) resources without embedded credentials are supported.",
      "Choose a direct downloadable image or file link.",
    );
  }
}
export function safeError(error) {
  // Never relay network bodies, tokens or arbitrary provider error strings.
  const code = /^[A-Z][A-Z0-9_]{1,70}$/.test(error?.code || "")
    ? error.code
    : "UNEXPECTED_ERROR";
  return {
    code,
    message:
      code === "UNEXPECTED_ERROR"
        ? "The operation could not be completed."
        : String(error.message || code).slice(0, 220),
    nextAction: String(
      error?.nextAction || "Check provider readiness and retry explicitly.",
    ).slice(0, 220),
  };
}

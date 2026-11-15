import { fail, sourceUrl } from "./common.js";
export const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/zip": ".zip",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3",
};
export function sanitizeFilename(value, mime = "application/octet-stream") {
  let name = String(value || "download")
    .normalize("NFC")
    .replace(
      /[\u0000-\u001f\u007f<>:"/\\|?*#%\u202a-\u202e\u2066-\u2069]/g,
      "_",
    )
    .replace(/[. ]+$/, "")
    .replace(/^\.+/, "")
    .trim();
  if (!name) name = "download";
  const ext = /\.[A-Za-z0-9]{1,12}$/.exec(name)?.[0] || EXT[mime] || "";
  let stem = name.endsWith(ext) && ext ? name.slice(0, -ext.length) : name;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = "_" + stem;
  return (stem || "download").slice(0, 150 - ext.length) + ext;
}
function dispositionName(header) {
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header || "");
  if (encoded)
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {}
  return (
    /filename\s*=\s*"([^"]+)"/i.exec(header || "")?.[1] ||
    /filename\s*=\s*([^;]+)/i.exec(header || "")?.[1]?.trim()
  );
}
export async function acquireSource(
  input,
  {
    fetch = globalThis.fetch,
    maxBytes = MAX_SOURCE_BYTES,
    timeoutMs = 45000,
  } = {},
) {
  const url = sourceUrl(input.sourceUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      credentials: "include",
      redirect: "follow",
      signal: controller.signal,
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
    if (!response.ok)
      throw fail(
        "SOURCE_HTTP_ERROR",
        `The source returned HTTP ${response.status}.`,
        "Open the original resource and check access before retrying.",
      );
    if (response.status === 206 || response.headers.has("content-range"))
      throw fail(
        "SOURCE_PARTIAL_REJECTED",
        "The resource returned a partial file.",
        "Use a direct full-file download link.",
      );
    const mime = (
      response.headers.get("content-type") || "application/octet-stream"
    )
      .split(";")[0]
      .toLowerCase()
      .trim();
    if (/html|xhtml/.test(mime))
      throw fail(
        "SOURCE_HTML_REJECTED",
        "The resource is a web page or sign-in page, not a downloadable file.",
        "Choose the direct file or image URL.",
      );
    const headerLength = response.headers.get("content-length");
    const length = headerLength !== null ? Number(headerLength) : null;
    if (length !== null && Number.isFinite(length) && length > maxBytes)
      throw fail(
        "SOURCE_TOO_LARGE",
        "This resource exceeds the 32 MiB in-memory transfer limit.",
        "Download this resource using the provider website instead.",
      );
    if (!response.body)
      throw fail("SOURCE_EMPTY", "The resource contains no readable bytes.");
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes)
          throw fail(
            "SOURCE_TOO_LARGE",
            "This resource exceeds the 32 MiB in-memory transfer limit.",
          );
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (!size) throw fail("SOURCE_EMPTY", "The resource is empty.");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
    const prefix = new TextDecoder(encoding)
      .decode(bytes.subarray(0, 4096))
      .replace(/^\uFEFF/, "")
      .trimStart();
    if (
      /^(?:<!doctype\s+html|<(?:html|head|body|form|meta|title|script)\b|(?:<!--[^]*?-->|<\?xml[^]*?\?>)\s*<(?:html|head|body|form|meta)\b)/i.test(
        prefix,
      )
    )
      throw fail(
        "SOURCE_HTML_REJECTED",
        "The resource contains HTML, possibly a login or error page.",
        "Choose a direct downloadable file.",
      );
    // With transparent HTTP compression Content-Length describes encoded bytes, not decoded bytes.
    if (
      length !== null &&
      Number.isFinite(length) &&
      length !== size &&
      !response.headers.get("content-encoding")
    )
      throw fail(
        "SOURCE_LENGTH_MISMATCH",
        "The resource length did not match its response.",
        "Retry from the original file link.",
      );
    let pathName;
    try {
      pathName = decodeURIComponent(
        new URL(response.url || url).pathname.split("/").pop(),
      );
    } catch {
      pathName = "download";
    }
    const filename = sanitizeFilename(
      dispositionName(response.headers.get("content-disposition")) ||
        input.filename ||
        pathName,
      mime,
    );
    let preview;
    if (size <= 256 * 1024 && /^image\/(png|jpeg|gif|webp|avif)$/.test(mime)) {
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      preview = `data:${mime};base64,${btoa(binary)}`;
    }
    return { bytes, filename, mime, preview };
  } catch (e) {
    if (typeof e.code === "string") throw e;
    throw fail(
      controller.signal.aborted ? "SOURCE_TIMEOUT" : "SOURCE_UNAVAILABLE",
      controller.signal.aborted
        ? "The resource timed out."
        : "The browser could not read the resource.",
      "Check source permissions, login, and direct-link availability; then retry.",
    );
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

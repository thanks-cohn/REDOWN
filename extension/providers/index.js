// Byte-only provider adapters. URLs of the source/page never enter this layer.
const GOOGLE = "https://www.googleapis.com/drive/v3/";
const GRAPH = "https://graph.microsoft.com/v1.0/";
const DROPBOX_CHUNK = 4 * 1024 * 1024;
const ONEDRIVE_CHUNK = 16 * 320 * 1024; // Graph: non-final fragments must be 320 KiB multiples.
const MAX = 32 * 1024 * 1024;
const fail = (code, message, uncertain = false, httpStatus) =>
  Object.assign(new Error(message), {
    code,
    uncertain,
    definitive: !uncertain,
    ...(httpStatus ? { httpStatus } : {}),
    nextAction: uncertain
      ? "Check the provider for this file before starting another save; this operation is not automatically replayed."
      : "Check permissions, quota and connectivity, then retry as a new save.",
  });
const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export const sha256 = async (bytes) =>
  hex(await crypto.subtle.digest("SHA-256", bytes));
export async function dropboxHash(bytes) {
  const hashes = [];
  for (let i = 0; i < bytes.length; i += DROPBOX_CHUNK)
    hashes.push(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          bytes.subarray(i, i + DROPBOX_CHUNK),
        ),
      ),
    );
  const joined = new Uint8Array(hashes.length * 32);
  hashes.forEach((h, i) => joined.set(h, i * 32));
  return sha256(joined);
}
export function microsoftUploadURL(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw fail(
      "UPLOAD_ENDPOINT_INVALID",
      "Microsoft returned an invalid upload endpoint.",
    );
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    ![
      "1drv.com",
      "sharepoint.com",
      "onedrive.com",
      "sharepoint-df.com",
      "my.microsoftpersonalcontent.com",
    ].some((host) => u.hostname === host || u.hostname.endsWith("." + host))
  )
    throw fail(
      "UPLOAD_ENDPOINT_INVALID",
      "Microsoft returned an unrecognized upload host.",
    );
  return u.href;
}
function renamed(name, requested) {
  if (name === requested) return true;
  const at = requested.lastIndexOf("."),
    base = at > 0 ? requested.slice(0, at) : requested,
    ext = at > 0 ? requested.slice(at) : "";
  return (
    typeof name === "string" &&
    name.startsWith(base + " (") &&
    name.endsWith(")" + ext) &&
    /^\d+$/.test(name.slice(base.length + 2, name.length - ext.length - 1))
  );
}
// Graph's conflict rename spelling varies across account types. Trust the final
// receipt's name only after independent object ID, parent and byte proof agree;
// still require the original basename and extension to survive the rename.
function onedriveName(name, requested) {
  if (name === requested) return true;
  const at = requested.lastIndexOf("."),
    base = at > 0 ? requested.slice(0, at) : requested,
    ext = at > 0 ? requested.slice(at) : "";
  return (
    typeof name === "string" &&
    name.startsWith(base) &&
    name.length > requested.length &&
    /[ _(-]/.test(name[base.length]) &&
    (!ext || name.endsWith(ext))
  );
}
export function createAdapters({ fetch = globalThis.fetch } = {}) {
  async function request(
    url,
    options = {},
    uncertain = false,
    readOnly = false,
  ) {
    for (let attempt = 0; attempt < (readOnly ? 3 : 1); attempt++) {
      let r;
      try {
        r = await fetch(url, {
          ...options,
          credentials: "omit",
          redirect: options.redirect || "error",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(90000),
        });
      } catch {
        throw fail(
          "PROVIDER_NETWORK",
          "Provider request was interrupted.",
          uncertain,
        );
      }
      if (readOnly && attempt < 2 && (r.status === 429 || r.status >= 500)) {
        const delay = Number(r.headers.get("Retry-After") || 0);
        // Do not ignore a long throttling window or busy-loop an overloaded API.
        if (!Number.isFinite(delay) || delay < 0 || delay > 2)
          throw fail(
            "PROVIDER_RATE_LIMIT",
            "Provider asked us to retry later.",
            uncertain,
            r.status,
          );
        if (delay)
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        continue;
      }
      return r;
    }
  }
  async function json(url, options = {}, uncertain = false, readOnly = false) {
    const r = await request(url, options, uncertain, readOnly);
    if (!r.ok)
      throw fail(
        r.status === 401
          ? "PROVIDER_AUTH_REVOKED"
          : r.status === 403
            ? "PROVIDER_PERMISSION"
            : r.status === 429
              ? "PROVIDER_RATE_LIMIT"
              : "PROVIDER_HTTP",
        `Provider rejected the request (HTTP ${r.status}).`,
        uncertain || r.status >= 500,
        r.status,
      );
    let data;
    try {
      data = await r.json();
    } catch {
      throw fail(
        "PROVIDER_RESPONSE_INVALID",
        "Provider returned an invalid response.",
        uncertain,
      );
    }
    return data;
  }
  const headers = (token) => ({ Authorization: `Bearer ${token}` });
  async function proveContent(url, token, bytes) {
    const r = await request(
      url,
      { headers: headers(token), redirect: "follow" },
      true,
      true,
    );
    if (!r.ok || !r.body)
      throw fail(
        "PROVIDER_PROOF_UNCERTAIN",
        "Saved file bytes could not be independently read back.",
        true,
      );
    const reader = r.body.getReader();
    let offset = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (
          offset + value.length > bytes.length ||
          !value.every((byte, i) => byte === bytes[offset + i])
        )
          throw fail(
            "PROVIDER_BYTES_MISMATCH",
            "Saved bytes did not match the source.",
            true,
          );
        offset += value.length;
      }
      if (offset !== bytes.length)
        throw fail(
          "PROVIDER_BYTES_MISMATCH",
          "Saved bytes were truncated.",
          true,
        );
    } catch (e) {
      if (e.code) throw e;
      throw fail(
        "PROVIDER_PROOF_UNCERTAIN",
        "Saved byte read-back was interrupted.",
        true,
      );
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  async function google({ bytes, filename, mime, token, onConfirming }) {
    const begin = await request(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
      {
        method: "POST",
        headers: {
          ...headers(token),
          "Content-Type": "application/json",
          "X-Upload-Content-Type": mime,
          "X-Upload-Content-Length": String(bytes.length),
        },
        body: JSON.stringify({
          name: filename,
          mimeType: mime,
          parents: ["root"],
        }),
      },
      true,
    );
    if (!begin.ok)
      throw fail(
        "GOOGLE_SESSION_REJECTED",
        `Google could not start the upload (HTTP ${begin.status}).`,
        begin.status >= 500,
        begin.status,
      );
    let endpoint;
    try {
      endpoint = new URL(begin.headers.get("location"));
    } catch {
      throw fail(
        "UPLOAD_ENDPOINT_INVALID",
        "Google returned no usable upload session.",
      );
    }
    if (
      endpoint.origin !== "https://www.googleapis.com" ||
      !endpoint.pathname.startsWith("/upload/drive/")
    )
      throw fail(
        "UPLOAD_ENDPOINT_INVALID",
        "Google returned an untrusted upload session.",
      );
    const receipt = await json(
      endpoint.href,
      {
        method: "PUT",
        headers: {
          ...headers(token),
          "Content-Type": mime,
          "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
        },
        body: bytes,
      },
      true,
    );
    if (typeof receipt.id !== "string" || !receipt.id)
      throw fail(
        "GOOGLE_RECEIPT_UNCERTAIN",
        "Google did not confirm a file ID.",
        true,
      );
    await onConfirming?.();
    const object = await json(
      `${GOOGLE}files/${encodeURIComponent(receipt.id)}?fields=id,name,size,trashed,sha256Checksum`,
      { headers: headers(token) },
      true,
      true,
    );
    if (
      object.id !== receipt.id ||
      object.name !== filename ||
      Number(object.size) !== bytes.length ||
      object.trashed !== false
    )
      throw fail(
        "GOOGLE_PROOF_UNCERTAIN",
        "Google metadata did not confirm the intended file.",
        true,
      );
    if (object.sha256Checksum) {
      if (
        typeof object.sha256Checksum !== "string" ||
        object.sha256Checksum.toLowerCase() !== (await sha256(bytes))
      )
        throw fail(
          "GOOGLE_BYTES_MISMATCH",
          "Google checksum did not match the source.",
          true,
        );
    } else
      await proveContent(
        `${GOOGLE}files/${encodeURIComponent(receipt.id)}?alt=media`,
        token,
        bytes,
      );
    return {
      provider: "google",
      id: object.id,
      name: object.name,
      size: Number(object.size),
      confirmed: true,
      requestedName: filename,
    };
  }
  async function dropbox({ bytes, filename, token, onConfirming }) {
    const call = (
      path,
      body,
      binary = false,
      arg,
      uncertain = false,
      readOnly = false,
    ) =>
      json(
        `https://${binary ? "content" : "api"}.dropboxapi.com/2/${path}`,
        {
          method: "POST",
          headers: {
            ...headers(token),
            "Content-Type": binary
              ? "application/octet-stream"
              : "application/json",
            ...(arg
              ? {
                  "Dropbox-API-Arg": JSON.stringify(arg).replace(
                    /[\u007f-\uffff]/g,
                    (c) =>
                      `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
                  ),
                }
              : {}),
          },
          body: binary ? body : JSON.stringify(body),
        },
        uncertain,
        readOnly,
      );
    const start = await call(
      "files/upload_session/start",
      new Uint8Array(),
      true,
      { close: false },
    );
    if (typeof start.session_id !== "string" || !start.session_id)
      throw fail(
        "DROPBOX_SESSION_INVALID",
        "Dropbox did not create an upload session.",
      );
    let offset = 0;
    // Keep the last chunk for finish: only its receipt can prove a commit.
    while (offset + DROPBOX_CHUNK < bytes.length) {
      const append = await request(
        "https://content.dropboxapi.com/2/files/upload_session/append_v2",
        {
          method: "POST",
          headers: {
            ...headers(token),
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              cursor: { session_id: start.session_id, offset },
              close: false,
            }),
          },
          body: bytes.subarray(offset, offset + DROPBOX_CHUNK),
        },
      );
      if (!append.ok)
        throw fail(
          "DROPBOX_APPEND_FAILED",
          `Dropbox rejected an upload chunk (HTTP ${append.status}).`,
          false,
          append.status,
        );
      offset += DROPBOX_CHUNK;
    }
    const receipt = await call(
      "files/upload_session/finish",
      bytes.subarray(offset),
      true,
      {
        cursor: { session_id: start.session_id, offset },
        commit: {
          path: "/" + filename,
          mode: "add",
          autorename: true,
          mute: true,
          strict_conflict: true,
        },
      },
      true,
    );
    if (
      typeof receipt.id !== "string" ||
      !receipt.id ||
      !receipt.rev ||
      receipt.size !== bytes.length ||
      !renamed(receipt.name, filename)
    )
      throw fail(
        "DROPBOX_RECEIPT_UNCERTAIN",
        "Dropbox did not confirm the intended committed file.",
        true,
      );
    await onConfirming?.();
    const object = await call(
      "files/get_metadata",
      { path: receipt.id },
      false,
      null,
      true,
      true,
    );
    const hash = await dropboxHash(bytes);
    if (
      object[".tag"] !== "file" ||
      object.id !== receipt.id ||
      object.rev !== receipt.rev ||
      object.name !== receipt.name ||
      object.size !== bytes.length ||
      object.content_hash !== hash ||
      receipt.content_hash !== hash
    )
      throw fail(
        "DROPBOX_PROOF_UNCERTAIN",
        "Dropbox metadata/checksum did not confirm the saved bytes.",
        true,
      );
    return {
      provider: "dropbox",
      id: object.id,
      name: object.name,
      size: object.size,
      confirmed: true,
      requestedName: filename,
    };
  }
  async function onedrive({ bytes, filename, token, onConfirming }) {
    const root = await json(
      GRAPH + "me/drive/root?$select=id",
      { headers: headers(token) },
      false,
      true,
    );
    if (!root.id)
      throw fail(
        "ONEDRIVE_ROOT_INVALID",
        "OneDrive did not identify the upload root.",
      );
    const session = await json(
      GRAPH +
        `me/drive/items/${encodeURIComponent(root.id)}:/${encodeURIComponent(filename)}:/createUploadSession`,
      {
        method: "POST",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          item: {
            "@microsoft.graph.conflictBehavior": "rename",
            name: filename,
          },
        }),
      },
    );
    const endpoint = microsoftUploadURL(session.uploadUrl);
    let offset = 0,
      receipt;
    while (offset < bytes.length) {
      const end = Math.min(offset + ONEDRIVE_CHUNK, bytes.length),
        last = end === bytes.length;
      // Opaque session URL is already authorized: NEVER send the access token.
      const response = await request(
        endpoint,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Range": `bytes ${offset}-${end - 1}/${bytes.length}`,
          },
          body: bytes.subarray(offset, end),
        },
        last,
      );
      if (last) {
        if (![200, 201].includes(response.status))
          throw fail(
            "ONEDRIVE_COMMIT_UNCERTAIN",
            `OneDrive did not confirm finalization (HTTP ${response.status}).`,
            true,
            response.status,
          );
        try {
          receipt = await response.json();
        } catch {
          throw fail(
            "ONEDRIVE_RECEIPT_UNCERTAIN",
            "OneDrive finalization response was invalid.",
            true,
          );
        }
      } else {
        if (response.status !== 202)
          throw fail(
            "ONEDRIVE_RANGE_UNCERTAIN",
            `OneDrive did not confirm the uploaded range (HTTP ${response.status}).`,
            true,
            response.status,
          );
        let progress;
        try {
          progress = await response.json();
        } catch {
          throw fail(
            "ONEDRIVE_RANGE_UNCERTAIN",
            "OneDrive progress response was invalid.",
            true,
          );
        }
        if (
          progress.nextExpectedRanges?.length !== 1 ||
          !String(progress.nextExpectedRanges[0]).startsWith(`${end}-`)
        )
          throw fail(
            "ONEDRIVE_RANGE_UNCERTAIN",
            "OneDrive reported an unexpected upload offset.",
            true,
          );
      }
      offset = end;
    }
    if (!receipt?.id)
      throw fail(
        "ONEDRIVE_RECEIPT_UNCERTAIN",
        "OneDrive did not confirm the saved object ID.",
        true,
      );
    await onConfirming?.();
    const object = await json(
      GRAPH +
        `me/drive/items/${encodeURIComponent(receipt.id)}?$select=id,name,size,parentReference,file`,
      { headers: headers(token) },
      true,
      true,
    );
    if (
      object.id !== receipt.id ||
      object.name !== receipt.name ||
      object.size !== bytes.length ||
      !onedriveName(object.name, filename) ||
      object.parentReference?.id !== root.id ||
      !object.file
    )
      throw fail(
        "ONEDRIVE_PROOF_UNCERTAIN",
        "OneDrive metadata did not confirm the intended saved file.",
        true,
      );
    if (object.file.hashes?.sha256Hash) {
      if (
        typeof object.file.hashes.sha256Hash !== "string" ||
        object.file.hashes.sha256Hash.toLowerCase() !== (await sha256(bytes))
      )
        throw fail(
          "ONEDRIVE_BYTES_MISMATCH",
          "OneDrive checksum did not match the source.",
          true,
        );
    } else
      await proveContent(
        GRAPH + `me/drive/items/${encodeURIComponent(receipt.id)}/content`,
        token,
        bytes,
      );
    return {
      provider: "onedrive",
      id: object.id,
      name: object.name,
      size: object.size,
      confirmed: true,
      requestedName: filename,
    };
  }
  const adapters = { google, dropbox, onedrive };
  return Object.fromEntries(
    Object.entries(adapters).map(([id, upload]) => [
      id,
      {
        async upload(input) {
          if (
            !(input.bytes instanceof Uint8Array) ||
            input.bytes.length <= 0 ||
            input.bytes.length > MAX ||
            typeof input.filename !== "string" ||
            !input.filename ||
            typeof input.token !== "string" ||
            !input.token ||
            typeof input.mime !== "string"
          )
            throw fail(
              "UPLOAD_INPUT_INVALID",
              "Upload requires validated nonempty bytes, filename, MIME type and authorization.",
            );
          return upload(input);
        },
      },
    ]),
  );
}

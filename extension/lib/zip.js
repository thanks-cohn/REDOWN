import { Zip, ZipPassThrough, strToU8 } from "../vendor/fflate.js";
import { fail } from "./common.js";
export const MAX_EXPORT_BYTES = 16 * 1024 * 1024;
export async function exportDiagnostics(
  store,
  { maxBytes = MAX_EXPORT_BYTES } = {},
) {
  const settings = await store.settings(),
    upper = await store.eventLastId();
  const chunks = [];
  let size = 0,
    count = 0;
  const zip = new Zip((error, data) => {
    if (error) throw error;
    size += data.length;
    if (size > maxBytes)
      throw fail(
        "EXPORT_TOO_LARGE",
        "The retained diagnostics exceed the 16 MiB local export limit.",
        "Reduce retention or export after clearing logs. Existing events have not been deleted.",
      );
    chunks.push(data);
  });
  const events = new ZipPassThrough("events.jsonl");
  zip.add(events);
  let after = 0;
  while (true) {
    const page = await store.eventChunk(after, 100, upper);
    if (!page.length) break;
    for (const event of page) {
      events.push(strToU8(JSON.stringify(event) + "\n"));
      count++;
    }
    after = page.at(-1).id;
  }
  events.push(new Uint8Array(), true);
  const summary = {
    version: "0.1.0",
    apiVersion: 1,
    count,
    retention:
      settings.diagnosticsCap === null ? "unlimited" : settings.diagnosticsCap,
    collectionEnabled: settings.diagnosticsEnabled,
    exportedAt: new Date().toISOString(),
    speedInterval:
      "bytes / elapsed seconds across upload and provider metadata confirmation",
    snapshot:
      "Retained event IDs at export start; concurrent retention/clear may remove records.",
  };
  for (const [name, text] of [
    ["summary.json", JSON.stringify(summary, null, 2)],
    [
      "README.txt",
      "PRIVATE: This archive may contain browsing URLs, filenames inferred from URLs, and account-related paths. Review before sharing. Known credential query strings are removed; sanitization is best effort. No file contents, OAuth tokens, headers, or response bodies are logged. Export stays local; no cloud upload. Speed covers upload and confirmation, not source acquisition.\n",
    ],
  ]) {
    const entry = new ZipPassThrough(name);
    zip.add(entry);
    entry.push(strToU8(text), true);
  }
  zip.end();
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return {
    bytes,
    summary,
    filename: `redown-basic-diagnostics-${new Date().toISOString().slice(0, 10)}.zip`,
  };
}
export function zipDataUrl(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return "data:application/zip;base64," + btoa(binary);
}

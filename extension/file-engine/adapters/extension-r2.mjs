// Trusted extension adapter: all OAuth handling stays in RedownCloudflareApi.request.
import {r2ResponseDiagnostic as responseDiagnostic} from "./r2-diagnostics.mjs";
import { errorWithDiagnostic, traceContext } from "../diagnostics.mjs";
import { fail, fileIdentity } from "../engine.mjs";
import { providerDescription } from "../provider-contract.mjs";
const EXTENSION_MAX_BYTES = 65536;
function extensionR2Adapter({ request, roots, createObject }) {
  const base = (i) => `/accounts/${encodeURIComponent(i.account)}/r2/buckets/${encodeURIComponent(i.container)}/objects`;
  const object = (i) => base(i) + "/" + i.key.split("/").map(encodeURIComponent).join("/");
  const checked = async (path, options = {}, stage = "object.read") => {
    let r;
    try {
      r = await request(path, { ...options, redirect: "error" });
    } catch (error) {
      if (error?.diagnostic) throw error;
      throw errorWithDiagnostic(error?.name === "TimeoutError" ? "TIMEOUT" : "NETWORK_FAILURE",{component:"provider-adapter",stage,method:options.method || "GET"});
    }
    if (r.status === 404) return null;
    if (!r.ok) {
      throw await responseDiagnostic(r,{stage,method:options.method || "GET"});
    }
    return r;
  };
  const metadata = (i, size, revision, type) => {
    if (!Number.isSafeInteger(size) || size < 0 || !revision) throw fail("INVALID_PROVIDER_RESPONSE");
    return { ...i, size, revision: String(revision).replace(/^"|"$/g,""), contentType: type || "application/octet-stream", folder: i.key.endsWith("/") };
  };
  const adapter = {
    id: "extension-r2",
    capabilities: { realProvider: true, identity: "exact-key", atomicCreate: typeof createObject === "function", atomicConditionalDelete: false, maxBytes: EXTENSION_MAX_BYTES },
    assertIdentity(i) {
      fileIdentity(i, { root: true });
      if (i.provider !== "extension-r2" || !roots.some((r) => r.account === i.account && r.container === i.container)) throw fail("SCOPE_DENIED");
    },
    async list(i, { limit = 50, cursor, query, sort, recursive = false } = {}) {
      adapter.assertIdentity(i);
      if (query || sort && sort !== "key-asc") throw fail("UNSUPPORTED_QUERY");
      const p = new URLSearchParams({ per_page: String(limit), prefix: i.key });
      if (cursor) p.set("cursor", cursor);
      if (!recursive) p.set("delimiter", "/");
      const response = await checked(base(i) + "?" + p, {}, "object.list");
      if (!response) throw fail("NOT_FOUND_OR_INACCESSIBLE");
      const body = await response.json();
      if (body.success === false) throw errorWithDiagnostic("INVALID_PROVIDER_RESPONSE",{component:"provider-adapter",stage:"object.list",httpStatus:response.status,nativeCode:body.errors?.[0]?.code});
      const data = body.result ?? body, rows = Array.isArray(data) ? data : data.objects, info = body.result_info || {};
      if (!Array.isArray(rows) || rows.length > limit) throw fail("INVALID_PROVIDER_RESPONSE");
      const next = data.cursor || info.cursor || null;
      if ((data.truncated ?? info.is_truncated) && !next) throw fail("INVALID_CURSOR");
      const objects = rows.map((o) => metadata({ ...i, key: o.key }, o.size, o.etag || o.version || o.uploaded, o.httpMetadata?.contentType));
      for (const key of data.delimited || info.delimited || []) objects.push({ ...i, key, size: 0, revision: "implicit-prefix", folder: true, implicit: true });
      return { objects, cursor: next, complete: !next };
    },
    async stat(i) {
      adapter.assertIdentity(i);
      // The documented OAuth Object API has GET/PUT/DELETE, no HEAD operation.
      // Exact-prefix listing obtains metadata without buffering existing object bytes.
      const query=new URLSearchParams({prefix:i.key,per_page:'1'});
      const response=await checked(base(i)+'?'+query,{},'object.stat');
      if(!response)throw fail('NOT_FOUND_OR_INACCESSIBLE');
      const body=await response.json();if(body.success===false)throw errorWithDiagnostic('INVALID_PROVIDER_RESPONSE',{component:'provider-adapter',stage:'object.stat',httpStatus:response.status,nativeCode:body.errors?.[0]?.code});
      const rows=Array.isArray(body.result)?body.result:(body.result??body).objects;
      if(!Array.isArray(rows)||rows.length>1)throw fail('INVALID_PROVIDER_RESPONSE');
      const exact=rows.find(o=>o.key===i.key);
      if(!exact && (body.result_info?.cursor || body.result?.cursor)) throw fail('CAPACITY');
      return exact?metadata(i,exact.size,exact.etag||exact.version||exact.uploaded,exact.httpMetadata?.contentType):null;
    },
    async read(i, { range } = {}) {
      adapter.assertIdentity(i);
      if (range) throw fail("PROVIDER_OPERATION_UNSUPPORTED");
      const r = await checked(object(i));
      if (!r) throw fail("NOT_FOUND_OR_INACCESSIBLE");
      const declaredLength = r.headers.get("content-length");
      if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || !Number.isSafeInteger(Number(declaredLength)))) {
        await r.body?.cancel();
        throw fail("INVALID_PROVIDER_RESPONSE");
      }
      if (declaredLength !== null && Number(declaredLength) > EXTENSION_MAX_BYTES) {
        await r.body?.cancel();
        throw fail("SIZE_LIMIT");
      }
      if (!r.body) throw fail("INVALID_PROVIDER_RESPONSE");
      const reader = r.body.getReader();
      let size = 0;
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > EXTENSION_MAX_BYTES) throw fail("SIZE_LIMIT");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      const declared = r.headers.get("content-length");
      if (declared !== null && Number(declared) !== size) throw fail("TRUNCATED_READ");
      return { bytes, metadata: metadata(i, size, r.headers.get("etag"), r.headers.get("content-type")) };
    },
    async create(i, bytes, options = {}, context = {}) {
      adapter.assertIdentity(i);
      if (!createObject) throw fail("PROVIDER_OPERATION_UNSUPPORTED");
      if (bytes.length > EXTENSION_MAX_BYTES) throw fail("SIZE_LIMIT");
      await createObject(i, bytes, {traceparent:traceContext(context.resourceTrace?.id).traceparent});
      const fresh = await adapter.stat(i);
      if (!fresh || fresh.size !== bytes.length) throw fail("VERIFICATION_DISAGREEMENT");
      return fresh;
    },
    async delete() {
      throw fail("UNSUPPORTED_ATOMIC_DELETE");
    }
  };
  const manifest = providerDescription(adapter);
  manifest.authentication = ["extension-oauth"];
  manifest.features.rangeReads = false;
  manifest.features.recursiveListing = true;
  for (const op of (createObject ? ["move", "rename", "delete", "ingest"] : ["upload", "copy", "mkdir", "move", "rename", "delete", "ingest"])) manifest.operations[op] = "unsupported";
  adapter.manifest = manifest;
  return adapter;
}
export {
  EXTENSION_MAX_BYTES,
  extensionR2Adapter
};

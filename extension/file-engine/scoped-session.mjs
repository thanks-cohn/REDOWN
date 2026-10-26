import validateDoctor from './doctor-validator.mjs';
import {validDiagnostic,diagnosticFrom} from './diagnostics.mjs';
// One scoped authorization facade shared by Node and the extension. Never expose engine handles.
import { validateLocator } from "./provider-contract.mjs";
import { FILE_API_VERSION, METHODS, validate, fileIdentity, fail } from "./engine.mjs";
const fields = (input, allowed) => input && typeof input === "object" && !Array.isArray(input) && Object.keys(input).every((k) => allowed.includes(k));
function createScopedSession({ engine, scope, validateRequests, validateSession, probe } = {}) {
  if (!engine || !fields(scope, ["operations", "locations", "maxOperations"]) || !Array.isArray(scope.operations) || !scope.operations.length || scope.operations.some((x) => ![...METHODS, "cancel", "reconcile"].includes(x)) || !Array.isArray(scope.locations) || !scope.locations.length) throw fail("INVALID_SCOPE");
  const policy = structuredClone(scope);
  for (const location of policy.locations) location.locator ? validateLocator(location) : fileIdentity(location, { root: true });
  const budget = policy.maxOperations ?? 32;
  if (!Number.isInteger(budget) || budget < 1 || budget > 100000) throw fail("INVALID_SCOPE");
  const hasDoctor=typeof probe==='function' && policy.operations.includes('list');
  const owned = /* @__PURE__ */ new Set();
  let executions = 0;
  const locationAllowed = async (id) => {
    for (const scope2 of policy.locations) if (await engine.contains(scope2, id)) return true;
    return false;
  };
  const permitted = async (r) => {
    if (!policy.operations.includes(r.operation)) return false;
    for (const id of [r.source, r.destination].filter(Boolean)) if (!await locationAllowed(id)) return false;
    return true;
  };
  const checked = async (request) => {
    if (!validateRequests.some((v) => v(request))) throw fail("INVALID_REQUEST");
    const r = validate(request);
    if (!await permitted(r)) throw fail("AUTHORIZATION_DENIED");
    if (r.operation === "list" && (r.limit ?? 50) > 100) throw fail("RESPONSE_BUDGET");
    return r;
  };
  const jobFor = async (id) => {
    if (typeof id !== "string" || !owned.has(id)) throw fail("AUTHORIZATION_DENIED");
    const job = await engine.inspect(id);
    if (!job || !await permitted(job.request)) throw fail("AUTHORIZATION_DENIED");
    return job;
  };
  const query = async (method, input = {}) => {
    try {
      if (typeof method !== "string" || !["describe", "execute", "plan", "inspect", "evidence", "cancel", "reconcile", "resources", "jobs", "doctor"].includes(method)) throw fail("UNSUPPORTED_OPERATION");
      if (method==='doctor' && !hasDoctor) throw fail('PROVIDER_OPERATION_UNSUPPORTED');
      if (!validateSession({ method, input })) throw fail("INVALID_INPUT");
      if (!fields(input, ["request", "id", "limit", "offset", "metric", "rootIndex", "operation"])) throw fail("INVALID_INPUT");
      const required = { describe: [], execute: ["request"], plan: ["request"], inspect: ["id"], evidence: ["id"], cancel: ["id"], reconcile: ["id"], resources: ["id", "metric"], jobs: ["limit", "offset"], ...(hasDoctor?{doctor:["rootIndex","operation"]}:{}) };
      if (!Object.hasOwn(required, method)) throw fail("UNSUPPORTED_OPERATION");
      if (Object.keys(input).some((k) => !required[method].includes(k))) throw fail("INVALID_INPUT");
      let data;
      if (method === "describe") data = { apiVersion: "1.0.0", fileApiVersion: FILE_API_VERSION, transport: "JSON lines over owner-launched stdio or embedded query", operations: policy.operations, locations: policy.locations, providers: engine.describe().providers.filter((p) => policy.locations.some((l) => l.provider === p.id)), methods: Object.keys(required), requestSchema: "extension/file-engine/schema-0.2.json", supportedVersions: engine.describe().supportedVersions, providerContracts: engine.describe().providerContracts.filter((p) => policy.locations.some((l) => l.provider === p.provider)), requestSchemas: ["extension/file-engine/schema-0.2.json", "extension/file-engine/schema-0.3.json"], limits: { listPage: 100, jobPage: 25, maxOperations: budget, remaining: budget - executions, maxBytes: 2097152 }, authorization: "Intersection of owner session scope and coordinator authorizer; process possession is the stdio capability", unsupported: ["network service", "MCP", "global recovery", "unscoped journal access"], sourceRefs: ["agent/files/api.mjs", "extension/file-engine/engine.mjs"], testRefs: ["tests/file-agent-session.test.mjs"] };
      else if(method==='doctor'){
        const rootIndex=input.rootIndex??0, operation=input.operation??'upload';
        if(!Number.isInteger(rootIndex)||rootIndex<0||rootIndex>=policy.locations.length||!METHODS.includes(operation))throw fail('INVALID_INPUT');
        const root=structuredClone(policy.locations[rootIndex]);
        const authorization={apiVersion:'0.3.0',operation:'list',source:root,idempotencyKey:'doctor-'+crypto.randomUUID()};
        await engine.plan(authorization,{authorize:permitted});
        if(executions>=budget)throw fail('OPERATION_BUDGET');executions++;
        data=await probe(root,{operation});
        await engine.plan(authorization,{authorize:permitted});
        if(!validateDoctor(data)||data.readOnly!==true||data.mutationPhase!=='NOT_SUBMITTED'||data.steps.some(s=>s.diagnostic&&!validDiagnostic(s.diagnostic))||data.status==='PASS'&&(!data.steps.length||data.steps.some(s=>s.required!==false&&s.status!=='PASS')))throw fail('DIAGNOSTICS_LOST');
      }
      else if (method === "execute" || method === "plan") {
        const request = await checked(input.request);
        if (method === "plan") data = await engine.plan(request, { authorize: permitted });
        else {
          if (executions >= budget) throw fail("OPERATION_BUDGET");
          executions++;
          data = await engine.run(request, { authorize: permitted });
          owned.add(data.id);
        }
      } else if (method === "jobs") {
        const limit = input.limit ?? 25, offset = input.offset ?? 0;
        if (!Number.isInteger(limit) || limit < 1 || limit > 25 || !Number.isInteger(offset) || offset < 0 || offset > budget) throw fail("INVALID_INPUT");
        const ids = [...owned], jobs = [];
        for (const id of ids.slice(offset, offset + limit)) {
          const j = await jobFor(id);
          jobs.push({ id: j.id, operation: j.request.operation, state: j.state, error: j.error ?? null });
        }
        data = { jobs, total: ids.length, nextOffset: offset + limit < ids.length ? offset + limit : null };
      } else {
        const job = await jobFor(input.id);
        if (method === "inspect") data = job;
        if (method === "evidence") data = await engine.exportEvidence(job.id);
        if (method === "cancel" || method === "reconcile") {
          if (!policy.operations.includes(method)) throw fail("AUTHORIZATION_DENIED");
          data = await engine[method](job.id);
        }
        if (method === "resources") {
          if (!["getTrace", "getLatencyBreakdown", "getMemoryProfile", "explainSlowdown"].includes(input.metric)) throw fail("INVALID_INPUT");
          data = engine.resources.query(input.metric, { operationId: job.id });
        }
      }
      return { apiVersion: "1.0.0", state: "available", data: structuredClone(data) };
    } catch (error) {
      return { apiVersion: "1.0.0", state: "failed", error: { code: /^[A-Z_0-9]{1,64}$/.test(error?.code || "") ? error.code : "INVALID_INPUT", diagnostic: diagnosticFrom(error,{component:"session",stage:"validation"}) } };
    }
  };
  return Object.freeze({ query });
}
export {
  createScopedSession
};

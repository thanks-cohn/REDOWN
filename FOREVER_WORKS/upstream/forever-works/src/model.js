import {schemas} from './contracts.js';
import {canonical,compare} from './canonical.js';
import {validateStructure} from './structure.js';
const KINDS = new Set(["intent", "capability", "invariant", "constraint", "dependency", "decision", "compatibility", "migration", "implementation", "evidence"]);
const CLASSIFICATIONS = new Set(["LOCKED", "SEMANTIC", "CAPABILITY", "TRANSITIONAL", "LEGACY", "OPTIONAL"]);
const REF_FIELDS = new Set(["relatedCapabilities", "relatedConstraints", "relatedInvariants", "relatedImplementations", "requiredCapabilities", "protectedInvariants", "compatibilityObligations", "relatedEntities", "preservedCapabilities", "preservedInvariants", "compatibilityImpact", "verification", "satisfiesCapabilities", "constrainedByInvariants", "satisfiesConstraints", "compatibilityContracts", "evidence", "sourceImplementation", "targetImplementation", "currentImplementation", "scope", "validationReferences"]);
const REQUIRED = {
  intent: ["name", "statement", "purpose"], capability: ["name", "statement"], invariant: ["name", "statement", "severity"],
  constraint: ["statement", "category", "classification"], dependency: ["dependencyName", "dependencyType", "purpose", "reasonSelected", "replacementClassification"],
  decision: ["title", "status", "context", "decision", "rationale"], compatibility: ["contractType", "boundary", "mustPreserve", "migrationPolicy", "version"],
  migration: ["sourceImplementation", "targetImplementation", "reason", "status"], implementation: ["type", "technology", "satisfiesCapabilities"],
  evidence: ["type", "source", "statementSupported", "confidence"]
};

function references(record) {
  const result = [];
  const properties=Object.values(schemas).find(s=>s.properties?.kind?.const===record?.kind)?.properties??{};
  for (const key of REF_FIELDS) {
    if(!Object.hasOwn(properties,key))continue;
    const value = record?.[key];
    if (typeof value === "string" && true) result.push(value);
    else if (Array.isArray(value)) result.push(...value.filter(item => typeof item === "string" && true));
  }
  if (Object.hasOwn(properties,'verification') && Array.isArray(record?.verification)) for (const check of record.verification) {
    if (check && typeof check === 'object' && Array.isArray(check.evidence)) result.push(...check.evidence.filter(x=>typeof x==='string'));
  }
  if (Object.hasOwn(properties,'claims') && Array.isArray(record?.claims)) for (const claim of record.claims) {
    if (claim && Array.isArray(claim.evidence)) result.push(...claim.evidence.filter(item => typeof item === "string"));
  }
  return result;
}

/** Return canonical UTF-8 JSON text, separately from in-memory key enumeration. */
export const normalize = canonical;

/** Stable public error. Codes, rather than messages, are the compatibility surface. */
export class ForeverApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ForeverApiError";
    this.code = code;
    this.details = details;
  }
  toJSON() { return {error: {code: this.code, message: this.message, details: this.details}}; }
}

function overall(checks) {
  const statuses = new Set(checks.map(check => check.status));
  return statuses.has("fail") ? "fail" : checks.length && statuses.size === 1 && statuses.has("pass") ? "pass" : "partial";
}

const OPERATIONS = Object.freeze(["audit", "describe", "evaluateReplacement", "explainDependency", "getEntity", "getProjectIntent", "listCapabilities", "listDependencies", "listImplementations", "listInvariants", "normalize", "traceEntity", "validateModel", "verifyMigration"]);

/** Create the transport-neutral v0.1 facade around an already-loaded Model. */
export function createForeverApiFromModel(model, adapter = {name: "javascript-core"}) {
  const entity = (id) => {
    const value = model.getEntity(id);
    if (!value) throw new ForeverApiError("entity-not-found", `entity not found: ${id}`, {id});
    return value;
  };
  const translate = (operation, fn) => {
    try { return fn(); }
    catch (error) {
      if (error instanceof ForeverApiError) throw error;
      const match = /^(entity|dependency|implementation|migration) not found: (.+)$/.exec(error?.message ?? "");
      if (match) throw new ForeverApiError(`${match[1]}-not-found`, error.message, {id: match[2], operation});
      throw error;
    }
  };
  return Object.freeze({
    describe: () => ({foreverApiVersion: "0.1", supportedModelVersions: ["0.1"], modelVersionCompatibility: "0.x minor versions with understood required semantics", operations: [...OPERATIONS], implementation: {name: "@forever-works/javascript", version: "0.1.0"}, adapter}),
    getProjectIntent: () => {
      const intents = model.list("intent");
      if (!intents.length) throw new ForeverApiError("project-intent-not-found", "project intent not found", {});
      return intents[0];
    },
    getEntity: (id) => entity(id),
    listCapabilities: () => model.list("capability"),
    listInvariants: () => model.list("invariant"),
    listDependencies: () => model.list("dependency"),
    listImplementations: () => model.list("implementation"),
    traceEntity: (id) => translate("traceEntity", () => model.traceEntity(id)),
    explainDependency: (id) => translate("explainDependency", () => model.explainDependency(id)),
    validateModel: () => ({valid: model.validate().length === 0, errors: model.validate()}),
    audit: () => { const issues = model.audit(); return {issues, issueCount: issues.length}; },
    evaluateReplacement: (current, candidate) => translate("evaluateReplacement", () => model.evaluateReplacement(current, candidate)),
    verifyMigration: (id) => translate("verifyMigration", () => model.verifyMigration(id)),
    normalize: () => model.normalized()
  });
}

function evaluation(candidate, requirements, claims = []) {
  const byRequirement = new Map(claims.filter(claim => claim && typeof claim === "object").map(claim => [claim.requirement, claim]));
  const checks = [...new Set(requirements)].map(requirement => {
    const claim = byRequirement.get(requirement);
    if (!claim) return {requirement, status: "unknown", reason: "No candidate evidence supplied"};
    return Object.fromEntries(["requirement", "status", "evidence", "reason"].filter(key => key in claim).map(key => [key, claim[key]]));
  });
  return {candidate, result: overall(checks), checks};
}

/** In-memory, host-neutral representation constructed from parsed JSON data. */
export class Model {
  constructor(manifest, records) {
    this.manifest = manifest;
    this.records = records;
    this.entities = new Map((Array.isArray(records)?records:[]).filter(record => record && typeof record === "object" && record.id).map(record => [record.id, record]));
  }
  validate() {
    const errors = validateStructure(this.manifest, this.records);
    for (const record of (Array.isArray(this.records)?this.records:[])) if (record && typeof record === "object") for (const reference of references(record)) {
      if (!this.entities.has(reference)) errors.push({code: "broken-reference", path: record.id ?? "?", reference, message: `unknown reference ${reference}`});
    }
    return errors.sort((a, b) => `${a.code}\0${a.path}\0${a.reference ?? ""}`.localeCompare(`${b.code}\0${b.path}\0${b.reference ?? ""}`));
  }
  getEntity(id) { return this.entities.get(id); }
  list(kind) { return this.records.filter(record => record?.kind === kind).sort((a, b) => compare(a.id,b.id)); }
  traceEntity(id) {
    if (!this.entities.has(id)) throw new Error(`entity not found: ${id}`);
    const adjacency = new Map([...this.entities.keys()].map(key => [key, new Set()]));
    for (const record of this.records) for (const reference of references(record)) if (adjacency.has(reference)) { adjacency.get(record.id).add(reference); adjacency.get(reference).add(record.id); }
    const found = new Set(), pending = [id];
    while (pending.length) { const current = pending.pop(); if (found.has(current)) continue; found.add(current); pending.push(...[...adjacency.get(current)].filter(next => !found.has(next))); }
    return [...found].sort().map(key => this.entities.get(key));
  }
  explainDependency(id) {
    const record = this.entities.get(id);
    if (!record || record.kind !== "dependency") throw new Error(`dependency not found: ${id}`);
    const keys = ["id", "dependencyName", "purpose", "reasonSelected", "replacementClassification", "requiredCapabilities", "protectedInvariants", "relatedConstraints", "replacementRequirements", "compatibilityObligations", "historicalContext", "provenance"];
    return Object.fromEntries(keys.filter(key => key in record).map(key => [key, record[key]]));
  }
  findDependencies(...classifications) { return this.list("dependency").filter(record => classifications.includes(record.replacementClassification)); }
  audit() {
    const issues = this.validate();
    for (const record of this.records) {
      const id = record?.id ?? "?", kind = record?.kind;
      if (kind !== "evidence" && !("provenance" in record)) issues.push({code: "missing-provenance", path: id, message: "record has no provenance"});
      if (kind === "capability" && !record.relatedImplementations?.length) issues.push({code: "capability-no-implementation", path: id, message: "capability has no implementation"});
      if (kind === "invariant" && !record.verification?.length) issues.push({code: "invariant-no-verification", path: id, message: "invariant has no verification"});
      if (kind === "compatibility" && !record.validationReferences?.length) issues.push({code: "compatibility-no-validation", path: id, message: "compatibility contract has no validation"});
      if (kind === "dependency" && record.replacementClassification === "TRANSITIONAL" && !record.revisitCondition) issues.push({code: "transitional-no-revisit", path: id, message: "transitional dependency has no revisit condition"});
      if (kind === "migration" && !record.verification?.length) issues.push({code: "migration-unverified", path: id, message: "migration has no verification evidence"});
    }
    return issues.sort((a, b) => `${a.code}\0${a.path}`.localeCompare(`${b.code}\0${b.path}`));
  }
  evaluateReplacement(current, candidate) {
    const dependency = this.entities.get(current), implementation = this.entities.get(candidate);
    if (!dependency || dependency.kind !== "dependency") throw new Error(`dependency not found: ${current}`);
    if (!implementation || implementation.kind !== "implementation") throw new Error(`implementation not found: ${candidate}`);
    const requirements = ["requiredCapabilities", "protectedInvariants", "relatedConstraints", "replacementRequirements", "compatibilityObligations"].flatMap(key => dependency[key] ?? []);
    return evaluation(candidate, requirements, implementation.claims);
  }
  verifyMigration(id) {
    const migration = this.entities.get(id);
    if (!migration || migration.kind !== "migration") throw new Error(`migration not found: ${id}`);
    const result = evaluation(id, ["preservedCapabilities", "preservedInvariants", "compatibilityImpact"].flatMap(key => migration[key] ?? []), migration.claims);
    const verification = new Set(migration.verification ?? []);
    for (const check of result.checks) if (check.status === "pass" && !(check.evidence ?? []).some(item => verification.has(item))) Object.assign(check, {status: "unknown", reason: "No referenced migration verification evidence"});
    result.result = overall(result.checks);
    return result;
  }
  normalized() { return normalize({...this.manifest, records: [...this.records].sort((a, b) => compare(a.id,b.id))}); }
}

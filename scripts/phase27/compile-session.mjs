import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standalone from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
const ajv = new Ajv({ strict: false, code: { source: true, esm: true } });
addFormats(ajv);
for (const path2 of ["extension/file-engine/schema-0.2.json", "extension/file-engine/schema-0.3.json", "agent/files/session.schema.json"]) ajv.addSchema(JSON.parse(readFileSync(path2)));
const source = standalone(ajv, { request02: "urn:redown:file-api:0.2.0#/$defs/request", request03: "urn:redown:file-api:0.3.0#/$defs/request", session: "urn:redown:files:1.0.0:session" });
const result = await build({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "browser", minify: true });
const path = "extension/file-engine/session-validators.mjs", code = result.outputFiles[0].text;
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== code) throw Error("SESSION_VALIDATOR_DRIFT");
} else writeFileSync(path, code);

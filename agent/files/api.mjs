import {createScopedSession} from '../../extension/file-engine/scoped-session.mjs';
// Owner creates a session; agents receive this facade, never the coordinator or its store.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {readFileSync} from 'node:fs';
const requestSchema=JSON.parse(readFileSync(new URL('../../extension/file-engine/schema-0.2.json',import.meta.url)));
const ajv=new Ajv({strict:false});addFormats(ajv);
ajv.addSchema(requestSchema);
ajv.addSchema(JSON.parse(readFileSync(new URL('../../extension/file-engine/schema-0.3.json',import.meta.url))));
const validateRequests=['0.2.0','0.3.0'].map(v=>ajv.getSchema(`urn:redown:file-api:${v}#/$defs/request`));
const validateSession=ajv.compile(JSON.parse(readFileSync(new URL('./session.schema.json',import.meta.url))));
export const createFileSession=options=>createScopedSession({...options,validateRequests,validateSession});

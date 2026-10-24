import {readFile,stat} from 'node:fs/promises';
import {exportTraceEvents} from '../agent/resources/trace-event.mjs';
const [path,...extra]=process.argv.slice(2);if(!path||extra.length)throw Error('Usage: node scripts/resource-trace-export.mjs EVIDENCE.json > trace.json');
if((await stat(path)).size>1048576)throw Error('INPUT_BUDGET');
process.stdout.write(JSON.stringify(exportTraceEvents(JSON.parse(await readFile(path,'utf8'))))+'\n');

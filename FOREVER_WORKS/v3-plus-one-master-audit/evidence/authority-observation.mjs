// Audit-only actual background restore observation; all Chrome/storage/provider APIs mocked.
import {worker} from '../../../tests/helpers/background-worker.mjs';
import {writeFileSync} from 'node:fs';
const h=worker();await h.ready();
await h.context.restoreDurableV3();
const before=structuredClone(h.local.rightClickV3);
// Model the existing default-bucket writer's storage.local-only patch.
h.local.rightClickV3={...h.local.rightClickV3,revision:h.local.rightClickV3.revision+1,defaultBucket:{profileId:'p',accountId:'a',bucketName:'redown'}};
const afterMirrorOnlyWrite=structuredClone(h.local.rightClickV3);
await h.context.restoreDurableV3();
const afterRestore=structuredClone(h.local.rightClickV3);
const result={scope:'actual restoreDurableV3 in controlled whole-background helper; synthetic local-only default patch matching current direct writer shape; no provisioning performed',before,afterMirrorOnlyWrite,afterRestore,mirrorOnlyDefaultSurvives:Object.hasOwn(afterRestore,'defaultBucket')};
writeFileSync('FOREVER_WORKS/v3-plus-one-master-audit/evidence/authority-observation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

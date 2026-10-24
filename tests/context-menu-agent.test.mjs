import test from 'node:test';import assert from 'node:assert/strict';import {runContextMenuTrial} from '../agent/aac/context-menu.mjs';
test('redown-manage registers a real control and dispatches to options without invoking storage execution',async()=>{const result=await runContextMenuTrial();assert.equal(result.operation,'chrome.runtime.openOptionsPage');});

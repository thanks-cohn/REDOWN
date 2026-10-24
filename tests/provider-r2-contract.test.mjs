import test from 'node:test';
import {providerBaseline} from './providers/baseline.mjs';
import {r2Fixture} from './providers/r2-fixture.mjs';
test('mandatory universal baseline runs real R2 adapter + Worker against offline binding',async()=>providerBaseline(await r2Fixture()));

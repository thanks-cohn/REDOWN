import {adapterFactories} from '../../agent/files/bootstrap.mjs';
import {immutableReferenceAdapter} from '../../extension/file-engine/adapters/immutable-reference.mjs';
adapterFactories.set('immutable-reference',async()=>{const adapter=immutableReferenceAdapter();return {adapter,roots:[adapter.root]};});

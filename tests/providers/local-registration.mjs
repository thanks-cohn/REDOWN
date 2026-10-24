// Owner registration module: no core/session/Python changes are needed for this provider.
import {adapterFactories} from '../../agent/files/bootstrap.mjs';
import {localReferenceAdapter} from '../../extension/file-engine/adapters/local-reference.mjs';
adapterFactories.set('local-reference',async(store,c)=>({adapter:await localReferenceAdapter(c.directory),roots:[{provider:'local-reference',account:'owner',container:'sandbox',key:''}]}));

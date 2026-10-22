// Reuse existing libraries; no shell, network, browser session, preparation or dynamic module path.
import {createAgentApi} from '../api.mjs';
import {createDebugApi} from '../debug/api.mjs';
import {createSemanticApi} from '../semantic/api.mjs';
import {createRuntimeDiagnostics,inspectBundle} from '../runtime/api.mjs';
import {createExplorerAPI} from '../explorer/api.mjs';
export function createAdapters({bundle,runtimeBundle}={}){
 const instances=new Map();
 const factories={project:()=>createAgentApi(),debug:()=>createDebugApi(),semantic:()=>createSemanticApi(),runtime:()=>runtimeBundle?inspectBundle(runtimeBundle):createRuntimeDiagnostics({context:'offline'}),explorer:()=>createExplorerAPI({bundle})};
 return {get(namespace){if(!Object.hasOwn(factories,namespace))throw Error('UNKNOWN_NAMESPACE');if(!instances.has(namespace))instances.set(namespace,factories[namespace]());return instances.get(namespace);}};
}

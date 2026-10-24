import {queryResources,validateResourceBundle} from '../../extension/file-engine/resources.mjs';
export function createResourceAPI({resourceBundle}={}){
 if(resourceBundle&&!validateResourceBundle(resourceBundle))throw Error('INVALID_RESOURCE_BUNDLE');
 const pinned=resourceBundle?structuredClone(resourceBundle):null;
 return Object.freeze({query:(method,input={})=>structuredClone(queryResources(pinned,method,input))});
}

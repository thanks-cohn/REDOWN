import {queryResources,validateResourceBundle} from '../../extension/file-engine/resources.mjs';
export function createResourceAPI({resourceBundle}={}){
 if(resourceBundle&&!validateResourceBundle(resourceBundle))throw Error('INVALID_RESOURCE_BUNDLE');
 const pinned=resourceBundle?structuredClone(resourceBundle):null;
 return {query:(method,input={})=>queryResources(pinned,method,input)};
}

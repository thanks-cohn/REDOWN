import '../../extension/runtime-diagnostics.js';
export const createRuntimeDiagnostics=globalThis.RedownRuntimeDiagnostics.create;
export function inspectBundle(bundle){
  if(!bundle||bundle.schemaVersion!=='1.0.0'||!Array.isArray(bundle.events)||bundle.events.length>256)throw new Error('INVALID_BUNDLE');
  // Re-sanitize imports; unknown optional metadata is not trusted for export.
  const api=createRuntimeDiagnostics({context:'offline-import'});api.setEnabled(true);
  for(const event of bundle.events)api.record(event);
  return api;
}

export const previewNavigationKey='previewNavigationAxisV1';
export const normalizeAxis=value=>value==='vertical'?'vertical':'horizontal';
export function previewDirection(event,axis='horizontal'){
 if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.defaultPrevented||event.target?.closest?.('input,textarea,select,[contenteditable],video,audio,iframe,pre,[role=separator],[role=slider],[role=tree],[role=menu]'))return 0;
 const pair=normalizeAxis(axis)==='vertical'?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];
 return event.key===pair[0]?-1:event.key===pair[1]?1:0;
}
export function watchPreviewAxis(callback,storage=globalThis.chrome?.storage){
 let revision=0;const change=(changes,area)=>{if(area==='local'&&changes[previewNavigationKey]){revision++;callback(normalizeAxis(changes[previewNavigationKey].newValue));}};
 const initial=revision;void storage?.local?.get(previewNavigationKey).then(data=>{if(revision===initial)callback(normalizeAxis(data[previewNavigationKey]));}).catch(()=>{});
 storage?.onChanged?.addListener(change);return ()=>storage?.onChanged?.removeListener?.(change);
}

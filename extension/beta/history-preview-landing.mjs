// History GO TO should frame the *normal* side preview without expanding it.
// The spacing token is shared with the existing Expand Preview CSS.
export function positionHistoryGoToLanding({row,files,preview,workspace,viewport=window}){
  // The file list owns its scroll position. Never use row.scrollIntoView():
  // that can also scroll the entire Explorer document.
  const scroller=files?.closest?.('#dropzone')||files;
  if(row&&scroller&&scroller.scrollHeight>scroller.clientHeight){
    const selected=row.getBoundingClientRect(),bounds=scroller.getBoundingClientRect();
    if(selected.top<bounds.top)scroller.scrollTop+=selected.top-bounds.top;
    else if(selected.bottom>bounds.bottom)scroller.scrollTop+=selected.bottom-bounds.bottom;
  }
  if(!preview||!workspace||!viewport)return;
  const gap=Number.parseFloat(viewport.getComputedStyle?.(workspace)?.getPropertyValue('--preview-bottom-gap'))||16;
  const excess=preview.getBoundingClientRect().bottom-(viewport.innerHeight-gap);
  // Only correct a preview that is too low. Do not yank the page upward when
  // the normal-size preview already has more than enough room below it.
  if(excess>0.5)viewport.scrollBy?.({top:excess,behavior:'instant'});
}

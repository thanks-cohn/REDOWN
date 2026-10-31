(() => {
 const select=document.getElementById('toolbar-open-mode');
 if(!select)return;
 select.value='shelf';select.disabled=true;
 const status=document.getElementById('toolbar-mode-status');
 if(status)status.textContent='Toolbar opens the Shelf. Popup is used automatically for recovery.';
})();

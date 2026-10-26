"""Scrollable Tk laboratory content, including keyboard focus visibility."""
def scrollable_content(root):
    import tkinter as tk
    from tkinter import ttk
    shell = ttk.Frame(root)
    shell.pack(fill='both', expand=True)
    shell.rowconfigure(0, weight=1)
    shell.columnconfigure(0, weight=1)
    canvas = tk.Canvas(shell, highlightthickness=0)
    vertical = ttk.Scrollbar(shell, orient='vertical', command=canvas.yview)
    horizontal = ttk.Scrollbar(shell, orient='horizontal', command=canvas.xview)
    canvas.configure(yscrollcommand=vertical.set, xscrollcommand=horizontal.set)
    canvas.grid(row=0, column=0, sticky='nsew')
    vertical.grid(row=0, column=1, sticky='ns')
    horizontal.grid(row=1, column=0, sticky='ew')
    content = ttk.Frame(canvas)
    item = canvas.create_window(0, 0, anchor='nw', window=content)
    def resize(_event=None):
        canvas.itemconfigure(item, width=max(canvas.winfo_width(), content.winfo_reqwidth()))
        canvas.configure(scrollregion=canvas.bbox('all'))
    content.bind('<Configure>', resize)
    canvas.bind('<Configure>', resize)
    def focus_visible(event):
        widget = event.widget
        if not str(widget).startswith(str(content) + '.'):
            return
        root.update_idletasks()
        left = widget.winfo_rootx() - content.winfo_rootx()
        top = widget.winfo_rooty() - content.winfo_rooty()
        for start, size, viewport, total, origin, move in (
            (top, widget.winfo_height(), canvas.winfo_height(), content.winfo_height(), canvas.canvasy(0), canvas.yview_moveto),
            (left, widget.winfo_width(), canvas.winfo_width(), content.winfo_width(), canvas.canvasx(0), canvas.xview_moveto)):
            if start < origin or start + size > origin + viewport:
                target = start if size >= viewport or start < origin else start + size - viewport
                move(max(0, target) / max(1, total))
    def wheel(event):
        # Preserve native text/list/dropdown scrolling and selection semantics.
        if event.widget.winfo_class() in ('Text', 'Listbox', 'TCombobox'):
            return
        units = (-1 if event.num == 4 else 1) if getattr(event, 'num', None) in (4, 5) else (-1 if event.delta > 0 else 1)
        canvas.yview_scroll(units * 3, 'units')
    root.bind('<FocusIn>', focus_visible, add='+')
    for sequence in ('<MouseWheel>', '<Button-4>', '<Button-5>'):
        root.bind(sequence, wheel, add='+')
    # Scrollbars remain keyboard reachable using standard Tk traversal.
    vertical.configure(takefocus=True)
    horizontal.configure(takefocus=True)
    return content

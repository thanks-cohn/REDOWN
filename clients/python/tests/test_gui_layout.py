"""Run with a display (including on Windows) for real Tk geometry checks."""
import unittest
from unittest.mock import patch


class GuiLayoutTests(unittest.TestCase):
    def test_all_controls_reachable_at_laptop_size_and_scaled_text(self):
        import tkinter as tk
        from redown.lab import gui
        try:
            root=tk.Tk()
        except tk.TclError as error:
            self.skipTest('Desktop display unavailable: '+str(error))
        checked=[]
        def descendants(widget):
            for child in widget.winfo_children():
                yield child
                yield from descendants(child)
        def inspect():
            for scaling in (1.0,2.0):
                root.tk.call('tk','scaling',scaling)
                root.geometry('1024x600');root.update()
                widgets=list(descendants(root))
                canvas=next(w for w in widgets if w.winfo_class()=='Canvas')
                output=[w for w in widgets if w.winfo_class()=='Text'][-1]
                self.assertGreater(canvas.bbox('all')[3],canvas.winfo_height())
                output.focus_force();root.update()
                self.assertGreater(canvas.canvasy(0),0)
                self.assertLessEqual(output.winfo_rooty(),canvas.winfo_rooty()+canvas.winfo_height())
                buttons=[w for w in widgets if w.winfo_class() in ('Button','TButton')]
                for text in ('RUN COMPLETE LABORATORY','PREFLIGHT','COPY JSON REPORT','1. CONNECT TO REDOWN'):
                    button=next(w for w in buttons if w.cget('text')==text)
                    button.focus_force();root.update()
                    self.assertGreaterEqual(button.winfo_rooty(),canvas.winfo_rooty()-2)
                    self.assertLessEqual(button.winfo_rooty()+button.winfo_height(),canvas.winfo_rooty()+canvas.winfo_height()+2)
                checked.append(scaling)
        try:
            with patch('tkinter.Tk',return_value=root),patch.object(root,'mainloop',side_effect=inspect):
                gui()
            self.assertEqual(checked,[1.0,2.0])
        finally:
            root.destroy()

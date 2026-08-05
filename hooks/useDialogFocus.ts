import { useEffect, useRef } from 'react'

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'

export function useDialogFocus(open: boolean, onEscape: () => void) {
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const escapeRef = useRef(onEscape)
  escapeRef.current = onEscape

  useEffect(() => {
    if (!open) {
      returnFocusRef.current?.focus()
      returnFocusRef.current = null
      return
    }
    if (!returnFocusRef.current && document.activeElement instanceof HTMLElement) returnFocusRef.current = document.activeElement
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]')
    const dialog = dialogs.item(dialogs.length - 1)
    if (!dialog) return
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
    focusable()[0]?.focus()
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); escapeRef.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) { event.preventDefault(); dialog.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    dialog.addEventListener('keydown', keepFocusInside)
    return () => dialog.removeEventListener('keydown', keepFocusInside)
  }, [open])
}

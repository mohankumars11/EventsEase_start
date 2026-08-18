import { useEffect, useRef, useState, useCallback } from 'react'
import { imagesFromTransfer, imageUrlsFromText } from '../lib/productStudio'

/**
 * Ctrl+V, drag-and-drop, and an explicit Paste button — for any screen.
 *
 * ── Why this is a hook and not a handler on one component ────────────────
 * The first version of this lived inside the workbench's Photos tab, which
 * meant pasting a screenshot only worked if you had already opened a product
 * AND switched to that one tab. Everywhere else — the catalogue list, the
 * other tabs, the phone-first photo screen — Ctrl+V did nothing, which reads
 * as "paste is broken" rather than "paste is somewhere else".
 *
 * ── The three ways a paste can fail to reach a page ──────────────────────
 * All three are handled here, because any one of them looks identical to the
 * feature not existing:
 *
 *  1. Something swallowed the event. The listener is registered in the CAPTURE
 *     phase on `window`, so it runs before any component that calls
 *     `stopPropagation` on its own paste.
 *
 *  2. Focus is inside a text box. A paste there is the browser's to handle —
 *     unless it carries an image, in which case the text box has no use for it
 *     and we take it. Typing a caption still pastes text normally.
 *
 *  3. The page never gets a `paste` event at all. This is the one people hit:
 *     after Win+Shift+S the snipping overlay had focus, and if the click back
 *     into the window lands somewhere that does not take keyboard focus, Chrome
 *     may route Ctrl+V nowhere. There is no listener that can fix that — so
 *     `pasteFromClipboard()` reads the clipboard directly via the Async
 *     Clipboard API, and every screen puts it behind a visible button. A button
 *     is a user gesture, which is exactly what that API requires.
 */
export function usePasteImages({ onImages, onUrls, enabled = true } = {}) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  // Through refs so the window listener is attached once for the life of the
  // screen instead of being torn down and rebuilt after every upload.
  const imagesRef = useRef(onImages)
  const urlsRef = useRef(onUrls)
  useEffect(() => { imagesRef.current = onImages }, [onImages])
  useEffect(() => { urlsRef.current = onUrls }, [onUrls])

  useEffect(() => {
    if (!enabled) return

    function onPaste(e) {
      const files = imagesFromTransfer(e.clipboardData)
      if (files.length) {
        e.preventDefault()
        e.stopPropagation()
        imagesRef.current?.(files)
        return
      }

      const target = e.target
      const typing = /^(INPUT|TEXTAREA)$/.test(target?.tagName ?? '') || target?.isContentEditable
      if (typing) return

      const urls = imageUrlsFromText(e.clipboardData?.getData('text/plain'))
      if (urls.length && urlsRef.current) {
        e.preventDefault()
        urlsRef.current(urls)
      }
    }

    // Capture phase — see (1) above.
    window.addEventListener('paste', onPaste, true)
    return () => window.removeEventListener('paste', onPaste, true)
  }, [enabled])

  /**
   * Read the clipboard on demand, for the Paste button.
   *
   * Returns a reason string when it cannot, rather than throwing: "your browser
   * would not let us read the clipboard" is something an admin can act on
   * (use the button's neighbour, drag the file in), and a red stack trace is
   * not.
   */
  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.read) {
      return { ok: false, reason: 'This browser cannot read the clipboard directly — press Ctrl+V instead, or drag the file in.' }
    }
    let items
    try {
      items = await navigator.clipboard.read()
    } catch {
      return { ok: false, reason: 'The browser blocked reading the clipboard. Click once anywhere on this panel, then press Ctrl+V.' }
    }

    const files = []
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'))
      if (!type) continue
      try {
        const blob = await item.getType(type)
        files.push(new File([blob], `pasted-${Date.now()}-${files.length}.${type.split('/')[1] || 'png'}`, { type }))
      } catch { /* one unreadable item must not lose the rest */ }
    }

    if (files.length) { imagesRef.current?.(files); return { ok: true, count: files.length } }

    // No picture, but an address on the clipboard is still a picture.
    const text = items.find(i => i.types.includes('text/plain'))
    if (text && urlsRef.current) {
      try {
        const urls = imageUrlsFromText(await (await text.getType('text/plain')).text())
        if (urls.length) { urlsRef.current(urls); return { ok: true, count: urls.length } }
      } catch { /* fall through to the message below */ }
    }
    return { ok: false, reason: 'There is no image on the clipboard. Take a screenshot first, or copy an image.' }
  }, [])

  /**
   * Drag handlers for a drop target.
   *
   * `dragenter`/`dragleave` fire for every child element the pointer crosses,
   * so a naive handler flickers the highlight off the moment the cursor moves
   * over the text inside the zone. Counting entries against leaves fixes it.
   */
  const dropHandlers = {
    onDragEnter: e => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault(); depth.current++; setDragging(true)
    },
    onDragOver: e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() },
    onDragLeave: e => {
      e.preventDefault()
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    },
    onDrop: e => {
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      const images = imagesFromTransfer(e.dataTransfer)
      if (images.length) imagesRef.current?.(images)
      return images
    },
  }

  return { dragging, dropHandlers, pasteFromClipboard }
}

export default usePasteImages

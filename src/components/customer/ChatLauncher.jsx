import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'

/**
 * The assistant's launcher — draggable, dismissible, and it remembers.
 *
 * ── Three things a floating button owes you ───────────────────────────────
 * A bubble that hovers over every screen is borrowing space it does not own,
 * and the rent is control. This one pays it three ways:
 *
 *   move it    Drag it anywhere down either edge. Whatever it covers on YOUR
 *              phone — a price, a submit button, the corner your thumb rests
 *              in — you can move it off. This is the honest fix for the fault
 *              that got the original bubble deleted and replaced by a Help
 *              tab: no fixed position is right for every screen in the app, so
 *              the position stops being ours to choose.
 *   dismiss it A long-press (or the × on hover) hides it for the session. The
 *              Account tab and the support strip on Home both still reach a
 *              human, so hiding this closes nothing off.
 *   remember   Both the position and the dismissal persist — the position in
 *              localStorage, the dismissal in sessionStorage. Somebody who
 *              moved it once should not have to move it on every page.
 *
 * ── It snaps to an edge, and never floats mid-screen ──────────────────────
 * On release it flies to whichever side is nearer, keeping only its vertical
 * position. A launcher parked in the middle of the page covers content on
 * every screen instead of one, and free-form placement means a customer can
 * strand it half off-screen with no way back. Snapping keeps it thumb-reachable
 * and makes the drag one decision (how high) instead of two.
 *
 * The vertical range is clamped between the app bar and the tab bar, so it can
 * never be dropped underneath either — the two places it would be unreachable.
 *
 * ── Drag and tap are the same gesture until they aren't ───────────────────
 * Pointer events, one handler, and a 6px threshold decides which it was. Below
 * the threshold it is a tap and opens the panel; above it, the click is
 * suppressed so a drag that ends over the button does not also open it. That
 * distinction is the whole reason this is a `pointerdown` handler and not
 * `onDragStart` — HTML5 drag has no touch support worth the name.
 *
 * Pointer capture means the gesture keeps tracking even when the finger leaves
 * the button, which on a 56px target during a fast flick is most of the drag.
 */

const POS_KEY = 'sambramo_chat_pos_v1'
const HIDE_KEY = 'sambramo_chat_hidden'
const DRAG_THRESHOLD = 6
const SIZE = 56
const EDGE = 14
/** Keep it clear of the app bar at the top and the tab bar at the bottom. */
const TOP_LIMIT = 76

function readPos() {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null')
    if (!raw || typeof raw.y !== 'number' || (raw.side !== 'left' && raw.side !== 'right')) return null
    return raw
  } catch {
    return null
  }
}

export default function ChatLauncher({ open, onToggle }) {
  // `null` means "wherever .chat-dock parks it" — the CSS default, which
  // already knows the measured tab-bar height. Only a real drag opts into
  // JS-controlled positioning, so the common case costs no layout work.
  const [pos, setPos] = useState(readPos)
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(HIDE_KEY) === '1' } catch { return false }
  })
  const [dragging, setDragging] = useState(false)
  const [showClose, setShowClose] = useState(false)

  const ref = useRef(null)
  const drag = useRef(null)
  const longPress = useRef(null)

  const bottomLimit = useCallback(() => {
    const nav = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-h') || '0', 10,
    )
    return window.innerHeight - (Number.isFinite(nav) ? nav : 0) - SIZE - 10
  }, [])

  // A phone rotated, or a desktop window resized, can leave a remembered Y
  // below the fold — where the button is unreachable and looks like it has
  // simply gone.
  useEffect(() => {
    if (!pos) return
    function clamp() {
      setPos(p => (p ? { ...p, y: Math.max(TOP_LIMIT, Math.min(p.y, bottomLimit())) } : p))
    }
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [pos, bottomLimit])

  function persist(next) {
    setPos(next)
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }

  function hide() {
    setHidden(true)
    try { sessionStorage.setItem(HIDE_KEY, '1') } catch { /* private mode */ }
  }

  function onPointerDown(e) {
    // Never start a drag from the close affordance.
    if (e.target.closest('[data-chat-close]')) return
    const rect = ref.current.getBoundingClientRect()
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetY: e.clientY - rect.top,
      moved: false,
    }
    ref.current.setPointerCapture(e.pointerId)
    // Long-press reveals the close control on touch, where there is no hover.
    longPress.current = setTimeout(() => {
      if (drag.current && !drag.current.moved) setShowClose(true)
    }, 450)
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

    d.moved = true
    clearTimeout(longPress.current)
    setDragging(true)
    setPos({
      side: e.clientX < window.innerWidth / 2 ? 'left' : 'right',
      y: Math.max(TOP_LIMIT, Math.min(e.clientY - d.offsetY, bottomLimit())),
      // While the finger is down the button tracks it horizontally too; the
      // snap only happens on release. Dragging a button that refuses to follow
      // your finger sideways feels broken even when the end state is correct.
      x: e.clientX - SIZE / 2,
    })
  }

  function onPointerUp(e) {
    const d = drag.current
    clearTimeout(longPress.current)
    drag.current = null
    if (!d) return
    ref.current?.releasePointerCapture?.(e.pointerId)

    if (!d.moved) { setDragging(false); return }

    setDragging(false)
    setPos(p => {
      if (!p) return p
      // Drop `x` — the snap is to an edge, so only the side and the height
      // survive the gesture.
      const next = { side: p.side, y: p.y }
      try { localStorage.setItem(POS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }

  // Suppress the click that follows a drag, so releasing over the button does
  // not also open the panel.
  function onClick(e) {
    if (dragging) { e.preventDefault(); return }
    onToggle()
  }

  if (hidden) return null

  /* No inline position until the button has actually been dragged — the CSS
     dock (index.css) already places it against the measured tab-bar height,
     and reproducing that in JS would be a second source of truth for the same
     number. */
  const style = pos
    ? {
        position: 'fixed',
        top: pos.y,
        left:  pos.x != null ? pos.x : pos.side === 'left'  ? EDGE : undefined,
        right: pos.x != null ? undefined : pos.side === 'right' ? EDGE : undefined,
        bottom: 'auto',
        zIndex: 45,
        transition: dragging ? 'none' : 'left 0.28s cubic-bezier(0.16,1,0.3,1), right 0.28s cubic-bezier(0.16,1,0.3,1), top 0.28s cubic-bezier(0.16,1,0.3,1)',
      }
    : undefined

  return (
    <div
      ref={ref}
      style={style}
      className={pos ? 'select-none' : 'chat-dock select-none'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setShowClose(true)}
      onMouseLeave={() => !dragging && setShowClose(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={open ? 'Close the assistant' : 'Ask Sambramo — drag to move'}
        aria-expanded={open}
        className={`relative flex h-14 w-14 touch-none items-center justify-center rounded-full bg-saffron-400 shadow-[0_12px_30px_-8px_rgba(43,15,82,0.55)] ring-2 ring-white/70 transition-transform ${
          dragging ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105 active:scale-95'
        }`}
      >
        {open ? (
          <X size={22} className="text-plum-950" />
        ) : (
          <>
            {/* The kolam, not a generic speech bubble — this is the one piece of
                app chrome that floats over every screen, so it is worth it being
                recognisably Sambramo rather than the same circle every site has.
                The message glyph rides the corner to say what it does.

                `solid` because the mark's monoline centre closes up below ~24px;
                the knockout is painted the disc's own saffron so it reads as a
                hole in the mark rather than a white dot on it. */}
            <span style={{ '--sambramo-knockout': '#fbbf24' }} className="flex items-center justify-center">
              <SambramoMark size={26} variant="solid" title="" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-plum-900 ring-2 ring-white">
              <MessageCircle size={11} className="text-saffron-300" strokeWidth={2.8} />
            </span>
            <span aria-hidden="true" className="absolute -left-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-forest-500 animate-pulse-ring" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-forest-600 ring-2 ring-white" />
            </span>
          </>
        )}
      </button>

      {/* Dismiss. Appears on hover, and on touch after a long press — a
          permanently visible × on a 56px bubble is a second target inside the
          first, and on a phone the two are one thumb wide. */}
      {showClose && !open && (
        <button
          type="button"
          data-chat-close
          onClick={hide}
          aria-label="Hide the assistant for now"
          className="animate-pop-in absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-plum-950 text-white shadow-lg ring-2 ring-white"
        >
          <X size={12} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

/**
 * The steps, always visible.
 *
 * Done = green with a tick that springs in. Current = plum, ringed, label
 * bold. Ahead = grey. A done step can be tapped to go back to it; a step
 * ahead cannot, because skipping forward is how half-answered listings
 * reach review.
 *
 * Up to seven fit across a phone. Beyond that the rail scrolls sideways,
 * keeps the current step centred, and a thin bar underneath says how far
 * through the whole journey the partner is.
 */
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

export default function StepRail({ steps, current, done, onJump }) {
  const idx = steps.findIndex(s => s.id === current)
  const scrolls = steps.length > 7
  const scroller = useRef(null)
  const curRef = useRef(null)
  const doneCount = steps.filter(s => done.has(s.id)).length
  const pct = Math.round((doneCount / steps.length) * 100)

  useEffect(() => {
    if (!scrolls || !scroller.current || !curRef.current) return
    const s = scroller.current, c = curRef.current
    s.scrollTo({ left: c.offsetLeft - s.clientWidth / 2 + c.clientWidth / 2, behavior: 'smooth' })
  }, [current, scrolls])

  const itemW = scrolls ? 58 : null
  const lineFill = steps.length > 1 ? (lastDoneIndex(steps, done) / (steps.length - 1)) * 100 : 0

  return (
    <div>
      <div ref={scroller} className={scrolls ? '-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''}>
        <div className="relative" style={scrolls ? { width: itemW * steps.length } : undefined}>
          <div className="absolute top-[15px] h-[3px] rounded-full bg-ink/[0.08]"
            style={{ left: scrolls ? itemW / 2 : 20, right: scrolls ? itemW / 2 : 20 }}>
            <motion.div className="h-full rounded-full bg-forest-500" animate={{ width: `${lineFill}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
          </div>
          <ol className={`relative flex ${scrolls ? '' : 'justify-between px-1'}`}>
            {steps.map((s, i) => {
              const isDone = done.has(s.id) && s.id !== current
              const isCur = s.id === current
              const can = done.has(s.id) || i <= idx
              return (
                <li key={s.id} ref={isCur ? curRef : null} className="flex flex-col items-center" style={{ width: itemW ?? 40 }}>
                  <button type="button" disabled={!can} onClick={() => can && onJump(s.id)}
                    aria-current={isCur ? 'step' : undefined} aria-label={`${s.label}${isDone ? ', done' : ''}`}
                    className="relative flex h-[32px] w-[32px] items-center justify-center">
                    {isCur && (
                      <motion.span layoutId="rail-ring" className="absolute inset-0 rounded-full ring-[3px] ring-plum-200"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                    )}
                    <motion.span animate={{ scale: isCur ? 1 : 0.86 }}
                      className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-extrabold transition-colors ${
                        isDone ? 'bg-forest-600 text-white' : isCur ? 'bg-plum-700 text-white' : 'bg-white text-ink/40 ring-2 ring-ink/10'
                      }`}>
                      {isDone
                        ? <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 600, damping: 18 }}><Check size={14} strokeWidth={3.5} /></motion.span>
                        : i + 1}
                    </motion.span>
                  </button>
                  <span className={`mt-1 whitespace-nowrap text-[9.5px] leading-none ${
                    isCur ? 'font-extrabold text-plum-700' : isDone ? 'font-bold text-forest-700' : 'font-semibold text-ink/40'
                  }`}>{s.short}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      {scrolls && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-forest-500 to-emerald-400"
              animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 160, damping: 28 }} />
          </div>
          <span className="text-[10.5px] font-extrabold text-ink/50">{doneCount}/{steps.length} done</span>
        </div>
      )}
    </div>
  )
}

function lastDoneIndex(steps, done) {
  let last = 0
  steps.forEach((s, i) => { if (done.has(s.id)) last = i })
  return last
}

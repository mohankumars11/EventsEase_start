/**
 * The seven steps, always visible.
 *
 * Done = green with a tick that springs in. Current = plum, ringed, label
 * bold. Ahead = grey. A done step can be tapped to go back to it; a step
 * ahead cannot, because skipping forward is how half-answered listings
 * reach review. The connecting line fills as steps complete.
 */
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

export default function StepRail({ steps, current, done, onJump }) {
  const idx = steps.findIndex(s => s.id === current)
  const fill = steps.length > 1 ? (Math.max(0, done.size === 0 ? 0 : lastDoneIndex(steps, done)) / (steps.length - 1)) * 100 : 0
  return (
    <div className="relative px-1">
      <div className="absolute left-[calc(1.25rem)] right-[calc(1.25rem)] top-[15px] h-[3px] rounded-full bg-ink/[0.08]">
        <motion.div className="h-full rounded-full bg-forest-500" animate={{ width: `${fill}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
      </div>
      <ol className="relative flex justify-between">
        {steps.map((s, i) => {
          const isDone = done.has(s.id) && s.id !== current
          const isCur = s.id === current
          const can = done.has(s.id) || i <= idx
          return (
            <li key={s.id} className="flex w-10 flex-col items-center">
              <button type="button" disabled={!can} onClick={() => can && onJump(s.id)}
                aria-current={isCur ? 'step' : undefined} aria-label={`${s.label}${isDone ? ', done' : ''}`}
                className="relative flex h-[32px] w-[32px] items-center justify-center">
                {isCur && (
                  <motion.span layoutId="rail-ring" className="absolute inset-0 rounded-full ring-[3px] ring-plum-200"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <motion.span
                  animate={{ scale: isCur ? 1 : 0.86 }}
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
  )
}

function lastDoneIndex(steps, done) {
  let last = 0
  steps.forEach((s, i) => { if (done.has(s.id)) last = i })
  return last
}

import { SERVICE_PACKS, PACK_BY_ID, defaultPackQty } from '../../data/servicePacks'
import { StepFrame } from './JourneyChrome'
import OptionCard from './OptionCard'

/**
 * One chapter, on its own screen.
 *
 * Two shapes, one component, because from the customer's side they are the
 * same act — read a question, pick an answer:
 *
 *   'choice'    a question about the celebration. Books nothing, and changes
 *               which chapters come next. "Whose birthday is it?"
 *   'service'   one service, with its real packages from servicePacks.js.
 *
 * ── The single-select auto-advance ──────────────────────────────────────
 * Tapping an answer on a single-select chapter moves the flow on by itself,
 * after a beat long enough to see the tick land. That beat is the whole
 * design: no beat and the screen appears to jump out from under the thumb;
 * no auto-advance and every chapter costs two taps, which across a
 * twenty-nine-chapter wedding is twenty-nine taps spent confirming something
 * the customer already said.
 *
 * Multi-select chapters never auto-advance — the customer is still choosing —
 * and neither does anything with a quantity stepper on screen, because
 * advancing out from under somebody adjusting a number is the most
 * frustrating thing an app can do.
 */
export default function ChapterStep({ chapter, value, onChange, guestCount, circleId }) {
  if (chapter.kind === 'choice') {
    return <ChoiceChapter chapter={chapter} value={value} onChange={onChange} />
  }
  return (
    <ServiceChapter
      chapter={chapter}
      value={value}
      onChange={onChange}
      guestCount={guestCount}
      circleId={circleId}
    />
  )
}

function ChoiceChapter({ chapter, value, onChange }) {
  const multi = !!chapter.multi
  const picked = multi
    ? (Array.isArray(value) ? value : [])
    : (value ? [value] : [])

  function toggle(id) {
    if (!multi) return onChange(id)
    onChange(picked.includes(id) ? picked.filter(p => p !== id) : [...picked, id])
  }

  return (
    <StepFrame
      overline={chapter.title}
      question={chapter.question}
      why={chapter.why}
      footnote={multi ? 'Choose as many as apply.' : null}
    >
      <div className="space-y-2.5">
        {chapter.options.map(option => (
          <OptionCard
            key={option.id}
            emoji={option.emoji}
            name={option.name}
            desc={option.desc}
            note={option.note}
            multi={multi}
            selected={picked.includes(option.id)}
            onToggle={() => toggle(option.id)}
          />
        ))}
      </div>
    </StepFrame>
  )
}

function ServiceChapter({ chapter, value, onChange, guestCount, circleId }) {
  const shelf = SERVICE_PACKS[chapter.serviceId]
  const packs = (chapter.packIds ?? [])
    .map(id => PACK_BY_ID[id])
    .filter(Boolean)

  const selection = value ?? { packIds: [], qty: {}, skipped: false }
  const picked = selection.packIds ?? []
  const recommended = chapter.recommend?.[circleId] ?? null
  const multi = !!chapter.multi

  function toggle(packId) {
    const already = picked.includes(packId)
    const nextIds = multi
      ? (already ? picked.filter(p => p !== packId) : [...picked, packId])
      : (already ? [] : [packId])

    // Quantities follow the packs. Leaving a stale qty behind for a pack
    // nobody has chosen is a number that silently reappears if they change
    // their mind, which reads as the app remembering something they undid.
    const qty = { ...(selection.qty ?? {}) }
    if (!nextIds.includes(packId)) delete qty[packId]
    else if (qty[packId] == null) qty[packId] = defaultPackQty(PACK_BY_ID[packId], guestCount)

    onChange({ packIds: nextIds, qty, skipped: false })
  }

  function setQty(packId, n) {
    onChange({ ...selection, qty: { ...(selection.qty ?? {}), [packId]: n }, skipped: false })
  }

  return (
    <StepFrame
      overline={chapter.title}
      question={chapter.question}
      why={chapter.why}
      footnote={shelf?.unitHint}
    >
      {shelf?.blurb && (
        <p className="mb-4 rounded-2xl bg-surface-sunk/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          {shelf.blurb}
        </p>
      )}

      <div className="space-y-2.5">
        {packs.map(pack => {
          const isPicked = picked.includes(pack.id)
          return (
            <OptionCard
              key={pack.id}
              emoji={pack.emoji}
              name={pack.name}
              desc={pack.blurb}
              includes={pack.includes}
              note={pack.note}
              multi={multi}
              selected={isPicked}
              recommended={pack.id === recommended && !picked.length}
              onToggle={() => toggle(pack.id)}
              qty={selection.qty?.[pack.id] ?? defaultPackQty(pack, guestCount)}
              qtyLabel={pack.unit === 'unit' ? `${pack.unitLabel ?? 'unit'}s` : null}
              onQty={pack.unit === 'unit' ? n => setQty(pack.id, n) : null}
            />
          )
        })}
      </div>

      {multi && packs.length > 1 && (
        <p className="mt-3 text-center text-[11.5px] text-ink-mute">
          You can choose more than one here.
        </p>
      )}
    </StepFrame>
  )
}

/**
 * Should this chapter move the flow on the moment an answer is tapped?
 *
 * Kept beside the component rather than inside it because the page owns the
 * flow and the timer. A chapter with a quantity stepper is excluded even when
 * it is single-select — see the note at the top.
 */
export function autoAdvances(chapter) {
  if (!chapter || chapter.multi) return false
  if (chapter.kind === 'choice') return true
  const packs = (chapter.packIds ?? []).map(id => PACK_BY_ID[id]).filter(Boolean)
  return !packs.some(p => p.unit === 'unit')
}

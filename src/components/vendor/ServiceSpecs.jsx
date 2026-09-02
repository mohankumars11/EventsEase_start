import { useState } from 'react'
import { Check, Loader2, Sparkles, ChevronDown } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { specsForTrade, specProgress } from '../../data/partnerSpecs'

/**
 * The questions that decide which jobs reach a partner.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PICKED, NEVER TYPED — AND THIS IS THE SECOND TIME
 * ══════════════════════════════════════════════════════════════════════
 *
 * `AddFromCatalogue` already replaced the free-text service name, because
 * a real partner on this platform has a row reading "videpgraphy" that
 * has never been offered a single job. This is the same rule applied one
 * level deeper: a caterer typing "south indian bhramin" would be just as
 * invisible to a search for `south_brahmin`, and just as un-told.
 *
 * Every answer here is a choice id from data/partnerSpecs.js. Nothing on
 * this screen accepts free text, which also means nothing on it can be
 * misspelt.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY IT IS FOLDED SHUT
 * ══════════════════════════════════════════════════════════════════════
 *
 * A caterer has four groups and thirty-odd boxes. Opened by default, on
 * every service row, the listing tab becomes a form rather than a list —
 * and this is a screen partners open to check a price, not to fill in a
 * profile.
 *
 * So it is one line saying how much is answered, and it opens when
 * somebody wants it. The count is the honest prompt: "2 of 4 answered"
 * asks for the other two without a red badge or a nag.
 */

export default function ServiceSpecs({ trade, value, onSave }) {
  const groups = specsForTrade(trade)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value ?? {})
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  /* A trade with nothing to ask renders nothing at all, rather than an
     empty panel headed "Details". */
  if (!groups.length) return null

  const progress = specProgress(trade, value)
  const answered = progress?.done ?? 0

  function toggle(group, choiceId) {
    setDraft(d => {
      if (group.type === 'one') {
        /* Tapping the chosen one again clears it. Without that there is
           no way back to "not saying", and a mis-tap on a radio becomes
           permanent — which is how a pure-veg kitchen ends up
           permanently marked as serving both. */
        return { ...d, [group.id]: d[group.id] === choiceId ? undefined : choiceId }
      }
      const cur = Array.isArray(d[group.id]) ? d[group.id] : []
      return {
        ...d,
        [group.id]: cur.includes(choiceId)
          ? cur.filter(x => x !== choiceId)
          : [...cur, choiceId],
      }
    })
  }

  async function save() {
    setBusy(true)
    try {
      /* Strip the empties. An `undefined` from clearing a radio would be
         dropped by JSON.stringify anyway, but an empty array would be
         stored and then read back as "answered with nothing" — which is
         what `specProgress` counts, so it would report a group done that
         a partner has not answered. */
      const clean = {}
      for (const [k, v] of Object.entries(draft)) {
        if (v == null) continue
        if (Array.isArray(v) && !v.length) continue
        clean[k] = v
      }
      await onSave(clean)
      setOpen(false)
      toast.success('Saved. This is what we match you on.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 overflow-hidden rounded-2xl bg-ink/[0.02] ring-1 ring-ink/[0.05]">
      <button
        type="button"
        onClick={() => { setDraft(value ?? {}); setOpen(o => !o) }}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <Sparkles size={14} className={answered ? 'text-forest-600' : 'text-saffron-700'} />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-extrabold text-ink">
            {answered === progress.total
              ? 'What you do — all answered'
              : `What you do — ${answered} of ${progress.total} answered`}
          </span>
          {!answered && (
            <span className="block text-[11.5px] leading-snug text-ink-soft">
              This is what decides which jobs reach you.
            </span>
          )}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-ink/[0.06] bg-white p-3.5">
          {groups.map(g => (
            <div key={g.id}>
              <p className="text-[13px] font-extrabold leading-tight text-ink">{g.question}</p>
              {g.hint && (
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{g.hint}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.choices.map(c => {
                  const cur = draft[g.id]
                  const on = g.type === 'one'
                    ? cur === c.id
                    : Array.isArray(cur) && cur.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(g, c.id)}
                      aria-pressed={on}
                      className={`rounded-full px-3 py-1.5 text-left text-[12.5px] font-bold transition ${
                        on
                          ? 'bg-plum-950 text-white'
                          : 'bg-white text-ink-soft ring-1 ring-ink/[0.10]'
                      }`}
                    >
                      {c.label}
                      {/* The clarifier only when it is chosen, so the
                          unpicked rail stays scannable. */}
                      {on && c.scan && (
                        <span className="ml-1.5 font-semibold opacity-70">{c.scan}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-2.5 text-[13px] font-extrabold text-plum-950 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save
          </button>
        </div>
      )}
    </div>
  )
}

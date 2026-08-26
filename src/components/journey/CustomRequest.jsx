import { useState } from 'react'
import { Check, PencilLine } from 'lucide-react'

/**
 * "Not on this list?"
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY EVERY CHOICE SCREEN NEEDS ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every service screen in this flow offers three or four packages, and they
 * are good packages, and they are not everything. A family that wants a
 * specific thing — the photographer their cousin used, a nadaswaram troupe
 * from their own village, a cake copied from a photograph, mutton done the
 * way their grandmother did it — currently has two options: pick something
 * near enough, or leave.
 *
 * Both are bad, and the second is worse in a way that is invisible: an
 * abandoned journey tells a coordinator nothing. "We want the same halwai
 * who did my brother's wedding" tells them everything, and it is a booking.
 *
 * ── Why it is closed by default ─────────────────────────────────────────
 * Because an open text box on every screen turns a flow of choices into a
 * flow of homework. Most people want one of the packages, and for them this
 * has to be a line they can ignore. It opens on a tap for the person who
 * needs it, which is the minority who would otherwise have left.
 *
 * ── Why the note travels with the CHAPTER ───────────────────────────────
 * Not into one big "anything else" box at the end. A sentence about the cake
 * belongs beside the cake, so the coordinator sourcing the cake reads it
 * without hunting — and so the customer can see, at the reveal, that the
 * thing they asked for was recorded.
 */
export default function CustomRequest({ value, onChange, placeholder, label }) {
  const note = value ?? ''
  const [open, setOpen] = useState(!!note)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12.5px] font-bold text-plum-700 ring-1 ring-hairline/12 transition-colors hover:bg-plum-50"
      >
        <PencilLine size={14} />
        {label ?? 'Not on this list? Tell us what you want'}
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-[20px] bg-surface-sunk/[0.04] p-4 ring-1 ring-hairline/[0.1]">
      <label className="flex items-center gap-2 text-[12.5px] font-extrabold text-ink">
        <PencilLine size={14} className="text-plum-600" />
        {label ?? 'Tell us what you want instead'}
      </label>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">
        In your own words. A name, a shop, a photograph you have seen, a family recipe — anything
        we should source rather than choose for you.
      </p>
      <textarea
        rows={3}
        value={note}
        onChange={e => onChange(e.target.value.slice(0, 500))}
        placeholder={placeholder ?? 'e.g. the same halwai who did my brother’s wedding in Mysuru'}
        className="mt-2.5 w-full resize-none rounded-2xl border-2 border-hairline/15 bg-white px-3.5 py-2.5 text-[13.5px] text-ink focus:border-saffron-400 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700">
          {note.trim() && <><Check size={11} strokeWidth={3} /> Saved with your plan</>}
        </span>
        <span className="text-[11px] text-ink-mute">{note.length}/500</span>
      </div>

      {/* Honest about the one thing this box cannot do yet. A customer who
          has a photograph in their hand needs to be told where to send it,
          not left guessing whether a paperclip icon is missing. */}
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">
        Have a photograph of what you mean? Send it to your coordinator on WhatsApp once they
        call — they will attach it to this request.
      </p>
    </div>
  )
}

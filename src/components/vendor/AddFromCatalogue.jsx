import { useMemo, useState } from 'react'
import { Search, Check, X, Loader2, Plus } from 'lucide-react'
import { TRADES, offeringsForTrade, allOfferings } from '../../data/partnerCatalogue'

/**
 * Pick what you do. Do not type it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS REPLACED A TEXT BOX
 * ══════════════════════════════════════════════════════════════════════
 *
 * A real partner on this platform has a service row reading
 * "videpgraphy". One transposed letter, and that row has never been
 * offered a single job — `match_partners` joins on the trade, and a
 * free-typed name could not be matched to one. Nobody told them, and
 * nothing could: the app had no idea what a service was meant to be
 * called, so it could not tell a typo from a speciality.
 *
 * Everything here comes from the customer's own catalogue
 * (data/partnerCatalogue.js), so a partner can only claim work a
 * customer can actually book, and the trade is derived rather than
 * chosen. A row that cannot be matched can no longer be created.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BUILT FOR SOMEBODY WITH FOUR MINUTES AND ONE THUMB
 * ══════════════════════════════════════════════════════════════════════
 *
 * Search first, because a decorator who knows they do mandaps should not
 * have to guess which of seventeen trades we filed it under. Trades
 * second, for browsing. Multi-select throughout: setting up a listing is
 * one sitting, and making somebody repeat a four-step flow per service
 * is how a listing ends up with one row in it.
 *
 * Prices are deliberately NOT asked here. The platform sets the customer
 * price from its own rate card — a partner's own number is used by
 * coordinators for pre-book quotes, and asking for seventeen of them
 * before anybody has been paid anything is how this screen gets
 * abandoned. It stays editable per row afterwards.
 */
export default function AddFromCatalogue({ existing = [], onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [trade, setTrade] = useState(null)
  const [picked, setPicked] = useState(() => new Set())
  const [saving, setSaving] = useState(false)

  // Already-listed names, so nothing offers a duplicate.
  const have = useMemo(
    () => new Set((existing ?? []).map(s => String(s.name ?? '').trim().toLowerCase())),
    [existing])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term) {
      return allOfferings()
        .filter(o => o.name.toLowerCase().includes(term) || o.trade.toLowerCase().includes(term))
        .slice(0, 30)
    }
    if (!trade) return []
    return offeringsForTrade(trade).map(o => ({ ...o, trade }))
  }, [q, trade])

  const toggle = key => setPicked(p => {
    const n = new Set(p)
    n.has(key) ? n.delete(key) : n.add(key)
    return n
  })

  async function save() {
    setSaving(true)
    /* One row per ticked offering. The variants a partner ticked ride in
       the description, because they describe HOW they do the thing
       rather than being separate things — and `category` is the trade
       the catalogue already knows, never anything typed. */
    for (const key of picked) {
      const [name, tradeName, variants] = JSON.parse(key)
      await onAdd({
        name,
        category: tradeName,
        description: variants.length ? variants.join(' · ') : null,
        price: null,
        is_active: true,
      })
    }
    setSaving(false)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-ink/[0.08] px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 p-1">
          <X size={20} className="text-ink-mute" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight text-ink">What do you do?</p>
          <p className="text-[12px] font-semibold text-ink-mute">
            Tick everything. You can change it later.
          </p>
        </div>
      </header>

      <div className="border-b border-ink/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-ink/[0.04] px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-ink-mute" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setTrade(null) }}
            placeholder="Search — mandap, candid, dhol…"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:text-ink-mute"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-3">
        {/* Trades, when nobody is searching. */}
        {!q.trim() && !trade && (
          <ul className="grid grid-cols-2 gap-2">
            {TRADES.map(t => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setTrade(t)}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink/[0.07] active:scale-[0.99]"
                >
                  <span className="text-[13.5px] font-extrabold leading-snug text-ink">{t}</span>
                  <Plus size={15} className="shrink-0 text-saffron-700" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {trade && !q.trim() && (
          <button
            type="button"
            onClick={() => setTrade(null)}
            className="mb-3 text-[12.5px] font-extrabold text-saffron-800"
          >
            ← All work types
          </button>
        )}

        <ul className="space-y-2">
          {results.map(o => {
            const already = have.has(o.name.toLowerCase())
            const variantLabels = o.variants.map(v => v.label)
            const key = JSON.stringify([o.name, o.trade, variantLabels])
            const on = picked.has(key)

            return (
              <li key={o.serviceId + o.trade}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => toggle(key)}
                  className={`flex w-full items-start gap-3 rounded-[20px] p-4 text-left transition ${
                    already ? 'bg-ink/[0.02] opacity-55'
                      : on ? 'bg-saffron-400/15 ring-2 ring-saffron-400'
                      : 'bg-white ring-1 ring-ink/[0.07]'
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                    on ? 'bg-saffron-500 text-plum-950' : 'ring-1 ring-ink/20'
                  }`}>
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-extrabold leading-snug text-ink">
                      {o.name}
                    </span>
                    <span className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-mute">
                      {o.trade}
                    </span>
                    {/* What a customer can actually ask for inside this
                        service. Shown so a partner recognises the work in
                        their own words rather than a category name. */}
                    {variantLabels.length > 0 && (
                      <span className="mt-1 block text-[12px] leading-snug text-ink-soft">
                        {variantLabels.join(' · ')}
                      </span>
                    )}
                    {already && (
                      <span className="mt-1 block text-[11.5px] font-bold text-ink-mute">
                        Already on your listing
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {q.trim() && results.length === 0 && (
          <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-mute">
            Nothing matches “{q.trim()}”.<br />
            If you do something that is not here, tell us and we will add it —
            it has to exist for customers before you can be matched to it.
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink/[0.08] bg-white px-4 py-3.5">
        <button
          type="button"
          onClick={save}
          disabled={picked.size === 0 || saving}
          className="w-full rounded-full bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:bg-ink/[0.08] disabled:text-ink-mute"
        >
          {saving
            ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Adding…</span>
            : picked.size === 0
              ? 'Pick what you do'
              : `Add ${picked.size} to my listing`}
        </button>
      </div>
    </div>
  )
}

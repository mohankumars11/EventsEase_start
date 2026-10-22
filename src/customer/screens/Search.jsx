/**
 * One box for 438 occasions and 34 services. Matches whole words first,
 * then prefixes, then anywhere — "pho" finds Photography before it finds
 * "Photography Exhibition", and "haldi" finds the ceremony immediately.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Search as SearchIcon, X } from 'lucide-react'
import { OCCASIONS, occasionLine } from '../data/occasions'
import { TRADES } from '../data/trades'
import { photoFor } from '../data/photos.generated'
import { Photo } from '../ui/kit'

const POPULAR = ['Wedding reception', 'Haldi', 'Birthday', 'Housewarming', 'Photographer', 'Catering', 'Mehendi', 'Annual day', 'Product launch', 'Naming ceremony']
const norm = s => s.toLowerCase().normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ')
const ALIAS = { photographer: 'photography', caterer: 'catering', cook: 'catering', makeup: 'makeup', decorator: 'decor', dj: 'dj', pandit: 'priest', poojari: 'priest', car: 'transport', bus: 'transport', cake: 'cake', mc: 'anchor', host: 'anchor' }

function score(text, q) {
  const t = norm(text), words = t.split(/\s+/)
  if (words.includes(q)) return 3
  if (words.some(w => w.startsWith(q))) return 2
  return t.includes(q) ? 1 : 0
}

export default function Search() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const query = norm(q).trim()
  const key = ALIAS[query] ?? query
  const res = useMemo(() => {
    if (key.length < 2) return null
    const trades = TRADES.map(t => ({ t, s: Math.max(score(t.label, key), score(t.name, key)) })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 6)
    const occ = OCCASIONS.map(o => {
      const n = score(o.name, key)
      return { o, s: n ? n * 2 + (o.featured ? 1 : 0) : score(o.categoryLabel, key) * 0.5 }
    }).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 24)
    return { trades, occ }
  }, [key])

  return (
    <main className="cx-enter min-h-[100dvh] pb-10">
      <header className="cx-safe-top sticky top-0 z-[120] bg-white/95 px-3 pb-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cx-press cx-btn grid h-11 w-11 shrink-0 place-items-center rounded-full"><ArrowLeft size={20} /></button>
          <label className="flex h-12 flex-1 items-center gap-2.5 rounded-[16px] bg-[var(--soft)] px-3.5 ring-2 ring-[#6A2BD9]/25">
            <SearchIcon size={19} className="text-[var(--brand)]" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Occasion or service" enterKeyHint="search"
              className="h-full flex-1 bg-transparent text-[15px] font-bold outline-none placeholder:text-[var(--ink-3)]" data-search-input />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" className="grid h-7 w-7 place-items-center rounded-full bg-white"><X size={14} /></button>}
          </label>
        </div>
      </header>

      {!res && (
        <section className="px-4 pt-2">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">People search for</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR.map(p => <button key={p} type="button" onClick={() => setQ(p)} className="cx-press cx-btn rounded-full px-3.5 py-2 text-[13px] font-bold">{p}</button>)}
          </div>
        </section>
      )}

      {res && !res.trades.length && !res.occ.length && (
        <p className="px-5 pt-8 text-center text-[14px] font-semibold text-[var(--ink-2)]">Nothing matches “{q}”. Try the occasion’s name, or a service like “photographer”.</p>
      )}

      {res?.trades.length > 0 && (
        <section className="pt-2">
          <p className="px-4 pb-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Services</p>
          <div className="cx-rail cx-noscroll">
            {res.trades.map(({ t }) => {
              const p = photoFor(`trade:${t.id}`)
              return (
                <Link key={t.id} to={`/s/${t.id}`} className="cx-tile cx-scrim cx-press block aspect-square w-[34%] max-w-[150px]">
                  <Photo src={p?.url} />
                  <p className="absolute inset-x-0 bottom-0 p-2.5 text-[12.5px] font-extrabold leading-tight text-white">{t.label}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {res?.occ.length > 0 && (
        <section>
          <p className="px-4 pb-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Occasions</p>
          <ul className="mx-4 overflow-hidden rounded-[22px] shadow-[0_0_0_1px_var(--line)]">
            {res.occ.map(({ o }, i) => {
              const p = photoFor(o.id) ?? photoFor(`trade:${o.must[0]}`)
              return (
                <li key={o.id} className={i ? 'border-t border-[var(--line)]' : ''}>
                  <Link to={`/o/${o.id}`} className="cx-press flex items-center gap-3 bg-white px-3 py-2.5 active:bg-[var(--soft)]">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-[var(--soft)]"><Photo src={p?.url} className="absolute inset-0 h-full w-full object-cover" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold">{o.name}</span>
                      <span className="block truncate text-[12px] font-semibold text-[var(--ink-3)]">{o.categoryLabel} · {occasionLine(o)}</span>
                    </span>
                    <ChevronRight size={17} className="text-[var(--ink-3)]" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}

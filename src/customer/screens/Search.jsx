/**
 * Search — never an empty screen.
 *
 * Before a word is typed it is already the whole catalogue: first the
 * question that decides everything after it — a celebration, or one
 * service? — then, for celebrations, every category as a chip and that
 * category's occasions as cards (Trending first: the ones families book
 * most); for services, all 34 in their groups. The box itself keeps
 * suggesting real things ("Search “Haldi Ceremony”"), the way Swiggy's
 * does, so the cursor is never blinking at nothing.
 *
 * Typing searches both, best first: whole words, then prefixes, then
 * anywhere — "pho" finds Photography before Photography Exhibition —
 * with the side the customer chose shown first.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Headset, LayoutGrid, MailOpen, Mic, PartyPopper, RotateCcw, Search as SearchIcon, ShieldCheck, Sparkles, Users, Wallet, X } from 'lucide-react'
import { usePlan } from '../state/PlanContext'
import { listen, canListen } from '../lib/voice'
import { CATEGORIES, CATEGORY, FEATURED, OCCASIONS } from '../data/occasions'
import { TRADES, TRADE_GROUPS } from '../data/trades'
import { OccasionCard, ServiceCard } from '../ui/art'
import { Segmented } from '../ui/kit'

const norm = s => s.toLowerCase().normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ')
const ALIAS = { photographer: 'photography', caterer: 'catering', cook: 'catering', decorator: 'decor', pandit: 'priest', poojari: 'priest', car: 'transport', bus: 'transport', mc: 'anchor', host: 'anchor', makeup: 'makeup', mehndi: 'mehendi', marriage: 'wedding', bday: 'birthday' }

function score(text, q) {
  const t = norm(text), words = t.split(/\s+/)
  if (words.includes(q)) return 3
  if (words.some(w => w.startsWith(q))) return 2
  return t.includes(q) ? 1 : 0
}

export default function Search() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const plan = usePlan()
  const [hearing, setHearing] = useState(false)
  const voice = async () => { setHearing(true); const said = await listen().catch(() => null); setHearing(false); if (said) setQ(said) }
  const [mode, setMode] = useState(() => { try { return sessionStorage.getItem('sbm.cx.door') === 'services' ? 'services' : 'occasions' } catch { return 'occasions' } })
  const [cat, setCat] = useState('trending')
  const chips = useRef(null)
  const query = norm(q).trim()
  const key = ALIAS[query] ?? query

  const res = useMemo(() => {
    if (key.length < 2) return null
    const trades = TRADES.map(t => ({ t, s: Math.max(score(t.label, key), score(t.name, key), score(t.why, key) * 0.4) })).filter(x => x.s).sort((a, b) => b.s - a.s)
    const occ = OCCASIONS.map(o => {
      const n = score(o.name, key)
      return { o, s: n ? n * 2 + (o.featured ? 1 : 0) : score(o.categoryShort, key) * 0.6 }
    }).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 60)
    return { trades: trades.map(x => x.t.id), occ: occ.map(x => x.o) }
  }, [key])

  const list = cat === 'trending' ? FEATURED : CATEGORY[cat].occasions
  useEffect(() => { chips.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }, [cat])
  const hint = useHint()

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
      <header className="cx-safe-top sticky top-0 z-[120] bg-white/95 px-3 pb-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cx-press cx-btn grid h-11 w-11 shrink-0 place-items-center rounded-full"><ArrowLeft size={20} /></button>
          <label className="flex h-[50px] flex-1 items-center gap-3 rounded-[14px] bg-white pl-3.5 pr-1 shadow-[0_0_0_1px_#E7E2EE,0_6px_16px_-10px_rgba(20,15,31,.35)]">
            <SearchIcon size={20} className="shrink-0 text-[var(--ink)]" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={hearing ? 'Listening…' : `Search “${hint}”`} enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--ink)] outline-none placeholder:font-medium placeholder:text-[#8E889C]" data-search-input />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" className="grid h-8 w-8 place-items-center rounded-full text-[var(--ink-3)]"><X size={17} /></button>}
            {canListen() && <><span className="h-6 w-px bg-[#E7E2EE]" /><button type="button" onClick={voice} aria-label="Search by voice" className={'grid h-10 w-10 place-items-center rounded-full ' + (hearing ? 'animate-pulse text-[var(--brand)]' : 'text-[var(--ink)]')} data-mic><Mic size={20} /></button></>}
          </label>
        </div>
        <div className="mt-3 px-1">
          <Segmented value={mode} onChange={setMode} options={[
            { value: 'occasions', label: 'A celebration', icon: PartyPopper },
            { value: 'services', label: 'One service', icon: LayoutGrid },
          ]} />
        </div>
      </header>

      {!res && (
        <section className="grid grid-cols-4 gap-2 px-3 pb-4" aria-label="Shortcuts" data-hub>
          {[
            [PartyPopper, 'Book a celebration', '/explore#celebrations', '#7C3AED', '#F3ECFF'],
            [LayoutGrid, 'Book a service', '/s', '#2563EB', '#EAF1FF'],
            [CalendarDays, 'My bookings', '/plans', '#0F9D58', '#E7F8EF'],
            [RotateCcw, plan.bookings.length ? 'Book again' : 'Saved masters', plan.bookings.length ? '/plans' : '/saved', '#EA580C', '#FFF1E6'],
            [Headset, 'Help', '/help', '#DB2777', '#FDEBF3'],
            [ShieldCheck, 'Cancellation', '/legal/cancellation', '#0F766E', '#E6F6F4'],
            [Users, 'Refer & earn', '/refer', '#7C3AED', '#F3ECFF'],
            [MailOpen, 'Invites & RSVP', '/invites', '#DB2777', '#FDECF4'],
            [Wallet, 'Wallet', '/wallet', '#0C831F', '#E9F8EF'],
          ].map(([I, t, to, c, bg]) => (
            <Link key={t} to={to} className="cx-press flex flex-col items-center gap-1.5 rounded-[18px] bg-white px-1 py-2.5 text-center shadow-[0_0_0_1px_#F0EBF7]">
              <span className="grid h-10 w-10 place-items-center rounded-[13px]" style={{ background: bg, color: c }}><I size={19} /></span>
              <span className="text-[10.5px] font-extrabold leading-tight text-[var(--ink-2)]">{t}</span>
            </Link>
          ))}
        </section>
      )}

      {!res && mode === 'occasions' && (
        <section className="cx-enter" key="o">
          <div ref={chips} className="cx-noscroll flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
            <Chip on={cat === 'trending'} onClick={() => setCat('trending')}><Sparkles size={13} className="text-[var(--gold)]" />Trending</Chip>
            {CATEGORIES.map(c => <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.short}</Chip>)}
          </div>
          <Head title={cat === 'trending' ? 'What families are booking' : CATEGORY[cat].short} sub={cat === 'trending' ? `${FEATURED.length} favourites, from ${OCCASIONS.length} occasions` : `${list.length} occasions · ${CATEGORY[cat].line}`} />
          <div className="grid grid-cols-3 gap-2 px-3" key={cat}>{list.map(o => <OccasionCard key={o.id} occasion={o} />)}</div>
        </section>
      )}

      {!res && mode === 'services' && (
        <section className="cx-enter" key="s">
          {TRADE_GROUPS.map((g, i) => (
            <div key={g.id} className={i ? 'mt-5' : 'pt-1'}>
              <Head title={g.label} />
              <div className="grid grid-cols-3 gap-2 px-3">{g.trades.map(t => <ServiceCard key={t.id} tradeId={t.id} />)}</div>
            </div>
          ))}
        </section>
      )}

      {res && !res.trades.length && !res.occ.length && (
        <div className="px-6 pt-10 text-center">
          <p className="text-[16px] font-extrabold">Nothing called “{q}” yet</p>
          <p className="mt-1.5 text-[13px] font-semibold text-[var(--ink-2)]">Try the occasion’s name — “housewarming”, “haldi” — or a service like “photographer”.</p>
        </div>
      )}

      {res && (mode === 'services' ? [['s', res.trades], ['o', res.occ]] : [['o', res.occ], ['s', res.trades]]).map(([kind, items]) => items.length > 0 && (
        <section key={kind} className="cx-enter pt-1">
          <Head title={kind === 'o' ? `Celebrations · ${items.length}` : `Services · ${items.length}`} />
          <div className="mb-5 grid grid-cols-3 gap-2 px-3">
            {kind === 'o' ? items.map(o => <OccasionCard key={o.id} occasion={o} />) : items.map(t => <ServiceCard key={t} tradeId={t} />)}
          </div>
        </section>
      ))}
    </main>
  )
}

function Head({ title, sub = null }) {
  return (
    <div className="px-4 pb-2.5">
      <h2 className="text-[16px] font-extrabold tracking-[-0.025em]">{title}</h2>
      {sub && <p className="truncate text-[11.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={'cx-press flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ' + (on ? 'bg-gradient-to-br from-[#F3ECFF] to-[#DCC8FF] text-[var(--am-ink)] shadow-[0_0_0_1.5px_#CDB4FF]' : 'bg-white text-[var(--ink-2)] shadow-[0_0_0_1px_#EEE6FA]')}>
      {children}
    </button>
  )
}

/* The placeholder names something real, and changes. */
function useHint() {
  const pool = useMemo(() => [...FEATURED.map(o => o.name), ...TRADES.map(t => t.label)].sort(() => Math.random() - 0.5), [])
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % pool.length), 2000); return () => clearInterval(t) }, [pool.length])
  return pool[i]
}

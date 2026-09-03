import { useMemo, useState } from 'react'
import {
  ArrowLeft, Check, ChevronRight, Loader2, Search, Send, X,
  UtensilsCrossed, Camera, Video, Flower2, Building2, Music, Sparkles,
  Brush, Hand, Tent, Printer, Truck, Lightbulb, CakeSlice, Mic,
  Speaker, ParkingSquare, Shield, Wine, HandHeart, Zap, HeartPulse,
  Flame, Gift, Package,
} from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { TRADES, offeringsForTrade } from '../../data/partnerCatalogue'
import { specsForTrade } from '../../data/partnerSpecs'
import { specsForServices } from '../../data/partnerServiceSpecs'
import { menusFor, FOOD_COUNTERS, CATERING_NOTES } from '../../data/cateringMenus'
import { ALL_DISH_GROUPS, TOTAL_DISHES } from '../../data/cateringDishes'
import { SERVICE_UNITS } from '../../config/vendor'
import MenuUpload from './MenuUpload'

/**
 * Adding what you do, as a journey rather than a form.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * The old picker was a flat list of 34 names and a price box. It worked,
 * in the sense that a determined person could get through it, and it
 * asked a caterer for exactly as much as it asked a balloon supplier:
 * a name, a number, and nothing about the business.
 *
 * A caterer's listing is not a name and a number. It is which cuisines
 * they cook, which menus they serve, what is on each of those menus, and
 * what a plate costs. Until this screen could hold that, the answer to
 * "what do you actually do" lived in a phone call.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE SHAPE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1  TRADE      what line of business — 24 cards, searchable
 *   2  OFFERINGS  what within it — multi-select
 *   3  DETAIL     the trade's own questions (cuisines, styles, kit)
 *   4  MENUS      catering: 12 real menu cards, every dish readable
 *   5  DISHES     catering: 479 dishes across 20 groups, à la carte
 *   6  PRICE      a floor price, or type your own
 *   7  REVIEW     what you are about to submit, then submit it
 *
 * Steps 3, 4 and 5 appear only when they have something to ask. A balloon
 * supplier goes trade → offering → price → review in four taps; a caterer
 * gets the seven they need. A flow that shows every screen to everybody
 * teaches people to tap Next without reading, which is how a form full of
 * defaults gets submitted.
 *
 * ── One question per screen ─────────────────────────────────────────
 * This is filled in on a phone, often outdoors, by somebody who has not
 * used the app before. Two questions on one screen means the second one
 * is answered wrong.
 */

/* An icon per trade. Not decoration: 24 identical cards of text is a wall
   somebody has to READ, and a picture is how you find your own trade in a
   list without reading all of it. */
const TRADE_ICON = {
  'Anchor & MC': Mic,
  'Bar & Beverages': Wine,
  'Bridal Makeup & Hair': Brush,
  'Cake & Desserts': CakeSlice,
  'Catering & Food': UtensilsCrossed,
  'DJ & Music': Music,
  'Decoration & Floral': Flower2,
  'Event Lighting': Lightbulb,
  'Gifts & Favours': Gift,
  'Guest Services': HandHeart,
  'Invitation & Printing': Printer,
  'Live Entertainment': Sparkles,
  'Mehendi Artist': Hand,
  'Photography': Camera,
  'Power & Cooling': Zap,
  'Priest & Rituals': Flame,
  'Safety & Facilities': HeartPulse,
  'Security Services': Shield,
  'Sound & AV': Speaker,
  'Tent & Furniture': Tent,
  'Transportation': Truck,
  'Valet Parking': ParkingSquare,
  'Venue': Building2,
  'Videography': Video,
}

const CATERING = 'Catering & Food'

export default function AddItemFlow({ existing = [], onAdd, onClose }) {
  const toast = useToast()
  const [step, setStep] = useState('trade')
  const [trade, setTrade] = useState(null)
  const [picked, setPicked] = useState([])     // offering serviceIds
  const [detail, setDetail] = useState({})     // spec answers
  const [menus, setMenus] = useState([])       // menu ids
  const [counters, setCounters] = useState([]) // counter ids
  const [dishes, setDishes] = useState([])     // a la carte dish names
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('per event')
  const [minOrder, setMinOrder] = useState('')
  const [uploads, setUploads] = useState([])
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  const offerings = useMemo(() => (trade ? offeringsForTrade(trade) : []), [trade])
  /* The questions for what they actually ticked, falling back to the
     trade's own.

     Reported exactly right: tapping "Welcome drinks" asked "Which
     cuisines can you cook?" and "Is your kitchen pure vegetarian?". So
     did "Sweets & mithai", and "Live food counters". Seven different
     businesses, one questionnaire, six of them answering something with
     nothing to do with what they sell -- which teaches a partner that
     the app does not know what they do and that the answers do not
     matter. Both were true. */
  const groups = useMemo(
    () => (trade ? specsForServices(picked, specsForTrade(trade)) : []),
    [trade, picked])
  const isCatering = trade === CATERING

  /* Menus follow the answers on the detail step. */
  const availableMenus = useMemo(() => {
    if (!isCatering) return []
    const cuisines = detail.cuisines ?? []
    if (!cuisines.length) return []
    /* Both facts, not one. A pure-veg Brahmin kitchen that serves only on
       the leaf sees four cards; the eight it does not see are eight fewer
       chances to tick something it cannot honour. */
    return menusFor({ cuisines, serves: detail.service ?? [], diet: detail.diet ?? null })
  }, [isCatering, detail.cuisines, detail.service])

  const alreadyHave = new Set(existing.map(s => s.name))
  const nameOf = id => offerings.find(o => o.serviceId === id)?.name ?? id

  /* The steps that actually exist for THIS trade. Computed rather than
     hardcoded, so Back and Next cannot walk into a screen with nothing
     on it. */
  const flow = useMemo(() => {
    const s = ['trade', 'offerings']
    if (groups.length) s.push('detail')
    if (isCatering) s.push('menus', 'dishes')
    s.push('price', 'review')
    return s
  }, [groups.length, isCatering])

  const idx = flow.indexOf(step)
  const goNext = () => setStep(flow[Math.min(idx + 1, flow.length - 1)])
  const goBack = () => (idx <= 0 ? onClose() : setStep(flow[idx - 1]))

  const canAdvance = {
    trade: !!trade,
    offerings: picked.length > 0,
    /* Not gated. Every spec question is optional -- a partner who cannot
       answer one today should not be blocked from listing at all, and an
       unanswered group shows as "2 of 4" on their listing afterwards. */
    detail: true,
    menus: true,
    dishes: true,
    price: true,
    review: true,
  }[step]

  async function submit() {
    setBusy(true)
    try {
      /* One vendor_services row per offering, all carrying the same
         specs. The trade is what dispatch matches on and it is written
         from TRADES rather than typed, so none of these rows can be the
         "videpgraphy" that never got a job. */
      const specs = { ...detail }
      if (menus.length) specs.menus = menus
      if (counters.length) specs.counters = counters
      if (dishes.length) specs.dishes = dishes
      if (minOrder && !/^\d+$/.test(minOrder)) specs.min_order_note = minOrder
      if (uploads.length) specs.uploads = uploads

      /* `picked` holds serviceIds; a vendor_services row stores the NAME.
         Writing the id here would put "welcome_drinks" on a partner's
         listing where "Welcome drinks" belongs -- and a coordinator
         reading a price list of snake_case ids would rightly assume the
         app was broken. */
      for (const id of picked) {
        await onAdd({
          name: nameOf(id),
          category: trade,
          description: null,
          price: price === '' ? null : Number(price),
          unit,
          /* A plain number becomes min_quantity, which coordinators and
             the quote engine already read. Anything else is a sentence
             and belongs with the other free text. */
          min_quantity: /^\d+$/.test(minOrder) ? Math.max(1, Number(minOrder)) : 1,
          lead_time_days: null,
          specs,
        })
      }
      toast.success(
        picked.length === 1
          ? 'Added. Our team checks it and turns it on.'
          : `${picked.length} added. Our team checks them and turns them on.`)
      onClose()
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-[#faf9f7]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-plum-950 px-4 pb-3 pt-4 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button" onClick={goBack} aria-label="Back"
            className="-ml-1 rounded-full p-1.5 text-white/80 hover:bg-white/10"
          >
            <ArrowLeft size={19} />
          </button>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold leading-tight">
              {STEP_TITLE[step]}
            </span>
            <span className="block text-[11.5px] text-white/60">
              {trade ?? 'Add what you do'}
            </span>
          </span>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded-full p-1.5 text-white/80 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress. Segments rather than a percentage: a partner should
            be able to see how many screens are left, and a bar at 43%
            does not answer that. */}
        <div className="mx-auto mt-3 flex max-w-2xl gap-1">
          {flow.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < idx ? 'bg-saffron-400' : i === idx ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-4 pb-32">

          {step === 'trade' && (
            <TradeStep
              q={q} setQ={setQ}
              value={trade}
              onPick={t => { setTrade(t); setPicked([]); setDetail({}); setMenus([]); goNext() }}
            />
          )}

          {step === 'offerings' && (
            <OfferingStep
              offerings={offerings}
              picked={picked}
              alreadyHave={alreadyHave}
              onToggle={name => setPicked(p =>
                p.includes(name) ? p.filter(x => x !== name) : [...p, name])}
            />
          )}

          {step === 'detail' && (
            <DetailStep groups={groups} value={detail} onChange={setDetail} />
          )}

          {step === 'menus' && (
            <MenuStep
              menus={availableMenus}
              chosen={menus}
              counters={counters}
              onToggleMenu={id => setMenus(m =>
                m.includes(id) ? m.filter(x => x !== id) : [...m, id])}
              onAllMenus={() => setMenus(
                menus.length === availableMenus.length ? [] : availableMenus.map(m => m.id))}
              onToggleCounter={id => setCounters(c =>
                c.includes(id) ? c.filter(x => x !== id) : [...c, id])}
              uploads={uploads}
              setUploads={setUploads}
            />
          )}

          {step === 'dishes' && (
            <DishStep chosen={dishes} onChange={setDishes} />
          )}

          {step === 'price' && (
            <PriceStep
              menus={availableMenus.filter(m => menus.includes(m.id))}
              price={price} setPrice={setPrice}
              unit={unit} setUnit={setUnit}
              isCatering={isCatering}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              trade={trade} picked={picked} detail={detail} groups={groups}
              menus={availableMenus.filter(m => menus.includes(m.id))}
              counters={FOOD_COUNTERS.filter(c => counters.includes(c.id))}
              dishes={dishes}
              price={price} unit={unit}
            />
          )}
        </div>
      </div>

      {/* ── The one action ─────────────────────────────────────────── */}
      {step !== 'trade' && (
        <div
          className="shrink-0 border-t border-ink/[0.08] bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              disabled={!canAdvance || busy}
              onClick={step === 'review' ? submit : goNext}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3.5 text-[15px] font-extrabold text-plum-950 transition active:scale-[0.99] disabled:opacity-40"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {step === 'review'
                ? <><Send size={16} /> Submit for review</>
                : <>Continue <ChevronRight size={16} /></>}
            </button>
            {step === 'offerings' && !picked.length && (
              <p className="mt-1.5 text-center text-[11.5px] text-ink-mute">
                Pick at least one to carry on.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const STEP_TITLE = {
  trade:     'What do you do?',
  offerings: 'Which of these?',
  detail:    'Tell us more',
  menus:     'Your menus',
  dishes:    'What can you cook?',
  price:     'What do you charge?',
  review:    'Check and submit',
}

/* ══════════════════════════════════════════════════════════════════ */

function TradeStep({ q, setQ, value, onPick }) {
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return TRADES
    /* Matches the trade AND the things inside it, so typing "biryani"
       or "generator" finds the right card without knowing our word for
       the trade. Somebody who runs a generator business does not think
       of themselves as "Power & Cooling". */
    return TRADES.filter(tr =>
      tr.toLowerCase().includes(t)
      || offeringsForTrade(tr).some(o => o.name.toLowerCase().includes(t)))
  }, [q])

  return (
    <>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search — catering, generator, mehendi…"
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-[14px] font-semibold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {list.map(t => {
          const Icon = TRADE_ICON[t] ?? Package
          const n = offeringsForTrade(t).length
          const on = value === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className={`flex flex-col items-start gap-2.5 rounded-[20px] p-3.5 text-left ring-1 transition active:scale-[0.98] ${
                on ? 'bg-saffron-400/15 ring-2 ring-saffron-400' : 'bg-white ring-ink/[0.06]'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-plum-950 text-white">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold leading-tight text-ink">{t}</span>
                <span className="block text-[11.5px] text-ink-mute">
                  {n} {n === 1 ? 'thing' : 'things'} you can list
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {!list.length && (
        <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
          Nothing matches “{q}”. Try a shorter word, or tell us what you do
          and we will add it.
        </p>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function OfferingStep({ offerings, picked, alreadyHave, onToggle }) {
  return (
    <>
      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        Tick everything you can do. Each one becomes a line on your listing
        and each one can be matched to a job.
      </p>
      <div className="space-y-2">
        {offerings.map(o => {
          /* `picked` holds serviceIds and `alreadyHave` holds names --
             the first is what the question sets are keyed on, the second
             is what a vendor_services row stores. Comparing the wrong one
             here shows no tick at all when a partner taps. */
          const on = picked.includes(o.serviceId)
          const have = alreadyHave.has(o.name)
          return (
            <button
              key={o.serviceId}
              type="button"
              disabled={have}
              onClick={() => onToggle(o.serviceId)}
              className={`flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left ring-1 transition active:scale-[0.99] ${
                have ? 'bg-ink/[0.03] ring-ink/[0.05] opacity-60'
                : on ? 'bg-saffron-400/15 ring-2 ring-saffron-400'
                     : 'bg-white ring-ink/[0.06]'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ${
                on ? 'bg-saffron-400 ring-saffron-400' : 'bg-white ring-ink/[0.18]'
              }`}>
                {on && <Check size={13} className="text-plum-950" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-ink">{o.name}</span>
                {have && <span className="block text-[11.5px] text-ink-mute">Already on your listing</span>}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function DetailStep({ groups, value, onChange }) {
  /* The functional updater, not a spread of `value`.
     `value` is the prop from the last render, so two taps inside one
     React batch both build on the SAME object and the second silently
     discards the first. Real taps usually get a re-render between them
     and survive by luck; the capture harness clicks three chips in one
     evaluation and lost two of them, which is the same bug with better
     timing. */
  function toggle(g, choiceId) {
    onChange(prev => {
      if (g.type === 'one') {
        return { ...prev, [g.id]: prev[g.id] === choiceId ? undefined : choiceId }
      }
      const cur = Array.isArray(prev[g.id]) ? prev[g.id] : []
      return {
        ...prev,
        [g.id]: cur.includes(choiceId) ? cur.filter(x => x !== choiceId) : [...cur, choiceId],
      }
    })
  }

  function setOther(g, text) {
    onChange(prev => ({ ...prev, [`${g.id}__other`]: text }))
  }

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <div key={g.id} className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[14px] font-extrabold leading-tight text-ink">{g.question}</p>
          {g.hint && <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{g.hint}</p>}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {g.choices.map(c => {
              const cur = value[g.id]
              const on = g.type === 'one' ? cur === c.id : Array.isArray(cur) && cur.includes(c.id)
              return (
                <button
                  key={c.id} type="button" onClick={() => toggle(g, c.id)} aria-pressed={on}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                    on ? 'bg-plum-950 text-white' : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
                  }`}
                >
                  {c.label}
                  {on && c.scan && <span className="ml-1.5 font-semibold opacity-70">{c.scan}</span>}
                </button>
              )
            })}
          </div>

          {/* ── Somewhere to put what our list does not have ─────────
              A fixed list is what keeps the data clean enough to match
              on, and it is also a list written by somebody who has never
              run this partner's kitchen. Every caterer has a speciality
              nobody thought to put in a dropdown, and being unable to
              say it is how a form starts feeling like it is about us
              rather than about them.

              Deliberately SEPARATE from the ticked ids, and never mixed
              into them: matching still runs on the choice ids, and free
              text is read by a person. That is the whole reason the
              dropdown exists. */}
          <input
            value={value[`${g.id}__other`] ?? ''}
            onChange={e => setOther(g, e.target.value)}
            placeholder="Something else? Type it here"
            className="mt-2.5 w-full rounded-2xl bg-ink/[0.02] px-3.5 py-2.5 text-[13px] font-semibold text-ink ring-1 ring-ink/[0.06] placeholder:font-normal placeholder:text-ink-mute"
          />
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function MenuStep({ menus, chosen, counters, onToggleMenu, onAllMenus, onToggleCounter, uploads, setUploads }) {
  const [open, setOpen] = useState(null)

  if (!menus.length) {
    return (
      <p className="rounded-[20px] bg-ink/[0.02] p-6 text-center text-[13px] leading-relaxed text-ink-mute">
        Pick your cuisines on the last screen and the menus for them appear
        here.
      </p>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Tick the menus you serve. Tap one to read every dish on it.
        </p>
        <button
          type="button" onClick={onAllMenus}
          className="shrink-0 rounded-full bg-plum-950 px-3.5 py-1.5 text-[12px] font-extrabold text-white"
        >
          {chosen.length === menus.length ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="space-y-2.5">
        {menus.map(m => {
          const on = chosen.includes(m.id)
          const isOpen = open === m.id
          return (
            <div
              key={m.id}
              className={`overflow-hidden rounded-[20px] ring-1 transition ${
                on ? 'bg-saffron-400/[0.10] ring-2 ring-saffron-400' : 'bg-white ring-ink/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <button
                  type="button"
                  onClick={() => onToggleMenu(m.id)}
                  aria-pressed={on}
                  aria-label={`${on ? 'Remove' : 'Add'} ${m.name}`}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ${
                    on ? 'bg-saffron-400 ring-saffron-400' : 'bg-white ring-ink/[0.18]'
                  }`}
                >
                  {on && <Check size={13} className="text-plum-950" />}
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : m.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="text-[15px] font-extrabold leading-tight text-ink">{m.name}</span>
                    {m.indicative && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                        Check price
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] text-ink-mute">{m.tier} · {m.scan}</span>
                  <span className="mt-1 block font-serif text-[17px] font-extrabold tracking-tight text-ink">
                    from ₹{m.fromPrice}
                    <span className="ml-1 font-sans text-[11.5px] font-bold text-ink-mute">
                      a plate · min {m.minPax}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11.5px] font-bold text-plum-700">
                    {isOpen ? 'Hide the dishes' : `Read all ${m.items.length} dishes`}
                  </span>
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-ink/[0.06] bg-white/70 p-4 pt-3">
                  {m.welcome?.length > 0 && (
                    <div className="mb-2.5">
                      {m.welcome.map(w => (
                        <p key={w} className="text-[12.5px] font-bold leading-snug text-plum-800">{w}</p>
                      ))}
                    </div>
                  )}
                  <ol className="space-y-1">
                    {m.items.map((it, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-soft">
                        <span className="w-4 shrink-0 text-right tabular-nums text-ink-mute">{i + 1}</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ol>
                  {m.needsReview && (
                    <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[11.5px] leading-snug text-amber-900">
                      We have written a traditional starting point. Edit it on
                      your listing so it reads the way you actually serve it.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Or just hand us the card ──────────────────────────────
          Sitting here, under twelve menus somebody is being asked to
          tick, because this is the moment they realise how long that
          will take. See MenuUpload. */}
      <div className="mt-5">
        <MenuUpload value={uploads} onChange={setUploads} />
      </div>

      {/* ── Counters ─────────────────────────────────────────────── */}
      <p className="mb-2 mt-6 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
        Counters you can add
      </p>
      <div className="flex flex-wrap gap-1.5">
        {FOOD_COUNTERS.map(c => {
          const on = counters.includes(c.id)
          return (
            <button
              key={c.id} type="button" onClick={() => onToggleCounter(c.id)} aria-pressed={on}
              className={`rounded-full px-3.5 py-2 text-left text-[12.5px] font-bold transition ${
                on ? 'bg-plum-950 text-white' : 'bg-white text-ink-soft ring-1 ring-ink/[0.08]'
              }`}
            >
              {c.name}
              <span className={`ml-1.5 font-semibold ${on ? 'opacity-70' : 'text-ink-mute'}`}>
                from ₹{c.fromPrice}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════ */

/**
 * The à la carte library — 479 dishes across 20 groups.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS SEPARATE FROM THE MENUS
 * ══════════════════════════════════════════════════════════════════════
 *
 * A set menu is what gets BOOKED. This is what a caterer can COOK, and
 * they are different questions with different answers: somebody who
 * serves Option 2 can still make Majjige Huli for a griha pravesha that
 * was never on any card.
 *
 * It is also how a family who wants one specific dish finds anybody at
 * all. "Do you make Hayagreeva" is currently a phone call to six
 * caterers; it should be a filter.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOLDED, AND SKIPPABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * 479 tick boxes is not a form, it is a punishment. Every group is shut
 * until opened, "all" fills a group in one tap, and Continue works with
 * nothing ticked — a caterer can come back to this on a slow afternoon,
 * which is when it will actually get done properly.
 */
function DishStep({ chosen, onChange }) {
  const [open, setOpen] = useState(null)
  const picked = new Set(chosen)

  function toggle(name) {
    onChange(picked.has(name) ? chosen.filter(x => x !== name) : [...chosen, name])
  }
  function toggleGroup(g) {
    const all = g.items.every(i => picked.has(i))
    onChange(all
      ? chosen.filter(x => !g.items.includes(x))
      : [...new Set([...chosen, ...g.items])])
  }

  return (
    <>
      <div className="mb-3 rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <p className="text-[13.5px] font-extrabold text-ink">
          Tick the dishes you make well
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
          This is how somebody looking for one particular dish finds you.
          You can skip it now and fill it in later.
        </p>
        {/* Sans, not the display serif. The serif zero at this size reads
            as a broken glyph rather than a number -- and "0 of 584" is
            the first thing a caterer sees on this screen, so it is the
            worst possible place for something that looks like a bug. */}
        <p className="mt-2 text-[19px] font-extrabold tracking-tight text-ink tabular-nums">
          {chosen.length}
          <span className="ml-1.5 text-[12px] font-bold text-ink-mute">
            of {TOTAL_DISHES} ticked
          </span>
        </p>
      </div>

      <div className="space-y-2">
        {ALL_DISH_GROUPS.map(g => {
          const n = g.items.filter(i => picked.has(i)).length
          const isOpen = open === g.id
          return (
            <div key={g.id} className="overflow-hidden rounded-[18px] bg-white ring-1 ring-ink/[0.06]">
              <div className="flex items-center gap-2 p-3.5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-[14px] font-extrabold leading-tight text-ink">
                    {g.label}
                  </span>
                  <span className="block text-[11.5px] text-ink-mute">
                    {g.scan ? g.scan + ' · ' : ''}{n ? n + ' of ' + g.items.length : g.items.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                    n === g.items.length ? 'bg-plum-950 text-white' : 'bg-ink/[0.04] text-ink-soft'
                  }`}
                >
                  {n === g.items.length ? 'Clear' : 'All'}
                </button>
                <ChevronRight
                  size={16}
                  className={`shrink-0 text-ink-mute transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </div>

              {isOpen && (
                <div className="flex flex-wrap gap-1.5 border-t border-ink/[0.06] p-3.5">
                  {g.items.map(i => {
                    const on = picked.has(i)
                    return (
                      <button
                        key={i} type="button" onClick={() => toggle(i)} aria-pressed={on}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                          on ? 'bg-saffron-400 text-plum-950' : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.07]'
                        }`}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function PriceStep({ menus, price, setPrice, unit, setUnit, minOrder, setMinOrder, isCatering }) {
  return (
    <div className="space-y-4">
      {isCatering && menus.length > 0 && (
        <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="text-[13px] font-extrabold text-ink">Your menus start at</p>
          <div className="mt-2 space-y-1.5">
            {menus.map(m => (
              <div key={m.id} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-ink-soft">{m.name}</span>
                <span className="font-serif text-[15px] font-extrabold tracking-tight text-ink tabular-nums">
                  from ₹{m.fromPrice}
                </span>
              </div>
            ))}
          </div>
          {/* The honest framing, and the reason `fromPrice` is never
              rendered as a flat number: the caterer's own card says "450+"
              and the plus is the whole point. */}
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-mute">
            These are the rates we have on file as a starting point. Your own
            price is what we quote — put it below.
          </p>
        </div>
      )}

      <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-extrabold text-ink">
            Your price
          </span>
          <span className="mb-2 block text-[12px] leading-snug text-ink-soft">
            Leave it blank if you would rather quote each job. Nothing is
            shown to a customer until our team has checked it.
          </span>
          <div className="flex items-center gap-2">
            <span className="font-serif text-[20px] font-extrabold text-ink">₹</span>
            <input
              value={price}
              onChange={e => setPrice(e.target.value.replace(/\D/g, '').slice(0, 7))}
              inputMode="numeric"
              placeholder="450"
              className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-[16px] font-extrabold text-ink ring-1 ring-ink/[0.08] placeholder:font-normal placeholder:text-ink-mute"
            />
          </div>
        </label>

        <p className="mb-1.5 mt-3.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink-mute">
          Per what?
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_UNITS.map(u => (
            <button
              key={u.id} type="button" onClick={() => setUnit(u.id)}
              className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${
                unit === u.id ? 'bg-plum-950 text-white' : 'bg-ink/[0.03] text-ink-soft ring-1 ring-ink/[0.08]'
              }`}
            >
              {u.id}
            </button>
          ))}
        </div>
      </div>

      {isCatering && (
        <div className="rounded-[20px] bg-ink/[0.02] p-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
            Standard terms
          </p>
          <ul className="mt-2 space-y-1">
            {CATERING_NOTES.map(n => (
              <li key={n} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
                <span className="text-ink-mute">·</span>{n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

function ReviewStep({ trade, picked, detail, groups, menus, counters, dishes = [], price, unit }) {
  const answered = groups.flatMap(g => {
    const v = detail[g.id]
    if (!v) return []
    const ids = Array.isArray(v) ? v : [v]
    return ids.map(id => g.choices.find(c => c.id === id)?.label).filter(Boolean)
  })

  return (
    <div className="space-y-3">
      <Card title="Your trade">
        <p className="text-[14px] font-extrabold text-ink">{trade}</p>
      </Card>

      <Card title={picked.length === 1 ? 'What you are listing' : `What you are listing (${picked.length})`}>
        <ul className="space-y-1">
          {picked.map(n => (
            <li key={n} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Check size={13} className="shrink-0 text-forest-600" /> {n}
            </li>
          ))}
        </ul>
      </Card>

      {answered.length > 0 && (
        <Card title="What you do">
          <p className="text-[13px] leading-relaxed text-ink-soft">{answered.join(' · ')}</p>
        </Card>
      )}

      {menus.length > 0 && (
        <Card title={`Menus (${menus.length})`}>
          <ul className="space-y-1">
            {menus.map(m => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-ink">{m.name}</span>
                <span className="shrink-0 text-ink-mute tabular-nums">
                  {m.items.length} dishes · from ₹{m.fromPrice}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {counters.length > 0 && (
        <Card title="Counters">
          <p className="text-[13px] text-ink-soft">{counters.map(c => c.name).join(' · ')}</p>
        </Card>
      )}

      {dishes.length > 0 && (
        <Card title="Dishes you make">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="font-extrabold text-ink">{dishes.length}</span> ticked
            {' — '}{dishes.slice(0, 6).join(', ')}
            {dishes.length > 6 && ' and ' + (dishes.length - 6) + ' more'}
          </p>
        </Card>
      )}

      <Card title="Price">
        <p className="font-serif text-[20px] font-extrabold tracking-tight text-ink">
          {price === '' ? 'Quote on request' : `₹${Number(price).toLocaleString('en-IN')}`}
          {price !== '' && <span className="ml-1.5 font-sans text-[12px] font-bold text-ink-mute">{unit}</span>}
        </p>
      </Card>

      {/* What happens next, said plainly. A partner who submits and hears
          nothing assumes it failed and submits again. */}
      <div className="rounded-[20px] bg-forest-50 p-4 ring-1 ring-forest-200/70">
        <p className="text-[13px] font-extrabold text-forest-900">What happens now</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-forest-800">
          Somebody at Sambramo reads this, usually the same day. You will be
          told the moment it is live, and jobs can start arriving that week.
        </p>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-ink-mute">
        {title}
      </p>
      {children}
    </div>
  )
}

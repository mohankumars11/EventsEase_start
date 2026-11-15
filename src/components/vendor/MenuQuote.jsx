/**
 * A Menu Studio request, as the caterer sees and answers it.
 *
 * The customer chose and personalised a SAMBRAMO menu (customer app,
 * screens/MenuStudio); the request carries it as a structured snapshot
 * (canonical_demand.menu — api/_lib/anchorBook.js). The same menu went to
 * every caterer who fits; each answers with their own price:
 *
 *   Quote as asked       per plate × guests, the extra charges, how long it holds
 *   Quote with changes   the same, plus every dish they would swap, drop or add —
 *                        the customer must approve those before booking
 *   Ask a question       a clarification the customer answers (migration 200)
 *   Decline
 *
 * The partner enters THEIR price (take-home); Sambramo computes the
 * customer's (api/submit-custom-quote.js). No contact details travel either
 * way until a booking is paid — the database refuses a phone number or an
 * email in a message.
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, MessageCircle, Pencil, Plus, Send, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const rupee = n => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
const CHARGES = [['prep', 'Preparation charges'], ['staff', 'Serving staff'], ['equipment', 'Buffet equipment & crockery'], ['transport', 'Transport'], ['setup', 'Setup & clearing'], ['tax', 'GST / taxes']]
const DIET = { veg: '#118C4F', egg: '#C77700', non_veg: '#8B2E1A' }
const MEAL = { breakfast: 'Breakfast', lunch: 'Lunch', hightea: 'High tea', dinner: 'Dinner' }
/* What the customer did to Sambramo's menu, so the caterer prices the right dish. */
const Mark = ({ d }) => d.c ? <span className="ml-1 text-[10px] font-extrabold text-plum-700">{d.c === 'typed' ? 'customer’s own' : d.c === 'swapped' && d.r ? `instead of ${d.r}` : d.c}</span> : null

function Dot({ d }) {
  if (!d) return null
  return <span className="inline-grid h-[12px] w-[12px] shrink-0 place-items-center rounded-[2px] align-middle" style={{ boxShadow: `inset 0 0 0 1.5px ${DIET[d]}` }}><span className="h-[4px] w-[4px] rounded-full" style={{ background: DIET[d] }} /></span>
}

/** The menu on a request card — enough to decide whether to open it. */
export function MenuBrief({ menu, compact = false }) {
  const all = menu.sections.flatMap(s => s.dishes)
  const show = compact ? all.slice(0, 6) : all
  return (
    <div className="mt-3 rounded-2xl bg-[#FFFCF5] p-3 ring-1 ring-[#EDE2CB]" data-menu-brief>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A7637]">{{ restaurant: 'Restaurant order · you deliver', cook: 'Cook at the customer’s place' }[menu.way] ?? 'Sambramo menu · price it as it is'}</p>
      <p className="mt-0.5 text-[15px] font-extrabold text-ink">{menu.name}</p>
      <p className="text-[11.5px] font-bold text-ink-soft">{[menu.cuisine, menu.diet && { veg: 'Vegetarian', non_veg: 'Non-veg', mixed: 'Veg + non-veg', jain: 'Jain', vegan: 'Vegan', eggless: 'Eggless' }[menu.diet], menu.serve, MEAL[menu.meal] ?? menu.meal, menu.guests && `${menu.guests} guests`].filter(Boolean).join(' · ')}</p>
      {compact ? (
        <ol className="mt-2 space-y-0.5 text-[12px] font-semibold text-ink-soft">
          {show.map((d, i) => <li key={i} className="truncate"><span className="mr-1 text-[#B08A3E]">{i + 1}.</span>{d.n} <Dot d={d.d} />{d.c && <span className="ml-1 text-[10px] font-extrabold text-plum-700">{d.c === 'typed' ? 'customer’s own' : d.c}</span>}</li>)}
          {all.length > show.length && <li className="text-plum-700">+ {all.length - show.length} more dishes</li>}
        </ol>
      ) : menu.sections.map((s, si) => (
        <div key={s.id} className="mt-2">
          <p className="rounded-full bg-[#3B1670] px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-white">{s.name}</p>
          <ol className="mt-1 space-y-0.5 px-1 text-[12.5px] font-semibold text-ink">
            {s.dishes.map((d, i) => <li key={i}>{d.n} <Dot d={d.d} />{d.c && <span className="ml-1 text-[10px] font-extrabold text-plum-700">{d.c === 'typed' ? 'customer’s own' : d.c === 'swapped' && d.r ? `instead of ${d.r}` : d.c}</span>}</li>)}
          </ol>
        </div>
      ))}
      {menu.flags?.length > 0 && <div className="mt-2 rounded-xl bg-amber-50 p-2 text-[11px] font-bold text-amber-900 ring-1 ring-amber-200">{menu.flags.map(f => <p key={f}>{f}</p>)}</div>}
      {menu.allergies && <p className="mt-2 text-[11.5px] font-bold text-red-800">Avoid: {menu.allergies}</p>}
      {menu.instructions && <p className="mt-1 text-[11.5px] font-semibold text-ink-soft">Note: {menu.instructions}</p>}
      {menu.refs?.length > 0 && <div className="mt-2 flex gap-1.5">{menu.refs.map(u => <a key={u} href={u} target="_blank" rel="noreferrer" className="h-14 w-14 overflow-hidden rounded-xl bg-surface"><img src={u} alt="Customer reference" className="h-full w-full object-cover" /></a>)}</div>}
    </div>
  )
}

/** Questions and answers on one request (migration 200). */
export function QuoteThread({ requestId, role }) {
  const [rows, setRows] = useState(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const load = () => supabase.from('sambramo_quote_messages').select('id, sender_role, kind, body, created_at').eq('quote_request_id', requestId).order('created_at')
    .then(({ data, error }) => setRows(error ? false : data ?? []))
  useEffect(() => { load() }, [requestId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (rows === false) return <p className="mt-2 text-[11.5px] font-semibold text-ink-mute">Questions switch on with the next Sambramo update.</p>
  async function send(kind) {
    setErr('')
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('sambramo_quote_messages').insert({ quote_request_id: requestId, sender_role: role, sender_id: u?.user?.id, kind, body: text.trim() })
    if (error) { setErr(/check/i.test(error.message) ? 'Keep phone numbers and emails out — Sambramo shares contacts once the booking is paid.' : error.message); return }
    setText(''); load()
  }
  return (
    <div className="mt-2" data-quote-thread>
      {(rows ?? []).map(m => (
        <p key={m.id} className={'mt-1 max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] font-semibold ' + (m.sender_role === role ? 'ml-auto bg-plum-50 text-plum-900' : 'bg-surface text-ink')}>
          <span className="block text-[9.5px] font-extrabold uppercase tracking-wide opacity-60">{m.sender_role === 'partner' ? 'Caterer' : 'Customer'}{m.kind === 'revision_request' ? ' · asked for a revised quote' : ''}</span>{m.body}
        </p>
      ))}
      <div className="mt-2 flex gap-1.5">
        <input value={text} onChange={e => setText(e.target.value.slice(0, 1000))} placeholder={role === 'partner' ? 'Ask the customer…' : 'Reply…'} className="h-10 flex-1 rounded-xl bg-surface px-3 text-[13px] font-semibold outline-none" data-thread-input />
        <button type="button" disabled={!text.trim()} onClick={() => send(role === 'partner' ? 'clarification' : 'answer')} className="grid h-10 w-10 place-items-center rounded-xl bg-plum-700 text-white disabled:opacity-40" aria-label="Send"><Send size={15} /></button>
      </div>
      {err && <p className="mt-1 text-[11.5px] font-bold text-red-700">{err}</p>}
    </div>
  )
}

/** The reply. onSubmit(requestId, { headers, body }) — CustomQuoteInbox's submit. */
export function MenuQuoteSheet({ request, busy, onClose, onSubmit }) {
  const menu = request.canonical_demand?.menu
  const guests = Number(menu?.guests) || Number(request.canonical_demand?.guests) || 0
  const [mode, setMode] = useState('as_asked')     // as_asked | with_changes | question
  const [perPlate, setPerPlate] = useState('')
  const [minGuests, setMinGuests] = useState('')
  const [charges, setCharges] = useState({})        // key → { amount, included }
  const [other, setOther] = useState({ label: '', amount: '' })
  const [days, setDays] = useState(2)
  const [notes, setNotes] = useState('')
  const [changes, setChanges] = useState([])        // { action, section_id, from_dish_id, from_name, to_name, note }
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState({ section: menu?.sections[0]?.id ?? 'special', name: '' })

  const plates = Math.max(guests, Number(minGuests) || 0)
  const food = (Number(perPlate) || 0) * plates
  const extra = CHARGES.reduce((t, [k]) => t + (charges[k]?.included ? 0 : Number(charges[k]?.amount) || 0), 0) + (Number(other.amount) || 0)
  const total = food + extra
  const changeFor = d => changes.find(c => c.from_dish_id === d.id && c.from_name === d.n)
  const setChange = (d, s, patch) => setChanges(cs => [...cs.filter(c => !(c.from_dish_id === d.id && c.from_name === d.n)), ...(patch ? [{ section_id: s.id, from_dish_id: d.id, from_name: d.n, ...patch }] : [])])
  const headers = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  }
  async function send() {
    if (busy || !(Number(perPlate) > 0)) return
    const lines = [
      { description: `Food — ${menu.name} (per plate)`, quantity: plates || 1, unit: 'plate', unit_take_home_paise: Math.round(Number(perPlate) * 100) },
      ...CHARGES.filter(([k]) => charges[k]?.included || Number(charges[k]?.amount) > 0).map(([k, label]) => ({ description: label, quantity: 1, unit: 'item',
        unit_take_home_paise: charges[k]?.included ? 0 : Math.round(Number(charges[k].amount) * 100), charged: !charges[k]?.included })),
      ...(other.label.trim() && Number(other.amount) > 0 ? [{ description: other.label.trim(), quantity: 1, unit: 'item', unit_take_home_paise: Math.round(Number(other.amount) * 100) }] : []),
    ]
    await onSubmit(request.id, { headers: await headers(), body: {
      lines, notes: notes.trim() || null,
      menuReply: { perPlatePaise: Math.round(Number(perPlate) * 100), minGuests: Number(minGuests) || null, validDays: days, changes: mode === 'with_changes' ? changes : [] },
    } })
  }
  if (!menu) return null
  return (
    <div className="fixed inset-0 z-[96] overflow-y-auto bg-[#fbfaff]" data-menu-quote-sheet>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] ring-1 ring-ink/[0.05] backdrop-blur-xl">
        <p className="text-[16px] font-extrabold text-ink">Price this menu</p>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full"><X size={19} /></button>
      </div>
      <div className="mx-auto max-w-lg px-4 pb-10 pt-3">
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white p-1 ring-1 ring-hairline/10" data-reply-mode>
          {[['as_asked', 'As asked'], ['with_changes', 'With changes'], ['question', 'Ask a question']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} data-mode={k} className={'rounded-xl py-2 text-[12px] font-extrabold ' + (mode === k ? 'bg-plum-700 text-white' : 'text-ink-soft')}>{l}</button>
          ))}
        </div>

        {mode === 'question' ? (
          <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-hairline/10">
            <p className="text-[13px] font-extrabold text-ink">Ask before you price</p>
            <p className="text-[11.5px] font-semibold text-ink-mute">The customer sees it on their event board and answers here.</p>
            <QuoteThread requestId={request.id} role="partner" />
            <MenuBrief menu={menu} />
          </div>
        ) : (
          <>
            {mode === 'with_changes' && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11.5px] font-bold leading-snug text-amber-900 ring-1 ring-amber-200">Tap a dish to swap or drop it, or add one below. The customer sees every change and must approve it before booking — your quote is shown as a different menu, not compared like-for-like.</p>}
            <div className="mt-3 rounded-2xl bg-[#FFFCF5] p-3 ring-1 ring-[#EDE2CB]" data-quote-menu>
              <p className="text-[15px] font-extrabold text-ink">{menu.name}</p>
              <p className="text-[11.5px] font-bold text-ink-soft">{[menu.cuisine, menu.serve, MEAL[menu.meal] ?? menu.meal, guests && `${guests} guests`].filter(Boolean).join(' · ')}</p>
              {menu.sections.map(s => (
                <div key={s.id} className="mt-2">
                  <p className="rounded-full bg-[#3B1670] px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-white">{s.name}</p>
                  <ul className="mt-1 space-y-1">
                    {s.dishes.map((d, i) => {
                      const c = changeFor(d)
                      return (
                        <li key={i} className="rounded-xl px-1.5 py-1">
                          <div className="flex items-center gap-2">
                            <Dot d={d.d} />
                            <span className={'min-w-0 flex-1 text-[13px] font-semibold ' + (c?.action === 'remove' ? 'text-ink-mute line-through' : 'text-ink')}>{d.n}<Mark d={d} />{c?.action === 'swap' && <span className="font-extrabold text-plum-700"> → {c.to_name}</span>}</span>
                            {mode === 'with_changes' && <button type="button" onClick={() => setEditing(editing === `${s.id}:${i}` ? null : `${s.id}:${i}`)} className="flex h-7 items-center gap-1 rounded-full bg-plum-50 px-2 text-[11px] font-extrabold text-plum-700" data-change-dish><Pencil size={11} />Change</button>}
                          </div>
                          {editing === `${s.id}:${i}` && (
                            <div className="mt-1.5 flex gap-1.5">
                              <input autoFocus placeholder="Replace with…" defaultValue={c?.to_name ?? ''} onBlur={e => e.target.value.trim() && setChange(d, s, { action: 'swap', to_name: e.target.value.trim().slice(0, 80) })}
                                className="h-9 flex-1 rounded-lg bg-white px-2.5 text-[12.5px] font-semibold ring-1 ring-hairline/20 outline-none" data-swap-input />
                              <button type="button" onClick={() => { setChange(d, s, { action: 'remove' }); setEditing(null) }} className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-700" aria-label="Drop this dish"><Trash2 size={14} /></button>
                              {c && <button type="button" onClick={() => { setChange(d, s, null); setEditing(null) }} className="h-9 rounded-lg bg-surface px-2 text-[11px] font-extrabold text-ink-soft">Undo</button>}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              {mode === 'with_changes' && (
                <div className="mt-3 flex gap-1.5" data-add-change>
                  <select value={adding.section} onChange={e => setAdding(a => ({ ...a, section: e.target.value }))} className="h-9 rounded-lg bg-white px-2 text-[12px] font-bold ring-1 ring-hairline/20">
                    {menu.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input value={adding.name} onChange={e => setAdding(a => ({ ...a, name: e.target.value.slice(0, 80) }))} placeholder="Add a dish you suggest" className="h-9 min-w-0 flex-1 rounded-lg bg-white px-2.5 text-[12.5px] font-semibold ring-1 ring-hairline/20 outline-none" />
                  <button type="button" disabled={!adding.name.trim()} onClick={() => { setChanges(cs => [...cs, { action: 'add', section_id: adding.section, to_name: adding.name.trim() }]); setAdding(a => ({ ...a, name: '' })) }} className="grid h-9 w-9 place-items-center rounded-lg bg-plum-700 text-white disabled:opacity-40" aria-label="Add"><Plus size={15} /></button>
                </div>
              )}
              {changes.filter(c => c.action === 'add').map((c, i) => <p key={i} className="mt-1 text-[12px] font-bold text-plum-700">+ {c.to_name}</p>)}
            </div>
            {menu.flags?.length > 0 && <div className="mt-2 rounded-2xl bg-amber-50 p-2.5 text-[11.5px] font-bold text-amber-900 ring-1 ring-amber-200"><p className="mb-0.5 font-extrabold">Confirm you can do these:</p>{menu.flags.map(f => <p key={f}>{f}</p>)}</div>}
            {menu.allergies && <p className="mt-2 rounded-2xl bg-red-50 p-2.5 text-[11.5px] font-bold text-red-800 ring-1 ring-red-200">Customer asks to avoid: {menu.allergies}</p>}

            <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 ring-1 ring-hairline/10" data-quote-price>
              <div className="grid grid-cols-2 gap-2">
                <Num label="Your price per plate" value={perPlate} onChange={setPerPlate} prefix="₹" data="per-plate" />
                <Num label="Minimum plates" value={minGuests} onChange={setMinGuests} placeholder={String(guests || '')} data="min-guests" />
              </div>
              <p className="text-[11.5px] font-bold text-ink-soft">Food: {rupee(perPlate)} × {plates || '—'} plates = <span className="text-ink">{rupee(food)}</span>{Number(minGuests) > guests ? ' (your minimum)' : ''}</p>
              {CHARGES.map(([k, label]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-[12.5px] font-bold text-ink">{label}</span>
                  <button type="button" onClick={() => setCharges(c => ({ ...c, [k]: { ...c[k], included: !c[k]?.included } }))} aria-pressed={!!charges[k]?.included} className={'h-8 rounded-full px-2.5 text-[11px] font-extrabold ' + (charges[k]?.included ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-surface text-ink-mute')}>Included</button>
                  {!charges[k]?.included && <input inputMode="numeric" value={charges[k]?.amount ?? ''} onChange={e => setCharges(c => ({ ...c, [k]: { ...c[k], amount: e.target.value.replace(/[^\d]/g, '').slice(0, 8) } }))} placeholder="₹0" className="h-8 w-24 rounded-lg bg-surface px-2 text-right text-[12.5px] font-bold outline-none" data-charge={k} />}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input value={other.label} onChange={e => setOther(o => ({ ...o, label: e.target.value.slice(0, 60) }))} placeholder="Anything else (name)" className="h-8 min-w-0 flex-1 rounded-lg bg-surface px-2 text-[12.5px] font-semibold outline-none" />
                <input inputMode="numeric" value={other.amount} onChange={e => setOther(o => ({ ...o, amount: e.target.value.replace(/[^\d]/g, '').slice(0, 8) }))} placeholder="₹0" className="h-8 w-24 rounded-lg bg-surface px-2 text-right text-[12.5px] font-bold outline-none" />
              </div>
              <div className="flex items-center justify-between border-t border-hairline/10 pt-2"><span className="text-[12.5px] font-extrabold text-ink">Your total</span><span className="text-[18px] font-black text-ink" data-quote-total>{rupee(total)}</span></div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">Quote holds for</p>
                <div className="mt-1 flex gap-1.5">{[1, 2, 3, 7].map(d => <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={'h-8 rounded-full px-3 text-[12px] font-extrabold ' + (days === d ? 'bg-ink text-white' : 'bg-surface text-ink-soft')}>{d} day{d > 1 ? 's' : ''}</button>)}</div>
              </div>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value.slice(0, 600))} placeholder="Anything the customer should know (no phone numbers)" className="w-full rounded-xl bg-surface p-2.5 text-[12.5px] font-semibold outline-none" />
              <p className="text-[11px] font-semibold leading-snug text-ink-mute">This is what you take home. Sambramo adds its fee and shows the customer one price.</p>
            </div>
            <button type="button" disabled={busy || !(Number(perPlate) > 0) || (mode === 'with_changes' && !changes.length)} onClick={send}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-saffron-400 text-[14px] font-extrabold text-plum-950 disabled:opacity-50" data-send-quote>
              <CheckCircle2 size={16} />{busy ? 'Sending…' : mode === 'with_changes' ? `Send quote with ${changes.length} change${changes.length === 1 ? '' : 's'}` : 'Send quote for this menu'}
            </button>
          </>
        )}
        <button type="button" disabled={busy} onClick={async () => onSubmit(request.id, { headers: await headers(), body: { decline: true } })} className="mt-2 h-11 w-full rounded-2xl text-[13px] font-extrabold text-red-700" data-decline>Decline this request</button>
        {mode !== 'question' && <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-ink-mute"><MessageCircle size={12} />Need to ask first? Use “Ask a question”.</p>}
      </div>
    </div>
  )
}

function Num({ label, value, onChange, prefix = '', placeholder = '', data }) {
  return (
    <label className="block rounded-xl bg-surface p-2.5">
      <span className="block text-[10px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
      <span className="mt-0.5 flex items-center gap-1"><span className="text-[14px] font-extrabold text-ink-mute">{prefix}</span>
        <input inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 7))} placeholder={placeholder} className="w-full bg-transparent text-[16px] font-black text-ink outline-none" data-num={data} /></span>
    </label>
  )
}

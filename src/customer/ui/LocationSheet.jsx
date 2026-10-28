/**
 * Where is the celebration? (Mohan, 2026-10-28 — after Blinkit / Zepto,
 * and Rapido's "book for someone else").
 *
 *   · search an area (Bengaluru live; Mysuru let in for testing)
 *   · use my current location
 *   · saved addresses — Home, Work, Other — with flat and landmark
 *   · "Booking for someone else?" — their name and number go with the
 *     place, so a surprise can be sent to a friend's address
 *   · anywhere we are not yet: say so warmly and take a "notify me"
 *     (lib/rewards.registerInterest → city_interest)
 *
 *   <LocationSheet open onClose onPick={place => …} />
 */
import { useMemo, useState } from 'react'
import { ArrowRight, Bell, Briefcase, Check, Home as HomeIcon, Loader2, LocateFixed, MapPin, Plus, Search, UserRound } from 'lucide-react'
import { BENGALURU_AREAS } from '../../data/bengaluruAreas'
import { Sheet } from './kit'
import { locate } from '../lib/where'
import { registerInterest } from '../lib/rewards'

const SAVED = 'sbm.cx.addresses.v1'
const readSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED) ?? '[]') } catch { return [] } }
const CITIES = ['Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Kochi', 'Mangaluru', 'Hubballi', 'Belagavi', 'Coimbatore', 'Jaipur', 'Lucknow', 'Chandigarh', 'Goa', 'Visakhapatnam', 'Thiruvananthapuram', 'Indore', 'Nagpur']
const MYSURU = [['Gayathripuram', 12.3168, 76.6727], ['VV Mohalla', 12.3193, 76.6312], ['Kuvempunagar', 12.2844, 76.6265], ['Vijayanagar', 12.3375, 76.6129], ['Jayalakshmipuram', 12.3292, 76.6304]]
const LABELS = [['home', 'Home', HomeIcon], ['work', 'Work', Briefcase], ['other', 'Other', MapPin]]

export default function LocationSheet({ open, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [away, setAway] = useState(null) // a city we are not in yet
  const [saved, setSaved] = useState(readSaved)
  const [adding, setAdding] = useState(null) // the area being saved as an address
  const [other, setOther] = useState(false)
  const [them, setThem] = useState({ name: '', phone: '' })
  const t = q.trim().toLowerCase()
  const areas = useMemo(() => [
    ...BENGALURU_AREAS.map(a => ({ name: a.name, city: 'Bengaluru', lat: a.lat, lng: a.lng, market: 'BLR', tier: a.tier })),
    ...MYSURU.map(([name, lat, lng]) => ({ name, city: 'Mysuru', lat, lng, market: 'MYS', test: true, tier: 9 })),
  ].filter(a => !t || a.name.toLowerCase().includes(t) || a.city.toLowerCase().includes(t)).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)).slice(0, 60), [t])
  const otherCity = t.length >= 3 ? CITIES.find(c => c.toLowerCase().startsWith(t)) : null
  const forWhom = other && them.name.trim().length >= 2 ? { name: them.name.trim(), phone: them.phone.trim() || null } : null

  const choose = place => onPick({ ...place, source: place.source ?? 'picked', for: forWhom })
  async function here() {
    setBusy(true); setAway(null)
    const r = await locate()
    setBusy(false)
    if (!r.ok) { setAway({ off: true }); return }
    if (!r.market?.live) { setAway({ city: r.place.city || r.place.area, lat: r.place.lat, lng: r.place.lng }); return }
    choose({ ...r.place, market: r.market.id, test: !!r.market.test, source: 'gps' })
  }
  function saveAddress(label, extra) {
    const list = [...saved.filter(s => s.label !== label || label === 'other'), { ...adding, label, ...extra, id: Date.now() }]
    setSaved(list)
    try { localStorage.setItem(SAVED, JSON.stringify(list)) } catch { /* off */ }
    setAdding(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Where’s the celebration?">
      <div className="pb-3" data-location-sheet>
        <label className="flex h-12 items-center gap-2.5 rounded-[16px] bg-[#F6F3FA] px-3.5 focus-within:ring-2 focus-within:ring-[#C4B5FD]">
          <Search size={17} className="text-[var(--brand)]" />
          <input value={q} onChange={e => { setQ(e.target.value); setAway(null) }} placeholder="Search an area or city" className="h-full flex-1 bg-transparent text-[14.5px] font-bold outline-none placeholder:text-[var(--ink-3)]" data-location-search />
        </label>
        <button type="button" onClick={here} className="cx-press mt-2 flex w-full items-center gap-3 rounded-[16px] px-1 py-3 text-left" data-use-gps>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EFE6FF] text-[var(--brand)]">{busy ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}</span>
          <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-extrabold text-[var(--brand)]">Use my current location</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">Masters nearest to you come first</span></span>
          <ArrowRight size={16} className="text-[var(--brand)]" />
        </button>

        {/* For someone else */}
        <button type="button" onClick={() => setOther(x => !x)} aria-pressed={other} className="flex w-full items-center gap-3 rounded-[16px] bg-[#FDF2F8] px-3 py-3 text-left" data-for-other>
          <UserRound size={18} className="shrink-0 text-[#DB2777]" />
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold text-[#9D174D]">Booking for someone else?</span><span className="block text-[11.5px] font-semibold text-[#BE185D]">A surprise at a friend’s place — masters will call them</span></span>
          <span className={'relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors ' + (other ? 'bg-[#DB2777]' : 'bg-[#E5E0EA]')}><span className={'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ' + (other ? 'left-[21px]' : 'left-[3px]')} /></span>
        </button>
        {other && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={them.name} onChange={e => setThem(x => ({ ...x, name: e.target.value }))} maxLength={80} placeholder="Their name" className="h-11 rounded-[12px] bg-[#FAF8FD] px-3 text-[14px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
            <input value={them.phone} onChange={e => setThem(x => ({ ...x, phone: e.target.value }))} inputMode="tel" maxLength={16} placeholder="Their phone" className="h-11 rounded-[12px] bg-[#FAF8FD] px-3 text-[14px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
          </div>
        )}

        {away && (
          <div className="cx-pop mt-3 rounded-[18px] bg-gradient-to-br from-[#F5F0FF] to-[#FDF2F8] p-4 text-center" data-not-here>
            {away.off ? <p className="text-[13.5px] font-bold text-[var(--ink-2)]">Location is off — pick your area below.</p> : (
              <>
                <p className="text-[28px]">🚀</p>
                <p className="text-[16px] font-black text-[#1C1033]">We’re not in {away.city || 'your city'} yet</p>
                <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-2)]">We’re live in Bengaluru and coming to more cities soon. Want us to tell you first?</p>
                <NotifyMe city={away.city || q} lat={away.lat} lng={away.lng} />
                <p className="mt-2 text-[11.5px] font-semibold text-[var(--ink-3)]">Planning for Bengaluru? Pick an area below.</p>
              </>
            )}
          </div>
        )}
        {otherCity && !away && (
          <div className="mt-3 rounded-[18px] bg-[#F5F0FF] p-4 text-center" data-not-here>
            <p className="text-[15px] font-black">{otherCity} is coming soon</p>
            <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-2)]">We’ll let you know the day we start there.</p>
            <NotifyMe city={otherCity} />
          </div>
        )}

        {saved.length > 0 && !t && (
          <div className="mt-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">Saved addresses</p>
            {saved.map(s => {
              const L = LABELS.find(l => l[0] === s.label) ?? LABELS[2]
              const Icon = L[2]
              return (
                <button key={s.id} type="button" onClick={() => choose(s)} className="cx-press flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left last:border-0" data-saved-address={s.label}>
                  <Icon size={17} className="shrink-0 text-[var(--brand)]" />
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold">{L[1]}{s.nick ? ` · ${s.nick}` : ''}</span><span className="block truncate text-[12px] font-semibold text-[var(--ink-3)]">{[s.flat, s.landmark, s.name ?? s.area, s.city].filter(Boolean).join(', ')}</span></span>
                </button>
              )
            })}
          </div>
        )}

        {adding ? (
          <SaveAddress place={adding} onCancel={() => setAdding(null)} onSave={saveAddress} onUse={extra => { choose({ ...adding, ...extra, area: adding.name }) }} />
        ) : (
          <ul className="mt-2 max-h-[38dvh] overflow-y-auto">
            {areas.map(a => (
              <li key={`${a.city}-${a.name}`} className="flex items-center border-b border-[var(--line)] last:border-0">
                <button type="button" onClick={() => choose({ area: a.name, city: a.city, lat: a.lat, lng: a.lng, market: a.market, test: a.test })} className="cx-press flex min-w-0 flex-1 items-center gap-3 py-3 text-left text-[14.5px] font-bold">
                  <MapPin size={16} className="shrink-0 text-[var(--brand)]" /><span className="truncate">{a.name}</span><span className="shrink-0 text-[11.5px] font-semibold text-[var(--ink-3)]">{a.city}{a.test ? ' · testing' : ''}</span>
                </button>
                <button type="button" onClick={() => setAdding(a)} aria-label={`Save ${a.name} as an address`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)]"><Plus size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  )
}

function SaveAddress({ place, onCancel, onSave, onUse }) {
  const [label, setLabel] = useState('home')
  const [flat, setFlat] = useState('')
  const [landmark, setLandmark] = useState('')
  const extra = { flat: flat.trim() || null, landmark: landmark.trim() || null, area: place.name }
  return (
    <div className="mt-3 rounded-[18px] bg-[#FBF9FD] p-3 shadow-[inset_0_0_0_1px_#F0EAF6]" data-save-address>
      <p className="text-[14px] font-extrabold">Save {place.name}</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {LABELS.map(([id, l, I]) => <button key={id} type="button" onClick={() => setLabel(id)} className={'flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-extrabold ' + (label === id ? 'bg-[#1C1033] text-white' : 'bg-white text-[var(--ink-2)] shadow-[inset_0_0_0_1px_#E9E2F2]')}><I size={14} />{l}</button>)}
      </div>
      <input value={flat} onChange={e => setFlat(e.target.value)} maxLength={120} placeholder="House / flat / floor" className="mt-2 h-11 w-full rounded-[12px] bg-white px-3 text-[14px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
      <input value={landmark} onChange={e => setLandmark(e.target.value)} maxLength={120} placeholder="Landmark (optional)" className="mt-2 h-11 w-full rounded-[12px] bg-white px-3 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0]" />
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
        <button type="button" onClick={onCancel} className="h-11 rounded-[12px] px-4 text-[13px] font-extrabold text-[var(--ink-3)]">Cancel</button>
        <button type="button" onClick={() => { onSave(label, extra); onUse(extra) }} className="cx-press cx-cta h-11 rounded-[12px] text-[13.5px] font-extrabold">Save & use this address</button>
      </div>
    </div>
  )
}

function NotifyMe({ city, lat = null, lng = null }) {
  const [contact, setContact] = useState('')
  const [state, setState] = useState('idle')
  return state === 'done' ? (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-extrabold text-[#0B6B3D]"><Check size={16} strokeWidth={3} />We’ll tell you the day we launch in {city}</p>
  ) : (
    <div className="mt-3 flex gap-2">
      <input value={contact} onChange={e => setContact(e.target.value)} maxLength={120} placeholder="Phone or email" className="h-11 min-w-0 flex-1 rounded-[12px] bg-white px-3 text-[13.5px] font-bold outline-none ring-1 ring-[#E7E1F0]" />
      <button type="button" disabled={state === 'busy'} onClick={async () => { setState('busy'); await registerInterest({ city, contact: contact.trim() || null, lat, lng }).catch(() => {}); setState('done') }}
        className="cx-press flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#1C1033] px-3.5 text-[13px] font-extrabold text-white" data-notify-me><Bell size={15} />Notify me</button>
    </div>
  )
}

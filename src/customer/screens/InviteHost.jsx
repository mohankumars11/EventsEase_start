/**
 * /invites/:id — the host's RSVP dashboard.
 *
 * Live headcount (adults + children coming, maybe, can't, not replied,
 * seen), food counts, per-function counts; the guest list with filters;
 * a WhatsApp button per guest (invite, then remind); an open link for
 * groups; paste-a-list import; CSV export; on the day, check-in; and
 * "Use this headcount" to size the celebration plan (catering, chairs…).
 * Refreshes every 15 s while open and when the app comes back.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, Download, Eye, Link2, Loader2, MessageCircle, Pencil, Plus, Trash2, UserCheck, Users } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { MEALS, STATUS, addGuests, getInvitation, guestsCsv, inviteText, markSent, parseGuestList, removeGuest, rsvpLink, saveInvitation, shareText, tally, updateGuest, whatsappUrl } from '../lib/rsvp'
import { BackHeader, Sheet } from '../ui/kit'

const FILTERS = [['all', 'All'], ['attending', 'Coming'], ['maybe', 'Maybe'], ['declined', 'Can’t come'], ['pending', 'Not replied'], ['unseen', 'Not seen']]
const SIDES = ['Family', 'Friends', 'Bride’s side', 'Groom’s side', 'Work', 'Neighbours']

export default function InviteHost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const plan = usePlan()
  const [inv, setInv] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [guest, setGuest] = useState(null)
  const [note, setNote] = useState('')

  const load = useCallback(() => getInvitation(id).then(setInv).catch(e => setErr(e.message)), [id])
  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 15000)
    const v = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', v)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v) }
  }, [load])

  if (!inv) return <main className="grid min-h-[60dvh] place-items-center">{err ? <p className="px-6 text-center text-[13.5px] font-bold text-[#9B1A2A]">{err}</p> : <Loader2 className="animate-spin text-[var(--brand)]" />}</main>
  const guests = inv.invitation_guests
  const t = tally(guests)
  const occ = OCCASION[inv.occasion_id]
  const shown = guests.filter(g => filter === 'all' || (filter === 'unseen' ? !g.opened_at : g.status === filter))
  const flash = m => { setNote(m); setTimeout(() => setNote(''), 2200) }
  const ensureSent = async () => { if (inv.status === 'draft') { await saveInvitation({ id: inv.id, status: 'sent' }); setInv(x => ({ ...x, status: 'sent' })) } }

  async function sendTo(g) {
    await ensureSent()
    const reminder = !!g.sent_at && g.status === 'pending'
    window.open(whatsappUrl(inviteText(inv, g, { reminder }), g.phone), '_blank')
    await markSent([g.id], reminder ? 'reminded_at' : 'sent_at').catch(() => {})
    load()
  }
  async function shareOpen() {
    if (!inv.open_enabled) { await saveInvitation({ id: inv.id, open_enabled: true }) }
    await ensureSent()
    const r = await shareText(inviteText({ ...inv, open_enabled: true }), inv.title)
    flash(r === 'copied' ? 'Group link copied — paste it in your WhatsApp group' : r === 'shared' ? 'Shared' : '')
    load()
  }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([guestsCsv(inv, guests)], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${inv.title.replace(/[^\w]+/g, '-')}-guests.csv` })
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const planned = inv.occasion_id && plan.event.occasionId === inv.occasion_id
  const today = inv.event_date && inv.event_date === new Date().toISOString().slice(0, 10)

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+110px)]">
      <BackHeader title={inv.title} sub={occ?.name ?? 'Invitation'} right={<Link to={`/invites/${inv.id}/edit`} aria-label="Edit invitation" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--am-ink)] shadow-[0_0_0_1px_#EEE6FA]"><Pencil size={18} /></Link>} />

      {/* Headcount */}
      <section className="mx-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-headcount>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#0B6B3D]">Coming</p>
            <p className="cx-num text-[40px] font-black leading-none tracking-[-0.04em]">{t.heads}<span className="ml-1.5 text-[15px] font-extrabold tracking-normal text-[var(--ink-3)]">people</span></p>
            <p className="mt-1 text-[12px] font-bold text-[var(--ink-2)]">{t.adults} adults{inv.allow_kids ? ` · ${t.kids} children` : ''}{today ? ` · ${t.arrived} arrived` : ''}</p>
          </div>
          <div className="text-right text-[12px] font-extrabold">
            <p className="text-[#8A5300]">{t.maybe} maybe</p><p className="text-[var(--ink-3)]">{t.declined} can’t come</p><p className="text-[var(--brand)]">{t.pending} not replied</p>
            <p className="flex items-center justify-end gap-1 text-[var(--ink-3)]"><Eye size={12} />{t.opened}/{t.invited} seen</p>
          </div>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#F3ECFF]">
          {[['attending', '#16A34A'], ['maybe', '#F59E0B'], ['declined', '#CBD5E1']].map(([k, c]) => <span key={k} style={{ width: `${t.invited ? (t[k] / t.invited) * 100 : 0}%`, background: c }} />)}
        </div>
        {inv.ask_meal && Object.keys(t.meals).length > 0 && (
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold text-[var(--ink-2)]">{MEALS.filter(([k]) => t.meals[k]).map(([k, l]) => <span key={k}>{l}: <b>{t.meals[k]}</b></span>)}</p>
        )}
        {inv.invitation_functions.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {inv.invitation_functions.map(f => {
              const n = guests.filter(g => g.status === 'attending' && g.invitation_guest_functions?.find(x => x.function_id === f.id)?.attending).reduce((s, g) => s + g.adults + g.kids, 0)
              return <span key={f.id} className="flex items-center justify-between rounded-[12px] bg-[#FAF8FD] px-3 py-2 text-[12px] font-bold"><span className="truncate">{f.name}</span><b className="cx-num shrink-0 pl-2">{n}</b></span>
            })}
          </div>
        )}
        {planned && t.heads > 0 && plan.event.guests !== t.heads && (
          <button type="button" onClick={() => { plan.setEvent({ guests: t.heads }); flash(`Your plan is now sized for ${t.heads} guests`) }} className="cx-press mt-3 flex w-full items-center justify-between rounded-[14px] bg-[#F1FBF5] px-3 py-2.5 text-left ring-1 ring-[#CDEFDC]" data-use-headcount>
            <span className="text-[13px] font-extrabold text-[#0B4F2A]">Use {t.heads} as your plan’s guest count</span><ChevronRight size={16} className="text-[#0C831F]" />
          </button>
        )}
      </section>

      {/* Actions */}
      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <Action icon={Plus} onClick={() => setAdding(true)} data="add">Add guests</Action>
        <Action icon={Link2} onClick={shareOpen} data="group">Group link</Action>
        <Action icon={Download} onClick={exportCsv} data="csv">Export</Action>
      </div>
      {note && <p className="mx-3 mt-2 rounded-[12px] bg-[var(--am-100)] px-3 py-2 text-[12.5px] font-bold text-[var(--am-ink)]">{note}</p>}

      {/* Guest list */}
      <div className="cx-noscroll mt-4 flex gap-1.5 overflow-x-auto px-3">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={'shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold ' + (filter === k ? 'bg-[var(--brand)] text-white' : 'bg-white text-[var(--ink-2)] shadow-[0_0_0_1px_#EEE6FA]')}>
            {l}{k !== 'all' ? ` · ${k === 'unseen' ? t.invited - t.opened : t[k]}` : ` · ${t.invited}`}
          </button>
        ))}
      </div>
      <ul className="mx-3 mt-2.5 overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#EEE6FA]">
        {!guests.length && <li className="p-5 text-center text-[13.5px] font-semibold text-[var(--ink-2)]">No guests yet — add them, or share the group link.</li>}
        {shown.map((g, i) => (
          <li key={g.id} className={(i ? 'border-t border-[var(--line)] ' : '') + 'flex items-center gap-3 px-3 py-2.5'} data-guest={g.status}>
            <button type="button" onClick={() => setGuest(g)} className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1.5"><span className="truncate text-[14.5px] font-extrabold">{g.name}</span>{g.checked_in_at && <UserCheck size={14} className="shrink-0 text-[#0C831F]" />}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] font-bold text-[var(--ink-3)]">
                <span className={'rounded-full px-1.5 py-[1px] text-[10.5px] font-extrabold ' + STATUS[g.status].tone}>{STATUS[g.status].label}</span>
                {g.status === 'attending' && <span>{g.adults + g.kids} {g.adults + g.kids === 1 ? 'person' : 'people'}</span>}
                {g.side && <span>{g.side}</span>}
                <span className="flex items-center gap-0.5">{g.opened_at ? <><Eye size={11} />seen</> : g.sent_at ? 'sent' : 'not sent'}</span>
              </span>
            </button>
            {today && g.status !== 'declined' ? (
              <button type="button" onClick={async () => { await updateGuest(g.id, { checked_in_at: g.checked_in_at ? null : new Date().toISOString() }); load() }} className={'cx-press flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-extrabold ' + (g.checked_in_at ? 'bg-[#0C831F] text-white' : 'bg-[#F1FBF5] text-[#0B6B3D]')} data-checkin>
                <Check size={14} />{g.checked_in_at ? 'Arrived' : 'Check in'}
              </button>
            ) : (
              <button type="button" onClick={() => sendTo(g)} className="cx-press flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#25D366] px-3 text-[12px] font-extrabold text-white" data-send>
                <MessageCircle size={14} />{g.sent_at && g.status === 'pending' ? 'Remind' : g.sent_at ? 'Resend' : 'Send'}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mx-4 mt-3 text-center text-[11.5px] font-semibold text-[var(--ink-3)]">WhatsApp opens with the message ready — tap send there. Each guest gets their own link.</p>

      <AddGuests open={adding} onClose={() => setAdding(false)} inv={inv} onAdded={n => { setAdding(false); flash(`${n} added`); load() }} />
      <GuestSheet g={guest} inv={inv} onClose={() => setGuest(null)} onChanged={() => { setGuest(null); load() }} />
    </main>
  )
}

function Action({ icon: Icon, onClick, data, children }) {
  return <button type="button" onClick={onClick} className="cx-press flex h-[62px] flex-col items-center justify-center gap-1 rounded-[16px] bg-white text-[12px] font-extrabold text-[var(--am-ink)] shadow-[0_0_0_1px_#EEE6FA]" data-action={data}><Icon size={19} className="text-[var(--brand)]" />{children}</button>
}

function AddGuests({ open, onClose, inv, onAdded }) {
  const [mode, setMode] = useState('one')
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [text, setText] = useState('')
  const [side, setSide] = useState(''); const [limit, setLimit] = useState(2); const [fnIds, setFnIds] = useState([])
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const parsed = mode === 'list' ? parseGuestList(text, inv.invitation_guests) : null
  async function add() {
    setBusy(true); setErr('')
    try {
      const list = mode === 'one' ? [{ name: name.trim(), phone }] : parsed.guests
      await addGuests(inv.id, list.filter(g => g.name), { side, partyLimit: limit, functionIds: fnIds })
      setName(''); setPhone(''); setText(''); onAdded(list.length)
    } catch (e) { setErr(/duplicate|unique/i.test(e.message) ? 'That phone number is already on the list.' : e.message) } finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add guests" footer={<button type="button" disabled={busy || (mode === 'one' ? name.trim().length < 2 : !parsed?.guests.length)} onClick={add} className="cx-press cx-cta flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-extrabold" data-add-guests>{busy && <Loader2 size={16} className="animate-spin" />}{mode === 'one' ? 'Add guest' : `Add ${parsed?.guests.length ?? 0} guests`}</button>}>
      <div className="space-y-3 pb-2">
        <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#F4F1F8] p-1">{[['one', 'One guest'], ['list', 'Paste a list']].map(([k, l]) => <button key={k} type="button" onClick={() => setMode(k)} className={'h-9 rounded-full text-[13px] font-extrabold ' + (mode === k ? 'bg-white text-[var(--am-ink)] shadow' : 'text-[var(--ink-3)]')}>{l}</button>)}</div>
        {mode === 'one' ? (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={100} className="h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[15px] font-semibold outline-none ring-1 ring-[#E7E1F0]" data-guest-name />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number (optional)" inputMode="tel" maxLength={16} className="h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[15px] font-semibold outline-none ring-1 ring-[#E7E1F0]" />
          </>
        ) : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder={'One per line:\nRavi Kumar, 98450 12345\nAnita Rao 9886012345\nMeena aunty'} className="w-full resize-none rounded-[13px] bg-[#FAF8FD] p-3 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0]" data-guest-list />
            {parsed && (parsed.guests.length > 0 || parsed.dupes.length > 0) && <p className="text-[12px] font-bold text-[var(--ink-2)]">{parsed.guests.length} to add{parsed.dupes.length ? ` · ${parsed.dupes.length} already on the list` : ''}</p>}
          </>
        )}
        <div><p className="text-[12px] font-extrabold text-[var(--ink-2)]">Group</p><div className="mt-1.5 flex flex-wrap gap-1.5">{SIDES.map(s => <button key={s} type="button" onClick={() => setSide(side === s ? '' : s)} className={'rounded-full px-3 py-1.5 text-[12.5px] font-bold ' + (side === s ? 'bg-[var(--brand)] text-white' : 'bg-[#F4F1F8] text-[var(--ink-2)]')}>{s}</button>)}</div></div>
        <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[13.5px] font-bold"><Users size={16} className="text-[var(--brand)]" />People per invite</span>
          <span className="flex items-center gap-2">{[1, 2, 4, 6].map(n => <button key={n} type="button" onClick={() => setLimit(n)} className={'h-9 w-9 rounded-full text-[13px] font-extrabold ' + (limit === n ? 'bg-[var(--brand)] text-white' : 'bg-[#F4F1F8]')}>{n}</button>)}</span></div>
        {inv.invitation_functions.length > 0 && (
          <div><p className="text-[12px] font-extrabold text-[var(--ink-2)]">Invite to (leave empty for all functions)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{inv.invitation_functions.map(f => <button key={f.id} type="button" onClick={() => setFnIds(x => (x.includes(f.id) ? x.filter(y => y !== f.id) : [...x, f.id]))} className={'rounded-full px-3 py-1.5 text-[12.5px] font-bold ' + (fnIds.includes(f.id) ? 'bg-[#0C831F] text-white' : 'bg-[#F4F1F8] text-[var(--ink-2)]')}>{f.name}</button>)}</div></div>
        )}
        {err && <p className="text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
      </div>
    </Sheet>
  )
}

function GuestSheet({ g, inv, onClose, onChanged }) {
  const [copied, setCopied] = useState(false)
  if (!g) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>
  return (
    <Sheet open={!!g} onClose={onClose} title={g.name}>
      <div className="space-y-2 pb-3 text-[13.5px] font-semibold text-[var(--ink-2)]">
        <p><span className={'rounded-full px-2 py-0.5 text-[11.5px] font-extrabold ' + STATUS[g.status].tone}>{STATUS[g.status].label}</span>{g.status === 'attending' ? ` · ${g.adults} adults${g.kids ? `, ${g.kids} children` : ''}` : ''}{g.meal ? ` · ${MEALS.find(m => m[0] === g.meal)?.[1]}` : ''}</p>
        {g.note && <p className="rounded-[12px] bg-[#FAF8FD] p-3">“{g.note}”</p>}
        <p>{g.phone ?? 'No number'} · up to {g.party_limit} {g.party_limit === 1 ? 'person' : 'people'}{g.side ? ` · ${g.side}` : ''}</p>
        <p className="text-[12px]">{g.sent_at ? `Sent ${new Date(g.sent_at).toLocaleDateString('en-IN')}` : 'Not sent yet'}{g.opened_at ? ' · seen' : ''}{g.responded_at ? ` · replied ${new Date(g.responded_at).toLocaleDateString('en-IN')}` : ''}</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(rsvpLink(g.token)); setCopied(true) } catch { /* off */ } }} className="cx-press h-11 rounded-[13px] bg-[#F4F1F8] text-[13px] font-extrabold text-[var(--am-ink)]">{copied ? 'Copied' : 'Copy their link'}</button>
          <button type="button" onClick={async () => { await updateGuest(g.id, { party_limit: Math.min(50, g.party_limit + 1) }); onChanged() }} className="cx-press h-11 rounded-[13px] bg-[#F4F1F8] text-[13px] font-extrabold text-[var(--am-ink)]">+1 person allowed</button>
        </div>
        <button type="button" onClick={async () => { if (confirm(`Remove ${g.name} from the list?`)) { await removeGuest(g.id); onChanged() } }} className="flex items-center gap-1.5 pt-2 text-[13px] font-extrabold text-[#9B1A2A]"><Trash2 size={15} />Remove guest</button>
      </div>
    </Sheet>
  )
}

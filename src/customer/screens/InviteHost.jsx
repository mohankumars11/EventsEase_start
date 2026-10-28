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
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, Download, Eye, Link2, Loader2, MessageCircle, Pencil, Plus, Trash2, UserCheck, Users } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import { usePlan } from '../state/PlanContext'
import { MEALS, STATUS, addGuests, getInvitation, guestsCsv, inviteText, markSent, parseGuestList, removeGuest, rsvpLink, saveInvitation, shareText, tally, updateGuest, whatsappUrl } from '../lib/rsvp'
import { BackHeader, Sheet } from '../ui/kit'
import InviteCard from '../ui/InviteCard'
import { parseTheme } from '../data/inviteTemplates'
import { guestsFromFile } from '../lib/guestImport'
import { setVip, whenLabel, TRAVEL_MODES } from '../lib/guestCare'
import { GuestCarePanel, HostCircles } from '../ui/hostCareUI'

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
  const sent = guests.filter(g => g.sent_at || g.opened_at || g.responded_at).length
  const unsent = guests.filter(g => !g.sent_at && !g.opened_at && !g.responded_at && g.phone)
  const nextUp = unsent[0] ?? null
  const remindUp = guests.find(g => g.status === 'pending' && g.sent_at && g.phone && !g.reminded_at) ?? null
  const recent = guests.filter(g => g.responded_at).sort((a, b) => b.responded_at.localeCompare(a.responded_at)).slice(0, 5)
  const planned = inv.occasion_id && plan.event.occasionId === inv.occasion_id
  const today = inv.event_date && inv.event_date === new Date().toISOString().slice(0, 10)

  return (
    <main className="cx-enter cx-cream min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom,0px)+110px)]">
      <BackHeader title={inv.title} sub={occ?.name ?? 'Invitation'} right={<Link to={`/invites/${inv.id}/edit`} aria-label="Edit invitation" className="cx-press grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--am-ink)] shadow-[0_0_0_1px_#EEE6FA]"><Pencil size={18} /></Link>} />

      {/* The numbers that matter, big: sent, seen, accepted, waiting. */}
      <section className="mx-3 grid grid-cols-2 gap-2.5" data-host-stats>
        {[
          ['Invites sent', sent, `of ${t.invited} on your list`, '#5B21B6', 'linear-gradient(150deg,#F5F0FF 0%,#EDE4FF 100%)', 'all'],
          ['Seen', t.opened, `${t.invited ? Math.round((t.opened / t.invited) * 100) : 0}% opened it`, '#1D4ED8', 'linear-gradient(150deg,#F0F6FF 0%,#E1ECFF 100%)', 'unseen'],
          ['Accepted', t.attending, `${t.heads} ${t.heads === 1 ? 'person' : 'people'} coming`, '#0B7A3B', 'linear-gradient(150deg,#EEFBF3 0%,#DDF5E6 100%)', 'attending'],
          ['Waiting', t.pending, `${t.maybe} maybe · ${t.declined} can’t come`, '#B45309', 'linear-gradient(150deg,#FFF8EB 0%,#FFEFD3 100%)', 'pending'],
        ].map(([l, n, s, c, bg, f]) => (
          <button key={l} type="button" onClick={() => setFilter(f)} className="cx-press rounded-[22px] p-4 text-left shadow-[0_0_0_1px_rgba(0,0,0,.03)]" style={{ background: bg }} data-stat={l}>
            <span className="block text-[12.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: c }}>{l}</span>
            <span className="cx-num mt-1 block text-[40px] font-black leading-none tracking-[-0.05em] text-[#1C1033]">{n}</span>
            <span className="mt-1.5 block truncate text-[12px] font-bold text-[var(--ink-2)]">{s}</span>
          </button>
        ))}
      </section>

      {/* The two big actions */}
      <div className="mx-3 mt-3 space-y-2">
        {nextUp ? (
          <button type="button" onClick={() => sendTo(nextUp)} className="cx-press flex h-[60px] w-full items-center gap-3 rounded-[20px] bg-[#25D366] px-4 text-left text-white shadow-[0_14px_26px_-14px_rgba(37,211,102,.95)]" data-send-next>
            <MessageCircle size={22} className="shrink-0" />
            <span className="min-w-0 flex-1"><span className="block text-[16px] font-black tracking-[-0.02em]">Send to {nextUp.name}</span><span className="block text-[12px] font-bold text-white/85">{unsent.length} still to send · WhatsApp opens ready</span></span>
            <ChevronRight size={20} className="shrink-0" />
          </button>
        ) : guests.length > 0 && t.pending > 0 && remindUp ? (
          <button type="button" onClick={() => sendTo(remindUp)} className="cx-press flex h-[60px] w-full items-center gap-3 rounded-[20px] bg-[#1C1033] px-4 text-left text-white" data-remind-next>
            <MessageCircle size={22} className="shrink-0" />
            <span className="min-w-0 flex-1"><span className="block text-[16px] font-black tracking-[-0.02em]">Remind {remindUp.name}</span><span className="block text-[12px] font-bold text-white/75">{t.pending} haven’t replied yet</span></span>
            <ChevronRight size={20} className="shrink-0" />
          </button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAdding(true)} className="cx-press cx-cta flex h-[54px] items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-action="add"><Plus size={18} />Add guests</button>
          <button type="button" onClick={shareOpen} className="cx-press flex h-[54px] items-center justify-center gap-2 rounded-[18px] bg-white text-[15px] font-extrabold text-[#1C1033] shadow-[inset_0_0_0_1.5px_#E2D9EE]" data-action="group"><Link2 size={18} />Group link</button>
        </div>
      </div>
      {note && <p className="mx-3 mt-2 rounded-[12px] bg-[var(--am-100)] px-3 py-2 text-[12.5px] font-bold text-[var(--am-ink)]">{note}</p>}

      {/* The card they received */}
      <Link to={`/invites/${inv.id}/edit`} className="mx-3 mt-3 flex items-center gap-3 rounded-[18px] bg-white p-2.5 shadow-[0_0_0_1px_#EEE6FA]" data-host-card>
        <span className="w-[58px] shrink-0"><InviteCard inv={inv} occasion={occ} theme={inv.theme} size="mini" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold">{parseTheme(inv.theme, occ).t.name}</span><span className="block text-[11.5px] font-semibold text-[var(--ink-3)]">{inv.status === 'draft' ? 'Draft — not sent yet' : inv.status === 'closed' ? 'RSVPs closed' : 'Live · guests can reply'}</span></span>
        <span className="shrink-0 rounded-full bg-[var(--am-100)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--am-ink)]">Edit design</span>
      </Link>

      {/* The dashboard */}
      <section className="mx-3 mt-3 rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_#EEE6FA]" data-headcount>
        <div className="flex items-center gap-4">
          <Donut t={t} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B6B3D]">Coming</p>
            <p className="cx-num text-[38px] font-black leading-none tracking-[-0.04em]">{t.heads}<span className="ml-1 text-[14px] font-extrabold tracking-normal text-[var(--ink-3)]">people</span></p>
            <p className="mt-1 text-[12px] font-bold text-[var(--ink-2)]">{t.adults} {t.adults === 1 ? 'adult' : 'adults'}{inv.allow_kids ? ` · ${t.kids} ${t.kids === 1 ? 'child' : 'children'}` : ''}</p>
            {today && <p className="mt-0.5 text-[12px] font-extrabold text-[#0C831F]">{t.arrived} arrived so far</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
          {TILES.map(([k, l, c, bg]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className="cx-press rounded-[14px] py-2.5" style={{ background: bg }} data-tile={k}>
              <span className="cx-num block text-[21px] font-black leading-none" style={{ color: c }}>{t[k]}</span>
              <span className="mt-1 block text-[10.5px] font-extrabold text-[var(--ink-2)]">{l}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[12px] font-bold">
          <span className="flex items-center justify-between rounded-[12px] bg-[#FAF8FD] px-3 py-2"><span className="flex items-center gap-1 text-[var(--ink-2)]"><Eye size={13} />Seen</span><b className="cx-num">{t.opened}/{t.invited}</b></span>
          <span className="flex items-center justify-between rounded-[12px] bg-[#FAF8FD] px-3 py-2"><span className="text-[var(--ink-2)]">Replied</span><b className="cx-num">{t.invited ? Math.round(((t.invited - t.pending) / t.invited) * 100) : 0}%</b></span>
        </div>
        {inv.ask_meal && Object.keys(t.meals).length > 0 && (
          <div className="mt-3"><p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">Food</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{MEALS.filter(([k]) => t.meals[k]).map(([k, l]) => <span key={k} className="rounded-full bg-[#FFF4DA] px-2.5 py-1 text-[12px] font-extrabold text-[#8A5300]">{l} · {t.meals[k]}</span>)}</div>
          </div>
        )}
        {inv.invitation_functions.length > 0 && (
          <div className="mt-3"><p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">By function</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {inv.invitation_functions.map(f => {
                const n = guests.filter(g => g.status === 'attending' && g.invitation_guest_functions?.find(x => x.function_id === f.id)?.attending).reduce((sum, g) => sum + g.adults + g.kids, 0)
                return <span key={f.id} className="flex items-center justify-between rounded-[12px] bg-[#FAF8FD] px-3 py-2 text-[12px] font-bold"><span className="truncate">{f.name}</span><b className="cx-num shrink-0 pl-2">{n}</b></span>
              })}
            </div>
          </div>
        )}
        {planned && t.heads > 0 && plan.event.guests !== t.heads && (
          <button type="button" onClick={() => { plan.setEvent({ guests: t.heads }); flash(`Your plan is now sized for ${t.heads} guests`) }} className="cx-press mt-3 flex w-full items-center justify-between rounded-[14px] bg-[#F1FBF5] px-3 py-2.5 text-left ring-1 ring-[#CDEFDC]" data-use-headcount>
            <span className="text-[13px] font-extrabold text-[#0B4F2A]">Use {t.heads} as your plan’s guest count</span><ChevronRight size={16} className="text-[#0C831F]" />
          </button>
        )}
      </section>

      {/* Guest care and style circles (migration 192). */}
      {'care' in inv ? (
        <>
          <GuestCarePanel inv={inv} reload={load} />
          <HostCircles inv={inv} />
        </>
      ) : (
        <p className="mx-3 mt-3 rounded-[16px] bg-[#F0FDFF] p-3 text-[12.5px] font-bold text-[#0C4A6E]" data-care-off>Guest care (arrivals, pickups, rooms, VIPs) and style circles switch on once migration 192 is applied.</p>
      )}

      {/* Latest replies */}
      {recent.length > 0 && (
        <section className="mx-3 mt-3 rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_#EEE6FA]" data-recent>
          <p className="text-[13px] font-extrabold">Latest replies</p>
          <ul className="mt-2 space-y-1.5">
            {recent.map(g => (
              <li key={g.id} className="flex items-center gap-2 text-[12.5px] font-bold">
                <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ' + STATUS[g.status].tone}>{g.name[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate"><b>{g.name}</b> — {STATUS[g.status].label.toLowerCase()}{g.status === 'attending' ? ` (${g.adults + g.kids})` : ''}</span>
                <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-3)]">{ago(g.responded_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mx-3 mt-3 flex justify-end">
        <button type="button" onClick={exportCsv} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-extrabold text-[var(--am-ink)] shadow-[0_0_0_1px_#EEE6FA]" data-action="csv"><Download size={15} />Export guest list</button>
      </div>

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
              <span className="flex items-center gap-1.5"><span className="truncate text-[14.5px] font-extrabold">{g.vip ? '👑 ' : ''}{g.name}</span>{g.travel?.pickup && <span title="Needs pickup">🚖</span>}{g.checked_in_at && <UserCheck size={14} className="shrink-0 text-[#0C831F]" />}</span>
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

function AddGuests({ open, onClose, inv, onAdded }) {
  const [mode, setMode] = useState('one')
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [text, setText] = useState('')
  const [side, setSide] = useState(''); const [limit, setLimit] = useState(2); const [fnIds, setFnIds] = useState([])
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [fromFile, setFromFile] = useState(null)
  const picker = useRef(null)
  const have = new Set(inv.invitation_guests.map(g => String(g.phone ?? '').replace(/\D/g, '').slice(-10)).filter(Boolean))
  const parsed = mode === 'list' ? parseGuestList(text, inv.invitation_guests)
    : mode === 'file' && fromFile ? { guests: fromFile.filter(g => !g.phone || !have.has(String(g.phone).replace(/\D/g, '').slice(-10))), dupes: fromFile.filter(g => g.phone && have.has(String(g.phone).replace(/\D/g, '').slice(-10))) } : null
  async function readFile(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setErr('')
    try { setFromFile(await guestsFromFile(f)) } catch (x) { setErr(x.message) }
  }
  async function add() {
    setBusy(true); setErr('')
    try {
      const list = mode === 'one' ? [{ name: name.trim(), phone }] : parsed.guests
      await addGuests(inv.id, list.filter(g => g.name), { side, partyLimit: limit, functionIds: fnIds })
      setName(''); setPhone(''); setText(''); setFromFile(null); onAdded(list.length)
    } catch (e) { setErr(/duplicate|unique/i.test(e.message) ? 'That phone number is already on the list.' : e.message) } finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add guests" footer={<button type="button" disabled={busy || (mode === 'one' ? name.trim().length < 2 : !parsed?.guests.length)} onClick={add} className="cx-press cx-cta flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] text-[15px] font-extrabold" data-add-guests>{busy && <Loader2 size={16} className="animate-spin" />}{mode === 'one' ? 'Add guest' : `Add ${parsed?.guests.length ?? 0} guests`}</button>}>
      <div className="space-y-3 pb-2">
        <div className="grid grid-cols-3 gap-1.5 rounded-full bg-[#F4F1F8] p-1">{[['one', 'One guest'], ['list', 'Paste'], ['file', 'Upload file']].map(([k, l]) => <button key={k} type="button" onClick={() => setMode(k)} className={'h-9 rounded-full text-[13px] font-extrabold ' + (mode === k ? 'bg-white text-[var(--am-ink)] shadow' : 'text-[var(--ink-3)]')}>{l}</button>)}</div>
        {mode === 'one' ? (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={100} className="h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[15px] font-semibold outline-none ring-1 ring-[#E7E1F0]" data-guest-name />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number (optional)" inputMode="tel" maxLength={16} className="h-12 w-full rounded-[13px] bg-[#FAF8FD] px-3.5 text-[15px] font-semibold outline-none ring-1 ring-[#E7E1F0]" />
          </>
        ) : mode === 'file' ? (
          <>
            <button type="button" onClick={() => picker.current?.click()} className="cx-press flex w-full items-center gap-3 rounded-[16px] bg-[#ECFDF3] p-4 text-left" data-upload-guests>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#0C831F] shadow"><Download size={19} className="rotate-180" /></span>
              <span className="min-w-0"><span className="block text-[15px] font-extrabold text-[#0B4F2A]">{fromFile ? `${fromFile.length} people found — pick another file` : 'Choose a file'}</span><span className="block text-[12px] font-semibold text-[#3C7A5A]">Excel (.xlsx), CSV, or contacts exported from your phone (.vcf)</span></span>
            </button>
            <input ref={picker} type="file" accept=".xlsx,.csv,.txt,.vcf,text/csv,text/plain,text/vcard,text/x-vcard,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={readFile} />
            {parsed && <p className="text-[12px] font-bold text-[var(--ink-2)]">{parsed.guests.length} to add{parsed.dupes.length ? ` · ${parsed.dupes.length} already on the list` : ''}</p>}
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
        {g.travel && (
          <p className="rounded-[12px] bg-[#F0FDFF] p-3 text-[12.5px] text-[#0C4A6E]" data-guest-travel>
            {TRAVEL_MODES.find(m => m[0] === g.travel.mode)?.[2]} {[g.travel.ref, g.travel.from && `from ${g.travel.from}`, g.travel.arrive_at && whenLabel(g.travel.arrive_at)].filter(Boolean).join(' · ')}
            {(g.travel.pickup || g.travel.stay || g.travel.drop) && <><br />{[g.travel.pickup && '🚖 pickup', g.travel.drop && '↩️ drop', g.travel.stay && `🏨 ${g.travel.rooms || 1} room × ${g.travel.nights || 1} night`].filter(Boolean).join(' · ')}</>}
            {g.travel.needs && <><br />“{g.travel.needs}”</>}
          </p>
        )}
        {'vip' in g && (
          <button type="button" onClick={async () => { await setVip(g.id, !g.vip); onChanged() }} aria-pressed={!!g.vip}
            className={'cx-press flex h-11 w-full items-center justify-center gap-1.5 rounded-[13px] text-[13px] font-extrabold ' + (g.vip ? 'bg-[#FFF4D6] text-[#8A6100] ring-1 ring-[#F2D27A]' : 'bg-[#F4F1F8] text-[var(--am-ink)]')} data-vip>
            {g.vip ? '👑 VIP guest — tap to remove' : '👑 Mark as VIP'}
          </button>
        )}
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

const TILES = [['attending', 'Coming', '#0C831F', '#E9F8EF'], ['maybe', 'Maybe', '#B45309', '#FFF4DA'], ['declined', 'Can’t', '#64748B', '#F1F5F9'], ['pending', 'Waiting', '#6D28D9', '#F3ECFF']]

function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}

/* Everyone invited, as one ring: coming, maybe, can't, waiting. */
function Donut({ t }) {
  const parts = [[t.attending, '#16A34A'], [t.maybe, '#F59E0B'], [t.declined, '#CBD5E1'], [t.pending, '#DDD0FB']]
  const C = 2 * Math.PI * 40
  let off = 0
  return (
    <span className="relative block h-[104px] w-[104px] shrink-0" aria-label={`${t.attending} coming, ${t.maybe} maybe, ${t.declined} can’t, ${t.pending} waiting`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#F3EEF9" strokeWidth="13" />
        {t.invited > 0 && parts.map(([n, c], k) => {
          const len = (n / t.invited) * C
          const el = n ? <circle key={k} cx="50" cy="50" r="40" fill="none" stroke={c} strokeWidth="13" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} /> : null
          off += len
          return el
        })}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center"><span><span className="cx-num block text-[20px] font-black leading-none">{t.invited}</span><span className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-3)]">invited</span></span></span>
    </span>
  )
}

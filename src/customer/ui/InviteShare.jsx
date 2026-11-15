/**
 * The invitation itself, ready to share at the END of the journey — the
 * checkout, and the "all set" screen once requests are sent (Mohan,
 * 2026-11-11: "the invitation should also be ready, so that you can share
 * it directly … give an edit option that goes to the RSVP part … make him
 * aware the link goes with the invitation, the replies come to the app";
 * then: "this section should come at the end, once he is at the checkout
 * — always redirect him to the event needs first, that is where the
 * business conversion happens"). So it never sits on the event card.
 *
 * The card is the real invitation — the same InviteCard the guest opens —
 * drawn from the event details in the occasion's first design. "Share"
 * saves it (signed in) with its open link on, and hands the phone's share
 * sheet a message built by lib/rsvp inviteShareText: the card's link to
 * view and RSVP, and the "Get Sambramo" link under it. "Edit" opens the
 * invitation wizard, on this invitation once it exists.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Download, Link2, ListChecks, Loader2, Palette, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePlan } from '../state/PlanContext'
import { savedWhere } from '../lib/where'
import { templatesFor, TEMPLATES, themeString } from '../data/inviteTemplates'
import { getInvitation, inviteShareText, saveInvitation, shareText } from '../lib/rsvp'
import InviteCard from './InviteCard'
import SignInSheet from '../screens/SignInSheet'

export default function InviteShare({ o, className = '' }) {
  const navigate = useNavigate()
  const plan = usePlan()
  const { user, profile } = useAuth()
  const ev = plan.event?.occasionId === o?.id ? plan.event : {}
  const date = ev.date ?? '', time = ev.time ?? ''
  const place = plan.place?.lat ? plan.place : savedWhere()
  const first = (profile?.full_name ?? user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0]
  const [invId, setInvId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [signIn, setSignIn] = useState(false)
  if (!o) return null
  const inv = {
    occasion_id: o.id, cover_key: o.id, title: first ? `${first}’s ${o.name}` : o.name, hosts_line: '', message: 'We’d love for you to be there. Tap below to tell us if you’re coming.',
    event_date: date ?? '', start_time: time ?? '', venue_name: place?.area ? `${place.area}${place.city ? `, ${place.city}` : ''}` : '', venue_address: place?.address ?? '',
    ask_meal: true, allow_kids: true, theme: themeString((templatesFor(o)[0] ?? TEMPLATES[0]).id, { art: true, live: true }),
  }

  async function share() {
    if (!user) { setSignIn(true); return }
    setBusy(true); setNote('')
    try {
      const id = invId ?? await saveInvitation({ ...inv, open_enabled: true, status: 'sent' })
      setInvId(id)
      const full = await getInvitation(id)
      const r = await shareText(inviteShareText(full, { guests: plan.event.guests }), full.title)
      setNote(r === 'copied' ? 'Invitation link copied — paste it in your WhatsApp group' : r === 'shared' ? 'Shared! Replies will show under My Bookings → Invites' : '')
    } catch (e) { setNote(e.message) } finally { setBusy(false) }
  }
  const edit = () => navigate(invId ? `/invites/${invId}/edit` : `/invites/new?o=${o.id}`)

  return (
    <section className={'mx-4 mt-5 overflow-hidden rounded-[26px] bg-gradient-to-b from-[#FFF4FA] via-white to-[#F4EEFF] p-4 ring-1 ring-[#F2D9EA] ' + className} data-invite-share={invId ? 'saved' : 'draft'}>
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#DB2777]"><Share2 size={13} />Your invitation is ready too</p>
      <h3 className="mt-1 text-[21px] font-black leading-[1.1] tracking-[-0.035em] text-[#1C1033]">Share it with your guests</h3>
      <p className="mt-1 text-[12.5px] font-semibold leading-snug text-[var(--ink-2)]">Made from your event details, in a design picked for a {o.name.toLowerCase()}. This is exactly what your guests will open.</p>

      {/* The real card, as the guest sees it. */}
      <div className="mx-auto mt-4 w-[68%] drop-shadow-[0_18px_28px_rgba(91,33,182,.28)]" data-invite-preview>
        <InviteCard inv={inv} occasion={o} theme={inv.theme} />
      </div>

      {/* What happens when they share — said once, plainly. */}
      <ul className="mt-4 space-y-2" data-invite-how>
        {[
          [Link2, 'Guests tap the link', 'They see this card and RSVP in one tap — no app, no sign-in.'],
          [ListChecks, 'Replies come to you here', 'Who’s coming, how many, veg or non-veg — live, under My Bookings → Invites.'],
          [Download, 'Sambramo rides along', 'The message carries a “Get Sambramo” link, so friends can plan their own.'],
        ].map(([Icon, head, line]) => (
          <li key={head} className="flex items-start gap-2.5 rounded-[14px] bg-white/80 p-2.5 shadow-[0_0_0_1px_#F3E4EE]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#FDECF4] text-[#DB2777]"><Icon size={16} strokeWidth={2.3} /></span>
            <span className="min-w-0"><span className="block text-[13px] font-extrabold text-[#1C1033]">{head}</span><span className="block text-[11.5px] font-semibold leading-snug text-[var(--ink-2)]">{line}</span></span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={share} disabled={busy} className="cx-press flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-[#DB2777] text-[13.5px] font-extrabold text-white shadow-[0_10px_20px_-12px_rgba(219,39,119,.9)] disabled:opacity-60" data-invite-share-now>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}{invId ? 'Share again' : 'Share invitation'}
        </button>
        <button type="button" onClick={edit} className="cx-press flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-white text-[13.5px] font-extrabold text-[#5B21A8] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-invite-edit>
          <Palette size={16} />Edit invitation
        </button>
      </div>
      {note && <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-bold text-[#0B7A45]" data-invite-note><CheckCircle2 size={14} />{note}</p>}
      {invId && <button type="button" onClick={() => navigate(`/invites/${invId}`)} className="mt-2 w-full text-center text-[12.5px] font-extrabold text-[#5B21B6]" data-invite-manage>See replies &amp; manage RSVPs ›</button>}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} onDone={() => { setSignIn(false); share() }} why="to share your invitation" />
    </section>
  )
}

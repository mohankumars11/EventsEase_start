/**
 * "Your invitation is ready" — the RSVP invitation, already made from what
 * the customer told us (occasion, date, time, venue), in the occasion's
 * first design. Nothing is saved until they share it: "Share with friends"
 * opens the wizard at its review step with everything filled in, and
 * "Change design" opens it at the design step (Mohan, 2026-10-31).
 *
 *   where="needs"     after the needs — one step from the masters, who
 *                     see the event with the request
 *   where="checkout"  share with friends, or change the design
 */
import { Link } from 'react-router-dom'
import { ChevronRight, Palette, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePlan } from '../state/PlanContext'
import { templatesFor, TEMPLATES, themeString } from '../data/inviteTemplates'
import InviteCard from './InviteCard'

export default function InviteReady({ occasion: o, where = 'checkout', className = '' }) {
  const plan = usePlan()
  const { user, profile } = useAuth()
  if (!o) return null
  const ev = plan.event.occasionId === o.id ? plan.event : {}
  const first = (profile?.full_name ?? user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0]
  const inv = {
    title: first ? `${first}’s ${o.name}` : o.name, event_date: ev.date ?? '', start_time: ev.time ?? '',
    venue_name: plan.place?.area ?? '', theme: themeString((templatesFor(o)[0] ?? TEMPLATES[0]).id, { art: true, live: true }),
  }
  const needs = where === 'needs'
  return (
    <section className={'mx-3 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#FFF4FA] via-white to-[#F4EEFF] p-3.5 ring-1 ring-[#F2D9EA] ' + className} data-invite-ready={where}>
      <div className="flex items-center gap-3.5">
        <span className="w-[92px] shrink-0 drop-shadow-[0_14px_20px_rgba(91,33,182,.28)]"><InviteCard inv={inv} occasion={o} theme={inv.theme} size="mini" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#DB2777]">✨ Made for you</p>
          <h3 className="mt-0.5 text-[17px] font-black leading-[1.15] tracking-[-0.03em]">Your invitation is ready</h3>
          <p className="mt-1 text-[12px] font-semibold leading-snug text-[var(--ink-2)]">
            {needs ? 'Built from your event details. One step away from your masters — your request carries the date, time and place.'
              : 'Share it with friends and family — they RSVP in one tap. Explore our live designs any time.'}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to={`/invites/new?o=${o.id}&step=review`} className="cx-press flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-[#DB2777] text-[13px] font-extrabold text-white shadow-[0_10px_20px_-12px_rgba(219,39,119,.9)]" data-invite-share>
          <Share2 size={15} />Share with friends
        </Link>
        <Link to={`/invites/new?o=${o.id}`} className="cx-press flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-white text-[13px] font-extrabold text-[#5B21A8] shadow-[inset_0_0_0_1.5px_#E3D5FA]" data-invite-design>
          <Palette size={15} />Change design<ChevronRight size={14} />
        </Link>
      </div>
    </section>
  )
}

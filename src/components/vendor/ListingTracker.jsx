import React, { useState } from 'react'
import {
  Check, Eye, BadgeCheck, Radio, AlertCircle, ChevronDown, EyeOff,
} from 'lucide-react'

/**
 * Every listing, and exactly where each one is.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY ONE CARD FOR ALL OF THEM WAS NOT ENOUGH
 * ══════════════════════════════════════════════════════════════════════
 *
 * ListingStatusCard says one thing about the whole account: "3 under
 * review". That is right when a partner has one listing and wrong the
 * moment they have four, because the four are not in the same place. A
 * caterer whose Catering went live on Tuesday, whose Welcome Drinks is
 * still being read, and whose Live Counters came back for a change is
 * told "1 needs a change" and has to guess which.
 *
 * Worse, the aggregate hides the good news. A partner sees "under
 * review" and concludes nothing has happened, when in fact two of their
 * four are already taking jobs.
 *
 * So: a summary line anybody can read at a glance, and every listing
 * underneath it with its own state.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOLDED PAST THREE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Three rows is a list. Nine is a wall above the thing a partner opened
 * the tab for. So three or fewer are open, more than three are folded
 * behind a line that already carries the answer — and anything needing
 * the partner is pulled to the top and never folded, because a listing
 * that came back for a change is the one thing here that is waiting on
 * them rather than on us.
 *
 * ── The four states are the ones the flow already promised ──────────
 * Submitted → read → verified → live is what WhatHappensNext told them
 * on the review screen. The same four words, in the same order, so the
 * promise and the tracking are recognisably one thing.
 */

const STEPS = ['submitted', 'read', 'verified', 'live']

const STATE = {
  rejected: {
    at: 'read',
    label: 'Needs a change',
    icon: AlertCircle,
    pill: 'bg-rose-600 text-white',
    ring: 'ring-rose-200',
    tint: 'bg-rose-50',
  },
  under_review: {
    at: 'read',
    label: 'Being read',
    icon: Eye,
    pill: 'bg-amber-500 text-white',
    ring: 'ring-amber-200',
    tint: 'bg-amber-50/70',
  },
  live: {
    at: 'live',
    label: 'Live',
    icon: Radio,
    pill: 'bg-forest-600 text-white',
    ring: 'ring-forest-200',
    tint: 'bg-forest-50/70',
  },
  hidden: {
    at: 'live',
    label: 'Hidden by you',
    icon: EyeOff,
    pill: 'bg-ink/[0.08] text-ink-soft',
    ring: 'ring-ink/[0.08]',
    tint: '',
  },
}

/** How long ago, in the words somebody uses out loud. */
function ago(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'a month ago' : `${months} months ago`
}

const stateOf = s =>
  s.review_status === 'rejected' ? 'rejected'
  : s.review_status === 'under_review' ? 'under_review'
  : s.is_active === false ? 'hidden'
  : 'live'

export default function ListingTracker({ services = [], onOpenJobs }) {
  const [open, setOpen] = useState(false)
  if (!services.length) return null

  const rows = services.map(s => ({ ...s, state: stateOf(s) }))

  const counts = rows.reduce((m, r) => ({ ...m, [r.state]: (m[r.state] ?? 0) + 1 }), {})
  const needsYou = rows.filter(r => r.state === 'rejected')
  const rest = rows.filter(r => r.state !== 'rejected')

  /* Three or fewer is a list; more is a wall above the thing they came
     for. Anything waiting on the partner is never folded. */
  const foldable = rest.length > 3
  const shown = foldable && !open ? [] : rest

  const summary = [
    counts.live && `${counts.live} live`,
    counts.under_review && `${counts.under_review} being read`,
    counts.rejected && `${counts.rejected} needs a change`,
    counts.hidden && `${counts.hidden} hidden`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.06]">
      <div className="flex items-center gap-3 border-b border-ink/[0.06] bg-ink/[0.02] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold leading-tight text-ink">
            Your {rows.length === 1 ? 'listing' : `${rows.length} listings`}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-soft">{summary}</p>
        </div>
        {counts.live > 0 && onOpenJobs && (
          <button
            type="button"
            onClick={onOpenJobs}
            className="shrink-0 rounded-full bg-forest-600 px-3 py-1.5 text-[11.5px] font-extrabold text-white"
          >
            See jobs
          </button>
        )}
      </div>

      {/* Anything waiting on the partner, first and always visible. */}
      {needsYou.map(r => <Row key={r.id} row={r} />)}

      {shown.map(r => <Row key={r.id} row={r} />)}

      {foldable && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-center gap-1.5 border-t border-ink/[0.06] py-2.5 text-[12px] font-extrabold text-ink-soft active:bg-ink/[0.02]"
        >
          {open ? 'Hide' : `Show all ${rest.length}`}
          <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
        </button>
      )}
    </div>
  )
}

function Row({ row }) {
  const meta = STATE[row.state]
  const Icon = meta.icon
  const here = STEPS.indexOf(meta.at)
  const when = ago(row.reviewed_at ?? row.created_at)

  return (
    <div className={`border-b border-ink/[0.05] px-4 py-3 last:border-b-0 ${meta.tint}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.pill}`}>
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-extrabold leading-tight text-ink">
            {row.name}
          </span>
          <span className="block text-[11.5px] text-ink-soft">
            {meta.label}{when ? ` · ${when}` : ''}
          </span>
        </span>
      </div>

      {/* Four beads, the same four steps the review screen promised. A
          bar would say "how far"; these say which part is happening. */}
      <div className="mt-2 flex items-center gap-1 pl-[38px]">
        {STEPS.map((sid, i) => (
          <span
            key={sid}
            aria-hidden
            className={`h-[3px] flex-1 rounded-full ${
              row.state === 'rejected' && i === here ? 'bg-rose-500'
              : i <= here ? 'bg-forest-600'
              : 'bg-ink/[0.08]'
            }`}
          />
        ))}
      </div>

      {/* Why it came back. A listing refused with no reason is a partner
          who submits the same thing again. */}
      {row.state === 'rejected' && row.review_note && (
        <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-[12px] leading-snug text-rose-900 ring-1 ring-rose-200">
          <span className="font-extrabold">What to change: </span>{row.review_note}
        </p>
      )}
    </div>
  )
}

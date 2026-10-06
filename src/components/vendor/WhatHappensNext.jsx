import React from 'react'
import { Check, Eye, BadgeCheck, Radio } from 'lucide-react'

/**
 * What happens after Submit, said before Submit.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS ON THE REVIEW SCREEN AND NOT AFTER IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * A partner who has just spent ten minutes on a form taps Submit
 * expecting to be live. They are not: the row lands as `under_review`,
 * dispatch only matches `live` rows, and somebody has to read it first.
 *
 * Told afterwards, that reads as a catch — the app took the work and
 * then produced a condition. Told BEFORE, on the screen where they are
 * still deciding, it is just how it works, and the ten minutes are spent
 * knowingly. The difference costs nothing and is the whole of whether a
 * partner trusts the next screen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FOUR STEPS, AND ALL FOUR ARE TRUE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Submitted   the moment they tap. vendor_services rows are written.
 *   We read it  review_status = 'under_review' — migration 101, and
 *               dispatch genuinely will not match it until it moves.
 *   Verified    the vendor's own verification, which is separate: a
 *               listing can be read and approved while the BUSINESS is
 *               still being checked, and match_partners wants both.
 *   Live        offers start arriving.
 *
 * No countdown and no "usually within 2 hours". "Usually the same day"
 * is what an operator actually does, and a promise that slips is how a
 * partner stops believing everything else on the screen — including the
 * ₹6,587, which is real and is the strongest thing we have to say.
 *
 * ── Where the partner already is ─────────────────────────────────────
 * `at` marks the step they are on, so the same component serves the
 * review screen ("you are about to do this") and the listing tab
 * afterwards ("this is where you are"). One description of the process,
 * not two that can drift apart.
 */

const STEPS = [
  {
    id: 'submitted',
    icon: Check,
    title: 'You submit it',
    body: 'Everything on this screen is saved. You can still change any of '
      + 'it afterwards.',
  },
  {
    id: 'read',
    icon: Eye,
    title: 'A person reads it',
    body: 'Not a machine. Usually the same day. If something needs '
      + 'changing we write what, and it comes straight back to you.',
  },
  {
    id: 'verified',
    icon: BadgeCheck,
    title: 'Your business is verified',
    body: 'Separate from the listing, and done once. Papers and a phone '
      + 'call, so a customer knows who is turning up.',
  },
  {
    id: 'live',
    icon: Radio,
    title: 'You go live',
    body: 'Jobs arrive with the price already on them. You tap yes or no, '
      + 'and no is free.',
  },
]

export default function WhatHappensNext({ at = 'submitted', className = '' }) {
  const here = STEPS.findIndex(s => s.id === at)

  return (
    <div className={`overflow-hidden rounded-[22px] bg-white ring-1 ring-ink/[0.06] ${className}`}>
      <div className="border-b border-ink/[0.06] bg-ink/[0.02] px-4 py-3">
        <p className="text-[13.5px] font-extrabold leading-tight text-ink">
          What happens after you submit
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
          Said now rather than afterwards, so nothing about it is a surprise.
        </p>
      </div>

      <ol className="p-4">
        {STEPS.map((s, i) => {
          const done = i < here
          const now = i === here
          const Icon = s.icon
          return (
            <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
              {/* The line between the dots, stopping at the last one so it
                  does not trail off the bottom of the card. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-[2px] rounded ${
                    done ? 'bg-forest-600' : 'bg-ink/[0.08]'
                  }`}
                />
              )}

              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-forest-600 text-white'
                  : now ? 'bg-kumkuma-600 text-white ring-4 ring-kumkuma-100'
                  : 'bg-ink/[0.05] text-ink-mute'
              }`}>
                <Icon size={15} />
              </span>

              <div className="min-w-0 pt-0.5">
                <p className={`text-[13.5px] font-extrabold leading-tight ${
                  now ? 'text-kumkuma-700' : done ? 'text-forest-700' : 'text-ink'
                }`}>
                  {s.title}
                  {now && (
                    <span className="ml-2 rounded-full bg-kumkuma-600 px-2 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-wide text-white">
                      You are here
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{s.body}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {/* The three standing promises, on the screen where somebody is
          deciding whether to hand us their business. Not repeated on
          every screen — a promise on eleven screens is wallpaper. */}
      <div className="border-t border-ink/[0.06] bg-forest-50/60 px-4 py-3">
        {[
          ['₹0 to join, ₹0 a month', 'Free while the network is being built, and the partner terms say so in writing.'],
          ['You choose every job', 'Decline anything. No penalty, no ranking hit.'],
          ['The money exists before you set out', 'The customer pays up front and Sambramo holds it.'],
        ].map(([t, d]) => (
          <div key={t} className="flex gap-2 py-1">
            <Check size={13} className="mt-[3px] shrink-0 text-forest-700" />
            <p className="text-[12px] leading-snug text-forest-900">
              <span className="font-extrabold">{t}. </span>{d}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

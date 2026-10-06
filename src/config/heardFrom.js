import {
  Users, HeartHandshake, Instagram, MessageCircle, Search,
  Store, PartyPopper, BadgeCheck, MoreHorizontal,
} from 'lucide-react'

/**
 * Where a partner came from, asked once.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS WORTH A SCREEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing else in this schema can answer "which channel brought the
 * partners who are still working in ninety days" — and that question is
 * the whole of the recruiting budget. A referral from an existing
 * partner and a Play Store install look identical in `vendors` today,
 * and they are not remotely the same partner.
 *
 * It is asked at onboarding because it is only answerable at onboarding.
 * A month later nobody remembers, and a survey nobody opens produces a
 * self-selected sample of the enthusiastic.
 *
 * ── The values are constrained, the detail is not ────────────────────
 * `vendors.heard_from` has a CHECK (migration 112) because an attribution
 * column that accepts free text becomes forty spellings of "instagram"
 * within a month and then cannot be grouped. What matters and cannot be
 * enumerated — WHICH partner referred them, WHICH event — goes in
 * `heard_from_detail`, which is why the referral options ask a follow-up.
 *
 * ── Why "another partner" is first ───────────────────────────────────
 * Not to bias the answer. It is first because it is the answer we most
 * want to be able to act on: a partner who refers another partner is the
 * cheapest and best supply this business will ever get, and knowing who
 * they are is what lets somebody thank them.
 */

export const HEARD_FROM = [
  {
    id: 'partner',
    icon: Users,
    label: 'Another partner told me',
    /* The follow-up is the point of the option. "A partner referred me"
       with no name is a statistic; with a name it is somebody to ring. */
    detail: 'Their name or business, if you remember it',
  },
  {
    id: 'customer',
    icon: HeartHandshake,
    label: 'A customer mentioned it',
    detail: null,
  },
  { id: 'instagram',  icon: Instagram,      label: 'Instagram',            detail: null },
  { id: 'whatsapp',   icon: MessageCircle,  label: 'A WhatsApp message',   detail: null },
  { id: 'google',     icon: Search,         label: 'I searched for it',    detail: null },
  { id: 'play_store', icon: Store,          label: 'The Play Store',       detail: null },
  {
    id: 'event',
    icon: PartyPopper,
    label: 'At an event or a shop',
    detail: 'Which one?',
  },
  {
    id: 'sambramo_team',
    icon: BadgeCheck,
    label: 'Somebody from Sambramo signed me up',
    detail: 'Who was it?',
  },
  {
    id: 'other',
    icon: MoreHorizontal,
    label: 'Somewhere else',
    detail: 'Where?',
  },
]

export const heardFrom = id => HEARD_FROM.find(h => h.id === id) ?? null

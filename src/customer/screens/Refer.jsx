/**
 * Refer a friend — where the third promo card's button goes.
 *
 * The link carries the customer's own referral code (profiles.referral_code,
 * resolved at sign-up by AuthContext from `ee_pending_ref`). It points at
 * the public site, never at window.location: inside the APK the origin is
 * https://customer.sambramo.app, a name that exists only on this phone.
 *
 * ── No reward amount is written here ────────────────────────────────
 * The promo artwork says ₹500 and 10% off. Nothing on the customer side
 * pays either yet (the live programme, migration 158, is partner-to-
 * partner), so this screen promises nothing in its own words until the
 * reward is wired. The artwork is Mohan's call.
 */
import { useState } from 'react'
import { Check, Copy, Share2, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { artFor } from '../data/art'
import { BackHeader } from '../ui/kit'

const PUBLIC_ORIGIN = 'https://sambramoh.vercel.app'

export default function Refer() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)
  const code = profile?.referral_code ?? null
  const link = code ? `${PUBLIC_ORIGIN}/signup?ref=${encodeURIComponent(code)}` : PUBLIC_ORIGIN
  const text = 'I plan our celebrations here — every master you need, booked in minutes. Join me:'

  async function share() {
    if (navigator.share) { try { await navigator.share({ title: 'Celebrate together', text, url: link }); return } catch { /* dismissed */ } }
    copy()
  }
  async function copy() {
    try { await navigator.clipboard.writeText(`${text} ${link}`); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard off */ }
  }

  return (
    <main className="cx-enter pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
      <BackHeader title="Celebrate together" sub="Invite friends and family" />
      <img src={artFor('promo-refer')} alt="Celebrate together — refer your friend" className="mx-4 block aspect-[1670/941] w-[calc(100%-32px)] rounded-[22px] object-cover shadow-[0_0_0_1px_#EEE6FA,0_18px_32px_-22px_rgba(58,18,144,.7)]" />

      <section className="mx-4 mt-5 rounded-[24px] bg-[var(--am-50)] p-4 ring-1 ring-[var(--am-200)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">Your invite code</p>
        <p className="cx-num mt-1 text-[28px] font-extrabold tracking-[0.06em]" data-ref-code>{code ?? '— — —'}</p>
        <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--ink-3)]">{link.replace(/^https?:\/\//, '')}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={share} className="cx-press cx-cta flex h-14 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" data-share>
            <Share2 size={18} />Share my invite
          </button>
          <button type="button" onClick={copy} aria-label="Copy" className="cx-press cx-btn grid h-14 w-14 place-items-center rounded-[18px]">{copied ? <Check size={20} strokeWidth={3} /> : <Copy size={20} />}</button>
        </div>
        {!code && <p className="mt-3 text-[12px] font-semibold text-[var(--ink-3)]">Your personal code appears here once your account finishes setting up. The link above still invites them.</p>}
      </section>

      <ol className="mx-4 mt-5 grid gap-2">
        {[['Share your invite', 'WhatsApp it to the people you celebrate with.'], ['They plan with you', 'Your friend signs up with your code.'], ['Celebrate together', 'Plan the same occasions, pick masters, book in minutes.']].map(([t, d], k) => (
          <li key={t} className="flex items-start gap-3 rounded-[18px] bg-white p-3 shadow-[0_0_0_1px_#EEE6FA]">
            <span className="cx-num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--am-100)] text-[13px] font-extrabold text-[var(--am-ink)]">{k + 1}</span>
            <span><span className="block text-[14px] font-extrabold">{t}</span><span className="block text-[12px] font-semibold text-[var(--ink-2)]">{d}</span></span>
          </li>
        ))}
      </ol>
      <p className="mx-6 mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] font-semibold text-[var(--ink-3)]"><Users size={14} />Rewards are announced in the app when they go live.</p>
    </main>
  )
}

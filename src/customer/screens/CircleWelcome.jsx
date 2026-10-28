/**
 * /rsvp/circle/:join — a style circle's invite link, opened by a relative.
 *
 * They see the invitation card and the circle (its name, its colours, how
 * many are in it), type their name, and they're in: circle_enter finds
 * them by phone if they are already a guest, otherwise adds them as one,
 * and hands back their own RSVP link — where they answer, share travel,
 * and chat with the circle. No app, no sign-in.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Sparkles, Users } from 'lucide-react'
import { OCCASION } from '../data/occasions'
import InviteCard from '../ui/InviteCard'
import { Swatches } from '../ui/guestCareUI'
import { circleEnter, circleWelcome } from '../lib/guestCare'

export default function CircleWelcome() {
  const { join } = useParams()
  const navigate = useNavigate()
  const [w, setW] = useState(undefined)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { circleWelcome(join).then(setW).catch(() => setW(null)) }, [join])

  async function enter() {
    setBusy(true); setErr('')
    try { const r = await circleEnter(join, name.trim(), phone.trim()); navigate(`/rsvp/${r.token}?circle=1`, { replace: true }) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <main className="cx-enter min-h-[100dvh] bg-gradient-to-b from-[#FDF2F8] via-[#FBF8FF] to-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] pt-[calc(env(safe-area-inset-top,0px)+16px)]" data-circle-welcome>
      <div className="mx-auto max-w-[480px]">
        {w === undefined ? <div className="grid min-h-[60dvh] place-items-center"><Loader2 className="animate-spin text-[var(--brand)]" /></div>
          : !w ? <p className="grid min-h-[60dvh] place-items-center text-center text-[15px] font-bold text-[var(--ink-2)]">This circle link isn’t active. Ask whoever sent it for a new one.</p>
          : (
            <>
              <div className="mx-auto w-[72%]"><InviteCard inv={w.invitation} occasion={OCCASION[w.invitation.occasion] ?? null} theme={w.invitation.theme} /></div>
              <section className="mt-4 rounded-[24px] bg-white p-5 text-center shadow-[0_0_0_1px_#F5D0E6]">
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#DB2777]"><Sparkles size={13} />You’re invited to a style circle</p>
                <div className="mt-2 flex justify-center"><Swatches colors={w.circle.colors} size={34} /></div>
                <p className="mt-2 text-[22px] font-black tracking-[-0.03em] text-[#1C1033]">{w.circle.name}</p>
                {w.circle.note && <p className="mt-1 text-[13px] font-semibold text-[var(--ink-2)]">{w.circle.note}</p>}
                <p className="mt-2 flex items-center justify-center gap-1 text-[12.5px] font-extrabold text-[#5B21B6]"><Users size={14} />{w.circle.members} already planning their looks</p>
                <div className="mt-4 space-y-2 text-left">
                  <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Your name" className="h-12 w-full rounded-[14px] bg-[#FAF8FD] px-4 text-[15px] font-bold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" data-circle-name />
                  <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" maxLength={16} placeholder="WhatsApp number (so the host can reach you)" className="h-12 w-full rounded-[14px] bg-[#FAF8FD] px-4 text-[14px] font-semibold outline-none ring-1 ring-[#E7E1F0] focus:ring-[var(--brand)]" />
                </div>
                {err && <p className="mt-2 text-[12.5px] font-bold text-[#9B1A2A]">{err}</p>}
                <button type="button" disabled={name.trim().length < 2 || busy} onClick={enter} className="cx-press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#DB2777] to-[#7C3AED] text-[16px] font-extrabold text-white shadow-[0_14px_28px_-14px_rgba(219,39,119,.9)] disabled:opacity-40" data-circle-enter>
                  {busy && <Loader2 size={18} className="animate-spin" />}Join the circle & RSVP
                </button>
                <p className="mt-2 text-[11.5px] font-semibold text-[var(--ink-3)]">{w.invitation.title}{w.invitation.hosts ? ` — ${w.invitation.hosts}` : ''}</p>
              </section>
            </>
          )}
      </div>
    </main>
  )
}

/**
 * Sign in without leaving the screen: email, then the 6-digit code.
 *
 * Email OTP until launch (phone OTP needs DLT registration). The role is
 * decided by the surface — this is the customer app, so a new account is
 * a customer; see AuthContext.intendedRole.
 */
import { useState } from 'react'
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Sheet } from '../ui/kit'

export default function SignInSheet({ open, onClose, onDone, why = 'to confirm your booking' }) {
  const { sendEmailOtp, verifyEmailOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function send() {
    setBusy(true); setErr('')
    try { await sendEmailOtp(email.trim()); setSent(true) } catch (e) { setErr(e.message ?? 'Could not send the code.') } finally { setBusy(false) }
  }
  async function verify() {
    setBusy(true); setErr('')
    try { await verifyEmailOtp(email.trim(), code.trim()); onDone?.() } catch (e) { setErr(e.message ?? 'That code did not work.') } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title={sent ? 'Enter the code' : 'Sign in'}>
      <p className="text-[13.5px] font-semibold leading-relaxed text-[var(--ink-2)]">
        {sent ? <>We sent a 6-digit code to <b className="text-[var(--ink)]">{email}</b>.</> : `Sign in ${why}. No password — we email you a code.`}
      </p>
      {!sent ? (
        <label className="mt-4 flex h-14 items-center gap-3 rounded-[18px] bg-[var(--soft)] px-4">
          <Mail size={19} className="text-[var(--brand)]" />
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            className="h-full flex-1 bg-transparent text-[15px] font-bold outline-none placeholder:text-[var(--ink-3)]" />
        </label>
      ) : (
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          className="cx-num mt-4 h-16 w-full rounded-[18px] bg-[var(--soft)] text-center text-[30px] font-extrabold tracking-[0.5em] outline-none" aria-label="Code" />
      )}
      {err && <p className="mt-2 text-[12.5px] font-bold text-[#C8112A]">{err}</p>}
      <button type="button" disabled={busy || (!sent ? !valid : code.length !== 6)} onClick={sent ? verify : send}
        className="cx-press cx-cta mb-2 mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold">
        {busy ? <Loader2 size={18} className="animate-spin" /> : null}{sent ? 'Verify and continue' : 'Email me a code'}{!busy && <ArrowRight size={18} />}
      </button>
      {sent && <button type="button" onClick={() => { setSent(false); setCode('') }} className="mb-2 w-full py-2 text-[13px] font-extrabold text-[var(--brand)]">Use a different email</button>}
    </Sheet>
  )
}

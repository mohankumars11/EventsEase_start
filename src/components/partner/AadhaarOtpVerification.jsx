import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Smartphone, LockKeyhole, TriangleAlert } from 'lucide-react'
import { verificationCall } from '../../lib/verification/edge'
import { supabase } from '../../lib/supabase'
import { checkIdentity } from '../../lib/validation/identity'
import { saveDocumentDetails } from '../../lib/partnerDocuments'

const OTP_SECONDS = 30

function formatAadhaar(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function last4(value) {
  return String(value ?? '').replace(/\D/g, '').slice(-4)
}

export default function AadhaarOtpVerification({ requirement, verdict, vendorId, onVerified }) {
  const [aadhaar, setAadhaar] = useState('')
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState('identity')
  const [challenge, setChallenge] = useState(null)
  const [maskedMobile, setMaskedMobile] = useState(null)
  const [otp, setOtp] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const cleaned = useMemo(() => aadhaar.replace(/\D/g, ''), [aadhaar])
  const numberCheck = cleaned.length === 12 ? checkIdentity('aadhaar', cleaned) : null
  const canSend = cleaned.length === 12 && numberCheck?.ok === true && consent && !busy
  const verified = verdict?.row?.provider_status === 'verified' || phase === 'verified'

  useEffect(() => {
    if (seconds <= 0) return
    const id = window.setInterval(() => setSeconds(v => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(id)
  }, [seconds])

  useEffect(() => {
    if (verified) setPhase('verified')
  }, [verified])

  async function post(body) {
    return verificationCall(body)
  }

  async function sendOtp() {
    if (!canSend) return
    setBusy(true); setError(''); setMessage('')
    try {
      const out = await post({ action: 'aadhaar_start', aadhaar: cleaned, vendorId, requirementId: requirement?.id || 'VER-ID-IDENTITY', consent: true })
      if (out.providerStatus === 'unavailable') {
        throw new Error(out.says || 'Aadhaar OTP service is not connected.')
      }
      if (!out.challenge) throw new Error(out.says || 'Aadhaar OTP service is not ready.')
      setChallenge(out.challenge)
      setMaskedMobile(out.maskedMobile || 'your Aadhaar-linked mobile')
      setSeconds(OTP_SECONDS)
      setPhase('otp')
      setMessage(out.says || 'OTP sent to your Aadhaar-linked mobile.')
    } catch (e) { setError(e?.message || 'We could not send the OTP. Please try again.') }
    finally { setBusy(false) }
  }

  async function verifyOtp() {
    if (busy || !challenge || !/^\d{6}$/.test(otp)) return
    setBusy(true); setError(''); setMessage('')
    try {
      /* Create the identity row before the provider result so the backend
         can stamp the exact requirement row immediately. */
      await saveDocumentDetails({
        vendorId,
        requirementId: requirement?.id || 'VER-ID-IDENTITY',
        kind: 'aadhaar',
        existing: verdict?.row || null,
        number: cleaned,
        checksumOk: true,
        checksumRule: 'aadhaar',
      })
      const out = await post({ action: 'aadhaar_verify', challenge, otp, vendorId, requirementId: requirement?.id || 'VER-ID-IDENTITY' })
      if (out.providerStatus === 'unavailable') throw new Error(out.says || 'Aadhaar verification service is unavailable.')
      if (out.providerStatus !== 'verified') throw new Error(out.says || 'The OTP did not verify this identity.')
      setPhase('verified')
      setMessage('Aadhaar authentication completed successfully.')
      await onVerified?.()
    } catch (e) { setError(e?.message || 'The OTP could not be verified.') }
    finally { setBusy(false) }
  }

  async function resend() {
    if (busy || seconds > 0 || !challenge) return
    setBusy(true); setError('')
    try {
      const out = await post({ action: 'aadhaar_resend', challenge, vendorId, requirementId: requirement?.id || 'VER-ID-IDENTITY' })
      setChallenge(out.challenge || challenge)
      setMaskedMobile(out.maskedMobile || maskedMobile)
      setSeconds(OTP_SECONDS)
      setMessage(out.says || 'A new OTP has been sent.')
    } catch (e) { setError(e?.message || 'We could not resend the OTP.') }
    finally { setBusy(false) }
  }

  function editNumber() {
    setPhase('identity'); setChallenge(null); setOtp(''); setError(''); setMessage('')
  }

  return (
    <section data-verification="aadhaar-otp" className="overflow-hidden rounded-[24px] bg-gradient-to-br from-plum-950 via-plum-900 to-plum-700 p-4 text-white shadow-[0_12px_30px_rgba(42,8,92,0.16)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.10] ring-1 ring-white/[0.15]"><ShieldCheck size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-extrabold">Aadhaar identity check</p>
            <span className="rounded-full bg-white/[0.10] px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-white/[0.85]">Recommended</span>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-white/[0.72]">Verify your identity with an Aadhaar-linked OTP. Sambramo keeps only the last four digits.</p>
        </div>
      </div>

      {phase === 'identity' && (
        <div className="mt-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/[0.68]">12-digit Aadhaar number</span>
            <div className="flex items-center gap-2 rounded-[16px] bg-white px-3.5 py-3 ring-1 ring-white/20">
              <LockKeyhole size={16} className="shrink-0 text-plum-700" />
              <input value={formatAadhaar(aadhaar)} onChange={e => { setAadhaar(e.target.value); setError(''); setMessage('') }} inputMode="numeric" autoComplete="off" placeholder="XXXX XXXX XXXX" className="min-w-0 flex-1 bg-transparent text-[17px] font-extrabold tracking-[0.08em] text-plum-950 outline-none placeholder:text-plum-950/30" aria-label="Aadhaar number" />
              {numberCheck?.ok && <CheckCircle2 size={19} className="shrink-0 text-emerald-600" />}
            </div>
          </label>
          {numberCheck && !numberCheck.ok && <p className="mt-2 text-[11.5px] font-semibold text-amber-100">{numberCheck.says}</p>}
          <label className="mt-3 flex items-start gap-3 rounded-[16px] bg-white/[0.08] p-3 ring-1 ring-white/[0.12]">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-current" />
            <span className="text-[11.5px] leading-relaxed text-white/[0.86]">I consent to Aadhaar authentication for Sambramo partner identity verification and understand that the result will be used to verify my partner account.</span>
          </label>
          <button type="button" disabled={!canSend} onClick={sendOtp} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-extrabold text-plum-900 disabled:cursor-not-allowed disabled:opacity-45">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Smartphone size={17} />} {busy ? 'Sending OTP…' : 'Send OTP'} {!busy && <ArrowRight size={16} />}
          </button>
          <div className="mt-3 flex items-center gap-2 text-[10.5px] text-white/[0.62]"><LockKeyhole size={12} /> We retain only the last four digits for the partner record.</div>
        </div>
      )}

      {phase === 'otp' && (
        <div className="mt-4">
          <div className="rounded-[16px] bg-white/[0.10] p-3 ring-1 ring-white/[0.12]"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.12]"><Smartphone size={16} /></span><div className="min-w-0"><p className="text-[12px] font-extrabold">OTP sent</p><p className="mt-0.5 truncate text-[11px] text-white/[0.68]">Sent to {maskedMobile}</p></div><button type="button" onClick={editNumber} className="ml-auto text-[11px] font-extrabold underline">Edit</button></div></div>
          <label className="mt-3 block"><span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/[0.68]">Enter 6-digit OTP</span><input value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-full rounded-[16px] bg-white px-4 py-3 text-center text-[22px] font-extrabold tracking-[0.24em] text-plum-950 outline-none" placeholder="• • • • • •" aria-label="Aadhaar OTP" /></label>
          <button type="button" disabled={busy || !/^\d{6}$/.test(otp)} onClick={verifyOtp} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 text-[13.5px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} {busy ? 'Verifying…' : 'Verify Aadhaar'} {!busy && <CheckCircle2 size={17} />}</button>
          <div className="mt-3 flex items-center justify-between gap-2"><button type="button" disabled={busy || seconds > 0} onClick={resend} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-white/[0.86] disabled:opacity-45"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> {seconds > 0 ? 'Resend in ' + seconds + 's' : 'Resend OTP'}</button><span className="text-[10.5px] text-white/[0.55]">Never share your OTP.</span></div>
        </div>
      )}

      {phase === 'verified' && <div className="mt-4 rounded-[18px] bg-emerald-500/[0.16] p-3.5 ring-1 ring-emerald-300/[0.25]"><div className="flex items-center gap-3"><CheckCircle2 size={24} className="shrink-0 text-emerald-300" strokeWidth={2.5} /><div className="min-w-0"><p className="text-[13.5px] font-extrabold">Identity verified</p><p className="mt-0.5 text-[11px] leading-snug text-white/[0.72]">Aadhaar authentication completed · ending {last4(aadhaar || verdict?.row?.number_last4 || '')}</p></div></div></div>}
      {message && <p className="mt-3 rounded-[14px] bg-white/[0.08] px-3 py-2.5 text-[11.5px] leading-snug text-white/[0.82]">{message}</p>}
      {error && <p className="mt-3 flex items-start gap-1.5 rounded-[14px] bg-amber-100/[0.10] px-3 py-2.5 text-[11.5px] leading-snug text-amber-100"><TriangleAlert size={13} className="mt-0.5 shrink-0" />{error}</p>}
    </section>
  )
}

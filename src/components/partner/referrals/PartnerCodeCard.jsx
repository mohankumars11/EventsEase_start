import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { ensureMyCode } from '../../../lib/referrals'
import { inviteLink } from '../../../lib/referralModel'
import { shareText, shareSaid } from '../../../lib/share'
import { track, EVENTS } from '../../../lib/track'
import { Card, CopyButton } from '../growth/parts'

/**
 * The partner's own code: one per partner, good for a poster.
 *
 * Minted by the server (ensure_my_referral_code). The old screen minted
 * it and then wrote it to `vendors` itself, which let a partner pick
 * their own code; 158 pins that column.
 *
 * It carries no trade. Somebody who joins with it is filed under the
 * trade they sign up as — which is why the trade screens hand out
 * invitation codes instead, and this card says so.
 */
export default function PartnerCodeCard({ code: initial }) {
  const [code, setCode] = useState(initial ?? null)
  const [said, setSaid] = useState(null)

  useEffect(() => {
    if (code) return
    let alive = true
    ensureMyCode().then(res => { if (alive && res.data) setCode(res.data) })
    return () => { alive = false }
  }, [code])

  if (!code) return null

  async function share() {
    track(EVENTS.REFERRAL_SHARED, { kind: 'partner_code' })
    const res = await shareText({
      title: 'Join me on Sambramo',
      text: `Join me on Sambramo as a partner. Sign up with my code ${code}: ${inviteLink(code)}`,
      dialogTitle: 'Invite a partner',
    })
    const msg = shareSaid(res.how)
    if (msg) { setSaid(msg); setTimeout(() => setSaid(null), 3000) }
  }

  return (
    <Card>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-plum-700">Your partner code</p>
      <div className="mt-2 flex items-center gap-2 rounded-[14px] bg-page-sunk px-3.5 py-3">
        <span className="flex-1 font-mono text-[18px] font-extrabold tracking-[0.18em] text-ink" data-testid="partner-code">{code}</span>
        <CopyButton text={code} onCopied={ok => ok && track(EVENTS.REFERRAL_STARTED, { kind: 'partner_code' })} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-mute">
        Works for any trade; they are counted under the trade they join as. To invite for a particular trade, open that trade below.
      </p>
      <button type="button" onClick={share}
        className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white active:scale-[0.98]">
        <Share2 size={14} /> Share your code
      </button>
      {said && <p className="mt-2 text-[11.5px] font-semibold text-ink-mute">{said}</p>}
    </Card>
  )
}

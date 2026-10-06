import { LifeBuoy, MessageCircle, Mail, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Fold from './Fold'
import { BRAND } from '../../config/sambramo'

/**
 * Where a partner goes when something has gone wrong.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A HELP SCREEN THAT ONLY OFFERS A CHAT LINK IS A SUPPORT COST
 * ══════════════════════════════════════════════════════════════════════
 *
 * The dashboard's own header comment says it: "a 'contact us' link where
 * a control belongs is a support cost dressed up as a feature." The same
 * is true of a help section. Most of what a partner would message about
 * has an answer that is already true of this app and does not change —
 * when money arrives, why a job did not reach them, what happens if they
 * cancel. Those are answered here, in the words a partner would use to
 * ask, and only then is there a way to reach a person.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MESSAGE ARRIVES WITH THE PARTNER CODE IN IT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every support conversation starts with "which partner are you", and a
 * partner reading their code off a different screen and typing it into
 * WhatsApp gets it wrong often enough to matter. The code is prefilled
 * and shown before the tap, so nobody is surprised by what they sent.
 *
 * Nothing here promises a response time. We do not have one to promise.
 */

const ANSWERS = [
  {
    q: 'When does my money actually arrive?',
    a: 'The customer pays before the job. Sambramo holds it until the work '
     + 'is done, then 24 hours after the event it becomes yours to claim. '
     + 'Once you claim it, it is usually sent within two working days — but '
     + 'we do not send anything to an unverified account, so add and verify '
     + 'your payout details before your first job, not after it.',
  },
  {
    q: 'Why am I not getting jobs?',
    a: 'Three things decide it, in this order: your services have to be '
     + 'live, not draft or under review; you have to be verified; and the '
     + 'job has to be inside your service area on a day you have not marked '
     + 'busy. The Jobs tab says which of those is currently true of you.',
  },
  {
    q: 'What is taken out of what the customer pays?',
    a: 'Sambramo takes a commission, and TCS and TDS are deposited with the '
     + 'authorities on your behalf — those two are not ours. Open any job '
     + 'in Earnings to see all four figures for that job and check the '
     + 'arithmetic yourself.',
  },
  {
    q: 'Can I change my prices after going live?',
    a: 'Yes. More, then My services, then the trade you want to change. '
     + 'A change goes back to our team for a look before it is live, so it '
     + 'is not instant — jobs you have already accepted are unaffected and '
     + 'keep the price you accepted them at.',
  },
  {
    q: 'What happens if I have to cancel a job?',
    a: 'Tell us as early as you can, through the job itself. A late '
     + 'cancellation leaves a family without a caterer on the morning of a '
     + 'function, so it counts against you and repeated ones end the '
     + 'partnership. An early one is a problem we can still solve.',
  },
  {
    q: 'Someone left me a review I think is unfair.',
    a: 'Message us with the job and what happened. We do read them, and we '
     + 'remove reviews that are about something other than the work you '
     + 'did. We do not remove one for being low.',
  },
]

export default function PartnerHelp({ vendor }) {
  const code = vendor?.partner_code ?? null
  const [copied, setCopied] = useState(false)

  const hello = code
    ? `Hello Sambramo, this is partner ${code}. `
    : 'Hello Sambramo, I am a partner and I need some help. '

  const wa = `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(hello)}`
  const mail = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
    code ? `Partner ${code}` : 'Partner support')}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(code ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* A clipboard that refuses is not an error worth a banner — the
         code is printed right next to the button and can be read. */
    }
  }

  return (
    <Fold icon={LifeBuoy} title="Help" summary="Answers first, then a person">
      <div className="space-y-3">
        <dl className="space-y-3">
          {ANSWERS.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-[13px] font-extrabold leading-snug text-ink">{q}</dt>
              <dd className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{a}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-[16px] bg-ink/[0.03] p-3">
          <p className="text-[12px] font-extrabold text-ink">Still stuck?</p>
          {code && (
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-ink-mute">
              We will ask for your partner code. It is
              <span className="font-mono font-extrabold tracking-wide text-ink">{code}</span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.08]"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              — it is already in the message below.
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-forest-600 px-4 text-[12.5px] font-extrabold text-white"
            >
              <MessageCircle size={14} /> WhatsApp us
            </a>
            <a
              href={mail}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-4 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.1]"
            >
              <Mail size={14} /> Email
            </a>
          </div>
        </div>
      </div>
    </Fold>
  )
}

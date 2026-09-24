import { useMemo, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { requirementsFor } from '../../data/compliance'
import { evaluateAll } from '../../lib/verification/satisfaction'
import DocumentCapture from '../partner/DocumentCapture'
import IdentityChoice from '../partner/IdentityChoice'

/**
 * "Get yourself verified."
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE BADGE HAS TO BE EARNED SOMEWHERE, AND THIS IS THE SOMEWHERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `vendors.is_verified` decides who receives work — `match_partners()`
 * filters on it — and until now the only way to move it was an operator
 * making a judgement call on a business name and a pincode. A partner
 * had no way to make their own case and no way to see where they stood.
 *
 * This is that screen. Four documents, all optional, and one button that
 * says "I am ready, look at me".
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY NOTHING HERE IS REQUIRED
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master signing up on a Sunday afternoon does not have a scan of
 * their PAN to hand, and demanding one at that moment loses the supply
 * this business does not yet have. So the screen never blocks — it makes
 * an argument instead: uploading is what gets you checked this week
 * rather than whenever somebody gets to you.
 *
 * That argument is stated once, at the top, and not repeated per field.
 * A row that nags on every line is a row people stop reading.
 *
 * ── The status a partner is actually asking about ────────────────────
 * Not "is my Aadhaar accepted" — "am I verified". So the verified state
 * leads, in the partner's own words, and the per-document verdicts sit
 * underneath as the detail behind it.
 *
 * ── The rows arrive as a prop ────────────────────────────────────────
 * PartnerAccount owns the read. It needs the count for the collapsed
 * fold's summary line, and it needs to know when migration 093 is absent
 * so it can decline to offer the row at all rather than open an empty
 * section. Fetching in both places would be two queries answering one
 * question, and they would disagree the moment one of them refreshed.
 */

/* Keyed on satisfaction.js's DOC_STATE, so there is one vocabulary for
   a document's standing rather than one per screen. */
const TONE = {
  verified:   'bg-forest-50 text-forest-800 ring-forest-200',
  pending:    'bg-saffron-400/15 text-saffron-900 ring-saffron-300/60',
  incomplete: 'bg-saffron-400/15 text-saffron-900 ring-saffron-300/60',
  rejected:   'bg-rose-50 text-rose-800 ring-rose-200',
  expired:    'bg-rose-50 text-rose-800 ring-rose-200',
  none:       'bg-ink/[0.04] text-ink-mute ring-ink/[0.06]',
}

const LABEL = {
  verified: 'Checked', pending: 'Being checked', incomplete: 'Unfinished',
  rejected: 'Sent back', expired: 'Expired', none: 'Not started',
}

/* Never "Verified". A human at Sambramo accepting a document means a
   human looked at it, which is a different and smaller claim than a
   government database confirming it exists. documentTypes.js
   verificationLabel() holds the same line. */
const CAPTION = {
  verified:   'A person at Sambramo has accepted this.',
  pending:    'Sent. Waiting for a person to look at it.',
  incomplete: 'Started, but something is still missing.',
  rejected:   'Sent back. Please upload it again.',
  expired:    'Out of date. Upload a current one.',
}

export default function VendorDocuments({
  vendor, byKind = {}, byRequirement = null, onUpdateVendor, onChanged, trades = [],
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)

  const vendorId = vendor?.id
  const verified = !!vendor?.is_verified
  const status   = vendor?.verification_status ?? 'draft'
  const uploaded = Object.keys(byRequirement ?? byKind).length

  /* What THIS partner is asked for, from the trades they listed. A
     partner with no listings yet gets the base set, which is correct:
     identity does not depend on what you do. */
  /* `answers` carries the partner's identity-document choice through, so
     this screen and the onboarding step ask for the SAME document. Without
     it a partner who chose a passport in step 4 is asked for an Aadhaar
     card here -- two screens disagreeing about one requirement, which is
     the exact failure `evaluateAll` is shared to avoid. */
  const identityChoice = vendor?.identity_document ?? null
  const requirements = useMemo(
    () => requirementsFor({ trades, answers: { identity_document: identityChoice } }),
    [trades, identityChoice])

  const identityReq = requirements.find(r => r.id === 'VER-ID-IDENTITY') ?? null
  const identityUploaded = !!(byRequirement ?? {})['VER-ID-IDENTITY']

  /* The same verdicts the onboarding step computes, from the same
     function. Two screens that decided independently whether a document
     was complete would eventually disagree, and the partner would be
     told different things in two places about one file. */
  const { results } = useMemo(
    () => evaluateAll(requirements, byRequirement ?? {}),
    [requirements, byRequirement])

  /* draft (or rejected) → submitted is the ONE verification transition a
     partner owns; 067's guard trigger allows exactly that and silently
     refuses everything else. So this is a plain column write through the
     dashboard's own `updateVendor` — the database is already the thing
     enforcing the rule, and going through updateVendor means the row
     Postgres returns lands back in state without refetching the account
     and collapsing every fold on the tab. */
  async function submit() {
    setSubmitting(true); setError(null)
    try {
      await onUpdateVendor({ verification_status: 'submitted' })
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  /* No card chrome of its own. This renders inside the Account tab's
     "Verification" fold, which already supplies the white panel, the ring
     and the title — a second card inside it draws a border 4px inside
     another border, which is the tell of a component pasted into a shell
     it was not written for. */
  return (
    <div className="space-y-3">
      {/* The argument, made once. */}
      {!verified && (
        <p className="rounded-[14px] bg-ink/[0.03] px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-ink-soft">
          Nothing here is compulsory and nothing is shown to customers. We
          look at it to confirm you are who you say you are — which is what
          lets us tell a family it is safe to pay before you arrive.
        </p>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ASKED FOR WHAT THEIR TRADE ACTUALLY NEEDS
          ══════════════════════════════════════════════════════════════

          This was DOCUMENT_KINDS — the same four rows for all twenty-six
          trades. A caterer was never asked about food and a mehendi
          artist was asked for a GST certificate, which is two failures
          in one list: the document that matters most was missing, and
          three of the four on screen were rows to scroll past.

          data/compliance.js decides, from the trades they actually
          listed. Each requirement names the upload slot it uses, so a
          caterer sees "Food business registration or licence" over the
          same control a decorator sees as "Proof of business". */}
      {/* Offered here as well as in onboarding, because this is where a
          partner comes back months later -- a driving licence that has
          since expired, or an Aadhaar they would now rather not use.
          Locked once something is filed: swapping the type under a stored
          row would leave a photograph of a passport filed as an Aadhaar
          card. */}
      {!verified && (
        <IdentityChoice
          value={identityChoice}
          options={identityReq?.acceptsTypes ?? []}
          locked={identityUploaded}
          onChange={async kind => {
            await onUpdateVendor?.({ identity_document: kind })
            await onChanged?.()
          }}
        />
      )}

      <ul className="space-y-2">
        {results.map(({ requirement, verdict, state }) => (
          <li key={requirement.id} data-requirement={requirement.id} data-state={state}>
            <button
              type="button"
              onClick={() => setOpenId(openId === requirement.id ? null : requirement.id)}
              className="flex w-full items-center gap-3 rounded-[16px] bg-white px-3 py-3 text-left ring-1 ring-ink/[0.06]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-ink">
                  {requirement.label}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-mute">
                  {CAPTION[state] ?? requirement.hint}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[10.5px] font-extrabold ring-1 ${TONE[state] ?? TONE.none}`}>
                {LABEL[state] ?? 'Not started'}
              </span>
            </button>

            {openId === requirement.id && (
              <div className="mt-2">
                <DocumentCapture
                  requirement={requirement}
                  verdict={verdict}
                  vendorId={vendorId}
                  listingId={requirement.listingId ?? null}
                  onUploaded={onChanged}
                  onClose={() => setOpenId(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className="rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700">{error}</p>
      )}

      {/* ── The one button that is theirs to press ───────────────────
          067's guard trigger allows exactly one verification transition
          from a partner: draft (or rejected) → submitted. So the button
          exists in exactly those two states and nowhere else — offering
          it to somebody already submitted would be a tap that raises a
          database exception. */}
      {!verified && ['draft', 'rejected'].includes(status) && (
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-primary w-full disabled:opacity-45"
        >
          {submitting ? 'Sending…' : uploaded ? 'Send for verification' : 'Ask to be verified'}
        </button>
      )}

      {status === 'rejected' && vendor?.verification_note && (
        <p className="rounded-[14px] bg-rose-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-rose-800">
          <span className="font-extrabold">What we noted:</span> {vendor.verification_note}
        </p>
      )}

      {verified && (
        <p className="inline-flex items-start gap-1.5 rounded-[14px] bg-forest-50 px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-forest-800">
          <BadgeCheck size={14} className="mt-0.5 shrink-0" />
          A human at Sambramo has checked you. Customers see the verified tick
          next to your name.
        </p>
      )}
    </div>
  )
}

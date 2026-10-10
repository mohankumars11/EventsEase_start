import { Check, Upload, ShieldCheck, TriangleAlert } from 'lucide-react'
import DocumentCapture from '../DocumentCapture'
import AadhaarOtpVerification from '../AadhaarOtpVerification'
import { KIND_BY_ID } from '../../../lib/partnerDocuments'

/**
 * The verification requirement list — one row per requirement, its real
 * state, and the existing upload / Aadhaar controls inline.
 *
 * Lifted out of pages/partner/steps/ComplianceStep.jsx unchanged so the
 * trade flows' Identity Verification & Bank Details step renders the SAME
 * rows, the same states and the same capture components as the account's
 * own verification screen.
 */
export const STATUS_TONE = {
  verified:   'bg-forest-50 text-forest-700 ring-forest-200',
  checked:    'bg-plum-50 text-plum-700 ring-plum-200',
  pending:    'bg-amber-50 text-amber-800 ring-amber-200',
  incomplete: 'bg-amber-50 text-amber-800 ring-amber-200',
  rejected:   'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  expired:    'bg-saffron-400/15 text-saffron-800 ring-saffron-300/60',
  none:       'bg-ink/[0.04] text-ink-mute ring-ink/[0.08]',
}

/**
 * What a document row is actually saying, from the columns that exist.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THREE DIFFERENT CLAIMS, AND THEY ARE NOT INTERCHANGEABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   checked    the NUMBER's own check digit agrees with the rest of it
 *              (`checksum_ok`, migration 142). Offline arithmetic. It
 *              catches typos and invented numbers and proves nothing
 *              about a person.
 *   verified   an operator accepted the document (`status`, 093), or a
 *              licensed provider confirmed it (`provider_status`, 142).
 *   uploaded   it is sitting in the queue.
 *
 * Collapsing these into one green tick is how a marketplace ends up
 * telling a customer that somebody was verified when a checksum passed.
 * The captions below say which one happened.
 */
export function rowState(verdict, doc) {
  if (!verdict) return doc ? 'pending' : 'none'
  /* evaluateAll already decided none / incomplete / expired / rejected /
     pending / verified. The only refinement here is cosmetic: a pending
     document whose NUMBER checked out gets its own word, because
     "checks out" and "verified" are different claims and the partner
     should be able to see which one they have. */
  if (verdict.state === 'pending' && doc?.checksum_ok) return 'checked'
  return verdict.state
}

export const STATE_CAPTION = {
  verified:   'Verified',
  checked:    'Number checks out — document still being read',
  pending:    'Sent — being checked',
  rejected:   'Sent back — please upload it again',
  expired:    'Expired — upload a current one',
}

export function Section({ title, items, docs, openId, onOpen, vendorId, onUploaded, listingFor, identityDoc }) {
  if (!items.length) return null
  return (
    <div className="mb-5">
      <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map(r => {
          const verdict = docs[r.id]
          const have = verdict?.row ?? null
          /* ── `verified_at` does not exist on vendor_documents ───────
             This read was `have?.verified_at`, a column 093 never
             created and 142 never added. It was always undefined, so
             the 'verified' branch below — its tick, its tone and its
             caption — was unreachable, and a document an operator had
             accepted months ago still read "Sent — being checked".

             The real columns are `status` (093: pending | accepted |
             rejected, written by an operator) and `provider_status`
             (142: not_checked | pending | verified | …, written by a
             verification provider). Both are consulted, and they are
             NOT the same claim — see `rowState`. */
          const state = rowState(verdict, have)
          const open = openId === r.id
          return (
            <li
              key={r.id}
              data-requirement={r.id}
              data-state={state}
              className="rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.07]"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${STATUS_TONE[state]}`}>
                  {state === 'verified' ? <Check size={15} strokeWidth={3} />
                    : state === 'rejected' || state === 'expired' ? <TriangleAlert size={15} />
                    : state === 'checked' || state === 'pending' ? <ShieldCheck size={15} />
                    : <Upload size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-extrabold leading-tight text-ink">
                    {r.label}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      r.required ? 'bg-rose-50 text-rose-700' : 'bg-ink/[0.05] text-ink-mute'
                    }`}>
                      {r.required ? 'Required' : 'Optional'}
                    </span>
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-ink-mute">{r.hint}</p>
                  {r.why && (
                    <p className="mt-1 text-[11.5px] italic leading-snug text-ink-mute">{r.why}</p>
                  )}
                  <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
                    {state === 'verified' && have?.provider_name === 'sambramo-instant-check'
                      ? 'Instantly checked by Sambramo'
                      : (STATE_CAPTION[state]
                        ?? `Not started · ${KIND_BY_ID[r.documentKind]?.label ?? 'document'}`)}
                  </p>
                  {/* An unfinished document is not a failed one, and the
                      difference is whether the partner is told what is
                      still missing. "Still needs the back, the expiry
                      date" is a task; a red cross is a dead end. */}
                  {verdict?.says && (
                    <p className="mt-1 text-[11.5px] leading-snug text-saffron-800">
                      {verdict.says}
                    </p>
                  )}

                  {/* The control this screen never had. Until now it
                      rendered state only, and the upload lived on a
                      different screen entirely -- so a partner read
                      "Not started" with nothing to tap. */}
                  <button
                    type="button"
                    onClick={() => onOpen?.(r.id)}
                    className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 text-[12px] font-extrabold text-ink-soft"
                  >
                    {open ? 'Close' : state === 'none' ? 'Add it' : 'Update'}
                  </button>
                </div>
              </div>

              {r.documentType === 'aadhaar' ? (
                <div className="mt-3">
                  <AadhaarOtpVerification
                    requirement={r}
                    verdict={verdict}
                    vendorId={vendorId}
                    onVerified={onUploaded}
                  />
                </div>
              ) : open && (
                <div className="mt-3">
                  <DocumentCapture
                    requirement={r}
                    verdict={verdict}
                    vendorId={vendorId}
                    listingId={listingFor?.(r.trade) ?? null}
                    compareWith={r.needsConsent ? identityDoc : null}
                    onUploaded={onUploaded}
                    onClose={() => onOpen?.(r.id)}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

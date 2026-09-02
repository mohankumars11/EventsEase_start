import { useRef, useState } from 'react'
import {
  BadgeCheck, Upload, Eye, Trash2, Loader2, FileText, Check, TriangleAlert,
} from 'lucide-react'
import {
  DOCUMENT_KINDS, uploadDocument, removeDocument, signedUrlFor,
} from '../../lib/partnerDocuments'

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

const TONE = {
  good:    'bg-forest-50 text-forest-800 ring-forest-200',
  pending: 'bg-saffron-400/15 text-saffron-900 ring-saffron-300/60',
  bad:     'bg-rose-50 text-rose-800 ring-rose-200',
  idle:    'bg-ink/[0.04] text-ink-mute ring-ink/[0.06]',
}

export default function VendorDocuments({ vendor, byKind, onUpdateVendor, onChanged }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const vendorId = vendor?.id
  const verified = !!vendor?.is_verified
  const status   = vendor?.verification_status ?? 'draft'
  const uploaded = Object.keys(byKind).length

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

      <ul className="divide-y divide-ink/[0.06]">
        {DOCUMENT_KINDS.map(kind => (
          <DocumentRow
            key={kind.id}
            kind={kind}
            row={byKind[kind.id]}
            vendorId={vendorId}
            onChanged={onChanged}
          />
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

/* ══════════════════════════════════════════════════════════════════════
   One document
   ══════════════════════════════════════════════════════════════════════

   A row, not a card. Four cards of an identical shape is 500px of a
   phone screen spent on four file pickers, and the thing a partner is
   scanning for is which ones are still empty — which a list answers in
   one glance and a stack of cards does not.

   The file input is hidden and driven by the row itself, because a bare
   <input type="file"> renders as an OS control that ignores every token
   in this design system and looks like a 1998 web form on a phone. */
function DocumentRow({ kind, row, vendorId, onChanged }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [last4, setLast4] = useState('')
  const [asking, setAsking] = useState(false)

  const badLast4 = !!last4 && !!kind.last4Pattern && !kind.last4Pattern.test(last4)

  const have = !!row
  const meta = have
    ? (row.status === 'accepted'
        ? { label: 'Accepted', tone: 'good', icon: Check }
        : row.status === 'rejected'
          ? { label: 'Not accepted', tone: 'bad', icon: TriangleAlert }
          : { label: 'Being checked', tone: 'pending', icon: Loader2 })
    : null

  async function pick(file) {
    if (!file) return
    setBusy(true); setError(null)
    try {
      await uploadDocument({ vendorId, kind: kind.id, file, last4: last4.trim() || null })
      setLast4(''); setAsking(false)
      await onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function view() {
    const url = await signedUrlFor(row.storage_path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else setError('Could not open that file just now.')
  }

  async function remove() {
    setBusy(true); setError(null)
    try {
      await removeDocument(row)
      await onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ${
          have ? TONE[meta.tone] : TONE.idle
        }`}>
          {have ? <FileText size={15} /> : <Upload size={15} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-extrabold leading-tight text-ink">
            {kind.label}
            {kind.recommended && !have && (
              <span className="ml-1.5 align-middle text-[10px] font-extrabold uppercase tracking-wider text-saffron-700">
                worth adding
              </span>
            )}
          </p>
          <p className="truncate text-[11.5px] font-semibold leading-snug text-ink-mute">
            {have
              ? `${meta.label}${row.number_last4 ? ` · ends ${row.number_last4}` : ''}`
              : kind.hint}
          </p>
        </div>

        {/* Actions, sized for a thumb and not for a mouse. */}
        <div className="flex shrink-0 items-center gap-1">
          {busy ? (
            <Loader2 size={16} className="animate-spin text-ink-mute" />
          ) : have ? (
            <>
              <button
                type="button" onClick={view} aria-label={`View your ${kind.label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute active:bg-ink/[0.06]"
              >
                <Eye size={16} />
              </button>
              <button
                type="button" onClick={remove} aria-label={`Remove your ${kind.label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute active:bg-rose-50 active:text-rose-600"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => (kind.last4Label ? setAsking(v => !v) : fileRef.current?.click())}
              className="rounded-full bg-ink/[0.05] px-3 py-1.5 text-[12px] font-extrabold text-ink active:bg-ink/[0.09]"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* The last-four box only appears once somebody has decided to add
          this document. Four permanently-visible text inputs above four
          permanently-visible file pickers is the version of this screen
          that nobody finishes. */}
      {asking && !have && (
        <div className="mt-2.5 rounded-[14px] bg-ink/[0.03] p-3">
          <label className="label text-[12px]" htmlFor={`doc-${kind.id}`}>
            {kind.last4Label} <span className="font-semibold text-ink-mute">(optional)</span>
          </label>
          <input
            id={`doc-${kind.id}`}
            className="input uppercase"
            maxLength={4}
            autoCapitalize="characters"
            value={last4}
            onChange={e => setLast4(e.target.value.toUpperCase())}
          />
          {/* Shaped, not required. A PAN ending in a letter and an Aadhaar
              ending in a letter are different mistakes, and the reviewer
              matching four characters against a card is the person who
              pays for a typo here — so it is worth catching. Leaving the
              box empty stays perfectly fine. */}
          <p className={`mt-1 text-[11px] font-semibold ${badLast4 ? 'text-rose-700' : 'text-ink-mute'}`}>
            {badLast4 ? `That is not the right shape. ${kind.last4Hint}` : kind.last4Hint}
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={badLast4}
            className="btn-primary mt-2.5 w-full disabled:opacity-45"
          >
            <Upload size={15} /> Choose a photo or PDF
          </button>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[11.5px] font-bold text-rose-700">{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => pick(e.target.files?.[0])}
      />
    </li>
  )
}

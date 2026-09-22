import { useRef, useState } from 'react'
import { Camera, Check, Loader2, TriangleAlert } from 'lucide-react'
import { uploadDocument, saveDocumentDetails } from '../../lib/partnerDocuments'
import { checkIdentity } from '../../lib/validation/identity'

/**
 * One requirement, and everything it says it needs.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FIELDS ARE THE REQUIREMENT'S, NOT THIS COMPONENT'S
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing here decides that a driving licence has two sides or that an
 * FSSAI licence expires. Every field below is rendered because the
 * requirement declared it — `backRequired`, `numberRequired`,
 * `holderNameRequired`, `issuingAuthorityRequired`, `expiryRequired`.
 *
 * That is the whole point of `lib/verification/requirements.js`. A
 * component that asked for an expiry date on a PAN would be a component
 * disagreeing with the engine, and the engine is what the guard tests.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE NUMBER IS CHECKED BEFORE IT IS SENT, AND ONLY FOUR DIGITS LEAVE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `checksumKind` runs the offline arithmetic in validation/identity.js —
 * Aadhaar's Verhoeff digit, the PAN structure, the GSTIN mod-36. A
 * mistyped or invented number is caught here, on the device, before
 * anybody is asked to look at a photograph.
 *
 * What is stored is `number_last4` and a boolean. The full number is
 * never sent: for Aadhaar that is not a preference but the Act, and for
 * everything else there is no operational reason to hold it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE ROW, TWO SIDES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Uploading a back does not create a second row and does not erase the
 * front — `uploadDocument` carries the other side across. A second row
 * would put back the uniqueness problem migration 143 removed.
 */

const inputCls =
  'w-full rounded-[12px] border-0 bg-white px-3 py-2.5 text-[13.5px] text-ink ' +
  'ring-1 ring-ink/[0.10] placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-plum-500'

/** One side of the document: a thumbnail, or a button to add one. */
function Side({ label, path, busy, onPick, disabled }) {
  const input = useRef(null)
  const [preview, setPreview] = useState(null)

  const pick = e => {
    const file = e.target.files?.[0]
    if (!file) return
    /* A local preview so the partner sees what they just chose without
       waiting for a round trip to storage and back through a signed
       URL. Revoked on the next pick to avoid leaking object URLs. */
    setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    onPick(file)
    e.target.value = ''
  }

  const has = !!(preview || path)

  return (
    <div className="flex-1">
      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy || disabled}
        className={`flex h-[92px] w-full items-center justify-center gap-2 rounded-[14px] ring-1 transition-colors ${
          has ? 'bg-forest-50 ring-forest-200' : 'bg-white ring-ink/[0.10]'
        } disabled:opacity-50`}
      >
        {busy ? <Loader2 size={18} className="animate-spin text-plum-600" />
          : preview ? <img src={preview} alt="" className="h-full w-full rounded-[14px] object-cover" />
          : has ? (
            <span className="flex flex-col items-center gap-1 text-forest-700">
              <Check size={18} strokeWidth={3} />
              <span className="text-[11px] font-extrabold">Added</span>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-ink-mute">
              <Camera size={18} />
              <span className="text-[11px] font-extrabold">Add photo</span>
            </span>
          )}
      </button>
      <input
        ref={input} type="file" className="hidden"
        accept="image/*,application/pdf" capture="environment"
        onChange={pick}
      />
    </div>
  )
}

export default function DocumentCapture({
  requirement, verdict, vendorId, listingId, onUploaded, onClose,
}) {
  const row = verdict?.row ?? null
  const [busySide, setBusySide] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [number, setNumber] = useState(row?.number_last4 ? '' : '')
  const [holderName, setHolderName] = useState(row?.holder_name ?? '')
  const [authority, setAuthority] = useState(row?.issuing_authority ?? '')
  const [issueDate, setIssueDate] = useState(row?.issue_date ?? '')
  const [expiryDate, setExpiryDate] = useState(row?.expires_on ?? '')

  /* Checked as they type, but only once there is enough to judge —
     telling somebody their Aadhaar is wrong at the third digit is how a
     correct form feels hostile. */
  const numberCheck = requirement.checksumKind && number.trim()
    ? checkIdentity(requirement.checksumKind, number)
    : null
  const numberSettled = number.trim().length >= 4

  async function send(file, side) {
    setBusySide(side); setError(null)
    try {
      const saved = await uploadDocument({
        vendorId,
        requirementId: requirement.id,
        kind: requirement.kind,
        listingId: listingId ?? null,
        trade: requirement.trade ?? null,
        file,
        side,
        existing: row,
      })
      onUploaded?.(saved)
    } catch (e) {
      setError(e?.message ?? 'That did not upload. Try once more.')
    } finally {
      setBusySide(null)
    }
  }

  async function saveDetails() {
    /* A number that fails its own checksum is not sent. There is no
       value in storing four digits off a number we already know is
       wrong, and the partner can fix it in front of us. */
    if (numberCheck && !numberCheck.ok) {
      setError(numberCheck.says)
      return
    }
    setSaving(true); setError(null)
    try {
      const saved = await saveDocumentDetails({
        vendorId,
        requirementId: requirement.id,
        kind: requirement.kind,
        listingId: listingId ?? null,
        trade: requirement.trade ?? null,
        existing: row,
        number: number.trim() || null,
        holderName: holderName.trim() || null,
        issuingAuthority: authority.trim() || null,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        checksumOk: numberCheck ? numberCheck.ok : undefined,
        checksumRule: requirement.checksumKind ?? undefined,
      })
      onUploaded?.(saved)
      onClose?.()
    } catch (e) {
      setError(e?.message ?? 'Could not save those details.')
    } finally {
      setSaving(false)
    }
  }

  const missing = verdict?.missing ?? []

  return (
    <section className="rounded-[20px] bg-page-sunk p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold leading-tight text-ink">{requirement.label}</h3>
          {requirement.why && (
            <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{requirement.why}</p>
          )}
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
                  className="shrink-0 text-[12px] font-extrabold text-ink-mute">
            Done
          </button>
        )}
      </div>

      {/* What is still wanted, named. */}
      {missing.length > 0 ? (
        <p className="mb-3 flex items-start gap-1.5 rounded-[12px] bg-saffron-400/10 px-3 py-2 text-[11.5px] leading-snug text-saffron-800">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          Still needs the {missing.join(', the ')}.
        </p>
      ) : verdict?.says ? (
        /* Nothing is missing, but there is still something to say --
           expired, or close enough to expiring to be worth renewing.
           Without this branch an out-of-date licence looked exactly
           like a current one. */
        <p className={`mb-3 flex items-start gap-1.5 rounded-[12px] px-3 py-2 text-[11.5px] leading-snug ${
          verdict.state === 'expired'
            ? 'bg-saffron-400/10 text-saffron-800'
            : 'bg-ink/[0.04] text-ink-soft'
        }`}>
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          {verdict.says}
        </p>
      ) : null}

      <div className="mb-3 flex gap-2.5">
        <Side
          label={requirement.backRequired ? 'Front' : 'The document'}
          path={row?.storage_path} busy={busySide === 'front'}
          onPick={f => send(f, 'front')}
        />
        {requirement.backRequired && (
          <Side
            label="Back" path={row?.back_path} busy={busySide === 'back'}
            onPick={f => send(f, 'back')}
          />
        )}
      </div>

      <div className="space-y-2.5">
        {requirement.numberRequired && (
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-extrabold text-ink">
              {requirement.label} number
              {row?.number_last4 && (
                <span className="ml-1.5 font-semibold text-ink-mute">
                  ending {row.number_last4} on file
                </span>
              )}
            </span>
            <input
              className={inputCls}
              value={number}
              inputMode={requirement.checksumKind === 'aadhaar' ? 'numeric' : 'text'}
              placeholder={requirement.mask ?? ''}
              onChange={e => setNumber(e.target.value)}
            />
            {numberCheck && numberSettled && (
              <span className={`mt-1 block text-[11.5px] leading-snug ${
                numberCheck.ok ? 'text-forest-700' : 'text-saffron-800'
              }`}>
                {numberCheck.says}
              </span>
            )}
            {/* Said plainly, because a partner typing a full Aadhaar into
                a phone deserves to know where it goes. */}
            <span className="mt-1 block text-[11px] leading-snug text-ink-mute">
              We check the number on your device and keep only the last four.
            </span>
          </label>
        )}

        {requirement.holderNameRequired && (
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-extrabold text-ink">
              Name exactly as printed
            </span>
            <input className={inputCls} value={holderName}
                   onChange={e => setHolderName(e.target.value)} />
          </label>
        )}

        {requirement.issuingAuthorityRequired && (
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-extrabold text-ink">
              Who issued it
            </span>
            <input className={inputCls} value={authority} placeholder="BBMP, RTO, FSSAI…"
                   onChange={e => setAuthority(e.target.value)} />
          </label>
        )}

        <div className="flex gap-2.5">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[11.5px] font-extrabold text-ink">
              Issued on <span className="font-semibold text-ink-mute">optional</span>
            </span>
            <input type="date" className={inputCls} value={issueDate}
                   onChange={e => setIssueDate(e.target.value)} />
          </label>
          {requirement.expiryRequired && (
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[11.5px] font-extrabold text-ink">Expires on</span>
              <input type="date" className={inputCls} value={expiryDate}
                     onChange={e => setExpiryDate(e.target.value)} />
            </label>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-saffron-800">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      <button
        type="button" onClick={saveDetails} disabled={saving}
        className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-plum-600 px-4 text-[13px] font-extrabold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {saving ? 'Saving…' : 'Save these details'}
      </button>
    </section>
  )
}

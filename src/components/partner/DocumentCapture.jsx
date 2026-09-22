import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Loader2, TriangleAlert } from 'lucide-react'
import { uploadDocument, saveDocumentDetails, signedUrlFor } from '../../lib/partnerDocuments'
import { checkIdentity } from '../../lib/validation/identity'
import { assessFile } from '../../lib/verification/imageQuality'
import { verification } from '../../lib/verification/providers'
import { judgeReading } from '../../lib/verification/providers/vision'
import { compareNames, MATCH } from '../../lib/verification/matching'
import BiometricConsent from './BiometricConsent'
import { CONSENT, fetchConsents, hasConsent } from '../../lib/partnerConsent'
import { supabase } from '../../lib/supabase'

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
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE PHOTOGRAPH IS NOW LOOKED AT, AND THE ORDER MATTERS
 * ══════════════════════════════════════════════════════════════════════
 *
 *   1  quality    on the device, free, instant
 *   2  classify   on the server: is this the document it is filed as
 *   3  upload     only now, and only if 1 and 2 allow it
 *   4  stamp      the server writes its OWN verdict onto the row
 *
 * The classification comes BEFORE the upload on purpose. A photograph of
 * a laptop should never reach storage at all — uploading it and then
 * deleting it would work, but it would mean every rejected image briefly
 * existed in a private bucket, and there is no reason for that.
 *
 * Step 4 is a second call because the row does not exist until step 3,
 * and the DEVICE is not allowed to write the verdict. If it could, a
 * partner could declare their laptop photo to be an Aadhaar card, which
 * is the exact thing being checked. Migration 148's trigger enforces
 * that in SQL too, so this is belt and braces.
 *
 * ── The refusal names what it saw ───────────────────────────────────
 * "Invalid document" teaches nobody anything and reads as an accusation.
 * "That looks like a laptop, not an Aadhaar card" is the same refusal
 * and tells them what to do next.
 *
 * ── What still never happens ────────────────────────────────────────
 * None of this says "verified". It says the image was READ. A forged
 * card reads exactly like a real one to a camera, and until a licensed
 * provider is contracted, a human reviewer is the only thing that can
 * approve a partner.
 */

const inputCls =
  'w-full rounded-[12px] border-0 bg-white px-3 py-2.5 text-[13.5px] text-ink ' +
  'ring-1 ring-ink/[0.10] placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-plum-500'

/** One side of the document: a thumbnail, or a button to add one. */
function Side({ label, path, busy, stage, rejected, accept, facing, onPick, disabled }) {
  const input = useRef(null)
  const [preview, setPreview] = useState(null)

  /* A refused photo must not keep sitting in the slot.
     The preview was set the moment the file was chosen, and nothing
     cleared it when the checks said no -- so the slot went green and
     showed the rejected image while storage held nothing at all. The
     partner read that as "done" and moved on. */
  useEffect(() => {
    if (!rejected) return
    setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [rejected])

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
        {busy ? (
            <span className="flex flex-col items-center gap-1 text-plum-700">
              <Loader2 size={18} className="animate-spin" />
              {/* Named, because "reading" takes a few seconds and an
                  unlabelled spinner at that length reads as stuck. */}
              <span className="text-[10px] font-extrabold">
                {stage === 'reading' ? 'Reading…' : stage === 'uploading' ? 'Saving…' : 'Checking…'}
              </span>
            </span>
          )
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
      {/* Both attributes come from the requirement now. `accept` was
          "image/*,application/pdf" for everything, which offered a PDF
          picker for a selfie; `capture` was "environment", which opened
          the rear camera when asking somebody to photograph their own
          face. */}
      <input
        ref={input} type="file" className="hidden"
        accept={accept} capture={facing}
        onChange={pick}
      />
    </div>
  )
}

export default function DocumentCapture({
  requirement, verdict, vendorId, listingId, compareWith = null, onUploaded, onClose,
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

  const [quality, setQuality] = useState(null)
  /* What the classifier said, and which step is running. Separate from
     `quality` because they fail for different reasons and the partner
     needs to be told which: "too blurry" and "that is a laptop" call
     for completely different next actions. */
  const [reading, setReading] = useState(null)
  const [stage, setStage] = useState(null)
  const [suggested, setSuggested] = useState(null)

  /* Only requirements that declare `needsConsent` ask. Everything else
     never reads the table, so a missing migration 150 costs nothing. */
  const [consented, setConsented] = useState(null)
  useEffect(() => {
    if (!requirement.needsConsent || !vendorId) return
    let cancelled = false
    fetchConsents(vendorId)
      .then(({ consents }) => {
        if (!cancelled) setConsented(hasConsent(consents, CONSENT.FACE_MATCH))
      })
      .catch(() => { if (!cancelled) setConsented(false) })
    return () => { cancelled = true }
  }, [requirement.needsConsent, vendorId])

  /* What the file picker offers, from the requirement rather than from
     this component. A selfie takes a photograph, not a PDF. */
  const accept = (requirement.allowedFileTypes ?? ['image/*', 'application/pdf']).join(',')
  const facing = requirement.captureFacing ?? 'environment'

  /* The camera stays shut until the question has been ANSWERED -- either
     way. A partner who said no still uploads the photo; it is compared
     by a person instead. What must not happen is the comparison
     happening before they were asked. */
  const awaitingConsent = !!requirement.needsConsent && consented === null

  /**
   * Quality, then content, then upload, then the server's own stamp.
   *
   * Reads top to bottom in the order the checks actually run, because
   * the order is the design: nothing reaches storage until both gates
   * have let it through.
   */
  async function send(file, side) {
    setBusySide(side); setError(null); setQuality(null); setReading(null)
    try {
      /* ── 1 · Judged before it leaves the device ─────────────────────
         A blurred or dark photograph is caught here, while the card is
         still in the partner's hand. The alternative is catching it two
         days later in a review queue and asking them to find it again.

         Warnings do NOT stop the upload — edge detection is a heuristic
         and refusing a real document on a guess is worse than accepting
         a slightly cropped one. */
      const verdict = await assessFile(file, { requirement })
      setQuality(verdict)
      if (!verdict.ok) {
        setError(verdict.failures[0]?.says ?? 'That photo could not be used.')
        return
      }

      /* ── 2 · Is it the document it is filed as? ─────────────────────
         The gate that did not exist. Only the front is classified: a
         back side is a barcode and an address, and asking a classifier
         whether that is "an Aadhaar card" invites a wrong answer about
         a correct photograph. */
      let judged = null
      let read = null
      if (side === 'front') {
        setStage('reading')
        read = await verification.readDocument({
          file,
          expectedType: requirement.detectAs?.[0] ?? null,
          requirementId: requirement.id,
          vendorId,
          accessToken: await tokenNow(),
        })
        judged = judgeReading(read, requirement)
        setReading({ ...read, judged })

        /* The only thing that stops an upload. Everything softer is said
           and then allowed through, because a human still reviews it and
           a wrongly refused document costs a real partner a real job. */
        if (judged.fatal) {
          setError(judged.says)
          return
        }
      }

      /* ── 3 · Now it may be stored ───────────────────────────────── */
      setStage('uploading')
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

      /* ── 4 · The server stamps its own verdict ──────────────────────
         Not this component. See the header. Best-effort by design: a
         document that is uploaded but unstamped is a document an
         operator reviews by eye, which is where it was heading anyway. */
      if (read?.stampToken && saved?.id) {
        const nameMatch = compareTyped(read, holderName)
        stamp(saved.id, read.stampToken, nameMatch).catch(() => {})
        if (nameMatch === MATCH.MISMATCH) {
          /* Said, never blocked. Indian names reorder, abbreviate,
             expand initials and transliterate two ways, and a person is
             far better at this than a string comparison. matchOutcome()
             in matching.js is written the same way for the same reason. */
          setError(`The name on the document does not look like "${holderName.trim()}". A person will check this — upload a different photo if you picked the wrong one.`)
        }
      }

      /* Anything the classifier read that the partner has not typed is
         offered, never written on their behalf. A form that fills itself
         in with a misread digit is worse than an empty one. */
      if (read?.extracted) suggestFrom(read.extracted)

      /* ── The face comparison, if it was agreed to ─────────────────
         Only when the partner said yes, and only ever advisory. A
         mismatch routes to the review queue; it never rejects anybody,
         because the cost of being wrong is somebody losing their
         livelihood over a bad photograph in bad light. */
      if (requirement.needsConsent && consented === true && saved?.id) {
        matchFace(file, saved.id).catch(() => {})
      }

      onUploaded?.(saved)
    } catch (e) {
      setError(e?.message ?? 'That did not upload. Try once more.')
    } finally {
      setBusySide(null); setStage(null)
    }
  }

  /** The partner's own token, for the endpoint to verify. */
  async function tokenNow() {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? null
  }

  /**
   * Compare the selfie with the photograph on the ID.
   *
   * Both images go up together and neither is stored by the endpoint.
   * The ID photograph is fetched back through a short-lived signed URL
   * -- the bucket is private and stays private.
   *
   * Nothing here can reject anybody. The strongest outcome is a row in
   * the review queue saying two photographs do not appear to be the
   * same person, which a reviewer then looks at. Bad light, a decade
   * between the two photographs, and a laminated card photographed
   * through glare are all ordinary, and a system that suspended people
   * over them would be suspending real partners weekly.
   */
  async function matchFace(selfie, documentId) {
    if (!compareWith?.storage_path) return
    const url = await signedUrlFor(compareWith.storage_path)
    if (!url) return

    const idBlob = await fetch(url).then(r => (r.ok ? r.blob() : null))
    if (!idBlob) return

    await fetch('/api/verify-document', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await tokenNow()}`,
      },
      body: JSON.stringify({
        documentId,
        compareFaces: true,
        selfieBase64: await blobBase64(selfie),
        idBase64: await blobBase64(idBlob),
        mimeType: selfie.type,
      }),
    })
  }

  /** Ask the server to write what the server decided. */
  async function stamp(documentId, stampToken, nameMatch) {
    await fetch('/api/verify-document', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await tokenNow()}`,
      },
      body: JSON.stringify({ documentId, stampToken, nameMatch }),
    })
  }

  /**
   * Does the name on the document look like the name that was typed?
   *
   * Runs HERE rather than on the server, because comparing them there
   * would mean sending the partner's typed name up for no other reason.
   * The document's name came back to this device and leaves it again as
   * one of four words.
   */
  function compareTyped(read, typed) {
    if (!requirement.holderNameRequired) return MATCH.NOT_AVAILABLE
    if (!typed?.trim() || !read?.extracted?.name) return MATCH.NOT_AVAILABLE
    return compareNames(typed, read.extracted.name).result
  }

  /* Offered, not applied. The partner presses to accept each one. */
  function suggestFrom(extracted) {
    setSuggested({
      number: extracted.number ?? null,
      holderName: extracted.name ?? null,
      expiryDate: extracted.expiry ?? null,
      authority: extracted.authority ?? null,
    })
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

      {/* ── What the classifier saw ────────────────────────────────
          Its own panel, above the fields, because it is the answer to
          the question the partner just asked by pressing the button.
          Green when the document was read and is what it should be;
          grey when nothing could be told, which is not a failure. */}
      <ReadingVerdict judged={reading?.judged} />

      {/* ── Offered, never applied ─────────────────────────────────
          A form that fills itself in from a misread digit is worse than
          an empty one: the partner scrolls past a wrong number they
          never typed and never checks it. Each value is a button. */}
      {suggested && Object.values(suggested).some(Boolean) && (
        <div className="mb-3 rounded-[12px] bg-plum-50 px-3 py-2.5 ring-1 ring-plum-100">
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-plum-800">
            Read from the document
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.number && requirement.numberRequired && (
              <Suggestion label={suggested.number} onUse={() => setNumber(suggested.number)} />
            )}
            {suggested.holderName && requirement.holderNameRequired && (
              <Suggestion label={suggested.holderName} onUse={() => setHolderName(suggested.holderName)} />
            )}
            {suggested.expiryDate && requirement.expiryRequired && (
              <Suggestion label={`Expires ${suggested.expiryDate}`} onUse={() => setExpiryDate(suggested.expiryDate)} />
            )}
            {suggested.authority && requirement.issuingAuthorityRequired && (
              <Suggestion label={suggested.authority} onUse={() => setAuthority(suggested.authority)} />
            )}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-plum-700/70">
            Tap to fill it in. Check it against the card — this is a reading,
            not a confirmation.
          </p>
        </div>
      )}

      {requirement.needsConsent && (
        <BiometricConsent
          vendorId={vendorId}
          granted={consented === true}
          onChanged={setConsented}
        />
      )}

      <div className="mb-3 flex gap-2.5">
        <Side
          label={requirement.backRequired ? 'Front' : 'The document'}
          path={row?.storage_path} busy={busySide === 'front'} stage={stage}
          rejected={!!error && busySide === null && !row?.storage_path}
          accept={accept} facing={facing} disabled={awaitingConsent}
          onPick={f => send(f, 'front')}
        />
        {requirement.backRequired && (
          <Side
            label="Back" path={row?.back_path} busy={busySide === 'back'} stage={stage}
            rejected={!!error && busySide === null && !row?.back_path}
            accept={accept} facing={facing} disabled={awaitingConsent}
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

      {/* Accepted, but worth a second look. Never blocks. */}
      {quality?.ok && quality.warnings?.length > 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-mute">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          {quality.warnings[0].says}
        </p>
      )}

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

/** One value the classifier read, and a press to accept it. */
function Suggestion({ label, onUse }) {
  return (
    <button
      type="button" onClick={onUse}
      className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-bold text-plum-900 ring-1 ring-plum-200"
    >
      {label}
    </button>
  )
}

/** A Blob or File to base64, without the data: prefix. */
function blobBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      const out = String(reader.result ?? '')
      const comma = out.indexOf(',')
      resolve(comma >= 0 ? out.slice(comma + 1) : out)
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * What the classifier concluded, in one line.
 *
 * Its own component so a scene can photograph all three states without
 * driving a file picker -- and because the three tones carry the whole
 * message. Green means read and correct. Amber means refused, and the
 * text names what was seen instead. Grey means nothing could be told,
 * which is not a failure and must not look like one.
 */
export function ReadingVerdict({ judged }) {
  if (!judged?.says) return null
  const state = !judged.ok ? 'wrong' : judged.uncertain ? 'uncertain' : 'read'
  return (
    <p
      data-reading={state}
      className={`mb-3 flex items-start gap-1.5 rounded-[12px] px-3 py-2 text-[11.5px] leading-snug ${
        state === 'wrong'
          ? 'bg-saffron-400/15 text-saffron-900'
          : state === 'uncertain'
            ? 'bg-ink/[0.04] text-ink-soft'
            : 'bg-forest-50 text-forest-800'
      }`}
    >
      {state === 'read'
        ? <Check size={12} className="mt-0.5 shrink-0" strokeWidth={3} />
        : <TriangleAlert size={12} className="mt-0.5 shrink-0" />}
      {judged.says}
    </p>
  )
}

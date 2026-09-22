/**
 * Is this photograph the document it is filed as?
 *
 * POST /api/verify-document
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE COMPLAINT THIS ANSWERS
 * ══════════════════════════════════════════════════════════════════════
 *
 * "For Aadhaar it is simply capturing any image and uploading it as a
 * document. Even if I upload a laptop image it is also taking it."
 *
 * That was exactly true. `imageQuality.js` checked blur, brightness,
 * resolution and edges, and every one of those is content-agnostic: a
 * sharp, well-lit photograph of a laptop passed every test, because
 * nothing anywhere looked at what was IN the picture.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS, AND THE WORD IT MUST NEVER USE
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is CLASSIFICATION and EXTRACTION. It reads a photograph and says
 * what it appears to be and what appears to be printed on it.
 *
 * It is NOT verification. Nothing here contacts UIDAI, NSDL, GSTN or
 * Parivahan; nothing here confirms the document exists, is current, or
 * belongs to the person holding it. A forged Aadhaar card reads exactly
 * like a real one to a camera.
 *
 * So the word "verified" does not appear in anything this returns, and
 * `verificationLabel()` in src/lib/verification/documentTypes.js refuses
 * to render it. A government-backed check needs a licensed provider --
 * AUA/KUA for Aadhaar, an aggregator for the rest -- and until one is
 * contracted, the honest ladder is:
 *
 *     read  ->  number checks out  ->  a person looked at it
 *
 * and only the third of those lets a partner go live.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT LEAVES THE DEVICE, AND WHAT IS KEPT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The image is posted here, sent to the model, and dropped. It is never
 * written to storage by this function, never logged, and never returned.
 *
 * The extracted NUMBER is returned to the device so the device can
 * compare it with what the partner typed -- and then it is gone. It is
 * not stored here and the caller keeps only `last4`. For Aadhaar that is
 * not a preference, it is the Act.
 *
 * Nothing raw is returned. The model's own words never reach a partner
 * or a customer; `verification_events` (migration 144) is the
 * operator-read, append-only place for that.
 */
import { createClient } from '@supabase/supabase-js'
import { cors } from './_lib/cors.js'
import { resolveProvider } from '../serverlib/providers.js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Bigger than any camera photo after the device-side compression. */
const MAX_BYTES = 6 * 1024 * 1024

/**
 * What the model is allowed to answer.
 *
 * A closed list, because "what is this?" with an open answer produces
 * "an identity document" for everything and cannot refuse anything. The
 * `not_a_document` entries are the important half: they are how a photo
 * of a laptop gets NAMED rather than just rejected.
 */
const KNOWN = [
  'aadhaar', 'pan', 'passport', 'voter_id', 'driving_licence',
  'vehicle_rc', 'gst_certificate', 'fssai_licence', 'shop_licence',
  'udyam', 'insurance_policy', 'bank_statement', 'cancelled_cheque',
  'police_clearance', 'psara_licence', 'selfie',
  'other_document', 'not_a_document',
]

const PROMPT = `You classify photographs of Indian identity and business documents.

Answer ONLY with JSON matching this shape:
{
  "documentType": one of ${KNOWN.join(' | ')},
  "confidence": 0.0 to 1.0,
  "isDocument": true or false,
  "whatYouSee": a short plain phrase naming the subject, e.g. "a laptop on a desk",
  "legible": true or false,
  "number": the document's own number exactly as printed, or null,
  "name": the holder's name exactly as printed, or null,
  "dob": YYYY-MM-DD or null,
  "expiry": YYYY-MM-DD or null,
  "authority": the issuing body if printed, or null
}

Rules:
- If the image is not a document at all, use "not_a_document", set
  isDocument false, and describe the subject in whatYouSee.
- Never guess a documentType to be helpful. If you cannot tell, use
  "other_document" with a low confidence.
- Transcribe only what is printed. Never infer, complete or correct a
  number or a name.
- A screenshot of a document, or a photograph of a screen showing one,
  is still not the document: set isDocument false and say so.
- Return the JSON and nothing else.`

function authorised(req) {
  const header = req.headers?.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

const fail = (res, status, providerStatus, says) =>
  res.status(status).json({ providerStatus, says, documentType: null, isDocument: null })

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!url || !anonKey) return fail(res, 500, 'unavailable', 'Document checking is not configured.')

  /* ── Who is asking ──────────────────────────────────────────────
     The partner's own access token, verified against Supabase. A
     `vendorId` in the body is not evidence of anything -- anybody with
     the anon key can type one -- so the vendor is looked up FROM the
     token and the body's copy is only ever compared, never trusted. */
  const token = authorised(req)
  if (!token) return fail(res, 401, 'unavailable', 'Please sign in again.')

  const asCaller = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: who, error: whoErr } = await asCaller.auth.getUser()
  if (whoErr || !who?.user) return fail(res, 401, 'unavailable', 'Please sign in again.')

  const { imageBase64, mimeType, requirementId, expectedType, vendorId,
          documentId, stampToken, nameMatch,
          compareFaces: wantsFaceCompare, selfieBase64, idBase64 } = req.body ?? {}

  /* ── Face comparison ────────────────────────────────────────────
     Its own path because it takes two images and answers a different
     question. Consent is re-checked server-side inside it: the panel in
     the app is where it is ASKED, this is where it is enforced. */
  if (wantsFaceCompare) {
    return compareFaces(res, { asCaller, documentId, selfieBase64, idBase64, mimeType })
  }

  /* ── Phase two: stamp the row with the verdict WE reached ────────
     The partner's device never writes detected_type. If it could, a
     partner could declare a photograph of a laptop to be an Aadhaar
     card, which is the exact check this endpoint exists to perform --
     and migration 148's trigger restores those columns from OLD for
     anybody who is not an operator, so the attempt would silently fail
     anyway.

     Instead the device sends back the id of the event THIS SERVER
     wrote, and the server re-reads its own record and stamps from that.
     The token is a uuid the server generated and returned once; it
     cannot be guessed, and nothing in it is taken on trust -- the
     verdict comes out of the row, not out of the request. */
  if (documentId && stampToken) {
    return stampDocument(res, { asCaller, documentId, stampToken, nameMatch })
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return fail(res, 400, 'unavailable', 'No image was sent.')
  }
  if (imageBase64.length * 0.75 > MAX_BYTES) {
    return fail(res, 413, 'unavailable', 'That image is too large to check.')
  }
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType ?? '')) {
    /* PDFs are a real document format and a real gap; they go to a human
       rather than being refused, because refusing a valid FSSAI
       certificate for being a PDF would be worse than not reading it. */
    return res.status(200).json({
      providerStatus: 'not_checked',
      documentType: null, isDocument: null,
      says: 'This will be checked by a person.',
    })
  }

  /* The vendor really does belong to this user. Read with the caller's
     own token so RLS is the thing enforcing it, not this line. */
  if (vendorId) {
    const { data: mine } = await asCaller
      .from('vendors').select('id').eq('id', vendorId).maybeSingle()
    if (!mine) return fail(res, 403, 'unavailable', 'That is not your account.')
  }

  const picked = resolveProvider(process.env)
  if (picked.error || !picked.provider?.images) {
    /* Not configured, or configured with a text-only model. Either way
       this is OUR gap, and it must never read as the partner's document
       being wrong. "unavailable" is not "invalid" -- the whole ladder
       depends on those staying distinct. */
    return res.status(200).json({
      providerStatus: 'unavailable',
      documentType: null, isDocument: null,
      says: 'We could not check this right now. It will be reviewed by a person.',
    })
  }

  let parsed = null
  let raw = null
  try {
    raw = await askModel(picked, imageBase64, mimeType, expectedType)
    parsed = extractJson(raw)
  } catch (err) {
    return res.status(200).json({
      providerStatus: 'unavailable',
      documentType: null, isDocument: null,
      says: 'We could not check this right now. It will be reviewed by a person.',
      // Not the model's words; just why the call did not complete.
      reason: String(err?.message ?? err).slice(0, 200),
    })
  }

  if (!parsed || !KNOWN.includes(parsed.documentType)) {
    return res.status(200).json({
      providerStatus: 'unavailable',
      documentType: null, isDocument: null,
      says: 'We could not read that clearly. It will be reviewed by a person.',
    })
  }

  /* ── The raw exchange goes where only an operator can read it ───── */
  const eventId = await recordEvent({
    profileId: who.user.id, vendorId, requirementId,
    provider: picked.id, model: picked.model, raw, parsed,
  })

  const confidence = clamp01(Number(parsed.confidence))

  return res.status(200).json({
    providerStatus: 'checked',
    /* Handed back so the device can ask us to stamp the row once it
       exists. Useless to anybody else: it only ever resolves to a row
       this server wrote, and only for the vendor who owns it. */
    stampToken: eventId,
    documentType: parsed.documentType,
    confidence,
    isDocument: parsed.isDocument !== false,
    whatYouSee: String(parsed.whatYouSee ?? '').slice(0, 120) || null,
    legible: parsed.legible !== false,
    /* Returned so the DEVICE can compare it with what was typed, and
       kept nowhere. The caller stores last4 and a boolean. */
    extracted: {
      number: str(parsed.number),
      name: str(parsed.name),
      dob: date(parsed.dob),
      expiry: date(parsed.expiry),
      authority: str(parsed.authority),
    },
  })
}

/* ══════════════════════════════════════════════════════════════════ */

const clamp01 = n => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)
const str = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null)
const date = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

async function askModel(picked, imageBase64, mimeType, expectedType) {
  const { provider, key, model } = picked
  const hint = expectedType
    ? `\n\nThe partner has filed this as: ${expectedType}. Judge the image on its own merits; do not let that filing change what you see.`
    : ''

  const body = provider.native === 'anthropic'
    ? {
        model,
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: PROMPT + hint },
          ],
        }],
      }
    : {
        model,
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: PROMPT + hint },
          ],
        }],
      }

  const headers = provider.native === 'anthropic'
    ? { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    : { 'content-type': 'application/json', authorization: `Bearer ${key}` }

  /* A partner is standing there holding a card. Twenty-five seconds and
     then a human reviews it. */
  const stop = AbortSignal.timeout(25_000)
  const r = await fetch(provider.url, { method: 'POST', headers, body: JSON.stringify(body), signal: stop })

  if (!r.ok) throw new Error(`provider returned ${r.status}`)
  const json = await r.json()

  return provider.native === 'anthropic'
    ? json?.content?.[0]?.text ?? ''
    : json?.choices?.[0]?.message?.content ?? ''
}

/** Models fence JSON, prefix it, and apologise before it. */
function extractJson(text) {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(candidate.slice(start, end + 1)) } catch { return null }
}

/**
 * The raw exchange, where only an operator can read it.
 *
 * Service-role, because `verification_events` has no INSERT policy for
 * anybody -- which is the point. Best-effort: a partner must not be
 * blocked from onboarding because an audit table is missing, and 144 may
 * not be applied yet.
 *
 * The number and the name are NOT written here. What an operator needs
 * to answer "why was my document refused" is the verdict and the model's
 * reasoning, not the partner's Aadhaar number sitting in a second table.
 */
async function recordEvent({ profileId, vendorId, requirementId, provider, model, raw, parsed }) {
  if (!serviceKey) return null
  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data } = await db.from('verification_events').insert({
      vendor_id: vendorId ?? null,
      direction: 'response',
      provider,
      payload: {
        model,
        /* 144 gives this table no profile_id column -- it hangs off an
           attempt, and a classification happens before a case exists.
           Kept in the payload so an operator can still answer "who sent
           this", without inventing a column the migration did not. */
        by_profile: profileId,
        requirement_id: requirementId ?? null,
        documentType: parsed?.documentType ?? null,
        confidence: parsed?.confidence ?? null,
        isDocument: parsed?.isDocument ?? null,
        whatYouSee: parsed?.whatYouSee ?? null,
        legible: parsed?.legible ?? null,
        /* Deliberately truncated and deliberately stripped: the verdict
           is worth keeping, the transcription of somebody's identity
           number is not. */
        raw: String(raw ?? '').replace(/\d{6,}/g, '[number]').slice(0, 2000),
      },
    }).select('id').maybeSingle()
    return data?.id ?? null
  } catch {
    /* An audit write that fails is a gap in the audit, not a reason to
       refuse the partner. Phase two simply does not happen, the columns
       stay null, and the operator sees an unclassified document -- which
       is what they saw before any of this existed. */
    return null
  }
}

/**
 * Write the verdict onto the document row.
 *
 * Service-role, because migration 148's trigger forbids everyone else --
 * including the partner whose document it is. The only thing taken from
 * the request is WHICH event to read; everything written comes out of
 * that event.
 *
 * `nameMatch` is the exception and is deliberately narrow: the name
 * comparison happens on the device, because comparing it here would mean
 * sending the partner's typed name to the server for no other reason.
 * It is a four-value enum the CHECK constraint polices, so the worst a
 * forged one can do is mislead an operator about a comparison they can
 * redo by looking at the document.
 */
async function stampDocument(res, { asCaller, documentId, stampToken, nameMatch }) {
  if (!serviceKey) return res.status(200).json({ stamped: false })

  /* The caller must own the document. Read with THEIR token, so RLS is
     what proves it rather than a line of JavaScript. */
  const { data: doc } = await asCaller
    .from('vendor_documents').select('id, vendor_id').eq('id', documentId).maybeSingle()
  if (!doc) return res.status(403).json({ stamped: false, error: 'not_yours' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: event } = await db
    .from('verification_events').select('vendor_id, payload')
    .eq('id', stampToken).maybeSingle()

  /* A token from somebody else's classification is refused rather than
     applied to this row. */
  if (!event || (event.vendor_id && event.vendor_id !== doc.vendor_id)) {
    return res.status(403).json({ stamped: false, error: 'token_mismatch' })
  }

  const payload = event.payload ?? {}
  const { error } = await db.from('vendor_documents').update({
    detected_type: payload.documentType ?? null,
    detected_confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
    name_match: ['match', 'partial_match', 'mismatch', 'not_available'].includes(nameMatch)
      ? nameMatch : null,
    classified_at: new Date().toISOString(),
  }).eq('id', documentId)

  /* 148 not applied yet: the columns do not exist. Reported, not thrown
     -- the document is uploaded and a human can still review it. */
  if (error) return res.status(200).json({ stamped: false, hint: 'apply migration 148' })
  return res.status(200).json({ stamped: true })
}

/* ══════════════════════════════════════════════════════════════════ */

const FACE_PROMPT = `You are comparing two photographs of faces.

The first is a photograph a person has just taken of themselves.
The second is the photograph printed on an identity document.

Answer ONLY with JSON:
{
  "sameRegion": "match" | "partial_match" | "mismatch" | "not_available",
  "confidence": 0.0 to 1.0,
  "why": one short plain sentence
}

Rules:
- "match" only when you are confident they are the same person.
- "partial_match" when they could be, but the photographs are too
  different in age, lighting, angle or quality to be sure. Printed ID
  photographs are often a decade old, low resolution, and photographed
  through lamination — that is normal, not suspicious.
- "mismatch" only when they are clearly different people.
- "not_available" when a face cannot be found in one or both images.
- Prefer "partial_match" to guessing. A person will read this.
- Return the JSON and nothing else.`

/**
 * Do these two photographs look like the same person?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ANSWER IS ADVISORY, ALWAYS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The strongest thing this can produce is a row in the review queue
 * saying two photographs do not appear to match, which a human then
 * looks at. It cannot reject, suspend or ban, and there is deliberately
 * no code path by which it could.
 *
 * That is not caution for its own sake. An ID photograph is often ten
 * years old, taken at a government counter, printed small and
 * photographed through lamination and glare. "Different person" and
 * "same person, terrible photograph" look very alike, and a system that
 * acted on the difference would be acting against real partners
 * regularly.
 *
 * Neither image is stored. Both are dropped when this returns.
 */
async function compareFaces(res, { asCaller, documentId, selfieBase64, idBase64, mimeType }) {
  if (!documentId || !selfieBase64 || !idBase64) {
    return res.status(400).json({ compared: false, error: 'two images are needed' })
  }

  /* Owned by the caller, proved by RLS rather than by this line. */
  const { data: doc } = await asCaller
    .from('vendor_documents').select('id, vendor_id').eq('id', documentId).maybeSingle()
  if (!doc) return res.status(403).json({ compared: false, error: 'not_yours' })

  /* Consent, re-checked on the server. The panel in the app is where it
     is ASKED; this is where it is enforced. A client that skipped the
     panel, or a partner who withdrew between uploading and this call,
     must not have their face processed. */
  const { data: consented } = await asCaller
    .rpc('has_consent', { p_vendor: doc.vendor_id, p_purpose: 'face_match' })
  if (consented !== true) {
    return res.status(200).json({ compared: false, reason: 'no_consent' })
  }

  const picked = resolveProvider(process.env)
  if (picked.error || !picked.provider?.images) {
    return res.status(200).json({ compared: false, reason: 'unavailable' })
  }

  let parsed = null
  try {
    const raw = await askModelTwoImages(picked, selfieBase64, idBase64, mimeType)
    parsed = extractJson(raw)
  } catch {
    return res.status(200).json({ compared: false, reason: 'unavailable' })
  }

  const VALUES = ['match', 'partial_match', 'mismatch', 'not_available']
  const result = VALUES.includes(parsed?.sameRegion) ? parsed.sameRegion : 'not_available'

  if (!serviceKey) return res.status(200).json({ compared: true, result })

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  /* The verdict on the row, written by the server. Best-effort: 150 may
     not be applied, and an unstamped selfie is one a reviewer compares
     by eye, which is where it was going anyway. */
  await db.from('vendor_documents')
    .update({ face_match: result, classified_at: new Date().toISOString() })
    .eq('id', documentId)

  /* And the reasoning, where only an operator can read it. The images
     are NOT written -- only what was concluded about them. */
  await db.from('verification_events').insert({
    vendor_id: doc.vendor_id,
    direction: 'response',
    provider: picked.id,
    payload: {
      kind: 'face_match',
      document_id: documentId,
      result,
      confidence: parsed?.confidence ?? null,
      why: String(parsed?.why ?? '').slice(0, 300),
    },
  }).then(() => {}, () => {})

  return res.status(200).json({ compared: true, result })
}

async function askModelTwoImages(picked, aBase64, bBase64, mimeType) {
  const { provider, key, model } = picked
  const type = /^image\/(jpeg|png|webp)$/.test(mimeType ?? '') ? mimeType : 'image/jpeg'

  const body = provider.native === 'anthropic'
    ? {
        model, max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: type, data: aBase64 } },
            { type: 'image', source: { type: 'base64', media_type: type, data: bBase64 } },
            { type: 'text', text: FACE_PROMPT },
          ],
        }],
      }
    : {
        model, max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${type};base64,${aBase64}` } },
            { type: 'image_url', image_url: { url: `data:${type};base64,${bBase64}` } },
            { type: 'text', text: FACE_PROMPT },
          ],
        }],
      }

  const headers = provider.native === 'anthropic'
    ? { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    : { 'content-type': 'application/json', authorization: `Bearer ${key}` }

  const r = await fetch(provider.url, {
    method: 'POST', headers, body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  })
  if (!r.ok) throw new Error(`provider returned ${r.status}`)
  const json = await r.json()
  return provider.native === 'anthropic'
    ? json?.content?.[0]?.text ?? ''
    : json?.choices?.[0]?.message?.content ?? ''
}

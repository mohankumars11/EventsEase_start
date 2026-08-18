import { supabase } from './supabase'
import { adminAuthHeader } from './adminSession'

/**
 * The browser half of the AI catalogue tools.
 *
 * Everything here does three things: turn what the admin gave us into a
 * payload, hand it to `/api/ai-catalog` with the caller's access token, and
 * hand the answer back. There is no model, no key and no prompt on this side —
 * the key would be in the bundle, and the bundle is public.
 *
 * ── Nothing here writes to the catalogue ─────────────────────────────────
 * The result of every call is a *proposal*. It goes into the same review table
 * as a pasted spreadsheet, the admin corrects it, and the existing
 * `importProducts` path does the writing. That separation is the point: it is
 * what makes a wrong row a five-second edit instead of a database repair.
 */

/** What the endpoint can read directly, and what has to be converted. */
export const ACCEPTED = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Photo',
  'image/png': 'Photo',
  'image/webp': 'Photo',
  'image/gif': 'Photo',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'text/plain': 'Text',
  'text/csv': 'Spreadsheet',
  'text/markdown': 'Text',
  'application/json': 'Data',
}

export const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.txt,.csv,.md,.json'

/**
 * ── How a file reaches the endpoint, and the one wall that is real ───────
 * Vercel caps a function's REQUEST BODY at 4.5 MB and rejects anything larger
 * with a bare `413` before the function runs — no chance to catch it, no
 * useful message. Base64 inflates a file by about a third, so sending bytes
 * inline tops out around a 3 MB PDF, and "your catalogue is too big" is not an
 * answer for a feature whose whole purpose is reading supplier catalogues.
 *
 * So the file goes to Supabase Storage and the endpoint gets a path. The
 * request body becomes a few hundred bytes. INLINE_MAX is only the fallback
 * for a database that has not run migration 052 yet, set below the wall with
 * room for base64 and the rest of the JSON.
 *
 * ── No size limit of our own ─────────────────────────────────────────────
 * There is deliberately no MAX_FILE_BYTES. A file of any size goes to storage,
 * and the only ceilings left are ones this code does not get to choose:
 *
 *   · the Supabase project's own upload limit (Storage → Settings), which the
 *     bucket now inherits rather than second-guessing;
 *   · the model's context window — a 400-page catalogue is not a size problem,
 *     it is a "more text than the model can hold at once" problem, and no
 *     upload limit would have helped with it.
 *
 * Both are reported by whoever enforces them, in their own words, rather than
 * pre-empted here by a number somebody guessed. The one limit still worth
 * warning about is the size at which reading gets slow, and that is a warning,
 * not a refusal.
 */
export const LARGE_FILE_WARN = 25 * 1024 * 1024
export const INLINE_MAX      = 3 * 1024 * 1024

const STAGING_BUCKET = 'ai-uploads'

export function describeFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const byExt = { pdf: 'PDF', docx: 'Word', doc: 'Word (old)', txt: 'Text', csv: 'Spreadsheet', md: 'Text', json: 'Data' }
  return ACCEPTED[file.type] ?? byExt[ext] ?? 'File'
}

/**
 * Whether we can read it at all, and what to say if we cannot.
 *
 * Only about the KIND of file, never the size. Size is the platform's call and
 * it reports its own limit accurately; a guess here would either block a file
 * that would have worked or pass one that would not.
 */
export function checkFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext === 'doc') {
    return `${file.name} is an old-format Word file. Open it and "Save as" .docx or PDF first.`
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return `${file.name} is a spreadsheet — copy the rows and paste them into the "Paste many" box instead, or export it as CSV.`
  }
  if (!ACCEPTED[file.type] && !['pdf', 'docx', 'txt', 'csv', 'md', 'json'].includes(ext)) {
    return `${file.name} isn't a kind of file this can read. Use a PDF, a photo, a Word file or a text file.`
  }
  return null
}

async function toBase64(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  // Chunked rather than String.fromCharCode(...bytes): spreading a multi-MB
  // array blows the argument limit and throws a RangeError on exactly the
  // large files this feature exists to read.
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

async function call(body) {
  // Refreshed if it is near expiry rather than sent as found. A Supabase
  // access token lasts about an hour, and an admin console left open through
  // a lunch break otherwise sends a dead token and is told its sign-in
  // expired — on a page that is visibly working.
  const authorization = await adminAuthHeader()

  const res = await fetch('/api/ai-catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify(body),
  })

  let payload
  try {
    payload = await res.json()
  } catch {
    // A 404 here almost always means the dev server, not a bug: `vite` serves
    // the app but not the /api functions, which only run under `vercel dev`.
    throw new Error(
      res.status === 404
        ? 'The AI endpoint is not running. It works on the deployed site; locally it needs `vercel dev` rather than `npm run dev`.'
        : `The AI service returned ${res.status}.`
    )
  }

  if (!res.ok) {
    // 413 comes from Vercel itself, before the function runs, so there is no
    // message of ours in it. Say what it actually means.
    if (res.status === 413) {
      throw new Error('That file was too big to send directly. Run migration 052_ai_upload_bucket.sql in the Supabase SQL editor — after that there is no size limit.')
    }
    throw new Error(payload?.error || `The AI service returned ${res.status}.`)
  }
  return payload
}

/**
 * Put one file somewhere the endpoint can fetch it from.
 *
 * Returns a `{ path }` descriptor on success. Returns null when the staging
 * bucket does not exist — migration 052 is applied by hand like every other
 * one here, and the caller then falls back to sending the bytes inline.
 */
async function stage(file, userId) {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const path = `${userId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from(STAGING_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (error) {
    // "Bucket not found" is the un-migrated case and is not an error worth
    // showing; anything else is.
    if (/bucket not found|does not exist/i.test(error.message)) return null
    throw new Error(`Could not upload ${file.name}: ${error.message}`)
  }

  return { name: file.name, media_type: file.type || 'application/octet-stream', path }
}

/**
 * Which readers this deployment actually has keys for.
 *
 * Asked once when the import panel opens, so it offers a choice only when
 * there is one to make — a "use the accurate reader" switch that silently does
 * nothing because no key is set is worse than no switch at all.
 *
 * Never throws: an unreachable endpoint means the panel simply shows no
 * choice, which is the correct fallback rather than a blocking error before
 * the admin has done anything.
 */
export async function fetchCapabilities() {
  try {
    const { providers } = await call({ mode: 'capabilities' })
    return providers ?? []
  } catch {
    return []
  }
}

/**
 * Read products out of files and/or pasted text.
 *
 * Files go to storage and only their paths travel in the request body — see
 * the note above INLINE_MAX for why sending the bytes themselves stops working
 * at about 3 MB. There is no size limit applied here.
 *
 * `onProgress` exists because uploading a stack of PDFs takes long enough to
 * look frozen, and a frozen button is a button somebody presses twice.
 */
export async function extractProducts({ files = [], text = '', instructions = '', categories = [], quality = 'fast', onProgress } = {}) {
  const staged = []
  let inlineBytes = 0

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? 'anon'

  for (const [i, file] of files.entries()) {
    const problem = checkFile(file)
    if (problem) throw new Error(problem)

    const mb = file.size / 1048576
    onProgress?.(
      file.size > LARGE_FILE_WARN
        // Told, not blocked. A 60 MB catalogue is a legitimate thing to hand
        // this; it just takes a while, and silence during a long upload is
        // what makes people press the button again.
        ? `Uploading ${file.name} — ${mb.toFixed(0)} MB, this will take a minute…`
        : `Uploading ${file.name} (${i + 1} of ${files.length})…`
    )

    const descriptor = await stage(file, userId)
    if (descriptor) {
      staged.push(descriptor)
      continue
    }

    // No staging bucket yet. Fall back to inline, and be explicit about the
    // ceiling rather than letting Vercel answer with a bare 413.
    if (file.size > INLINE_MAX) {
      throw new Error(
        `${file.name} is ${(file.size / 1048576).toFixed(1)} MB, and files over 3 MB need the upload area that migration 052_ai_upload_bucket.sql creates. Run it in the Supabase SQL editor, or send a smaller file.`
      )
    }
    inlineBytes += file.size * 1.37
    if (inlineBytes > INLINE_MAX) {
      throw new Error('Those add up to more than 3 MB. Run migration 052_ai_upload_bucket.sql to lift that, or send them one at a time.')
    }

    staged.push({
      name: file.name,
      media_type: file.type || 'application/octet-stream',
      data: await toBase64(file),
    })
  }

  onProgress?.(files.length ? 'Reading it…' : 'Thinking…')
  return call({ mode: 'extract', files: staged, text, instructions, categories, quality })
}

/** Ask for products that don't exist yet, researched against live sources. */
export async function researchProducts({ instructions, categories = [], quality = 'fast' }) {
  if (!instructions?.trim()) throw new Error('Say what you want to sell first.')
  return call({ mode: 'research', instructions, categories, quality })
}

/** Write the page for one product that already exists. */
export async function enrichProduct({ product, instructions = '' }) {
  return call({ mode: 'enrich', product, instructions })
}

/** Propose shelves for the shop. */
export async function suggestShelves({ instructions, categories = [] }) {
  return call({ mode: 'shelves', instructions, categories })
}

/**
 * Turn AI rows into the shape the existing review table and importer expect.
 *
 * Deliberately reuses `parseBulk`'s row shape — `errors[]`, `_line` — instead
 * of inventing a second one, so a pasted spreadsheet and an AI-read PDF land
 * in the same table, with the same validation and the same button underneath.
 * The only difference is two extra columns: what the model was confident about
 * and what it was not.
 */
export function toReviewRows(products = [], { defaultCategory = null, knownCategories = [] } = {}) {
  return products.map((p, i) => {
    const row = {
      _line: i + 1,
      _ai: true,
      confidence: p.confidence ?? 'low',
      note: p.note ?? null,
      image_query: p.image_query ?? null,
      name: p.name?.trim(),
      category: p.category?.trim() || defaultCategory,
      description: p.description?.trim() || null,
      subtitle: p.subtitle?.trim() || null,
      occasion: p.occasion?.trim() || null,
      emoji: p.emoji || '🎁',
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      specs: Array.isArray(p.specs)
        ? Object.fromEntries(p.specs.map(s => [s.label, s.value]))
        : {},
      errors: [],
    }

    if (!row.name) row.errors.push('No name')

    if (p.price == null || !Number.isFinite(Number(p.price)) || Number(p.price) <= 0) {
      // Not an error the row dies on — a product with no price is a normal
      // outcome when the source did not print one, and the admin types it in.
      // It just cannot be imported until they do.
      row.errors.push('Needs a price')
    } else {
      row.price = Number(p.price)
    }

    if (p.mrp && Number(p.mrp) > (row.price ?? 0)) row.mrp = Number(p.mrp)

    if (!row.category) row.errors.push('No shelf')
    else if (knownCategories.length && !knownCategories.includes(row.category)) {
      // The model was told the list; if it came back with something else, that
      // is worth showing rather than silently filing the product somewhere the
      // storefront has no page for.
      row.errors.push(`"${row.category}" is not one of your shelves`)
    }

    return row
  })
}

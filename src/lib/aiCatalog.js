import { supabase } from './supabase'

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
 * 32 MB is the request ceiling for the whole call, and base64 inflates a file
 * by a third — so the practical per-file limit is well under it. Checked here
 * rather than server-side so the admin finds out before a 20 MB upload.
 */
export const MAX_FILE_BYTES = 8 * 1024 * 1024
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024

export function describeFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const byExt = { pdf: 'PDF', docx: 'Word', doc: 'Word (old)', txt: 'Text', csv: 'Spreadsheet', md: 'Text', json: 'Data' }
  return ACCEPTED[file.type] ?? byExt[ext] ?? 'File'
}

/** Whether we can read it at all, and what to say if we cannot. */
export function checkFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is ${(file.size / 1048576).toFixed(1)} MB — the limit is 8 MB per file. Split it, or export a smaller PDF.`
  }
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Your session has expired — sign in again.')

  const res = await fetch('/api/ai-catalog', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
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

  if (!res.ok) throw new Error(payload?.error || `The AI service returned ${res.status}.`)
  return payload
}

/**
 * Read products out of files and/or pasted text.
 *
 * `onProgress` exists because encoding a stack of PDFs takes long enough to
 * look frozen, and a frozen button is a button somebody presses twice.
 */
export async function extractProducts({ files = [], text = '', instructions = '', categories = [], onProgress } = {}) {
  const encoded = []
  let total = 0

  for (const [i, file] of files.entries()) {
    const problem = checkFile(file)
    if (problem) throw new Error(problem)

    total += file.size
    if (total > MAX_TOTAL_BYTES) {
      throw new Error('That is more than 20 MB in one go. Send them in two batches.')
    }

    onProgress?.(`Reading ${file.name} (${i + 1} of ${files.length})…`)
    encoded.push({
      name: file.name,
      media_type: file.type || 'application/octet-stream',
      data: await toBase64(file),
    })
  }

  onProgress?.(files.length ? 'Reading it…' : 'Thinking…')
  return call({ mode: 'extract', files: encoded, text, instructions, categories })
}

/** Ask for products that don't exist yet, researched against live sources. */
export async function researchProducts({ instructions, categories = [] }) {
  if (!instructions?.trim()) throw new Error('Say what you want to sell first.')
  return call({ mode: 'research', instructions, categories })
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

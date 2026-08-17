// Vercel serverless function — turns unstructured material into catalogue
// rows that an admin then reviews.
//
// ── Why this is a server function ────────────────────────────────────────
// Two reasons, and the first is not negotiable: the AI key cannot go anywhere
// near the browser bundle. Anything in `import.meta.env` ships to every
// visitor of the storefront, so the key lives in an environment variable on
// Vercel and only this file ever sees it. The second is that the caller has to
// be checked — see serverlib/admin.js.
//
// ── What it does NOT do ──────────────────────────────────────────────────
// It never writes to the database. Not once, in any mode.
//
// That is the whole design. The ask was for something that "can never make a
// mistake", and no model can promise that — what it can do is propose, in a
// shape that makes a mistake obvious and cheap to fix. So every response is a
// list of candidate rows with a confidence and a note per row, and they land
// in the same review table as a pasted spreadsheet: the admin sees what will
// be created, edits what is wrong, and presses the button. The model does the
// typing; the person keeps the decision.
//
// ── Model-agnostic on purpose ────────────────────────────────────────────
// Speaks the OpenAI-compatible chat-completions shape, which OpenRouter, Groq
// and most others serve, so the shop can run on a free open-weight model and
// move to a better one by changing one environment variable. The provider
// table in serverlib/providers.js records what each one can actually do;
// Anthropic keeps its own branch because its API is a different shape.
import Anthropic from '@anthropic-ai/sdk'
import zlib from 'node:zlib'
import { requireAdmin } from '../serverlib/admin.js'
import { resolveProvider } from '../serverlib/providers.js'

// Research with web search genuinely takes a while; the default 10s would cut
// it off mid-thought.
export const config = { maxDuration: 60 }

/* ── The shape every mode returns ──────────────────────────────────────────
   A JSON schema rather than "please reply with JSON": with structured outputs
   the response is guaranteed to parse, so the console never has to defend
   against a stray sentence wrapped around the payload — the failure mode that
   makes this kind of feature flaky in the first place.

   `strict` is deliberately NOT set. Strict mode requires every property to be
   listed as required, which would force the model to invent a price for a
   product whose price the source never printed — the exact dishonesty the
   prompt below spends most of its words preventing. */

const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:        { type: 'string', description: 'The product name as a customer would see it.' },
          price:       { type: 'number', description: 'Price in rupees. Omit if the source does not state one.' },
          mrp:         { type: 'number', description: 'Struck-through price, only if the source states a higher original price.' },
          category:    { type: 'string', description: 'One of the shelf names given in the request. Never invent a new one.' },
          occasion:    { type: 'string' },
          subtitle:    { type: 'string', description: 'One short line under the name.' },
          description: { type: 'string', description: 'Two or three sentences. Only facts present in the source.' },
          emoji:       { type: 'string' },
          highlights:  { type: 'array', items: { type: 'string' }, description: 'Up to 5 short bullets.' },
          specs:       { type: 'array', items: {
            type: 'object',
            properties: { label: { type: 'string' }, value: { type: 'string' } },
            required: ['label', 'value'],
          } },
          image_query: { type: 'string', description: 'Three or four words to search a licensed photo library with. Not a URL.' },
          confidence:  { type: 'string', enum: ['high', 'medium', 'low'],
                         description: 'high only when every field came from the source. low when the price or the name was inferred.' },
          note:        { type: 'string', description: 'What you were unsure about, in one line, for the person reviewing this row.' },
        },
        required: ['name', 'category', 'confidence'],
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Anything the reviewer should know about the source as a whole — unreadable pages, ambiguous currency, duplicate rows.',
    },
  },
  required: ['products', 'warnings'],
}

const ENRICH_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    subtitle:    { type: 'string' },
    highlights:  { type: 'array', items: { type: 'string' } },
    specs:       { type: 'array', items: {
      type: 'object',
      properties: { label: { type: 'string' }, value: { type: 'string' } },
      required: ['label', 'value'],
    } },
    faqs: { type: 'array', items: {
      type: 'object',
      properties: { question: { type: 'string' }, answer: { type: 'string' } },
      required: ['question', 'answer'],
    } },
    slides: { type: 'array', items: {
      type: 'object',
      properties: {
        scene:  { type: 'string', enum: ['craft', 'packaging', 'moment', 'speed', 'promise', 'custom'] },
        kicker: { type: 'string' },
        title:  { type: 'string' },
        body:   { type: 'string' },
        icon:   { type: 'string' },
        accent: { type: 'string', enum: ['saffron', 'plum', 'emerald', 'rose', 'ink'] },
        // What a generated background for this slide should show. Never the
        // product itself — see api/ai-media.js for why that line matters.
        image_prompt: { type: 'string', description: 'A scene to illustrate this slide — mood, hands, wrapping, a table. Never a photo of the product itself.' },
      },
      required: ['scene', 'title', 'body'],
    } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['warnings'],
}

const SHELF_SCHEMA = {
  type: 'object',
  properties: {
    categories: { type: 'array', items: {
      type: 'object',
      properties: {
        id:      { type: 'string', description: 'The shelf name, in Title Case. This becomes the id and it is permanent.' },
        label:   { type: 'string' },
        emoji:   { type: 'string' },
        tagline: { type: 'string', description: 'One line, under fifteen words, describing what is on the shelf.' },
        kind:    { type: 'string', enum: ['shop', 'celebration'] },
        reason:  { type: 'string', description: 'Why this shelf is worth having, for the person reviewing it.' },
      },
      required: ['id', 'label', 'kind'],
    } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['categories', 'warnings'],
}

/* ── The house voice ─────────────────────────────────────────────────────
   Written once, here, because a model given no brand context produces
   competent catalogue copy for a generic gift shop, and this is not one. */

const BRAND = `
Sambramo is a celebrations business in Bengaluru and Mysuru, India. It sells
cakes, gifts and hampers, flowers, party essentials, pooja essentials, and a
Heritage & Crafts shelf of Mysore silk, rare handloom weaves and regional
crafts. It also plans whole celebrations — weddings, birthdays, housewarmings.

How it actually works, which constrains what you may write:
  · Nothing is warehoused. Every order is made or sourced per order by a
    partner kitchen, decorator or supplier, and delivered by Sambramo.
  · Same-day delivery across Bengaluru and Mysuru for most items.
  · The business is pre-launch. It has no order history and no customer
    reviews, so never write copy that claims popularity, ratings,
    "bestseller", "loved by thousands", or how many people bought something.
  · Prices are in Indian rupees.

Voice: warm, plain, specific. Short sentences. Indian English. No exclamation
marks, no "indulge in", no "elevate your celebration", no stacked adjectives.
Say the true concrete thing — "Serves 8 to 10", "Hand-woven in Molakalmuru" —
rather than the impressive vague one.
`

const HONESTY = `
The single rule that outranks everything else: do not invent facts about a
product.

If the source does not state a price, leave price out and say so in the note —
do not estimate one. If it does not say what a thing is made of, how big it is,
or how long it takes, do not fill that in. A row with three true fields and an
honest note is useful; a row with twelve plausible fields is a trap, because
the person reviewing it cannot tell which parts you knew and which you guessed.

Set confidence honestly. "high" means every field came from the source in front
of you. "medium" means you read the source correctly but had to interpret it.
"low" means you inferred something important, and the note must say what.
`

/* ── DOCX ────────────────────────────────────────────────────────────────
   A .docx is a ZIP of XML, and no model API takes Word files. Rather than
   tell a non-technical admin to "just export a PDF" — which is how a feature
   quietly stops being used — the text is pulled out here: walk the ZIP's local
   file headers, inflate `word/document.xml`, strip the tags. Paragraph and tab
   boundaries become whitespace first, so a table of products survives as one
   line per row rather than collapsing into a run-on string.

   Returns null on anything unexpected; the caller then says so plainly. */
function textFromDocx(buffer) {
  try {
    let xml = null
    let i = 0
    while (i < buffer.length - 30) {
      if (buffer.readUInt32LE(i) !== 0x04034b50) { i++; continue }

      const method   = buffer.readUInt16LE(i + 8)
      const compSize = buffer.readUInt32LE(i + 18)
      const nameLen  = buffer.readUInt16LE(i + 26)
      const extraLen = buffer.readUInt16LE(i + 28)
      const nameAt   = i + 30
      const name     = buffer.toString('utf8', nameAt, nameAt + nameLen)
      const dataAt   = nameAt + nameLen + extraLen

      if (name === 'word/document.xml') {
        // A streamed .docx writes 0 into the header and puts the real sizes in
        // a trailing descriptor. Inflating to the end of the buffer still works
        // — the inflater stops at the end of the deflate stream.
        const end = compSize > 0 ? dataAt + compSize : buffer.length
        const raw = buffer.subarray(dataAt, end)
        xml = method === 0 ? raw.toString('utf8') : zlib.inflateRawSync(raw).toString('utf8')
        break
      }

      i = compSize > 0 ? dataAt + compSize : i + 1
    }

    if (!xml) return null

    const text = xml
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:tab\/>/g, ' | ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return text.length > 20 ? text : null
  } catch {
    return null
  }
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Fetch anything that was staged in the upload bucket instead of sent inline.
 *
 * Vercel refuses a request body over 4.5 MB with a bare 413 before the
 * function even runs, so a supplier's PDF cannot travel in the request — the
 * browser puts it in Supabase Storage and sends a path. Here it comes back as
 * bytes, where a 30 MB buffer is unremarkable.
 *
 * Each file is deleted once read. This bucket is a hand-off, not an archive,
 * and a supplier's wholesale price list should not accumulate in it.
 */
async function hydrate(files, supabase) {
  const out = []
  const problems = []

  for (const file of files) {
    if (file.data || !file.path) { out.push(file); continue }

    const { data, error } = await supabase.storage.from('ai-uploads').download(file.path)
    if (error || !data) {
      problems.push(`${file.name} could not be read back after upload (${error?.message ?? 'no data'}).`)
      continue
    }

    const buf = Buffer.from(await data.arrayBuffer())
    out.push({ ...file, data: buf.toString('base64') })

    // Best effort. A file left behind is untidy, not broken, and failing the
    // import over a failed cleanup would be the wrong trade.
    supabase.storage.from('ai-uploads').remove([file.path]).catch(() => {})
  }

  return { files: out, problems }
}

/**
 * Turn one uploaded file into a content part, in whichever shape the active
 * provider understands — and report what could not be sent, rather than
 * dropping it silently.
 */
function buildParts(files, provider, native) {
  const parts = []
  const rejected = []

  for (const file of files.slice(0, 12)) {
    const { name = 'file', media_type = '', data } = file
    if (!data) continue

    const isPdf   = media_type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')
    const isImage = IMAGE_TYPES.includes(media_type)
    const isDocx  = media_type.includes('wordprocessingml') || name.toLowerCase().endsWith('.docx')

    if (isPdf) {
      if (!provider.pdf) {
        rejected.push(`${name} — this AI provider can't read PDFs. Send a photo of the pages, or switch to OpenRouter.`)
        continue
      }
      parts.push(native === 'anthropic'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
        : { type: 'file', file: { filename: name, file_data: `data:application/pdf;base64,${data}` } })
      continue
    }

    if (isImage) {
      if (!provider.images) {
        rejected.push(`${name} — the model in use can't see pictures. Set AI_MODEL to a vision model, or paste the text.`)
        continue
      }
      parts.push(native === 'anthropic'
        ? { type: 'image', source: { type: 'base64', media_type, data } }
        : { type: 'image_url', image_url: { url: `data:${media_type};base64,${data}` } })
      continue
    }

    const buf = Buffer.from(data, 'base64')

    if (isDocx) {
      const text = textFromDocx(buf)
      if (text) parts.push({ type: 'text', text: `--- ${name} (Word document) ---\n${text}` })
      else rejected.push(`${name} — that Word file could not be read. Save it as a PDF and try again.`)
      continue
    }

    // .txt, .csv, .md, .json and anything else that is really just text.
    parts.push({ type: 'text', text: `--- ${name} ---\n${buf.toString('utf8').slice(0, 200_000)}` })
  }

  return { parts, rejected }
}

/* ── Calling the model ───────────────────────────────────────────────── */

/** Strip a ```json fence if a weaker model wrapped its answer in one. */
function parseLoose(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(cleaned) } catch {}
  // Last resort: the first balanced-looking object in the string.
  const start = cleaned.indexOf('{')
  const end   = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  return null
}

/**
 * One request, in the OpenAI-compatible shape.
 *
 * Retries once without `response_format` if the endpoint rejects the JSON
 * schema. Model support for structured outputs varies by *provider routing*,
 * not just by model, so a model that advertises it can still land on an
 * endpoint that does not — and falling back to plain JSON is much better than
 * telling an admin their import failed for a reason they cannot act on.
 */
async function callOpenAiCompatible({ url, key, model, system, content, schema, schemaName, plugins }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content },
    ],
    max_tokens: 16000,
    response_format: { type: 'json_schema', json_schema: { name: schemaName, schema } },
  }
  if (plugins) body.plugins = plugins

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    // OpenRouter uses these for its dashboard attribution; harmless elsewhere.
    'HTTP-Referer': 'https://sambramoh.vercel.app',
    'X-Title': 'Sambramo Product Studio',
  }

  let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })

  if (res.status === 400 || res.status === 404 || res.status === 422) {
    const detail = await res.text()
    if (/response_format|json_schema|structured/i.test(detail)) {
      const relaxed = { ...body, response_format: { type: 'json_object' } }
      relaxed.messages[0].content += `\n\nReply with a single JSON object matching this schema, and nothing else:\n${JSON.stringify(schema)}`
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(relaxed) })
    } else {
      throw Object.assign(new Error(detail), { status: res.status })
    }
  }

  if (!res.ok) {
    throw Object.assign(new Error(await res.text()), { status: res.status })
  }

  const json = await res.json()
  const text = json.choices?.[0]?.message?.content
  if (!text) throw new Error('The model returned an empty answer.')

  const parsed = parseLoose(typeof text === 'string' ? text : JSON.stringify(text))
  if (!parsed) throw new Error('The model returned something that was not valid JSON.')

  return { payload: parsed, usage: json.usage ?? {} }
}

/** Same job, Anthropic's own shape. */
async function callAnthropic({ key, model, system, content, schema, search }) {
  const client = new Anthropic({ apiKey: key })
  const request = {
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema }, effort: search ? 'high' : 'medium' },
  }
  if (search) request.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }]

  const response = await client.messages.create(request)

  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('The model declined to answer that. Try rephrasing it.'), { status: 422 })
  }

  const block = response.content.find(b => b.type === 'text')
  if (!block) throw new Error('The model returned nothing usable.')

  const parsed = parseLoose(block.text)
  if (!parsed) throw new Error('The model returned something that was not valid JSON.')

  return { payload: parsed, usage: response.usage ?? {} }
}

/* ── Handler ──────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const resolved = resolveProvider()
  if (resolved.error) return res.status(503).json({ error: resolved.error })

  const auth = await requireAdmin(req)
  // `stage` rides along so "it says X" is enough to locate the problem — the
  // difference between a stale token and a wrong service key is invisible from
  // the message alone if you are not the person who wrote it.
  if (auth.error) return res.status(auth.status).json({ error: auth.error, stage: auth.stage, detail: auth.detail, project: auth.project })

  const { provider, model: baseModel } = resolved
  const {
    mode = 'extract',
    files = [],
    text = '',
    instructions = '',
    categories = [],
    product = null,
  } = req.body || {}

  const shelves = categories.length
    ? categories.map(c => `  · ${c}`).join('\n')
    : '  · (none supplied — put every product under "Gifts" and say so in the warnings)'

  try {
    let system
    let content
    let schema
    let schemaName
    let plugins
    let model = baseModel
    let wantsSearch = false
    let rejected = []

    if (mode === 'research') {
      wantsSearch = true
      schema = PRODUCT_SCHEMA
      schemaName = 'catalogue_products'
      system = `${BRAND}\n${HONESTY}\n
You are filling in a shop catalogue for the person who runs this business.

Search the web before you answer. You are proposing real items that a real
supplier in Bengaluru or Mysuru could actually deliver, at prices that match
what these things really cost in India right now — not remembered prices and
not round numbers you find pleasing. Prefer current Indian sources.

Every product must be filed under one of these existing shelves:
${shelves}

Do not invent a shelf. If something genuinely does not fit any of them, leave
it out and say why in the warnings.

Do not return image URLs. Return a short image_query instead — the console
searches a licensed photo library with it, because a picture lifted off
somebody else's shop is not ours to publish.`
      content = instructions || 'Suggest twelve products worth stocking.'

      // How search is switched on differs per provider: a plugin on
      // OpenRouter, a whole different model on Groq, a tool on Anthropic.
      if (provider.webSearch === 'plugin') plugins = [{ id: 'web', max_results: 6 }]
      if (provider.webSearch === 'compound') model = provider.searchModel

    } else if (mode === 'enrich') {
      schema = ENRICH_SCHEMA
      schemaName = 'product_page'
      system = `${BRAND}\n${HONESTY}\n
You are writing the product page for one item already in the catalogue.

Write only what follows from what you are told about this product. Where you
have nothing to go on for a field, leave it out — an empty highlights list is
correct when the input is just a name and a price.

The story slides are the part that sells it, and the part most easily ruined.
Each one is a single beat with a short title and two or three lines under it.
Write about this product specifically. "Wrapped like it matters" is right for a
hamper and wrong for a packet of diyas; if a scene does not apply, leave it out
rather than writing filler.

For image_prompt, describe a SCENE that illustrates the beat — hands tying a
ribbon, a lit doorway, a table being laid. Never describe the product itself:
those pictures get generated, and a generated picture of the thing being sold
is a picture of something the customer will not receive.`
      content = `${JSON.stringify(product ?? {}, null, 2)}\n\n${instructions || 'Write the product page.'}`

    } else if (mode === 'shelves') {
      schema = SHELF_SCHEMA
      schemaName = 'shop_shelves'
      system = `${BRAND}\n${HONESTY}\n
You are proposing shelves for this shop.

These already exist — do not propose them again:
${shelves}

A shelf earns its place by being a thing customers shop for, not a thing we
happen to sell. Fewer and clearer beats more and finer. Say in each reason why
it deserves its own shelf rather than living inside an existing one.`
      content = instructions || 'What shelves should this shop have?'

    } else {
      schema = PRODUCT_SCHEMA
      schemaName = 'catalogue_products'

      // Anything staged in the bucket is fetched here first, so `buildParts`
      // only ever sees bytes and does not care how they arrived.
      const hydrated = await hydrate(files, auth.supabase)
      const built = buildParts(hydrated.files, provider, provider.native)
      rejected = [...built.rejected, ...hydrated.problems]
      const parts = built.parts

      if (text.trim()) parts.push({ type: 'text', text: text.slice(0, 200_000) })
      parts.push({
        type: 'text',
        text: instructions || 'Pull every product out of this and fill in the fields you can.',
      })

      if (parts.length <= 1) {
        return res.status(400).json({
          error: rejected.length
            ? rejected.join(' ')
            : 'Attach a file or paste some text first.',
        })
      }

      content = parts
      system = `${BRAND}\n${HONESTY}\n
You are reading whatever the shop owner has — a supplier's PDF, a photograph of
a handwritten price list, a Word document, a WhatsApp message — and turning it
into catalogue rows.

Read everything given to you, including the pictures. A photographed price list
is a normal input here; if part of it is genuinely illegible, transcribe what
you can, leave the rest out, and say which part you could not read in the
warnings.

File every product under one of these existing shelves:
${shelves}

Do not invent a shelf. If something does not fit, put it under the closest one
and say so in that row's note.

Keep the source's own wording for names. Do not translate Kannada or Hindi
product names into English, and do not "improve" a name into marketing copy —
the person reviewing this needs to match your rows against their document line
by line.

Return one row per product, in the order they appear. If the same product
appears twice, return it once and mention the duplicate in the warnings.

Do not return image URLs. Return a short image_query instead.`

      // Free document parsing rather than the paid OCR default. Good enough
      // for the text-and-tables PDFs a supplier sends; a scanned, photographed
      // catalogue is better handled as images anyway.
      if (provider.pdf && provider.webSearch === 'plugin' &&
          files.some(f => (f.media_type === 'application/pdf') || f.name?.toLowerCase().endsWith('.pdf'))) {
        plugins = [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }]
      }
    }

    // Anthropic wants a string or its own block array; the OpenAI shape wants
    // parts. A plain string is valid in both.
    const { payload, usage } = provider.native === 'anthropic'
      ? await callAnthropic({ key: resolved.key, model, system, content, schema, search: wantsSearch })
      : await callOpenAiCompatible({
          url: provider.url, key: resolved.key, model, system,
          content: typeof content === 'string' ? [{ type: 'text', text: content }] : content,
          schema, schemaName, plugins,
        })

    return res.status(200).json({
      ...payload,
      // Files that could not be sent are reported as warnings rather than
      // thrown away — an admin who attached five PDFs to a provider that takes
      // none must be told which four were ignored.
      warnings: [...(payload.warnings ?? []), ...rejected],
      meta: { provider: provider.label, model, usage },
    })
  } catch (err) {
    const status = err?.status ?? 500
    const raw = err?.message ?? ''
    const message =
      status === 401 || status === 403
        ? `The ${provider.label} key was rejected. Check ${provider.keyEnv} in the Vercel settings.`
      : status === 402
        ? `${provider.label} says this account is out of credit.`
      : status === 429
        ? `${provider.label} is rate-limiting us — wait a moment and try again.`
      : /model/i.test(raw) && (status === 404 || status === 400)
        ? `The model "${baseModel}" was rejected by ${provider.label}. Set AI_MODEL to one it serves.`
      : status >= 500
        ? `${provider.label} is having trouble. Try again in a minute.`
        : raw.slice(0, 300) || 'Something went wrong reading that.'

    /* The friendly line above is a guess derived from a status code, and a
       guess is exactly what cost hours on the auth bug: "OpenRouter is having
       trouble" was shown for a fault that had nothing to do with OpenRouter,
       because anything without a `.status` defaults to 500. The real message
       rides along so the next failure is diagnosed instead of theorised. It
       is an error string from an API, never a key. */
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: message,
      detail: raw.slice(0, 500) || null,
      provider: provider.label,
      model,
    })
  }
}

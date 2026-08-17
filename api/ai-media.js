// Vercel serverless function — generates pictures and short clips, and files
// the result into the product gallery.
//
// ── What this is for, and what it is not for ─────────────────────────────
// A shop that has not photographed anything yet still needs pictures on its
// story slides and shelf headers: hands tying a ribbon, a lit doorway, a table
// being laid. Those are mood, they are not claims about merchandise, and a
// generated one is honest and free where a photoshoot is neither.
//
// A generated photo OF A PRODUCT is a different thing. The customer receives
// the real item, not the render — so anything made here is written into
// `product_media` with `source = 'ai'`, which the storefront prints as
// "Illustration", and `setPrimaryImage` refuses to let it inherit the "actual
// product photo" badge. The owner can still put one on a product; they cannot
// put one there *unlabelled*. That distinction is the entire point of the
// source column added in migration 023 and widened in 051.
//
// ── Why fal.ai ──────────────────────────────────────────────────────────
// It serves the open-weight generators — FLUX for stills, Wan for video — on
// a pay-per-output basis with no subscription, which is the only shape that
// makes sense for a shop generating a few dozen images a month. OpenRouter,
// which everything else here runs on, has no video generation at all and only
// closed image models, so this is deliberately a second key rather than a
// worse choice made to avoid one.
//
// ── Two calls, not one ──────────────────────────────────────────────────
// A Wan clip takes one to three minutes. A Vercel function does not live that
// long, so this submits the job and hands back the queue URLs, and the browser
// polls this same endpoint until it is done. The alternative — holding the
// request open — fails on exactly the long renders somebody actually wants.
import { requireAdmin } from '../serverlib/admin.js'

export const config = { maxDuration: 60 }

const FAL_SUBMIT = 'https://queue.fal.run'

/**
 * Open-weight by default, and overridable.
 *
 *   FLUX.1 [schnell]  Apache-2.0, four steps, fractions of a paisa per image.
 *   Wan 2.2 5B        Alibaba's open video model; five seconds at 480p.
 *
 * Both are replaceable through the environment because this end of the market
 * moves every few months and a better model should not need a deploy.
 */
const MODELS = {
  image: process.env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell',
  video: process.env.FAL_VIDEO_MODEL || 'fal-ai/wan/v2.2-5b/text-to-video',
}

/* ── Nothing written into the picture ─────────────────────────────────────
   Neither default model stamps a watermark onto its output — FLUX.1 [schnell]
   is Apache-2.0 and Wan is open-weight, and neither brands what it produces.
   That is one of the reasons they are the defaults: several hosted video
   services do burn a corner logo into free-tier renders, and a shop cannot use
   a picture with somebody else's mark on it.

   The remaining way lettering appears is the model inventing it — a signboard
   above a shop, a label on a box, a caption it decided the scene wanted. Image
   models are famously eager to do this, and the fix is to say so every time
   rather than hoping the person writing the prompt remembers. Appended to
   every request, and sent as a negative prompt where the model takes one.

   If you switch FAL_IMAGE_MODEL or FAL_VIDEO_MODEL, check the new model's own
   page: this covers what the model draws, not what a provider stamps on. */
const CLEAN_SUFFIX =
  '. No text, no lettering, no words, no captions, no signage, no logos, no watermark, no signature, no border.'

const NEGATIVE =
  'text, words, letters, caption, subtitle, signage, logo, watermark, signature, stamp, border, frame, ui overlay'

/**
 * The queue hands back absolute URLs and we follow them — but they arrive via
 * the browser, so they are attacker-controlled strings by the time they get
 * here. Following one unchecked would let anyone with an admin session point
 * this server at an internal address and read the response, with the fal key
 * attached. Host allow-list, not a substring check.
 */
const ALLOWED_HOSTS = new Set([
  'queue.fal.run', 'fal.run', 'rest.alpha.fal.ai',
  'fal.media', 'v3.fal.media', 'v2.fal.media', 'storage.googleapis.com',
])

function safeUrl(raw) {
  let url
  try { url = new URL(raw) } catch { return null }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  const ok = ALLOWED_HOSTS.has(host) || host.endsWith('.fal.media') || host.endsWith('.fal.run')
  return ok ? url.toString() : null
}

/** Pull the asset URL out of whichever shape the model returned. */
function assetFrom(result, kind) {
  if (!result) return null
  if (kind === 'video') {
    return result.video?.url ?? result.videos?.[0]?.url ?? result.output?.url ?? null
  }
  return result.images?.[0]?.url ?? result.image?.url ?? result.output?.[0]?.url ?? null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.FAL_KEY
  if (!key) {
    return res.status(503).json({
      error: 'Picture and video generation is not switched on. Get a key at fal.ai/dashboard/keys, add it as FAL_KEY in the Vercel project settings, and redeploy.',
    })
  }

  const auth = await requireAdmin(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error, stage: auth.stage, detail: auth.detail, project: auth.project })

  const { action = 'submit', kind = 'image', prompt = '', aspect = '1:1', statusUrl, responseUrl, productId, caption } = req.body || {}

  if (!['image', 'video'].includes(kind)) {
    return res.status(400).json({ error: 'Ask for an image or a video.' })
  }

  const falHeaders = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }

  try {
    /* ── Submit ─────────────────────────────────────────────────────── */
    if (action === 'submit') {
      if (!prompt.trim()) return res.status(400).json({ error: 'Describe the picture you want first.' })

      const clean = `${prompt.slice(0, 1500)}${CLEAN_SUFFIX}`

      const input = kind === 'video'
        ? {
            prompt: clean,
            negative_prompt: NEGATIVE,
            aspect_ratio: aspect === '1:1' ? '16:9' : aspect,
            resolution: '480p',
          }
        : {
            prompt: clean,
            // FLUX schnell has no negative-prompt input, so for stills the
            // instruction has to ride in the prompt itself. Sent anyway —
            // models that accept it use it, models that don't ignore it, and
            // the alternative is two code paths for one intention.
            negative_prompt: NEGATIVE,
            image_size: aspect === '16:9' ? 'landscape_16_9' : aspect === '4:5' ? 'portrait_4_3' : 'square_hd',
            num_images: 1,
          }

      const submit = await fetch(`${FAL_SUBMIT}/${MODELS[kind]}`, {
        method: 'POST', headers: falHeaders, body: JSON.stringify(input),
      })

      if (!submit.ok) {
        const detail = await submit.text()
        throw Object.assign(new Error(detail), { status: submit.status })
      }

      const queued = await submit.json()
      return res.status(200).json({
        done: false,
        requestId: queued.request_id,
        statusUrl: queued.status_url,
        responseUrl: queued.response_url,
        // Roughly what to tell the person waiting. A still is quick; a clip is
        // long enough that a spinner with no words reads as broken.
        expect: kind === 'video' ? 'About a minute or two.' : 'A few seconds.',
      })
    }

    /* ── Poll, then file the result ─────────────────────────────────── */
    if (action === 'poll') {
      const status = safeUrl(statusUrl)
      const response = safeUrl(responseUrl)
      if (!status || !response) return res.status(400).json({ error: 'That job reference is not one of ours.' })

      const stat = await fetch(status, { headers: falHeaders })
      if (!stat.ok) throw Object.assign(new Error(await stat.text()), { status: stat.status })
      const state = await stat.json()

      if (state.status !== 'COMPLETED') {
        return res.status(200).json({
          done: false,
          state: state.status,
          queuePosition: state.queue_position ?? null,
        })
      }

      const out = await fetch(response, { headers: falHeaders })
      if (!out.ok) throw Object.assign(new Error(await out.text()), { status: out.status })
      const result = await out.json()

      const assetUrl = safeUrl(assetFrom(result, kind))
      if (!assetUrl) return res.status(502).json({ error: 'The generator finished but returned nothing usable.' })

      /* Copy it into our own storage rather than linking fal's CDN. Their
         URLs expire, and a product page whose picture disappears in a month is
         worse than no picture — the same reason uploads are copied in rather
         than hot-linked everywhere else in this app. */
      const asset = await fetch(assetUrl)
      if (!asset.ok) return res.status(502).json({ error: 'Could not download the generated file.' })
      const bytes = Buffer.from(await asset.arrayBuffer())

      const contentType = asset.headers.get('content-type')
        || (kind === 'video' ? 'video/mp4' : 'image/jpeg')
      const ext = kind === 'video' ? 'mp4' : (contentType.includes('png') ? 'png' : 'jpg')
      const path = `${productId ?? 'library'}/ai-${Date.now()}.${ext}`
      const bucket = kind === 'video' ? 'product-media' : 'product-images'

      const { error: upErr } = await auth.supabase.storage
        .from(bucket)
        .upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false })

      if (upErr) {
        return res.status(502).json({
          error: /bucket/i.test(upErr.message)
            ? 'Storage is not set up yet — run migration 051_product_studio.sql in the Supabase SQL editor.'
            : `Could not save the file: ${upErr.message}`,
        })
      }

      const { data: { publicUrl } } = auth.supabase.storage.from(bucket).getPublicUrl(path)

      /* Filed as `ai`, always. This is the one field this endpoint is not
         willing to take from the caller: a generated picture that reaches the
         storefront labelled as a photograph is a lie told to a customer, and
         the label is the only thing standing between those two outcomes. */
      let media = null
      if (productId) {
        const { data, error } = await auth.supabase
          .from('product_media')
          .insert({
            product_id: productId,
            kind,
            url: publicUrl,
            source: 'ai',
            caption: caption?.slice(0, 300) || null,
            alt: prompt?.slice(0, 200) || null,
            sort_order: 500,
          })
          .select()
          .single()
        // A missing table means migration 051 has not been run. The file is
        // uploaded and the URL is returned regardless, so nothing is lost —
        // it just is not in the gallery yet.
        if (!error) media = data
      }

      return res.status(200).json({ done: true, url: publicUrl, kind, media })
    }

    return res.status(400).json({ error: 'Unknown action.' })
  } catch (err) {
    const status = err?.status ?? 500
    const raw = err?.message ?? ''

    /* fal answers several very different problems with 403, and guessing
       between them produced the wrong instruction: an exhausted balance was
       reported as "the key was rejected", which sends somebody to re-copy a
       key that was never wrong. fal's own `detail` says exactly what happened
       — an empty balance, a locked account, a bad key — so it is read first
       and only fallen back on when it says nothing useful. */
    let falDetail = ''
    try { falDetail = JSON.parse(raw)?.detail ?? '' } catch { falDetail = '' }

    const message =
      falDetail ? `fal.ai says: ${falDetail}`
      : status === 401 || status === 403 ? 'The fal.ai key was rejected. Check FAL_KEY in the Vercel settings.'
      : status === 402 ? 'That fal.ai account is out of credit — top it up at fal.ai/dashboard/billing.'
      : status === 429 ? 'fal.ai is rate-limiting us — wait a moment and try again.'
      : status === 404 ? `The model "${MODELS[kind]}" was not found. Set FAL_IMAGE_MODEL or FAL_VIDEO_MODEL to one fal.ai serves.`
      : status >= 500 ? 'fal.ai is having trouble. Try again in a minute.'
      : raw.slice(0, 300) || 'Could not generate that.'

    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message })
  }
}

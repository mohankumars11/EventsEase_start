import { supabase } from './supabase'

/**
 * Generating a picture or a clip, from the browser.
 *
 * The endpoint does the work in two calls — submit, then poll — because a Wan
 * clip takes longer than a serverless function is allowed to live. This hides
 * that: one `generate()` call, a progress string while it waits, a URL at the
 * end.
 *
 * Nothing here talks to fal.ai directly. The key is server-side, and the
 * finished file is copied into our own Supabase storage before this ever sees
 * a URL — so a generated image behaves exactly like an uploaded one from the
 * moment it exists.
 */

async function call(body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Your session has expired — sign in again.')

  const res = await fetch('/api/ai-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  })

  let payload
  try {
    payload = await res.json()
  } catch {
    throw new Error(
      res.status === 404
        ? 'The generator endpoint is not running. It works on the deployed site; locally it needs `vercel dev`.'
        : `The generator returned ${res.status}.`
    )
  }
  if (!res.ok) throw new Error(payload?.error || `The generator returned ${res.status}.`)
  return payload
}

const wait = ms => new Promise(r => setTimeout(r, ms))

/**
 * Ask for one image or one clip and wait for it.
 *
 * Polls on a gentle interval with a hard ceiling: a job that is still queued
 * after five minutes is a job something has gone wrong with, and leaving a
 * spinner running forever teaches people the button is broken.
 */
export async function generate({
  kind = 'image',
  prompt,
  aspect = '1:1',
  productId = null,
  caption = null,
  onProgress,
} = {}) {
  if (!prompt?.trim()) throw new Error('Describe the picture you want first.')

  onProgress?.(kind === 'video' ? 'Sending it to the video model…' : 'Sending it to the image model…')
  const job = await call({ action: 'submit', kind, prompt, aspect })

  if (job.done) return job

  onProgress?.(job.expect ?? 'Working…')

  const deadline = Date.now() + 5 * 60 * 1000
  // Stills come back in seconds, clips in minutes — so poll quickly at first
  // and then back off, rather than hammering for three minutes straight.
  let interval = kind === 'video' ? 4000 : 1500

  while (Date.now() < deadline) {
    await wait(interval)
    interval = Math.min(interval * 1.25, 10000)

    const state = await call({
      action: 'poll',
      kind,
      prompt,
      productId,
      caption,
      statusUrl: job.statusUrl,
      responseUrl: job.responseUrl,
    })

    if (state.done) {
      onProgress?.('Saving it…')
      return state
    }

    onProgress?.(
      state.queuePosition > 0
        ? `Waiting in the queue — ${state.queuePosition} ahead.`
        : kind === 'video' ? 'Rendering the clip…' : 'Drawing…'
    )
  }

  throw new Error('That is taking unusually long. It may still finish — check the gallery in a minute.')
}

/**
 * Prompt starters, written for the person who has never written one.
 *
 * Every one describes a SCENE rather than a product, which is not a stylistic
 * preference: a generated picture of the cake being sold is a picture of a cake
 * nobody will receive. Mood, hands, wrapping, a doorway — those illustrate the
 * story slides honestly.
 *
 * None of them mention text or watermarks, deliberately. The endpoint appends
 * that instruction to every prompt (CLEAN_SUFFIX in api/ai-media.js), so
 * repeating it here would be noise in a box the admin is meant to edit — and
 * worse, it would make it look optional.
 */
export const PROMPT_STARTERS = [
  {
    id: 'packaging',
    label: 'Wrapping & packaging',
    prompt: 'Close-up of hands tying a satin ribbon around a kraft-paper gift box on a pale wooden table, soft daylight from a window, warm and calm, shallow depth of field, photographic',
  },
  {
    id: 'doorway',
    label: 'The moment at the door',
    prompt: 'Warm evening light in an Indian home doorway, a wrapped gift box being handed over, marigold garland just visible at the edge of frame, candid and unposed, photographic',
  },
  {
    id: 'table',
    label: 'A table being laid',
    prompt: 'An Indian celebration table being set — brass diyas, marigold petals, folded banana leaf, soft morning light, overhead view, photographic',
  },
  {
    id: 'craft',
    label: 'Hands at work',
    prompt: 'Close-up of a weaver\'s hands at a handloom in Karnataka, silk thread catching the light, dust in the air, documentary photograph',
  },
  {
    id: 'delivery',
    label: 'On its way',
    prompt: 'A delivery rider on a Bengaluru street at dusk with a neatly boxed parcel, motion blur behind, warm streetlight, documentary photograph',
  },
]

/** Same idea, for the video model — short, one continuous shot. */
export const VIDEO_STARTERS = [
  {
    id: 'ribbon',
    label: 'Ribbon being tied',
    prompt: 'Slow close-up: hands tying a ribbon around a gift box on a wooden table, soft daylight, gentle camera push in, five seconds',
  },
  {
    id: 'diya',
    label: 'A diya being lit',
    prompt: 'Slow close-up of a brass diya being lit at dusk, flame catching, warm glow spreading outward, static camera, five seconds',
  },
  {
    id: 'petals',
    label: 'Petals falling',
    prompt: 'Marigold petals falling slowly onto a pale cloth surface in warm daylight, slow motion, static overhead camera, five seconds',
  },
]

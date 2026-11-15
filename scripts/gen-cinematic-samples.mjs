#!/usr/bin/env node
// Generate sample cinematic celebration cards via FAL (flux). Output: tmp/cinematic/*.jpg
//   node --env-file=.env scripts/gen-cinematic-samples.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const STYLE = 'cinematic film still, 35mm Kodak Portra film look, golden hour warm light, shallow depth of field, soft film grain, candid authentic emotion caught mid-moment, Indian people, tasteful, premium editorial photography, no text, no watermark'
const SAMPLES = [
  ['love-weddings', 'an Indian bride and groom exchanging flower garlands at a marigold mandap, the bride laughing with tears of joy, family blurred in the background throwing petals'],
  ['little-ones-family', 'an Indian grandmother holding a newborn baby at a naming ceremony at home, soft diya light, the young mother smiling beside her, jasmine flowers'],
  ['festivals-faith', 'an Indian family lighting diyas together on a balcony on Diwali night, a little girl holding a sparkler, warm glowing faces, fairy lights bokeh'],
]
mkdirSync('tmp/cinematic', { recursive: true })
for (const [id, scene] of SAMPLES) {
  const r = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: `${scene}. ${STYLE}`, image_size: 'portrait_4_3', num_inference_steps: 30, guidance_scale: 3.5, num_images: 1, enable_safety_checker: true }),
  })
  const j = await r.json()
  const url = j.images?.[0]?.url
  if (!url) { console.log(id, 'FAILED', JSON.stringify(j).slice(0, 300)); continue }
  writeFileSync(`tmp/cinematic/${id}.jpg`, Buffer.from(await (await fetch(url)).arrayBuffer()))
  console.log(id, 'ok')
}

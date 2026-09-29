#!/usr/bin/env node
/**
 * Can the crop frame ever leave the photograph?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE FAILURE IS SILENT, WHICH IS WHY IT IS SWEPT
 * ══════════════════════════════════════════════════════════════════════
 *
 * If the frame runs past an edge, `drawImage` pads with transparent
 * black, the JPEG encoder turns that into a hard corner, and nobody
 * finds out until a partner's face is on a customer's screen with a
 * white wedge beside it. There is no exception and no console warning.
 *
 * So the middle of this file does not test three interesting cases. It
 * sweeps thousands: every plausible photograph shape a phone produces,
 * dragged hard in every direction at every zoom, asserting the source
 * rectangle stays inside the image every single time.
 *
 *   node scripts/check-image-crop.mjs
 *   node scripts/check-image-crop.mjs --sabotage
 */
import { loadSrc } from './lib/loadSrc.mjs'

const { MAX_ZOOM, coverScale, clampOffset, initialCrop, zoomTo, sourceRect } =
  await loadSrc({
    'src/lib/imageCrop.js': [
      'MAX_ZOOM', 'coverScale', 'clampOffset', 'initialCrop', 'zoomTo', 'sourceRect',
    ],
  })

const sabotage = process.argv.includes('--sabotage')

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

const FRAME = 340

/* Real shapes, not round numbers: a 4:3 phone photo, a portrait one, a
   panorama, a square, a screenshot, and something tiny. */
const SHAPES = [
  ['4:3 landscape', 4032, 3024],
  ['4:3 portrait', 3024, 4032],
  ['16:9', 1920, 1080],
  ['9:16 portrait', 1080, 1920],
  ['square', 2000, 2000],
  ['panorama', 8000, 1200],
  ['tall strip', 900, 6000],
  ['smaller than the frame', 180, 240],
  ['exactly the frame', FRAME, FRAME],
]

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE IMAGE ALWAYS COVERS THE FRAME\n')

for (const [label, width, height] of SHAPES) {
  const scale = coverScale({ width, height, frame: FRAME })
  const covers = width * scale >= FRAME - 0.001 && height * scale >= FRAME - 0.001
  ok(`${label} · covers at the minimum scale`, covers,
     `${(width * scale).toFixed(1)}x${(height * scale).toFixed(1)} against ${FRAME}`)
}

ok('a tiny image is scaled UP rather than left with bars',
   coverScale({ width: 180, height: 240, frame: FRAME }) > 1)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA FRESH CROP IS CENTRED AND VALID\n')

for (const [label, width, height] of SHAPES) {
  const c = initialCrop({ width, height, frame: FRAME })
  const r = sourceRect({ ...c, width, height, frame: FRAME })
  const inside = r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= width && r.sy + r.sh <= height
  ok(`${label} · opens inside the image`, inside, JSON.stringify(r))
}

const wide = initialCrop({ width: 4032, height: 3024, frame: FRAME })
const r0 = sourceRect({ ...wide, width: 4032, height: 3024, frame: FRAME })
ok('a landscape photo opens horizontally centred',
   Math.abs((r0.sx + r0.sw / 2) - 4032 / 2) <= 1, JSON.stringify(r0))
ok('and the crop is square', r0.sw === r0.sh, `${r0.sw}x${r0.sh}`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE SWEEP — DRAGGED HARD, AT EVERY ZOOM\n')

/* Offsets far outside anything a finger could produce, because the
   clamp is what is being tested and a gentle drag never reaches it. */
const PULLS = [-100000, -5000, -800, -1, 0, 1, 800, 5000, 100000]

let checked = 0
const escapes = []

for (const [label, width, height] of SHAPES) {
  const min = coverScale({ width, height, frame: FRAME })
  for (let z = 0; z <= 10; z++) {
    const scale = min * (1 + (z / 10) * (MAX_ZOOM - 1))
    for (const x of PULLS) {
      for (const y of PULLS) {
        const offset = clampOffset({ offset: { x, y }, width, height, frame: FRAME, scale })
        const r = sourceRect({ offset, scale, width, height, frame: FRAME })
        checked++
        const inside =
          r.sx >= 0 && r.sy >= 0 &&
          r.sx + r.sw <= width + 0.001 && r.sy + r.sh <= height + 0.001 &&
          r.sw > 0 && r.sh > 0
        if (!inside) escapes.push(`${label} z=${scale.toFixed(3)} pull=(${x},${y}) -> ${JSON.stringify(r)}`)
      }
    }
  }
}

ok(`${checked} clamped positions, none outside the image`,
   escapes.length === 0,
   escapes.slice(0, 3).join(' | '))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nZOOM KEEPS ITS PROMISES\n')

const base = { width: 4032, height: 3024, frame: FRAME }
const min = coverScale(base)
const start = initialCrop(base)

const zoomedOut = zoomTo({ ...start, ...base, next: 0.0001 })
ok('zooming out stops at the covering scale',
   Math.abs(zoomedOut.scale - min) < 1e-9, `${zoomedOut.scale} vs ${min}`)

const zoomedIn = zoomTo({ ...start, ...base, next: 99 })
ok(`zooming in stops at ${MAX_ZOOM}x`,
   Math.abs(zoomedIn.scale - min * MAX_ZOOM) < 1e-9)

const inThenOut = zoomTo({ ...zoomTo({ ...start, ...base, next: min * 3 }), ...base, next: min })
ok('in then all the way out returns to the covering scale',
   Math.abs(inThenOut.scale - min) < 1e-9)

/* Zooming about the CENTRE, not the origin. The cheap version makes the
   subject slide off to one side as the partner zooms, which reads as
   the app fighting them. */
const centreBefore = {
  x: (FRAME / 2 - start.offset.x) / start.scale,
  y: (FRAME / 2 - start.offset.y) / start.scale,
}
const zoomed = zoomTo({ ...start, ...base, next: min * 2.5 })
const centreAfter = {
  x: (FRAME / 2 - zoomed.offset.x) / zoomed.scale,
  y: (FRAME / 2 - zoomed.offset.y) / zoomed.scale,
}
ok('what is under the centre stays under the centre',
   Math.abs(centreBefore.x - centreAfter.x) < 1 && Math.abs(centreBefore.y - centreAfter.y) < 1,
   `${JSON.stringify(centreBefore)} -> ${JSON.stringify(centreAfter)}`)

/* A zoom OUT invalidates an offset that was legal a moment earlier, and
   getting that order wrong is the realistic way a white edge ships. */
const dragged = clampOffset({
  offset: { x: -99999, y: -99999 }, ...base, scale: min * MAX_ZOOM,
})
const backOut = zoomTo({ offset: dragged, scale: min * MAX_ZOOM, ...base, next: min })
const rBack = sourceRect({ ...backOut, ...base })
ok('dragged to a corner, then zoomed out, stays inside',
   rBack.sx >= 0 && rBack.sy >= 0 &&
   rBack.sx + rBack.sw <= base.width && rBack.sy + rBack.sh <= base.height,
   JSON.stringify(rBack))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE OUTPUT IS A SQUARE, AND IT IS THE RIGHT ONE\n')

for (const [label, width, height] of SHAPES) {
  const c = initialCrop({ width, height, frame: FRAME })
  const r = sourceRect({ ...c, width, height, frame: FRAME })
  ok(`${label} · square source rect`, r.sw === r.sh, `${r.sw}x${r.sh}`)
}

const zoomedRect = sourceRect({ ...zoomTo({ ...start, ...base, next: min * 2 }), ...base })
ok('zooming in takes a SMALLER piece of the original',
   zoomedRect.sw < r0.sw, `${zoomedRect.sw} vs ${r0.sw}`)

if (sabotage) {
  ran++
  const bad1 = sourceRect({
    offset: { x: 5000, y: 5000 }, scale: min, ...base,
  })
  if (bad1.sx >= 0 && bad1.sy >= 0) {
    bad++
    fails.push('sabotage: expected an unclamped offset to escape the image, and it did not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0

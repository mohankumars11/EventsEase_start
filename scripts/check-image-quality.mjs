#!/usr/bin/env node
/**
 * Is a blurred photograph actually rejected?
 *
 * ══════════════════════════════════════════════════════════════════════
 * SYNTHETIC IMAGES, NOT FIXTURE FILES
 * ══════════════════════════════════════════════════════════════════════
 *
 * The images are BUILT here, pixel by pixel, rather than checked in as
 * PNGs. Three reasons, and the last is the one that matters:
 *
 *   a fixture is a binary in the repo that nobody can review
 *   a fixture of a document is a real document, and real identity
 *     documents must never be in a test
 *   a built image is a KNOWN quantity — "this one is a sharp grid, this
 *     one is the same grid box-blurred" — so a failure says which
 *     property broke rather than "the photo changed"
 *
 * Pure: no browser, no canvas, no network. The module takes RGBA in the
 * shape ImageData uses, which is exactly why it can be tested this way.
 *
 *   node scripts/check-image-quality.mjs
 *   node scripts/check-image-quality.mjs --sabotage
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sabotage = process.argv.includes('--sabotage')

const OUT = join(ROOT, 'node_modules/.cache/image-quality.mjs')
const ENTRY = join(ROOT, 'node_modules/.cache/image-quality-entry.mjs')
writeFileSync(ENTRY, [
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/imageQuality.js'))}`,
  `export * from ${JSON.stringify(join(ROOT, 'src/lib/verification/requirements.js'))}`,
].join('\n'))
const b = spawnSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  ENTRY, '--bundle', '--platform=node', '--format=esm', `--outfile=${OUT}`,
], { encoding: 'utf8', shell: true })
if (b.status !== 0) { console.error(b.stderr ?? b.stdout); process.exit(1) }

const M = await import(pathToFileURL(OUT).href)
const { assessImage, laplacianVariance, luminanceStats, QUALITY, requirementsFor } = M

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

/* ── Image builders ──────────────────────────────────────────────── */

function blank(w, h, level = 128) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = level
    data[i + 3] = 255
  }
  return { data, width: w, height: h }
}

/** A sharp document: high-contrast bars, like print on a card. */
function sharpCard(w = 900, h = 600, { level = 150, border = true } = {}) {
  const img = blank(w, h, level)
  const set = (x, y, v) => {
    const i = (y * w + x) * 4
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      /* Text-like rows of alternating dark blocks. */
      const inRow = (y % 40) < 14 && y > h * 0.2 && y < h * 0.85
      const inGlyph = (x % 12) < 7 && x > w * 0.1 && x < w * 0.9
      if (inRow && inGlyph) set(x, y, 20)
    }
  }
  /* A darker background ring, so the card reads as sitting on a table
     rather than filling the frame. */
  if (border) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x < w * 0.04 || y < h * 0.04 || x > w * 0.96 || y > h * 0.96) set(x, y, 60)
      }
    }
  }
  return img
}

/**
 * A card photographed so close that the print runs off the frame.
 *
 * The first version of this fixture just removed the background ring,
 * which left plain card colour at the edge -- uniform, so it never
 * actually bled and the test could not have passed. Here the text rows
 * extend to x = 0 and y = 0, which is what "cut off" really looks like.
 */
function bleedingCard(w = 900, h = 600, level = 150) {
  const img = blank(w, h, level)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((y % 40) < 14 && (x % 12) < 7) {
        const i = (y * w + x) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 20
      }
    }
  }
  return img
}

/** The same card, box-blurred until the edges stop existing. */
function blur(img, radius = 6) {
  const { width: w, height: h, data } = img
  const out = new Uint8ClampedArray(data.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          sum += data[(ny * w + nx) * 4]
          n++
        }
      }
      const v = sum / n
      const i = (y * w + x) * 4
      out[i] = out[i + 1] = out[i + 2] = v
      out[i + 3] = 255
    }
  }
  return { data: out, width: w, height: h }
}

/** Scale every pixel toward black or white. */
function relight(img, factor, offset = 0) {
  const out = new Uint8ClampedArray(img.data.length)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = img.data[i] * factor + offset
    out[i] = out[i + 1] = out[i + 2] = v
    out[i + 3] = 255
  }
  return { data: out, width: img.width, height: img.height }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nTHE MEASURES BEHAVE\n')

const sharp = sharpCard()
const blurred = blur(sharp, 6)

const vSharp = laplacianVariance(
  Float32Array.from({ length: sharp.width * sharp.height },
    (_, p) => sharp.data[p * 4]), sharp.width, sharp.height)
const vBlur = laplacianVariance(
  Float32Array.from({ length: blurred.width * blurred.height },
    (_, p) => blurred.data[p * 4]), blurred.width, blurred.height)

ok('a sharp card has high Laplacian variance', vSharp > QUALITY.blurFloor, `got ${Math.round(vSharp)}`)
ok('blurring collapses it', vBlur < vSharp / 10, `sharp ${Math.round(vSharp)} vs blurred ${Math.round(vBlur)}`)
ok('and the blurred one is under the floor', vBlur < QUALITY.blurFloor, `got ${Math.round(vBlur)}`)

const stats = luminanceStats(Float32Array.from({ length: 4 }, () => 10))
ok('luminanceStats reports a dark mean', stats.mean === 10)
ok('and counts crushed pixels', stats.clipped === 0)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nA GOOD PHOTOGRAPH PASSES\n')

const good = assessImage(sharp)
ok('a sharp, well-lit card is accepted', good.ok === true,
   JSON.stringify(good.failures.map(f => f.code)))
ok('and it reports its metrics', good.metrics?.blur > 0 && good.metrics?.longEdge === 900)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEACH FAILURE IS CAUGHT, AND NAMED\n')

const blurVerdict = assessImage(blurred)
ok('a blurred photo is rejected', blurVerdict.ok === false)
ok('the reason is blur', blurVerdict.failures.some(f => f.code === 'blur'),
   JSON.stringify(blurVerdict.failures.map(f => f.code)))
ok('and it says what to do',
   /blurry|clearer/i.test(blurVerdict.failures.find(f => f.code === 'blur')?.says ?? ''))

const dark = assessImage(relight(sharp, 0.16))
ok('a dark photo is rejected', dark.ok === false)
ok('the reason is darkness, not blur', dark.failures.some(f => f.code === 'dark'),
   JSON.stringify(dark.failures.map(f => f.code)))
ok('darkness is reported INSTEAD of blur, because it is the fixable one',
   !dark.failures.some(f => f.code === 'blur'))
ok('and it says what to do',
   /light/i.test(dark.failures.find(f => f.code === 'dark')?.says ?? ''))

const blown = assessImage(relight(sharp, 0.3, 215))
ok('a washed-out photo is rejected', blown.ok === false)
ok('the reason is brightness', blown.failures.some(f => f.code === 'bright'),
   JSON.stringify(blown.failures.map(f => f.code)))

const tiny = assessImage(sharpCard(320, 200))
ok('a low-resolution photo is rejected', tiny.ok === false)
ok('the reason is resolution', tiny.failures.some(f => f.code === 'resolution'))
ok('and it names the actual size', /320px/.test(
  tiny.failures.find(f => f.code === 'resolution')?.says ?? ''))

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nWARNINGS DO NOT BLOCK\n')

const edgeToEdge = assessImage(bleedingCard())
ok('a card filling the frame warns about edges',
   edgeToEdge.warnings.some(w => w.code === 'edges'),
   JSON.stringify(edgeToEdge.warnings.map(w => w.code)))
ok('but is not rejected for it', edgeToEdge.ok === true,
   JSON.stringify(edgeToEdge.failures.map(f => f.code)))
ok('and the warning says what to do',
   /edges|frame/i.test(edgeToEdge.warnings.find(w => w.code === 'edges')?.says ?? ''))
/* The measure must SEPARATE the two, not merely fire on one. A rule
   that flagged every document would be no rule at all. */
ok('a well-framed card does not warn about edges',
   !good.warnings.some(w => w.code === 'edges'),
   JSON.stringify(good.metrics))
ok('and the bleed score is clearly higher for the cropped one',
   edgeToEdge.metrics.bleed > good.metrics.bleed + 0.3,
   `framed ${good.metrics.bleed?.toFixed(2)} vs bleeding ${edgeToEdge.metrics.bleed?.toFixed(2)}`)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nFILE-LEVEL CHECKS COME FROM THE REQUIREMENT\n')

const aadhaar = requirementsFor({ trades: ['Photography'] })
  .find(r => r.documentType === 'aadhaar')
const licence = requirementsFor({ trades: ['Catering & Food'] })
  .find(r => r.documentType === 'fssai')

ok('Aadhaar does not accept a PDF', !aadhaar.allowedFileTypes.includes('application/pdf'))
ok('an FSSAI certificate does', licence.allowedFileTypes.includes('application/pdf'))

const wrongType = assessImage(sharp, {
  requirement: aadhaar, file: { type: 'application/pdf', size: 1000 },
})
ok('a PDF for an image-only requirement is rejected',
   wrongType.failures.some(f => f.code === 'type'))
ok('and it says a photo is wanted',
   /photo/i.test(wrongType.failures.find(f => f.code === 'type')?.says ?? ''))

const tooBig = assessImage(sharp, {
  requirement: aadhaar, file: { type: 'image/jpeg', size: 40 * 1048576 },
})
ok('an oversized file is rejected', tooBig.failures.some(f => f.code === 'size'))
ok('and it names the limit', /10 MB/.test(
  tooBig.failures.find(f => f.code === 'size')?.says ?? ''))

/* A PDF has no pixels. Saying "not checked" beats pretending. */
const pdf = assessImage(null, { requirement: licence, file: { type: 'application/pdf', size: 2000 } })
ok('a PDF passes the file checks and is marked unchecked',
   pdf.ok === true && pdf.checked === false)

/* ══════════════════════════════════════════════════════════════════ */
console.log('\nEVERY FAILURE HAS WORDS\n')

const all = [blurVerdict, dark, blown, tiny, wrongType, tooBig]
ok('no failure is ever silent',
   all.every(v => v.failures.every(f => typeof f.says === 'string' && f.says.length > 10)))
ok('no warning is ever silent',
   [good, edgeToEdge].every(v => v.warnings.every(w => w.says?.length > 10)))
ok('nothing says "invalid"',
   !all.some(v => v.failures.some(f => /invalid/i.test(f.says))))

if (sabotage) {
  ran++
  if (assessImage(blurred).ok === false) {
    bad++
    fails.push('sabotage: expected the blur rule to be broken, and it was not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) { console.log('FAILURES\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0

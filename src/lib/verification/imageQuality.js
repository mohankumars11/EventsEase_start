/**
 * Is this photograph good enough to read a number off?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THIS IS REAL TODAY, AND NEEDS NO PROVIDER
 * ══════════════════════════════════════════════════════════════════════
 *
 * OCR, face match and government verification all need a contract. This
 * does not. Every check below is arithmetic over pixels, runs on the
 * device in a few milliseconds, and catches the overwhelming majority of
 * documents a reviewer would have rejected anyway — blurred, dark,
 * cropped, or a 200px thumbnail of a 4MB card.
 *
 * Catching them at the moment of capture, while the card is still in the
 * partner's hand, is worth more than catching them two days later in a
 * queue. That is the whole argument for doing this before Phase 4.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PIXELS IN, VERDICT OUT — NO CANVAS, NO DOM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every function takes `{ data, width, height }` in the shape ImageData
 * uses: a flat RGBA Uint8 array. The browser gets there through a
 * canvas (see `imageDataFrom`), and a node guard gets there by building
 * the array directly — which is why `check-image-quality.mjs` can
 * assert a blurred image is rejected without a headless browser.
 *
 * ══════════════════════════════════════════════════════════════════════
 * A REJECTION MUST SAY WHAT TO DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Image is too blurry. Please upload a clearer photo." — never
 * "validation failed". A partner holding the card can fix any of these
 * in ten seconds if told which one it is.
 */

/* ── Thresholds ───────────────────────────────────────────────────────
   Tuned for a document photographed on a mid-range Android under indoor
   light, which is the realistic case. They are exported so the guard
   asserts against the same numbers the app uses, rather than its own. */
export const QUALITY = {
  /* Variance of the Laplacian. A sharp document photo sits in the
     hundreds; a blurred one collapses toward zero because neighbouring
     pixels stop differing. 100 is the usual starting point in the
     literature and holds up here. */
  blurFloor: 100,
  /* Mean luminance, 0-255. Below this the small print stops being
     legible even to a human. */
  darkFloor: 55,
  /* Above this the card is blown out and the print is lost in white. */
  brightCeiling: 233,
  /* Proportion of pixels at the very ends of the range. A photo taken
     against a window clips badly even when the mean looks fine. */
  clippedCeiling: 0.35,
  /* Long edge, in pixels. Below this a 12-digit number is not reliably
     readable by a person, let alone by OCR. */
  minLongEdge: 640,
  /* The document should not run off the frame. Measured as the share of
     border pixels that look like document rather than background. */
  edgeBleedCeiling: 0.72,
}

/** Rec. 709 luma. Cheap, and closer to perceived brightness than a mean. */
function toGrey({ data, width, height }) {
  const g = new Float32Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    g[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  return g
}

/**
 * Variance of the Laplacian — the standard sharpness measure.
 *
 * The Laplacian is a second-derivative filter: it responds to places
 * where brightness changes direction, which is what an edge is. A sharp
 * image has many such places and therefore a wide spread of responses; a
 * blurred one has few, and the variance collapses. Taking the VARIANCE
 * rather than the mean is what makes it robust — a uniformly grey image
 * and a sharp one can share a mean response, but never a spread.
 */
export function laplacianVariance(grey, width, height) {
  if (width < 3 || height < 3) return 0
  let sum = 0
  let sumSq = 0
  let n = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      /* The 4-neighbour kernel: centre * 4 minus its neighbours. */
      const v = 4 * grey[i]
        - grey[i - 1] - grey[i + 1]
        - grey[i - width] - grey[i + width]
      sum += v
      sumSq += v * v
      n++
    }
  }
  if (!n) return 0
  const mean = sum / n
  return sumSq / n - mean * mean
}

/** Mean brightness and how much of the frame is crushed or blown. */
export function luminanceStats(grey) {
  let sum = 0
  let clipped = 0
  for (let i = 0; i < grey.length; i++) {
    sum += grey[i]
    if (grey[i] <= 6 || grey[i] >= 249) clipped++
  }
  return {
    mean: grey.length ? sum / grey.length : 0,
    clipped: grey.length ? clipped / grey.length : 0,
  }
}

/**
 * Is the document running off the edge of the frame?
 *
 * ── What is actually measured, and why the first attempt was wrong ──
 * The first version compared the AVERAGE brightness of the border ring
 * to the average of the middle. That conflates two different things: a
 * card covered in dark print has a dark middle whether or not it is
 * cropped, so a well-framed document scored the same as a cut-off one.
 *
 * What distinguishes them is not brightness but VARIANCE. A document
 * resting on a table has a border ring of background — uniform, low
 * variance. A document that runs off the frame has print along that
 * edge, so the ring is full of light-dark transitions and its variance
 * approaches the variance of the document itself.
 *
 * The ratio of the two is therefore the signal: near 0 when the border
 * is background, near 1 when the border looks like more document.
 *
 * It remains a HEURISTIC and warns rather than rejects. Real boundary
 * detection needs a document model, which is a provider's job.
 */
export function edgeBleed(grey, width, height) {
  if (width < 16 || height < 16) return 0

  const ring = []
  const inner = []
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.03))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const onRing = x < band || y < band || x >= width - band || y >= height - band
      if (onRing) ring.push(grey[i])
      else inner.push(grey[i])
    }
  }
  if (ring.length < 8 || inner.length < 8) return 0

  const variance = a => {
    let sum = 0
    for (const v of a) sum += v
    const m = sum / a.length
    let sq = 0
    for (const v of a) sq += (v - m) * (v - m)
    return sq / a.length
  }

  const vInner = variance(inner)
  const vRing = variance(ring)

  /* A document with no print at all has nothing to compare against, so
     the ratio is meaningless and the answer is "no opinion". */
  if (vInner < 50) return 0

  return Math.min(1, vRing / vInner)
}

/**
 * The whole verdict.
 *
 * @param image       { data, width, height } — RGBA, as ImageData
 * @param requirement optional; its allowedFileTypes / maximumFileSize
 * @param file        optional; { type, size }
 * @returns { ok, failures: [{ code, says }], warnings: [...], metrics }
 */
export function assessImage(image, { requirement, file, thresholds } = {}) {
  const t = { ...QUALITY, ...(thresholds ?? {}) }
  const failures = []
  const warnings = []

  /* ── File-level checks first ──────────────────────────────────────
     They need no pixels, and a partner who picked the wrong file type
     should not wait for a Laplacian to be told so. */
  if (file && requirement?.allowedFileTypes?.length) {
    if (file.type && !requirement.allowedFileTypes.includes(file.type)) {
      failures.push({
        code: 'type',
        says: requirement.allowedFileTypes.includes('application/pdf')
          ? 'Upload a photo or a PDF.'
          : 'Upload a photo — a PDF cannot be used for this one.',
      })
    }
  }
  if (file && requirement?.maximumFileSize && file.size > requirement.maximumFileSize) {
    const mb = (requirement.maximumFileSize / 1048576).toFixed(0)
    failures.push({ code: 'size', says: `That file is over ${mb} MB. Take a photo instead of a scan.` })
  }

  /* A PDF has no pixels to judge. Saying so beats pretending to check. */
  if (!image) {
    return { ok: failures.length === 0, failures, warnings, metrics: null, checked: false }
  }

  const { width, height } = image
  const grey = toGrey(image)

  const longEdge = Math.max(width, height)
  const blur = laplacianVariance(grey, width, height)
  const { mean, clipped } = luminanceStats(grey)
  const bleed = edgeBleed(grey, width, height)

  if (longEdge < t.minLongEdge) {
    failures.push({
      code: 'resolution',
      says: `That image is only ${longEdge}px across. Take the photo closer, or send the original rather than a forwarded copy.`,
    })
  }

  if (mean < t.darkFloor) {
    failures.push({ code: 'dark', says: 'That photo is too dark to read. Try again in better light.' })
  } else if (mean > t.brightCeiling) {
    failures.push({ code: 'bright', says: 'That photo is washed out. Move away from the direct light.' })
  }

  if (clipped > t.clippedCeiling) {
    warnings.push({ code: 'clipped', says: 'Parts of that photo are pure black or pure white. Check the number is readable.' })
  }

  /* Blur is judged last of the hard failures, because a dark photo is
     also a blurred one and "try again in better light" is the more
     useful of the two sentences. */
  if (blur < t.blurFloor && mean >= t.darkFloor && mean <= t.brightCeiling) {
    failures.push({ code: 'blur', says: 'Image is too blurry. Please upload a clearer photo.' })
  }

  if (bleed > t.edgeBleedCeiling) {
    warnings.push({ code: 'edges', says: 'Document edges are not visible. Retake the photo with the whole card in frame.' })
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    checked: true,
    metrics: { width, height, longEdge, blur: Math.round(blur), mean: Math.round(mean), clipped, bleed },
  }
}

/**
 * Browser-only: a File to ImageData, downscaled.
 *
 * Downscaled on purpose. The measures above are scale-sensitive — a
 * Laplacian over a 12-megapixel image is both slow and dominated by
 * sensor noise rather than by whether the document is in focus. 1024 on
 * the long edge is enough to judge sharpness and fast enough to run
 * while somebody is still holding the phone up.
 */
export async function imageDataFrom(file, maxEdge = 1024) {
  if (typeof document === 'undefined') return null
  if (!file?.type?.startsWith('image/')) return null

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  /* The ORIGINAL dimensions matter for the resolution check — a 300px
     photo upscaled to 1024 is still a 300px photo. */
  const imageData = ctx.getImageData(0, 0, w, h)
  return { data: imageData.data, width: w, height: h, sourceWidth: bitmap.width, sourceHeight: bitmap.height }
}

/** The whole browser path: a File in, a verdict out. */
export async function assessFile(file, { requirement, thresholds } = {}) {
  const image = await imageDataFrom(file)
  if (image) {
    /* Judge resolution on what was actually taken, not on the copy we
       made to measure it. */
    const longEdge = Math.max(image.sourceWidth ?? 0, image.sourceHeight ?? 0)
    const verdict = assessImage(image, { requirement, file, thresholds })
    if (longEdge && verdict.metrics) {
      verdict.metrics.longEdge = longEdge
      verdict.failures = verdict.failures.filter(f => f.code !== 'resolution')
      const t = { ...QUALITY, ...(thresholds ?? {}) }
      if (longEdge < t.minLongEdge) {
        verdict.failures.push({
          code: 'resolution',
          says: `That image is only ${longEdge}px across. Take the photo closer, or send the original rather than a forwarded copy.`,
        })
      }
      verdict.ok = verdict.failures.length === 0
    }
    return verdict
  }
  return assessImage(null, { requirement, file, thresholds })
}

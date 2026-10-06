import { formatINR } from '../../utils/format'

/**
 * The only file in this repo that touches jsPDF.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE DYNAMIC import() IS THE WHOLE POINT
 * ══════════════════════════════════════════════════════════════════════
 *
 * jsPDF is ~120 KB gzipped. Imported at the top of any component it
 * joins the partner app's main bundle — which, in the Capacitor APK, is
 * install size on a cheap Android for a button most partners tap rarely
 * and some never.
 *
 * `await import('jspdf')` inside the handler makes Vite emit it as its
 * own chunk, fetched the first time somebody taps Download and never
 * otherwise. That is a property of WHERE the import is written, and one
 * careless top-level `import { jsPDF }` in a component would silently
 * undo it with no visible symptom. `check-money-masking.mjs` therefore
 * asserts that the string `jspdf` appears in exactly one file, and only
 * inside an `await import(`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT RENDERS A MODEL, IT DOES NOT COMPUTE ONE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every rupee here arrives in `model.lines`. Nothing in this file calls
 * jobMoney, reads a row, or rounds anything a second time. A document
 * that re-derives its own figures is a document that can disagree with
 * the screen it was opened from, which is the failure
 * `PayoutReceipt.jsx`'s header was written against.
 */

/**
 * ── Everything printed goes through this ────────────────────────────
 *
 * jsPDF's built-in fonts are Helvetica, Times and Courier, and all three
 * are limited to WinAnsi. The rupee sign U+20B9 is NOT in WinAnsi, and
 * neither is the narrow no-break space that `toLocaleString('en-IN')`
 * puts inside a grouped number. jsPDF answers that by switching the
 * string to UTF-16, which a WinAnsi font renders as mojibake — the
 * screen said ₹25,000 and the PDF said ¹25,000, on a document whose
 * entire purpose is to be believed.
 *
 * "Rs" is the ASCII form every Indian bank statement already uses, and
 * it is unambiguous. Em dashes, bullets and curly quotes get the same
 * treatment for the same reason.
 *
 * KNOWN LIMIT: a partner whose business name is written in Kannada or
 * Devanagari still cannot be printed by a core font. Fixing that means
 * embedding a Unicode TTF (several hundred KB, base64, inside the lazy
 * chunk) and is the right next step if it ever comes up — it is called
 * out here rather than discovered on somebody's payment slip.
 */
/* Escapes, not literal glyphs. This file is edited on Windows, where a
   tool that reads it as ANSI turns every one of these characters into
   mojibake -- and a mojibake'd character class silently stops matching
   the thing it was written to catch. */
const pdfSafe = s => String(s ?? '')
  .replace(/₹/g, 'Rs ')
  .replace(/[‐-―−]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[•·]/g, '*')
  .replace(/[    ]/g, ' ')
  .replace(/…/g, '...')
  /* Anything still outside Latin-1 would be re-encoded as UTF-16 and
     come out as mojibake, so it is dropped rather than printed wrong. */
  .replace(/[^\x20-\xFF\n]/g, '')
  .replace(/ {2,}/g, ' ')
  .trim()

const rupees = p => pdfSafe(formatINR(Math.round(Math.abs(p) / 100)))
const signed = p => `${p < 0 ? '- ' : ''}${rupees(p)}`

const PLUM = [46, 16, 101]        // plum-950, the brand's darkest
const INK = [31, 16, 51]
const MUTE = [107, 91, 133]

const fmtDate = d =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Build the PDF.
 * @returns {Promise<{blob: Blob, filename: string, dataUri: string}>}
 */
export async function renderDocument(model) {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 48
  let y = 56

  /* ── Masthead ───────────────────────────────────────────────────── */
  doc.setTextColor(...PLUM)
  doc.setFont('helvetica', 'bold').setFontSize(20)
  doc.text('SAMBRAMO', M, y)

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTE)
  doc.text(pdfSafe(model.title), M, y + 15)

  doc.setFontSize(9)
  doc.text(pdfSafe(model.documentNo), W - M, y, { align: "right" })
  doc.text(pdfSafe(fmtDate(model.issuedAt)), W - M, y + 13, { align: "right" })

  y += 34
  doc.setDrawColor(...PLUM).setLineWidth(1.2)
  doc.line(M, y, W - M, y)
  y += 24

  /* ── Who and what ───────────────────────────────────────────────── */
  doc.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(11)
  doc.text(pdfSafe(model.partner.name), M, y)
  y += 14

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTE)
  if (model.partner.code) { doc.text(pdfSafe(`Partner ${model.partner.code}`), M, y); y += 12 }

  const facts = []
  if (model.job) {
    if (model.job.service) facts.push(['Service', model.job.service])
    if (model.job.occasion) facts.push(['Event', model.job.occasion])
    if (model.job.eventDate) facts.push(['Event date', fmtDate(`${model.job.eventDate}T00:00:00+05:30`)])
    if (model.job.area) facts.push(['Location', model.job.area])
    if (model.job.bookingId) facts.push(['Booking', model.job.bookingId])
  }
  if (model.period) facts.push(['Period', model.period])
  if (model.jobCount != null) facts.push(['Bookings', String(model.jobCount)])

  y += 6
  for (const [k, v] of facts) {
    doc.setTextColor(...MUTE).text(pdfSafe(k), M, y)
    doc.setTextColor(...INK).text(pdfSafe(v), M + 96, y)
    y += 13
  }

  y += 14

  /* ── The money, in deduction order ──────────────────────────────── */
  for (const line of model.lines) {
    if (line.subtotal) {
      doc.setDrawColor(224, 220, 232).setLineWidth(0.6)
      doc.line(M, y - 10, W - M, y - 10)
    }

    doc.setFont('helvetica', (line.subtotal || line.strong) ? 'bold' : 'normal').setFontSize(10)
    doc.setTextColor(...INK)
    doc.text(pdfSafe(line.label), M, y)
    /* A plain hyphen, not an em dash: U+2014 is outside WinAnsi and
       would flip this one cell into UTF-16 mojibake on its own. */
    doc.text(line.paise === 0 && line.note ? '-' : signed(line.paise), W - M, y, { align: 'right' })
    y += 13

    if (line.note) {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTE)
      for (const l of doc.splitTextToSize(pdfSafe(line.note), W - M * 2 - 90)) {
        doc.text(l, M, y); y += 10
      }
    }
    y += 4
  }

  /* ── The total ──────────────────────────────────────────────────── */
  y += 6
  doc.setFillColor(...PLUM)
  doc.roundedRect(M, y - 4, W - M * 2, 34, 6, 6, 'F')
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(11)
  doc.text(pdfSafe(model.totalLabel), M + 14, y + 17)
  doc.setFontSize(14)
  doc.text(rupees(model.total), W - M - 14, y + 18, { align: 'right' })
  y += 50

  /* ── Where it went ──────────────────────────────────────────────── */
  const tail = []
  if (model.destination) tail.push(['Paid into', model.destination])
  if (model.status) tail.push(['Payout status', model.status])
  if (model.settledAt) tail.push(['Payout date', fmtDate(model.settledAt)])
  if (model.requestedAt) tail.push(['Requested', fmtDate(model.requestedAt)])
  if (model.reference) tail.push(['Reference', model.reference])
  if (model.batchReference) tail.push(['Payout reference', model.batchReference])

  doc.setFont('helvetica', 'normal').setFontSize(9)
  for (const [k, v] of tail) {
    doc.setTextColor(...MUTE).text(pdfSafe(k), M, y)
    doc.setTextColor(...INK).text(pdfSafe(v), M + 96, y)
    y += 13
  }

  /* ── Footnotes, pinned to the bottom ────────────────────────────── */
  let fy = doc.internal.pageSize.getHeight() - 56
  doc.setDrawColor(224, 220, 232).setLineWidth(0.6)
  doc.line(M, fy - 14, W - M, fy - 14)
  doc.setFontSize(7.5).setTextColor(...MUTE)
  for (const note of model.footnotes) { doc.text(pdfSafe(note), M, fy); fy += 10 }

  const filename = `${model.documentNo.replace(/\//g, '-')}.pdf`
  return { blob: doc.output('blob'), dataUri: doc.output('datauristring'), filename, doc }
}

/**
 * Hand the file to the person.
 *
 * ── Why this is not just doc.save() ─────────────────────────────────
 * `doc.save()` creates an object URL and clicks an anchor, which is a
 * browser download. Inside a Capacitor WebView that frequently does
 * nothing at all AND reports no error — the worst possible outcome for a
 * button on a financial screen, because the partner concludes the app is
 * broken and there is nothing in any log.
 *
 * On a device the data URI is opened instead, which hands the PDF to
 * Android's own viewer and its share sheet. It is checked at runtime
 * rather than imported, so the web build does not pull Capacitor in.
 *
 * NOTE: this branch is the one part of the documents work that the
 * headless harness cannot verify. It needs a real device or emulator.
 */
export async function deliverDocument(model) {
  const { blob, dataUri, filename, doc } = await renderDocument(model)

  const native = typeof window !== 'undefined'
    && window.Capacitor?.isNativePlatform?.()

  if (native) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: dataUri })
      return { delivered: 'native', filename }
    } catch {
      /* Fall through to the browser path rather than failing silently —
         a download that does nothing is the bug this function exists
         for, and a wrong-looking filename beats no file. */
    }
  }

  doc.save(filename)
  return { delivered: 'download', filename, blob }
}

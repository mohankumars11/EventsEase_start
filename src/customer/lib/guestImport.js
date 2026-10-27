/**
 * Guest lists from a file the host already has: Excel (.xlsx), CSV or a
 * plain list (.csv / .txt), or contacts exported from the phone (.vcf).
 * Everything is read on the device — nothing is uploaded until the host
 * taps Add — and returns [{ name, phone }], de-duplicated by phone.
 *
 * .xlsx is a zip of XML: the central directory is walked by hand and each
 * part inflated with the browser's own DecompressionStream, so no library
 * is shipped for it. Old binary .xls is not readable this way — the host
 * is asked to save it as .xlsx or .csv.
 */

const PHONE = /(\+?\d[\d\s().-]{7,17}\d)/
const NAME_COL = /^(full\s*)?name|guest|contact|person|invitee/i
const PHONE_COL = /phone|mobile|whats\s*app|number|contact\s*no|cell/i

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate-raw')
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds))
  return new Uint8Array(await out.arrayBuffer())
}

async function unzip(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let eocd = buf.length - 22
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('This file is not a real .xlsx — save it again from Excel or Google Sheets.')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const files = {}
  for (let i = 0; i < count; i++) {
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen))
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const raw = buf.subarray(start, start + size)
    files[name] = async () => dec.decode(method === 0 ? raw : await inflate(raw))
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const unescape = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')
const texts = xml => unescape([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))
const colIndex = ref => [...ref.match(/^[A-Z]+/)[0]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

/** The first sheet of an .xlsx, as rows of strings. */
async function xlsxRows(buf) {
  const z = await unzip(buf)
  const shared = z['xl/sharedStrings.xml'] ? [...(await z['xl/sharedStrings.xml']()).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => texts(m[1])) : []
  const sheet = Object.keys(z).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0]
  if (!sheet) throw new Error('No sheet found in this workbook.')
  const rows = []
  for (const r of (await z[sheet]()).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = []
    for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, ref, attrs, body = ''] = c
      const t = attrs.match(/t="(\w+)"/)?.[1], val = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      row[colIndex(ref)] = t === 's' ? shared[Number(val)] : t === 'inlineStr' ? texts(body) : val != null ? unescape(val) : ''
    }
    if (row.length) rows.push(Array.from(row, x => String(x ?? '').trim()))
  }
  return rows
}

/** CSV with quotes; also takes semicolons or tabs. */
function csvRows(text) {
  const sep = (text.split('\n')[0].match(/[;\t]/) || [','])[0]
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') q = false; else cell += ch }
    else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell.trim()); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row)
  return rows
}

/** Phone contacts exported as a .vcf (Android: Contacts → Export). */
function vcfGuests(text) {
  const out = []
  for (const card of text.split(/BEGIN:VCARD/i).slice(1)) {
    const unfolded = card.replace(/\r?\n[ \t]/g, '')
    const fn = unfolded.match(/^FN[^:\n]*:(.+)$/im)?.[1]?.trim()
    const n = unfolded.match(/^N[^:\n]*:(.+)$/im)?.[1]?.split(';').filter(Boolean).reverse().join(' ').trim()
    const tel = unfolded.match(/^TEL[^:\n]*:(.+)$/im)?.[1]?.trim()
    const name = (fn || n || '').replace(/\\,/g, ',')
    if (name) out.push({ name, phone: tel ?? null })
  }
  return out
}

/** Rows → guests: a header row picks the name and phone columns; without one, each row is scanned. */
function rowsToGuests(rows) {
  if (!rows.length) return []
  const head = rows[0].map(String)
  const ni = head.findIndex(h => NAME_COL.test(h)), pi = head.findIndex(h => PHONE_COL.test(h))
  const hasHeader = ni >= 0 || pi >= 0
  const body = hasHeader ? rows.slice(1) : rows
  return body.map(r => {
    if (hasHeader) {
      const first = head.findIndex(h => /^first/i.test(h)), last = head.findIndex(h => /^(last|sur)/i.test(h))
      const name = ni >= 0 ? r[ni] : [r[first], r[last]].filter(Boolean).join(' ')
      return { name: (name || '').trim(), phone: pi >= 0 ? (r[pi] || null) : (r.join(' ').match(PHONE)?.[1] ?? null) }
    }
    const line = r.join(' ')
    const m = line.match(PHONE)
    return { name: line.replace(m?.[0] ?? '', '').replace(/[,;|\t-]+/g, ' ').replace(/\s+/g, ' ').trim(), phone: m?.[1] ?? null }
  }).filter(g => g.name && g.name.length <= 100)
}

/** Read one picked file into guests. */
export async function guestsFromFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xls')) throw new Error('Old .xls files can’t be read on the phone — save it as .xlsx or .csv and pick it again.')
  if (name.endsWith('.xlsx')) return dedupe(rowsToGuests(await xlsxRows(new Uint8Array(await file.arrayBuffer()))))
  const text = await file.text()
  if (name.endsWith('.vcf') || /BEGIN:VCARD/i.test(text.slice(0, 200))) return dedupe(vcfGuests(text))
  return dedupe(rowsToGuests(csvRows(text)))
}

function dedupe(list) {
  const seen = new Set()
  return list.filter(g => {
    const k = String(g.phone ?? '').replace(/\D/g, '').slice(-10)
    if (!k) return true
    if (seen.has(k)) return false
    seen.add(k); return true
  })
}

/** The phone's own contact picker, where the browser has one (Chrome on Android). */
export const canPickContacts = () => typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in (navigator.contacts ?? {})
export async function pickContacts() {
  const list = await navigator.contacts.select(['name', 'tel'], { multiple: true })
  return dedupe(list.map(c => ({ name: c.name?.[0] ?? '', phone: c.tel?.[0] ?? null })).filter(g => g.name))
}

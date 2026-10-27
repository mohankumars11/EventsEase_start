/**
 * Read an .xlsx with nothing but Node: the zip central directory, raw
 * inflate, and the sheet XML. Enough for plain data workbooks (shared and
 * inline strings, numbers); no formulas, styles or dates.
 *
 *   import { readXlsx } from './lib/xlsx.mjs'
 *   const sheets = readXlsx('file.xlsx')   // { 'Sheet name': [[cell, …], …] }
 */
import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

function unzip(buf) {
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('xlsx: not a zip file')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const files = {}
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const raw = buf.subarray(start, start + size)
    files[name] = () => (method === 0 ? raw : inflateRawSync(raw)).toString('utf8')
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const unescape = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')
const texts = xml => unescape([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))
const colIndex = ref => [...ref.match(/^[A-Z]+/)[0]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

export function readXlsx(path) {
  const z = unzip(readFileSync(path))
  const shared = z['xl/sharedStrings.xml'] ? [...z['xl/sharedStrings.xml']().matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => texts(m[1])) : []
  const rels = Object.fromEntries([...z['xl/_rels/workbook.xml.rels']().matchAll(/<Relationship\b[^>]*>/g)].map(m => [m[0].match(/Id="([^"]+)"/)[1], m[0].match(/Target="([^"]+)"/)[1]]))
  const out = {}
  for (const m of z['xl/workbook.xml']().matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescape(m[0].match(/name="([^"]+)"/)[1]), rid = m[0].match(/r:id="([^"]+)"/)[1]
    const path = 'xl/' + rels[rid].replace(/^\/?(xl\/)?/, '')
    const rows = []
    for (const r of z[path]().matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = []
      for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const [, ref, attrs, body = ''] = c
        const t = attrs.match(/t="(\w+)"/)?.[1], v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
        row[colIndex(ref)] = t === 's' ? shared[Number(v)] : t === 'inlineStr' ? texts(body) : v != null ? unescape(v) : ''
      }
      if (row.length) rows.push(Array.from(row, x => x ?? ''))
    }
    out[name] = rows
  }
  return out
}

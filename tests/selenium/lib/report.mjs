/**
 * Results, as JUnit XML (for CI) and one HTML page (for a person).
 *
 * Every string that goes into a report passes through `redact` first:
 * test data includes Aadhaar-, PAN- and account-shaped values, and a
 * report is exactly the kind of file that gets attached to a ticket.
 * Screenshots are taken of the form, which only ever holds the synthetic
 * values these suites type.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function redact(s) {
  return String(s ?? '')
    .replace(/\b\d{12}\b/g, '[12 digits]')                                  // Aadhaar-shaped
    .replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, '[12 digits]')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]')                           // PAN-shaped
    .replace(/\b\d{9,18}\b/g, m => `[${m.length} digits]`)                 // account-shaped
    .replace(/(eyJ[\w-]+\.[\w-]+\.[\w-]+)/g, '[token]')                    // a JWT, never
    .replace(/(apikey|authorization)["':\s]+[^"',\s]+/gi, '$1: [hidden]')
}

const esc = s => redact(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))

export class Report {
  constructor(name, dir) {
    this.name = name
    this.dir = dir
    this.cases = []
    mkdirSync(join(dir, 'screenshots'), { recursive: true })
  }

  add({ suite, name, status, ms = 0, message = '', screenshot = null, console = [], meta = {} }) {
    this.cases.push({ suite, name, status, ms, message: redact(message), screenshot,
                      console: console.map(redact).slice(0, 20), meta })
  }

  get counts() {
    const c = { passed: 0, failed: 0, skipped: 0 }
    for (const x of this.cases) c[x.status]++
    return c
  }

  write() {
    const c = this.counts
    const bySuite = {}
    for (const x of this.cases) (bySuite[x.suite] ??= []).push(x)

    const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites name="${esc(this.name)}" tests="${this.cases.length}" failures="${c.failed}" skipped="${c.skipped}">`]
    for (const [suite, cases] of Object.entries(bySuite)) {
      const f = cases.filter(x => x.status === 'failed').length
      const s = cases.filter(x => x.status === 'skipped').length
      xml.push(`  <testsuite name="${esc(suite)}" tests="${cases.length}" failures="${f}" skipped="${s}">`)
      for (const x of cases) {
        xml.push(`    <testcase classname="${esc(suite)}" name="${esc(x.name)}" time="${(x.ms / 1000).toFixed(2)}">`)
        if (x.status === 'failed') xml.push(`      <failure message="${esc(x.message)}"/>`)
        if (x.status === 'skipped') xml.push(`      <skipped message="${esc(x.message)}"/>`)
        xml.push('    </testcase>')
      }
      xml.push('  </testsuite>')
    }
    xml.push('</testsuites>')
    writeFileSync(join(this.dir, 'junit.xml'), xml.join('\n'))

    const rows = this.cases.map(x => `<tr class="${x.status}"><td>${esc(x.suite)}</td><td>${esc(x.name)}</td>
      <td>${x.status}</td><td>${(x.ms / 1000).toFixed(1)}s</td><td>${esc(x.message)}${
      x.screenshot ? `<br><a href="${esc(x.screenshot)}">screenshot</a>` : ''}${
      x.console.length ? `<details><summary>console (${x.console.length})</summary><pre>${x.console.map(esc).join('\n')}</pre></details>` : ''}</td></tr>`)
    writeFileSync(join(this.dir, 'report.html'), `<!doctype html><meta charset="utf-8"><title>${esc(this.name)}</title>
<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
tr.failed td{background:#fff1f0}tr.skipped td{color:#777}.sum span{margin-right:16px;font-weight:700}pre{white-space:pre-wrap}</style>
<h1>${esc(this.name)}</h1><p class="sum"><span>${c.passed} passed</span><span>${c.failed} failed</span><span>${c.skipped} skipped</span>
generated ${new Date().toISOString()}</p><table><tr><th>Suite</th><th>Test</th><th>Result</th><th>Time</th><th>Detail</th></tr>${rows.join('')}</table>`)
    writeFileSync(join(this.dir, 'results.json'), JSON.stringify({ counts: c, cases: this.cases }, null, 1))
    return c
  }
}

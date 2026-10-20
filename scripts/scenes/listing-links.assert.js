/* The Links card: does the per-trade gate actually gate?
   Videography must offer a video link; Catering must not, and neither
   may be offered an audio link. A component that always rendered every
   row would photograph identically, so this reads the DOM. */
for (let i = 0; i < 80; i++) {
  if (document.querySelector('[data-ready]')) break
  await new Promise(r => setTimeout(r, 200))
}
const marker = document.querySelector('[data-ready]')
const trade = marker?.dataset?.trade ?? '(did not render)'
const rows = [...document.querySelectorAll('input[inputmode="url"]')].map(i => i.placeholder ?? '')
const has = s => rows.some(p => p.toLowerCase().includes(s))
const seen = rows.join(' | ')
/* The per-trade prompt must reach this screen, not just exist in the
   data file: the flow used to override it generically for all 34. */
const words = document.body.innerText
const checks = [
  { name: `scene rendered (${trade})`, ok: !!marker, detail: trade },
  { name: 'the generic prompt is gone', ok: !words.includes('Photos of your work'),
    detail: 'still showing "Photos of your work"' },
  { name: 'Instagram link is offered', ok: has('instagram'), detail: seen },
  { name: 'website / catalogue link is offered', ok: has('website'), detail: seen },
]
if (trade === 'Videography') {
  checks.push({ name: 'video link IS offered to Videography', ok: has('youtube'), detail: seen })
  checks.push({ name: 'audio link is NOT offered to Videography', ok: !has('audio'), detail: seen })
  checks.push({ name: "Videography is asked for its showreel, by name", ok: words.includes('showreel'),
    detail: 'no "showreel" on screen' })
} else if (trade === 'Catering & Food') {
  checks.push({ name: 'video link is NOT offered to Catering', ok: !has('youtube'), detail: seen })
  checks.push({ name: 'audio link is NOT offered to Catering', ok: !has('audio'), detail: seen })
  checks.push({ name: 'Catering gets exactly two link rows', ok: rows.length === 2, detail: `${rows.length} rows: ${seen}` })
  checks.push({ name: 'Catering is asked for its food and setup, by name', ok: words.includes('your food and your setup'),
    detail: 'generic prompt still showing' })
}
return checks

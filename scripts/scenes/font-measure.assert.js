const wait = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { if (document.querySelector('[data-ready]')) break; await wait(150) }
await document.fonts.ready
/* fonts.check is literal about the family string. Try the spellings the
   app actually uses, and corroborate with a width comparison against a
   generic fallback — a face that failed to load measures the same as
   the fallback, which is the only proof that does not depend on the
   check's quoting rules. */
const checks = {
  quoted: document.fonts.check('400 100px "Sambramo Display"'),
  unquoted: document.fonts.check("400 100px 'Sambramo Display'"),
  loadedList: [...document.fonts].map(f => `${f.family}/${f.status}`).join(', '),
}
const probe = (family, weight) => {
  const s = document.createElement('span')
  s.textContent = 'SAMBRAMO'
  s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;letter-spacing:-0.005em;font-weight:${weight};font-family:${family}`
  document.body.appendChild(s)
  const w = s.getBoundingClientRect().width
  s.remove()
  return w
}
const archivo = probe("'Sambramo Display', monospace", 400)
const mono = probe('monospace', 400)
return [
  { name: 'Sambramo Display is in document.fonts', ok: checks.quoted || checks.unquoted,
    detail: `quoted=${checks.quoted} unquoted=${checks.unquoted} | ${checks.loadedList}` },
  { name: 'it renders differently from the fallback (so it really loaded)',
    ok: Math.abs(archivo - mono) > 5, detail: `archivo=${archivo.toFixed(1)} fallback=${mono.toFixed(1)}` },
]

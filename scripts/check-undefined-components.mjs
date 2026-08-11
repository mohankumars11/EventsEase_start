#!/usr/bin/env node
/**
 * Fail on a capitalised JSX component that is used but never imported or
 * declared in the same file.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * A Vite build does not catch it. `<ShowcaseFallback />` with no
 * ShowcaseFallback in scope compiles perfectly happily and then throws a
 * ReferenceError the moment React renders it — which, on the landing page,
 * means the ErrorBoundary and a blank "something went wrong" for every
 * visitor. That shipped to production once, from an edit that removed a
 * component declaration and left its two JSX call sites behind.
 *
 * This project has no test runner, so `npm run build` was doing double duty
 * as the correctness check and this is the exact class of bug it cannot see.
 *
 *   node scripts/check-undefined-components.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (['.jsx', '.js'].includes(extname(p))) out.push(p)
  }
  return out
}

let problems = 0

for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')

  // `<Foo`, `<Foo.Bar` — only capitalised tags; lowercase ones are HTML.
  const used = new Set(
    [...src.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>.]/g)].map(m => m[1])
  )
  if (used.size === 0) continue

  const defined = new Set()

  // import X, { Y, Z as W } from '…'
  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]/g)) {
    for (const token of m[1].replace(/[{}]/g, ' ').split(/[,\s]+/)) {
      const name = token.trim().split(' as ').pop()
      if (name) defined.add(name)
    }
  }

  // function Foo / const Foo / class Foo
  for (const m of src.matchAll(/(?:function|const|let|var|class)\s+([A-Z][A-Za-z0-9_]*)/g)) {
    defined.add(m[1])
  }

  // Renamed destructuring, which is how every icon in this codebase arrives:
  //   {POINTS.map(({ icon: Icon, title }) => …)}
  // The binding is real but appears nowhere else, so without this the check
  // reports six false positives and stops being worth running.
  for (const m of src.matchAll(/[A-Za-z0-9_]+\s*:\s*([A-Z][A-Za-z0-9_]*)/g)) {
    defined.add(m[1])
  }

  // Shorthand destructuring, the other half of the same pattern:
  //   [{ Icon: GooglePayIcon, label }, …].map(({ Icon, label }) => <Icon …/>)
  // Here the binding is named `Icon` on both sides, so the renamed-pair rule
  // above never sees it. PaymentStrip.jsx does exactly this and was reported
  // as a crash that does not exist — a false positive in a pre-deploy gate is
  // expensive, because the next real one gets waved through.
  const destructured = [
    ...src.matchAll(/\(\s*\{([^{}]*)\}\s*\)\s*=>/g),        // ({ Icon, label }) =>
    ...src.matchAll(/(?:const|let|var)\s*\{([^{}]*)\}\s*=/g), // const { Icon } =
  ]
  for (const m of destructured) {
    for (const token of m[1].split(',')) {
      // Take the bound name: `Icon` from `Icon`, and from `icon: Icon` the
      // right-hand side, which the rule above already covers but is harmless
      // to repeat.
      const name = token.split(':').pop().split('=')[0].trim()
      if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) defined.add(name)
    }
  }

  for (const name of used) {
    if (defined.has(name)) continue
    console.error(`${relative('.', file)}: <${name}> is used but never imported or declared`)
    problems++
  }
}

if (problems) {
  console.error(`\n${problems} undefined component reference(s) — these throw at render, not at build.`)
  process.exit(1)
}
console.log('No undefined component references.')

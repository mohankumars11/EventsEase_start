#!/usr/bin/env node
/**
 * Is there a service worker in the build that is about to become an apk?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE CHECK THAT STOPS THIS COMING BACK
 * ══════════════════════════════════════════════════════════════════════
 *
 * A service worker inside a WebView outlives the apk that installed it.
 * Uninstalling the app clears it; installing a NEW apk over the old one
 * does not. So a single bad build is not a bad build -- it is a bad
 * build that keeps breaking every later good one, on every phone that
 * ever ran it, until the partner uninstalls.
 *
 * That asymmetry is why this runs inside `build-native.mjs` BEFORE
 * `cap sync`, and not as something somebody remembers to run.
 *
 *   node scripts/check-native-build.mjs
 *   node scripts/check-native-build.mjs --sabotage
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const DIST = join(ROOT, 'dist')
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

console.log('\nTHE BUILD EXISTS\n')
ok('dist/ is there', existsSync(DIST), 'run the build first')
if (!existsSync(DIST)) process.exit(1)

const indexPath = join(DIST, 'index.html')
ok('dist/index.html is there', existsSync(indexPath))
const html = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''

console.log('\nNO SERVICE WORKER REACHES THE APK\n')

/* The three artefacts vite-plugin-pwa emits. Any one of them is enough
   to register a worker, so all three are named rather than checking for
   the plugin having "probably" been off. */
ok('no dist/sw.js', !existsSync(join(DIST, 'sw.js')),
   'vite-plugin-pwa ran -- CAPACITOR_BUILD was not set')
ok('no dist/registerSW.js', !existsSync(join(DIST, 'registerSW.js')))
ok('no workbox runtime', !readdirSync(DIST).some(f => /^workbox-.*\.js$/.test(f)))

ok('index.html does not register one',
   !html.includes('vite-plugin-pwa:register-sw'),
   'the script tag that loads registerSW.js is still in the page')
ok('index.html has no serviceWorker.register',
   !/serviceWorker\s*\.\s*register/.test(html))

/* The manifest is harmless on its own -- it is an icon and a name, and
   it registers nothing. Named here only so a future reader does not
   delete it thinking it was part of the fault. */
const manifest = existsSync(join(DIST, 'manifest.webmanifest'))
console.log(`  · manifest.webmanifest ${manifest ? 'present' : 'absent'} (either is fine)`)

console.log('\nTHE SHELL IS ACTUALLY THERE TO SERVE\n')

/* Belt and braces: the reason a missing chunk was fatal is that
   Capacitor will not fall back to index.html for a dotted path. So the
   entry bundle named by the page has to genuinely exist on disk. A
   build that references a file it did not emit is the same crash by a
   different route. */
const entry = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
ok('index.html names an entry bundle', !!entry)
ok('and that bundle is on disk', !!entry && existsSync(join(DIST, 'assets', entry)),
   entry ? `assets/${entry} is referenced but missing` : '')

/* Every chunk the entry lazily imports must exist too. Vite writes them
   as relative specifiers inside the entry; a hash that survived from an
   earlier build is exactly what 404s inside the WebView. */
if (entry) {
  const code = readFileSync(join(DIST, 'assets', entry), 'utf8')
  const referenced = [...code.matchAll(/["'`]\.\/([A-Za-z0-9_.-]+\.js)["'`]/g)].map(m => m[1])
  const missing = [...new Set(referenced)].filter(f => !existsSync(join(DIST, 'assets', f)))
  ok(`every lazy chunk the entry names exists (${new Set(referenced).size} checked)`,
     missing.length === 0, missing.slice(0, 5).join(', '))
}

if (sabotage) {
  ran++
  if (!existsSync(join(DIST, 'sw.js'))) {
    bad++
    fails.push('sabotage: expected dist/sw.js to be present, and it is not')
  }
}

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}\n`)
if (fails.length) {
  console.log('FAILURES\n')
  for (const f of fails) console.log('  ' + f)
  console.log('\n  Build with `npm run app:partner`, which sets CAPACITOR_BUILD=true.\n')
}
process.exitCode = bad ? 1 : 0

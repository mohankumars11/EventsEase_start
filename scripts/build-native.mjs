#!/usr/bin/env node
/**
 * Build an apk's web assets, with the service worker OFF.
 *
 *   node scripts/build-native.mjs partner
 *   node scripts/build-native.mjs customer --remote
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS AT ALL
 * ══════════════════════════════════════════════════════════════════════
 *
 * `vite.config.js` already disables vite-plugin-pwa for native builds:
 *
 *     disable: process.env.CAPACITOR_BUILD === 'true'
 *
 * and `capacitor-config.mjs` already explains, at length, why a service
 * worker inside a WebView is actively harmful. Both were right. Neither
 * ran, because the thing that sets CAPACITOR_BUILD was the GitHub
 * workflow, and every apk anybody actually shipped was built locally
 * with:
 *
 *     "app:partner": "node scripts/capacitor-config.mjs partner && npm run build && npx cap sync"
 *
 * That chain has no way to set an environment variable that survives
 * into the `npm run build` segment on Windows, so it never did. Every
 * locally built apk in this repo carries dist/sw.js and a registerSW
 * script tag -- I checked all four.
 *
 * ── What that shipped ────────────────────────────────────────────────
 * The worker precaches the shell with `skipWaiting` and `clientsClaim`,
 * and it survives an apk-over-apk install because only a real uninstall
 * clears WebView storage. So on launch the OLD worker answers the
 * navigation with YESTERDAY's index.html, the new worker then claims the
 * page and drops the old precache, and the first lazy chunk the stale
 * shell asks for is in neither the new precache nor the new apk.
 *
 * Capacitor's WebViewLocalServer refuses to serve index.html for a path
 * containing a dot, so that request 404s rather than falling back. The
 * dynamic import rejects, nothing handles it, and the partner gets
 * "Something went wrong" after the onboarding cards -- with a Try again
 * button that reloads the same url and does it all over again.
 *
 * ── The fix is a variable, so the fix is a file ──────────────────────
 * One env var in one process. A build step that matters this much
 * should not depend on shell semantics differing between a developer's
 * machine and CI.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const target = process.argv[2]
const passthrough = process.argv.slice(3)

if (!['partner', 'customer'].includes(target)) {
  console.error('\n  Usage: node scripts/build-native.mjs <partner|customer> [--remote]\n')
  process.exit(1)
}

/* Inherited by every child below.
   CAPACITOR_BUILD turns the service worker off — the reason this file
   exists. VITE_SURFACE decides which app the bundle IS, and it is here
   for exactly the same reason: it was only ever set by the GitHub
   workflow, so a locally built "partner" apk compiled `currentSurface()`
   down to `customer` and behaved like the customer app inside a
   partner-branded shell.

   Both are folded into the bundle as constants at build time, so they
   have to be set for the BUILD and not merely for `cap sync`. */
const env = {
  ...process.env,
  CAPACITOR_BUILD: 'true',
  VITE_SURFACE: target,
}

const run = (label, cmd, args) => {
  console.log(`\n── ${label}\n`)
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    console.error(`\n  ${label} failed. Nothing was synced to the native project.\n`)
    /* `?? 1` was wrong. A failed `npm run build` exited 0 here, so the
       driver printed "failed. Nothing was synced" and then exited
       SUCCESSFULLY -- anything reading the code (CI, a shell chain, the
       APK job) would carry straight on as if the build had worked.
       `|| 1` makes a failure non-zero whatever the child reported. */
    process.exit(r.status || 1)
  }
}

run('capacitor config', 'node', ['scripts/capacitor-config.mjs', target, ...passthrough])

/* ── dist/ is emptied first, explicitly ─────────────────────────────
   Vite's `emptyOutDir` is supposed to default to true for an outDir
   inside the root, and on this project it demonstrably does not: six
   entry bundles had accumulated in dist/assets, and `cap sync` copied
   every one of them into the apk.

   That is what kept the old screens alive. A stale precaching service
   worker serves its OWN cached index.html; that page asks for the entry
   bundle it was built against; and it FINDS it, sitting in the apk
   beside the new one. The previous build then runs perfectly -- no 404,
   no chunk-load error, nothing for the error boundary or the preload
   handler to catch. Cleaning the native assets alone did not help,
   because the next `cap sync` put them straight back.

   Emptied here rather than argued with in vite.config: this is the
   build that produces an artefact somebody installs, and it should not
   depend on a default behaving as documented. */
const dist = join(ROOT, 'dist')
if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true })
  console.log('')
  console.log('── emptied dist/')
}

/* `npm run build`, not `vite build`: the npm script also runs the api
   bundle staleness check and writes the version file. Skipping it is how
   a stale bundle reaches a deploy. */
run('web build', 'npm', ['run', 'build'])

/* ── The gates, both before `cap sync` ──────────────────────────────
   Nothing wrong may reach the native project, because once it is in the
   apk it is on somebody's phone for as long as they keep the app
   installed — that asymmetry is the whole lesson of the service worker.

   1 · no service worker in the build
   2 · the build really is the app that was asked for */
/* ── Empty the native asset directory first ─────────────────────────
   `cap sync` COPIES dist into android/app/src/main/assets/public and
   never removes what is already there. Vite hashes every filename, so
   each build leaves its predecessor behind: seven entry bundles and
   five megabytes of dead chunks had accumulated by the time anybody
   looked.

   index.html always names the current one, so a clean launch was fine.
   The problem is what a STALE precaching service worker does with the
   rest. It serves its own cached index.html, that page asks for the
   entry bundle it was built against -- and finds it, sitting right
   there in the apk. The old app then runs perfectly: no 404, no
   chunk-load error, nothing for the error boundary or the preload
   handler to catch. Just the previous build, for ever, inside an apk
   that also contains the new one.

   That is the fuel. Removing it means a stale shell asks for something
   that genuinely is not there, which IS caught, and reloads into the
   installed build.

   `dist/` is authoritative and `cap sync` rewrites the whole directory,
   so there is nothing here worth keeping. */
const nativeAssets = join(ROOT, 'android/app/src/main/assets/public')
if (existsSync(nativeAssets)) {
  rmSync(nativeAssets, { recursive: true, force: true })
  console.log('')
  console.log('── cleaned android assets')
  console.log('')
}

run('native build check', 'node', ['scripts/check-native-build.mjs'])


const versionFile = join(ROOT, 'dist/version.json')
if (existsSync(versionFile)) {
  const v = JSON.parse(readFileSync(versionFile, 'utf8'))
  if (v.surface !== target) {
    console.error(`\n  Built as "${v.surface}" but "${target}" was asked for. Not syncing.\n`)
    process.exit(1)
  }
}

run('cap sync', 'npx', ['cap', 'sync'])

/* Checked AGAIN after the sync, which is the only moment the answer
   means anything -- before it, the directory has just been emptied and
   the question is vacuous. This is the run that proves exactly one
   build reached the native project. */
run('native assets check', 'node', ['scripts/check-native-build.mjs'])

const html = join(ROOT, 'dist/index.html')
if (existsSync(html)) {
  const entry = readFileSync(html, 'utf8').match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
  console.log(`\n✓ ${target} web assets built, no service worker`)
  if (entry) console.log(`  entry bundle: ${entry}`)
  if (existsSync(versionFile)) {
    const v = JSON.parse(readFileSync(versionFile, 'utf8'))
    console.log(`  surface:      ${v.surface}`)
    console.log(`  built at:     ${v.builtAt ?? 'unknown'}`)
  }
  console.log('')
}

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
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const target = process.argv[2]
const passthrough = process.argv.slice(3)

if (!['partner', 'customer'].includes(target)) {
  console.error('\n  Usage: node scripts/build-native.mjs <partner|customer> [--remote]\n')
  process.exit(1)
}

/* Inherited by every child below. This is the entire point of the file. */
const env = { ...process.env, CAPACITOR_BUILD: 'true' }

const run = (label, cmd, args) => {
  console.log(`\n── ${label}\n`)
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    console.error(`\n  ${label} failed. Nothing was synced to the native project.\n`)
    process.exit(r.status ?? 1)
  }
}

run('capacitor config', 'node', ['scripts/capacitor-config.mjs', target, ...passthrough])

/* `npm run build`, not `vite build`: the npm script also runs the api
   bundle staleness check and writes the version file. Skipping it is how
   a stale bundle reaches a deploy. */
run('web build', 'npm', ['run', 'build'])

/* ── The gate ───────────────────────────────────────────────────────
   Proving the variable did its job, rather than trusting that it did.
   A build that still contains a worker must not reach `cap sync`,
   because once it is in the apk it is on somebody's phone for as long
   as they keep the app installed. */
run('native build check', 'node', ['scripts/check-native-build.mjs'])

run('cap sync', 'npx', ['cap', 'sync'])

const html = join(ROOT, 'dist/index.html')
if (existsSync(html)) {
  const entry = readFileSync(html, 'utf8').match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
  console.log(`\n✓ ${target} web assets built without a service worker`)
  if (entry) console.log(`  entry bundle: ${entry}\n`)
}

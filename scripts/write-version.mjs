#!/usr/bin/env node
/**
 * Publish which build is live, so an installed app can tell.
 *
 *   node scripts/write-version.mjs        (after `vite build`)
 *
 * The web app updates itself. The APK cannot — its code is compiled in,
 * which is exactly why the bridge injects and push works, and the cost
 * is a phone that stays on whatever was installed until somebody
 * replaces it by hand.
 *
 * Until both apps are on the Play Store there is no updater to do that,
 * so the app compares its own stamped VITE_BUILD against this file,
 * served from the live site, and says so when they differ.
 *
 * ── A commit sha, not a version number ──────────────────────────────
 * A number has to be bumped by somebody, and the one release they
 * forget is the one where it mattered. A sha is produced by the act of
 * building and cannot drift from what was built.
 */
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const DIST = join(ROOT, 'dist')
if (!existsSync(DIST)) {
  console.error('\n  dist/ is missing — run `vite build` first.\n')
  process.exit(1)
}

const build = (process.env.VITE_BUILD ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 40)

/* Which app this bundle is. VITE_SURFACE decides isPartnerSurface()
   and is constant-folded, so nothing in the output reliably says it
   afterwards -- which is how a run of partner screenshots turned out
   to be the customer app. Recorded here so it can be read back. */
const surface = process.env.VITE_SURFACE === 'partner' ? 'partner' : 'customer'

writeFileSync(join(DIST, 'version.json'), JSON.stringify({
  build,
  surface,
  builtAt: new Date().toISOString(),
}, null, 2) + '\n', 'utf8')

console.log(`  version.json  build ${build.slice(0, 7)} · ${surface}`)

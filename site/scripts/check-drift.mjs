/**
 * Content staleness gate.
 *
 * content/*.json is a committed snapshot of the product's real data, because
 * Vercel builds this site with Root Directory `site` and ../src is never
 * uploaded. A committed snapshot is the only way build.mjs can see the
 * catalogue at deploy time — and the risk a committed snapshot carries is
 * that it silently stops matching.
 *
 * This is the same shape as scripts/build-api-bundle.mjs --check at the repo
 * root: an artifact plus a hash gate, for the same reason. Its header records
 * why the hash normalises line endings and reads UTF-8 rather than bytes — a
 * byte hash passed on Windows and failed on Vercel's Linux runner.
 *
 * WHERE THIS CAN RUN
 *
 * Locally and in CI, never on Vercel — there is no ../src there. That is why
 * it lives in `npm run check` and in the site workflow, and not in
 * `npm run build`. The Vercel build stays hermetic; the gate lives where the
 * sources do.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(SITE, '..')

const stampPath = join(SITE, 'content', '_stamp.json')
if (!existsSync(stampPath)) {
  console.error('\ncheck-drift: content/_stamp.json is missing. Run `npm run content`.\n')
  process.exit(1)
}
const stamp = JSON.parse(readFileSync(stampPath, 'utf8'))

const sha = file => createHash('sha256')
  .update(readFileSync(join(ROOT, file), 'utf8').replace(/\r\n/g, '\n'))
  .digest('hex').slice(0, 16)

const changed = []
const missing = []

for (const [file, rec] of Object.entries(stamp.sources ?? {})) {
  if (!existsSync(join(ROOT, file))) { missing.push(file); continue }
  const now = sha(file)
  if (now !== rec.sha) changed.push({ file, was: rec.sha, now })
}

if (missing.length || changed.length) {
  console.error('\ncheck-drift: the content snapshot no longer matches the product.\n')
  for (const f of missing) console.error(`  ✗ ${f} — no longer exists`)
  for (const c of changed) console.error(`  ✗ ${c.file}\n      snapshot ${c.was} · source now ${c.now}`)
  console.error(`\n  Snapshot taken ${stamp.generatedAt}.`)
  console.error('  Run `npm run content` to refresh it, then re-read the diff before committing:')
  console.error('  a change here means the website is about to start saying something different.\n')
  process.exit(1)
}

console.log(`check-drift: ok (${Object.keys(stamp.sources ?? {}).length} sources, snapshot ${stamp.generatedAt.slice(0, 10)})`)

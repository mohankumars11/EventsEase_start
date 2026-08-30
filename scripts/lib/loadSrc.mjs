/**
 * Import browser sources from a Node script.
 *
 * `src/` uses extensionless relative imports, which Node's ESM resolver
 * will not follow. esbuild resolves them exactly as Vite does, so this
 * tests and seeds against THE REAL FILES rather than a copy that can
 * drift — the same reasoning check-celebration-journey.mjs and
 * check-single-service.mjs already established, extracted here because a
 * third copy of it was one script too many.
 *
 * Usage:
 *
 *   const M = await loadSrc({
 *     'src/config/vendor.js':      ['TRADE_FOR_SERVICE', 'tradeFor'],
 *     'src/lib/instantPricing.js': ['priceLine'],
 *   })
 *
 * Pass `'*'` instead of an array to re-export everything from a module.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

export async function loadSrc(spec) {
  const tmp = mkdtempSync(join(tmpdir(), 'sambramo-src-'))
  const entry = join(tmp, 'entry.js')
  const out = join(tmp, 'bundle.mjs')

  const lines = Object.entries(spec).map(([file, names]) => {
    const path = JSON.stringify(join(ROOT, file))
    return names === '*'
      ? `export * from ${path}`
      : `export { ${names.join(', ')} } from ${path}`
  })

  writeFileSync(entry, lines.join('\n'))

  try {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: out,
      resolveExtensions: ['.js', '.jsx'],
      logLevel: 'error',
      // `import.meta.env` appears in src (config/instantBooking's dev-only
      // tier assertion, and the payment provider guards). Node has no such
      // object, so define it rather than let the bundle throw on load.
      define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
    })
    return await import(pathToFileURL(out).href)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

/**
 * Read a key from `.env`, falling back to the real environment.
 *
 * Not via a dotenv dependency: these are gate scripts and should not
 * acquire one to run. Read by Node rather than shelled out to, because
 * PowerShell on this machine reads UTF-8 as ANSI and mangles the file.
 *
 * `process.env` wins, so CI or a one-off override still works.
 */
/* Which environment the scripts talk to.

   SAMBRAMO_ENV=sandbox reads .env.sandbox instead of .env, so every
   check, capture and repro under scripts/ can be pointed at a throwaway
   database by setting one variable.

   It exists because there was only ever one Supabase project and one
   deployment, so every test run wrote to the database real customers
   use -- and two outages in two days were found by the CEO rather than
   by any check. A staging environment is not a nicety here; it is what
   makes it safe to check anything at all.

   Explicit process.env still wins, so CI and one-off overrides behave
   exactly as before. */
export const ENV_NAME = process.env.SAMBRAMO_ENV ?? "production"
export const ENV_FILE = ENV_NAME === "production" ? ".env" : ".env." + ENV_NAME

export function readEnv(key) {
  if (process.env[key]) return process.env[key]
  try {
    const src = readFileSync(join(ROOT, ENV_FILE), "utf8")
    const m = src.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

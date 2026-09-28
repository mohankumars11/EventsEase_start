#!/usr/bin/env node
/**
 * The Selenium runner.
 *
 *   node tests/selenium/run.mjs lab          every field, offline (CI)
 *   node tests/selenium/run.mjs e2e          the real app against the database
 *   node tests/selenium/run.mjs all
 *
 * Reports: reports/selenium/<suite>/{junit.xml, report.html, results.json,
 * screenshots/}. A failure takes a screenshot and keeps the browser's
 * console errors next to it.
 *
 * `e2e` needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY (from .env locally, secrets in CI). Without
 * them every e2e test is reported SKIPPED, never passed.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startDriver, consoleLines } from './lib/driver.mjs'
import { Report, redact } from './lib/report.mjs'
import { ROOT } from './lib/harness.mjs'

const which = process.argv[2] ?? 'lab'
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null
const SUITES = {
  lab: async () => (await import('./suites/fieldLab.mjs')).fieldLab,
  e2e: async () => (await import('./suites/partnerE2E.mjs')).partnerE2E,
}
const run = which === 'all' ? Object.keys(SUITES) : [which]

class AssertionError extends Error {}
let exitCode = 0

for (const name of run) {
  const dir = join(ROOT, 'reports', 'selenium', name)
  const report = new Report(`Sambramo Partner · ${name}`, dir)
  let driver = null
  try {
    driver = await startDriver()
  } catch (e) {
    report.add({ suite: name, name: 'start a browser', status: 'failed', message: e.message })
    report.write(); exitCode = 1; continue
  }

  const t = {
    driver,
    report,
    assert(cond, message) { if (!cond) throw new AssertionError(message) },
    skip(suite, testName, why) { report.add({ suite, name: testName, status: 'skipped', message: why }) },
    async test(suite, testName, fn) {
      if (only && !testName.includes(only)) return
      const start = Date.now()
      try {
        await fn()
        report.add({ suite, name: testName, status: 'passed', ms: Date.now() - start })
        process.stdout.write('.')
      } catch (e) {
        let shot = null
        try {
          const png = await driver.takeScreenshot()
          shot = `screenshots/${report.cases.length + 1}-${testName.replace(/[^\w]+/g, '-').slice(0, 60)}.png`
          writeFileSync(join(dir, shot), png, 'base64')
        } catch { /* the browser may be gone */ }
        report.add({ suite, name: testName, status: 'failed', ms: Date.now() - start,
                     message: e instanceof AssertionError ? e.message : `${e.name}: ${e.message}`,
                     screenshot: shot, console: await consoleLines(driver) })
        process.stdout.write('F')
      }
    },
  }

  try {
    await (await SUITES[name]())(t)
  } catch (e) {
    report.add({ suite: name, name: 'suite setup', status: 'failed', message: redact(e.stack ?? e.message) })
  } finally {
    await driver.quit().catch(() => {})
  }

  const c = report.write()
  console.log(`\n\n${name}: ${c.passed} passed, ${c.failed} failed, ${c.skipped} skipped`)
  console.log(`  reports/selenium/${name}/report.html`)
  for (const x of report.cases.filter(x => x.status === 'failed').slice(0, 25)) {
    console.log(`  ✗ [${x.suite}] ${x.name}\n      ${x.message}`)
  }
  if (c.failed) exitCode = 1
}
process.exit(exitCode)

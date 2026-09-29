/**
 * One headless browser, the one this machine has.
 *
 * Edge locally (it is what the dev box has; Chrome is not installed) and
 * Chrome on GitHub's runners, chosen by BROWSER or by what exists.
 * Selenium Manager fetches the matching driver, so no driver binary is
 * checked in or pinned.
 *
 * The window is a phone: 412 x 915, the size the partner app is laid out
 * for. A desktop-width run would test a layout no partner sees.
 */
import { Builder, Browser } from 'selenium-webdriver'
import edge from 'selenium-webdriver/edge.js'
import chrome from 'selenium-webdriver/chrome.js'
import { existsSync } from 'node:fs'

const EDGE_PATHS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
                    'C:/Program Files/Microsoft/Edge/Application/msedge.exe']

export function whichBrowser() {
  if (process.env.BROWSER) return process.env.BROWSER
  return EDGE_PATHS.some(existsSync) ? 'edge' : 'chrome'
}

export async function startDriver({ width = 412, height = 915 } = {}) {
  const browser = whichBrowser()
  const args = ['--headless=new', `--window-size=${width},${height}`, '--disable-gpu',
                '--disable-dev-shm-usage', '--no-first-run', '--lang=en-IN']
  if (process.env.CI) args.push('--no-sandbox')

  let driver
  if (browser === 'edge') {
    const o = new edge.Options().addArguments(...args)
    o.setLoggingPrefs({ browser: 'ALL' })
    driver = await new Builder().forBrowser(Browser.EDGE).setEdgeOptions(o).build()
  } else {
    const o = new chrome.Options().addArguments(...args)
    o.setLoggingPrefs({ browser: 'ALL' })
    driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(o).build()
  }
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 60000, script: 30000 })
  driver.__browser = browser
  return driver
}

/** Browser console lines since the last call: errors and warnings only. */
export async function consoleLines(driver) {
  try {
    const entries = await driver.manage().logs().get('browser')
    return entries.filter(e => ['SEVERE', 'WARNING'].includes(e.level.name))
      .map(e => `${e.level.name} ${e.message}`)
  } catch {
    return []
  }
}

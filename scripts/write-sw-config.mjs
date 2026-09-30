#!/usr/bin/env node
/**
 * Bake the Firebase web config into the push service worker in dist/.
 *
 *   node scripts/write-sw-config.mjs        (run after `vite build`)
 *
 * ══════════════════════════════════════════════════════════════════════
 * A SERVICE WORKER CANNOT READ import.meta.env
 * ══════════════════════════════════════════════════════════════════════
 *
 * It runs outside the page and outside the bundler, and is fetched as a
 * static file. So the config has to reach it some other way, and the
 * original answer — query parameters on the registration URL — is
 * fragile in a way that fails silently:
 *
 * The parameters are only present if the browser reuses the exact
 * registration that carried them. A worker registered earlier without
 * them keeps its own URL, `self.location.search` comes back empty,
 * `firebase.initializeApp` is skipped, and `onBackgroundMessage` is
 * never attached.
 *
 * FCM then delivers the push perfectly. The browser receives a message
 * no handler claims and shows NOTHING, while every server-side signal
 * reports success. There is no error in any log, on either side.
 *
 * Baking the values in removes the dependency entirely: the worker is
 * self-sufficient however it was registered.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BASE64, AND WHY IT IS NOT OBFUSCATION
 * ══════════════════════════════════════════════════════════════════════
 *
 * The placeholder is a single-quoted string in the worker source, so the
 * substituted value must not contain quotes or newlines — a JSON object
 * pasted in raw would terminate the string and produce a syntax error.
 * Base64 is the simplest encoding with that property.
 *
 * It hides nothing and is not meant to. The Firebase web config is
 * public by design: it identifies the project and authorises nothing.
 * The key that authorises SENDING is FIREBASE_SERVICE_ACCOUNT, which
 * lives on the server and never reaches a browser.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const target = join(ROOT, 'dist', 'firebase-messaging-sw.js')

if (!existsSync(target)) {
  console.error('\n  dist/firebase-messaging-sw.js is missing — run `vite build` first.\n')
  process.exit(1)
}

const config = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(config).filter(([, v]) => !v).map(([k]) => k)

if (missing.length) {
  /* Loud, and it fails the build.
   *
   * A silent skip here produces an app that looks completely fine and
   * cannot receive a single background notification — which is exactly
   * the failure this script exists to end. Better to stop now, where
   * there is a build log somebody is reading. */
  console.error(`\n  Cannot bake the service worker config — missing: ${missing.join(', ')}\n`)
  process.exit(1)
}

const src = readFileSync(target, 'utf8')

if (!src.includes('__FIREBASE_SW_CONFIG__')) {
  console.error('\n  The placeholder is gone from firebase-messaging-sw.js — has it been edited?\n')
  process.exit(1)
}

const baked = Buffer.from(JSON.stringify(config), 'utf8').toString('base64')
writeFileSync(target, src.replace('__FIREBASE_SW_CONFIG__', baked), 'utf8')

console.log(`\n  firebase-messaging-sw.js  ←  ${config.projectId}  (${baked.length} chars baked)\n`)

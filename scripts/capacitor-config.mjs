#!/usr/bin/env node
/**
 * Write `capacitor.config.json` for whichever app is being built.
 *
 *   node scripts/capacitor-config.mjs customer
 *   node scripts/capacitor-config.mjs partner
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE CONFIG IS GENERATED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Capacitor reads ONE config file, and it carries the app id, the app
 * name and the server URL — the three things that differ between the
 * customer app and the partner app. Two static files would mean copying
 * one over the other before every build, which is a step somebody
 * eventually forgets, and forgetting it ships the partner app under the
 * customer's package id.
 *
 * So the target is named explicitly at build time and the config is
 * written from it. Building the wrong app requires typing the wrong word,
 * rather than forgetting a step.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `server.url` — THE DECISION THAT KEEPS DEPLOYS INSTANT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Capacitor can either BUNDLE the built web assets into the app, or point
 * the WebView at a live URL. Bundling is the default and it would cost
 * something this project currently has: pushing to
 * `feature/without-shopping` reaches every phone immediately, with no
 * store review.
 *
 * Bundled, every copy fix and every price change would need an App Store
 * review — days, for a one-line edit. So the shell points at the live
 * site, and a store release is only needed when something NATIVE changes:
 * push configuration, permissions, a new plugin, the icon.
 *
 * ── What that costs, stated honestly ─────────────────────────────────
 * The app needs a network connection to start. A bundled build would open
 * offline and show a cached shell; this one shows the WebView's own
 * failure page.
 *
 * That is the right trade HERE and would not be everywhere: this app is a
 * marketplace. Every screen it has — a live offer with a countdown, a
 * matching board, an escrow balance — is meaningless without the server.
 * There is nothing useful to show a master offline except a lie about
 * what is happening.
 *
 * Apple accepts this pattern; what Guideline 4.2 rejects is an app with
 * no native integration, and native push is exactly that integration.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const TARGETS = {
  customer: {
    appId: 'com.sambramo.app',
    appName: 'Sambramo',
    url: 'https://sambramoh.vercel.app',
  },
  partner: {
    appId: 'com.sambramo.partner',
    appName: 'Sambramo Partners',
    url: 'https://sambramo-partners.vercel.app',
  },
}

const target = process.argv[2]

/**
 * Bundled, or pointed at the live site?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY BUNDLED IS NOW THE DEFAULT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `server.url` was the original choice and its argument was good: a
 * deploy reaches every installed phone in minutes, and a store release
 * is only needed when something native changes. On a product whose copy
 * and prices change daily, that is worth a great deal.
 *
 * It does not survive contact with Android.
 *
 * ── The bridge ──────────────────────────────────────────────────────
 * Capacitor injects `window.Capacitor` through
 * `WebViewCompat.addDocumentStartJavaScript`, and falls back to
 * `WebViewLocalServer`'s injector when the WebView lacks
 * DOCUMENT_START_SCRIPT. That fallback rewrites LOCAL assets only — a
 * remote origin gets nothing. When it fails there is no error: the page
 * loads perfectly and `window.Capacitor` is simply undefined, so the
 * app reports itself as a browser and native push cannot be registered
 * at all. Which is exactly what a real device reported.
 *
 * ── And the service worker ──────────────────────────────────────────
 * vite-plugin-pwa precaches the app shell. Inside a WebView that cache
 * is far stickier than in Chrome, so "I deployed, relaunch the app"
 * kept showing code from hours earlier — the instant-update benefit
 * that justified server.url in the first place, not actually arriving.
 *
 * So: the web assets are compiled INTO the apk. The bridge is then
 * guaranteed, push works, and what is on the phone is what was built.
 *
 * The cost is real and worth stating plainly: every change now needs a
 * new APK. That is the ordinary way an app works, and it is the price
 * of the app being an app.
 *
 * `--remote` keeps the old behaviour, for live-reload during native
 * development where it is genuinely useful.
 */
const REMOTE = process.argv.includes('--remote')
if (!TARGETS[target]) {
  console.error(`\n  Usage: node scripts/capacitor-config.mjs <${Object.keys(TARGETS).join('|')}>\n`)
  process.exit(1)
}

const t = TARGETS[target]

const config = {
  appId: t.appId,
  appName: t.appName,
  // Still required even with `server.url`: Capacitor copies from here on
  // `cap sync`, and the native project expects the directory to exist.
  webDir: 'dist',

  /* Bundled: no `url`, so the WebView loads the assets inside the apk
     over the https scheme Capacitor serves them on. With --remote the
     url comes back and the app loads the live site instead. */
  server: {
    ...(REMOTE ? { url: t.url } : {}),
    // HTTPS only. `cleartext: false` means a downgraded connection fails
    // rather than silently loading over HTTP — on an app that carries a
    // customer's address and a master's earnings, that is not a setting
    // worth being relaxed about.
    cleartext: false,
    androidScheme: 'https',
  },

  ios: {
    // The WebView's own background, visible for the moment before the
    // page paints. Matched to the splash so a cold start does not flash
    // white then aqua — the same reasoning vite.config.js gives for
    // `background_color` in the PWA manifest.
    backgroundColor: '#1B5C73',
    contentInset: 'always',
    // A pull-to-refresh gesture inside a WebView reloads the whole app
    // mid-booking, which loses the matching screen a customer is
    // watching.
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    backgroundColor: '#1B5C73',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    PushNotifications: {
      // Both platforms show the notification while the app is open. The
      // alternative is a master with the app in front of them missing a
      // 45-second offer because the banner was suppressed as redundant.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

writeFileSync(join(ROOT, 'capacitor.config.json'), JSON.stringify(config, null, 2) + '\n')

console.log(`\n  capacitor.config.json → ${t.appName}`)
console.log(`    id   ${t.appId}`)
console.log(`    mode ${REMOTE ? 'remote — ' + t.url : 'bundled into the apk'}\n`)

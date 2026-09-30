import { useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import { isNativeApp } from '../../lib/nativePush'

/**
 * "You are on the website. The app is where the jobs are."
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A FEATURE AND NOT A DEBUGGING AID
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master reaching Sambramo from a WhatsApp forward lands in a browser
 * tab. Everything works there except the one thing the business depends
 * on: a job offer lives 45 seconds, and a browser tab that is not open
 * cannot be told about it. Web push helps and is not the same — it
 * cannot survive an iPhone, and on Android it is at the mercy of
 * whichever browser they used.
 *
 * So every master on the website needs to end up in the app, and until
 * now nothing on the site said so.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT ALSO ENDS AN AMBIGUITY THAT COST HOURS
 * ══════════════════════════════════════════════════════════════════════
 *
 * An installed APK and a home-screen shortcut to this site carry the
 * same name and the same icon on Android. Tapping the wrong one opens
 * Chrome, with no Capacitor bridge and no native push — and looks
 * identical to opening the app.
 *
 * That is not a mistake somebody makes once. It is indistinguishable by
 * design, and the only reliable signal is the one this component reads:
 * `window.Capacitor` is present in the app and absent in the browser.
 *
 * So the banner is shown ONLY in the browser. Seeing it means, without
 * ambiguity, that this is not the app — and it carries the link that
 * fixes that.
 */

/* The rolling release tag. Every build replaces it, so this URL is
   permanent and can be sent to a master once. */
const BASE = 'https://github.com/mohankumars11/EventsEase_start/releases/download/android-latest'

const APPS = {
  partner: {
    apk: `${BASE}/sambramo-partner.apk`,
    label: 'Install the Sambramo Partners app',
    title: 'You are using the website',
    // Said as what they lose, not what we want.
    why: 'A job is offered for 45 seconds and the first master to accept gets it. The app buzzes your phone even when it is closed; a browser tab cannot.',
  },
  customer: {
    apk: `${BASE}/sambramo-customer.apk`,
    label: 'Install the Sambramo app',
    title: 'Get the app',
    why: 'Masters reply while you are doing something else. The app tells you the moment one accepts — a browser tab has to be open to tell you anything.',
  },
}

const DISMISSED = 'sambramo_install_dismissed'

export default function InstallTheApp({ app = 'partner' }) {
  const [gone, setGone] = useState(() => {
    try { return localStorage.getItem(DISMISSED) === '1' } catch { return false }
  })

  // In the app already. Nothing to say.
  if (isNativeApp() || gone) return null

  // iPhone has no APK. Telling an iPhone owner to install one is worse
  // than saying nothing — the iOS build is not done yet, and promising
  // it here would be a promise on a screen rather than a plan.
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return null

  function dismiss() {
    setGone(true)
    try { localStorage.setItem(DISMISSED, '1') } catch { /* storage off */ }
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-plum-950 p-4 text-white">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white/80"
      >
        <X size={15} />
      </button>

      <p className="flex items-center gap-2 pr-6 text-[14.5px] font-extrabold leading-tight">
        <Smartphone size={16} className="shrink-0 text-saffron-400" />
        {APPS[app].title}
      </p>

      {/* The reason, stated as what they lose rather than what we want. */}
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/75">
        {APPS[app].why}
      </p>

      <a
        href={APPS[app].apk}
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-saffron-400 py-3 text-[14px] font-extrabold text-plum-950 transition active:scale-[0.99]"
      >
        <Download size={16} /> {APPS[app].label}
      </a>

      <p className="mt-2 text-center text-[11px] leading-snug text-white/50">
        Android will ask you to allow installing from your browser. Once it is
        installed, open it from your app drawer — not from an old icon on your
        home screen.
      </p>
    </div>
  )
}

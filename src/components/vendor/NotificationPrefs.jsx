import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { savePrefs, PREF_DEFAULTS } from '../../lib/partnerInbox'

/**
 * What a partner is willing to be interrupted for.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THERE IS NO SWITCH FOR OFFERS
 * ══════════════════════════════════════════════════════════════════════
 *
 * An offer lives for forty-five seconds and the whole arrangement
 * depends on the phone buzzing. A switch that silently stops the work
 * arriving is a trap, and the partner who flips it will conclude weeks
 * later that Sambramo has no jobs. If somebody genuinely wants none, the
 * honest controls already exist: mark the days busy, or close the
 * account. Both are on this tab.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT SAVES ON THE TAP
 * ══════════════════════════════════════════════════════════════════════
 *
 * No Save button under five switches. A settings row that needs
 * confirming is a settings row people leave half-changed, and the write
 * is one upsert of five booleans.
 *
 * The switch moves first and is put back if the write fails. Waiting for
 * a round trip before the thumb sees anything is what makes a toggle
 * feel broken on a slow connection.
 */

const ROWS = [
  ['job_updates',   'Job updates',   'A booking changes, or a customer cancels'],
  ['payouts',       'Money',         'Your earnings clear, and when a payout is sent'],
  ['reviews',       'Reviews',       'Somebody rates a job you did'],
  ['messages',      'Replies',       'We answer something you asked us'],
  ['announcements', 'From Sambramo', 'New areas, fee changes, festival notices'],
  /* ── The one notification this system actually sends ─────────────
     Migration 148 added the column so a partner could stop the
     coverage sweep nudging them. It never appeared here, so the only
     reminder the app has ever sent was the only one nobody could turn
     off. Last in the list because it is the one most worth leaving on
     -- match_partners cannot offer a date the calendar has not spoken
     for, so a partner who silences this and then forgets goes quiet
     without knowing why. */
  ['calendar',      'Calendar',      'When your availability is running out'],
]

export default function NotificationPrefs({ vendorId, initial }) {
  const [prefs, setPrefs] = useState({ ...PREF_DEFAULTS, ...(initial ?? {}) })
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)

  async function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(key)
    setError(null)
    /* Built from ROWS rather than enumerated by hand. The hand-written
       list is how `calendar` was lost: the column was added, the row
       was not, and the save silently dropped it for two migrations. A
       switch that exists on screen is now a switch that gets sent. */
    const res = await savePrefs(vendorId,
      Object.fromEntries(ROWS.map(([k]) => [k, next[k]])))
    setSaving(null)
    if (!res.ok) {
      setPrefs(prefs)
      setError('That did not save. Try again.')
    }
  }

  return (
    <div className="space-y-1">
      {ROWS.map(([key, label, hint]) => (
        <button
          key={key}
          type="button"
          role="switch"
          aria-checked={prefs[key]}
          onClick={() => toggle(key)}
          className="flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold leading-tight text-ink">{label}</span>
            <span className="block text-[11.5px] leading-snug text-ink-mute">{hint}</span>
          </span>
          {saving === key
            ? <Loader2 size={15} className="shrink-0 animate-spin text-ink-mute" />
            : (
              <span className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                prefs[key] ? 'bg-forest-600' : 'bg-ink/15'
              }`}>
                <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  prefs[key] ? 'translate-x-4' : ''
                }`} />
              </span>
            )}
        </button>
      ))}

      <p className="pt-1 text-[11.5px] leading-snug text-ink-mute">
        New jobs always come through. An offer lasts under a minute, so there is
        no switch for it — to stop work arriving, mark the days busy on your
        calendar.
      </p>

      {error && <p className="text-[12px] font-semibold text-rose-700">{error}</p>}
    </div>
  )
}

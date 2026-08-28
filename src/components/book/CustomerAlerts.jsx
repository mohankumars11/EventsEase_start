import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { alertsAvailability, enableAlerts } from '../../lib/push'

/**
 * "Tell me when a master accepts."
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE MATCHING SCREEN MAKES A PROMISE NOTHING WAS KEEPING
 * ══════════════════════════════════════════════════════════════════════
 *
 * It says, in as many words: *you can close the app — we will alert you
 * the moment someone accepts*. There was no customer-side push at all.
 * `notifyPartners` had existed since dispatch was built and had no
 * counterpart, and no screen had ever asked a customer for the
 * notification permission.
 *
 * So a customer who did what the screen invited them to do heard nothing
 * ever again. An unkept promise on that screen is worse than never
 * having made it, because it is the sentence that persuaded them to stop
 * watching.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASKED HERE, AND ONLY HERE
 * ══════════════════════════════════════════════════════════════════════
 *
 * A browser gives one chance at the permission. Spend it on page load
 * and most people refuse, and the app can never ask again.
 *
 * This is the one moment in the customer's whole journey when the answer
 * is obviously yes: they have just committed to a booking, they are
 * watching a screen that says it will take about a minute, and they
 * would rather not watch it. The offer is made once, inline, and never
 * repeated — if they decline, the board still works exactly as before.
 */
export default function CustomerAlerts() {
  const { user } = useAuth()
  const [state, setState] = useState('checking')   // checking | offer | on | unavailable
  const [busy, setBusy] = useState(false)

  const check = useCallback(async () => {
    if (!user?.id) return
    const can = alertsAvailability()

    const { data } = await supabase
      .from('push_tokens').select('id')
      .eq('profile_id', user.id).eq('app', 'customer').limit(1)

    if (data?.length) { setState('on'); return }
    setState(can?.ok ? 'offer' : 'unavailable')
  }, [user?.id])

  useEffect(() => { check() }, [check])

  async function turnOn() {
    setBusy(true)
    const r = await enableAlerts({ profileId: user.id, app: 'customer' })
    setBusy(false)
    // A refusal is not an error worth a red box. The board keeps working;
    // they simply have to keep it open.
    setState(r.ok ? 'on' : 'unavailable')
  }

  if (state === 'checking' || state === 'unavailable') return null

  if (state === 'on') {
    return (
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-forest-700">
        <Bell size={12} />
        You can close the app — we will alert you
      </p>
    )
  }

  return (
    <button
      onClick={turnOn}
      disabled={busy}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08] transition active:scale-[0.99] disabled:opacity-60"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} className="text-ink-mute" />}
      Alert me when a master accepts
    </button>
  )
}

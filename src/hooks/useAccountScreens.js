import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Opening a screen on More, and coming back from it.
 *
 * Every way into a More screen (a row, the Jobs cards, the Earnings
 * card, Grow's shortcuts) pushes a history entry marked `up`. Going up
 * pops that entry when it is there, so the on-screen Back and Android's
 * back button land in the same place: wherever the partner actually came
 * from. The apk registers no `backButton` listener, so Capacitor's
 * default applies and the hardware button is `history.back()`.
 *
 * Opened cold (a notification, a reload) there is nothing to pop, so it
 * replaces with the parent rather than leaving the app.
 *
 * Its own hook so check-trade-champion-ui can drive exactly this code in
 * a browser, back button included, without a partner login.
 */
export function useAccountScreens() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  /* Switching screens must not drop `return` — see VendorDashboard: a
     partner mid-setup who touched any tab used to stop being one. */
  const keepReturn = useCallback(next => {
    const out = new URLSearchParams(next)
    const r = params.get('return')
    if (r) out.set('return', r)
    return out
  }, [params])

  const drop = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''))

  const openAccount = (screen, extra = {}) =>
    setParams(keepReturn(screen ? drop({ tab: 'account', screen, ...extra }) : { tab: 'account' }),
              { state: { up: true } })

  const goUp = parent => {
    if (location.state?.up) { navigate(-1); return }
    setParams(keepReturn(parent ? drop({ tab: 'account', ...parent }) : { tab: 'account' }), { replace: true })
  }

  /* Filters are replaced, not pushed: typing a search must not leave one
     history entry per letter for the back button to walk through. */
  const setScreenParams = (screen, extra, { replace = false } = {}) =>
    setParams(keepReturn(drop({ tab: 'account', screen, ...extra })),
              replace ? { replace: true, state: location.state } : { state: { up: true } })

  const screenParams = {
    trade: params.get('trade'), rid: params.get('rid'),
    st: params.get('st'), ft: params.get('ft'), q: params.get('q'),
  }

  return { screen: params.get('screen'), screenParams, keepReturn, openAccount, goUp, setScreenParams }
}

/**
 * Every trade's Add-item flow, mounted for real.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * AddItemFlow used five lucide icons in its stepper — ListChecks, Soup,
 * ClipboardList, IndianRupee, SendHorizonal — and imported none of them.
 * Building the phases array threw a ReferenceError while the component
 * was still rendering, which is the error boundary, on the FIRST screen,
 * for every partner and every trade. It was live for twenty commits.
 *
 * Nothing caught it. Bundlers do not: esbuild and Vite treat a bare
 * identifier as a runtime global, exactly like `window`, so the build was
 * clean. And every scene photographed a STEP — OperationsStep,
 * DetailStep, ReviewStep — never the flow that contains them, so the
 * screenshots were all green while the thing they lived inside could not
 * mount at all.
 *
 * ══════════════════════════════════════════════════════════════════════
 * flushSync, AND WHY THE FIRST VERSION OF THIS FILE PROVED NOTHING
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first attempt called `root.render()` in a loop and read the error
 * straight afterwards. React 18 renders concurrently, so `render()` only
 * SCHEDULES the work: the loop finished, recorded "no error" for all
 * twenty-six trades, and unmounted every root before React had drawn a
 * single one. Reintroducing the exact bug it was written for still gave
 * a green tick.
 *
 * flushSync forces the render to happen inside the call, which is the
 * only way the throw lands before the result is read. It runs outside
 * React's own lifecycle — a timeout, not an effect body — because
 * flushSync from inside a lifecycle is ignored with a warning, which
 * would put the vacuous version back with a fig leaf on it.
 *
 * Sabotage-tested: delete the icon import and this fails, naming the
 * trades and the ReferenceError.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import AddItemFlow from '../../src/components/vendor/AddItemFlow'
import { TRADES } from '../../src/data/partnerCatalogue'

/* Not the app's boundary: that one shows a friendly apology, which is
   the behaviour being tested against. This one records and re-reports. */
class Catch extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { this.props.onError(String(err?.message ?? err)) }
  render() { return this.state.err ? null : this.props.children }
}

function mountEach() {
  const out = []
  for (const trade of TRADES) {
    /* One at a time into a detached root: the flow is a portal to
       document.body, and twenty-six stacked would make "did it render"
       unanswerable. */
    /* React does not always take the previous portal down before the
       next mount goes up, and a leftover Back button made ten of the
       twenty-six look fine while the flow returned null. Cleared
       explicitly, so each iteration is measured on its own. */
    for (const n of document.querySelectorAll('[data-add-item-flow]')) n.remove()

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    let err = null
    try {
      flushSync(() => {
        root.render(
          <Catch onError={m => { err = m }}>
            <ToastProvider>
              <AddItemFlow
                existing={[]}
                startTrade={trade}
                onAdd={() => {}}
                onClose={() => {}}
              />
            </ToastProvider>
          </Catch>,
        )
      })
    } catch (e) {
      err = String(e?.message ?? e)
    }

    /* A boundary that swallows the throw leaves no error to read, so
       the render is checked directly. Not by counting body children —
       the scene's own root and this host make that at least two
       whatever happens, which is a check that cannot fail. It looks
       for the flow's own portal root. Two markers were tried first and
       both were wrong: a step-specific string, because not every trade
       lands on that step, and the Back button, because a leftover
       portal from the previous iteration still had one. Both reported
       16 of 26 when all 26 were broken. */
    const drew = !!document.querySelector('[data-add-item-flow]')

    out.push({ trade, err, drew })
    try { flushSync(() => root.unmount()) } catch { /* already gone */ }
    host.remove()
  }
  return out
}

export default function FlowRenders() {
  const [results, setResults] = React.useState([])

  React.useEffect(() => {
    /* Out of React's lifecycle, so flushSync is honoured rather than
       warned about and ignored. */
    const t = setTimeout(() => {
      const out = mountEach()
      window.__FLOW_RESULTS__ = out
      setResults(out)

      /* Reported as console errors, not only as text: the screenshot
         harness collects those, so the check script reads one thing and
         there is no second CDP implementation to keep working.

         The count is asserted as well as the failures — a harness that
         mounted nothing would otherwise print a green tick, which is
         precisely the shape of the bug this file exists for. */
      for (const r of out) {
        if (r.err) console.error(`FLOW: ${r.trade} threw — ${r.err}`)
        else if (!r.drew) console.error(`FLOW: ${r.trade} rendered nothing`)
      }

      /* Last, and required by the check script.

         Without it the guard was timing-dependent: the screenshot fired
         partway through the loop, so it reported on whichever trades
         had been reached — eight of twenty-six on this machine — and a
         healthy-looking pass could have covered a third of the list.
         A run that has not printed this line is not a pass. */
      console.error(`FLOW-DONE ${out.length}/${TRADES.length}`)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const bad = results.filter(r => r.err || !r.drew)
  return (
    <div id="flow" style={{ width: 390, margin: '0 auto', padding: 16, font: '13px system-ui' }}>
      <p style={{ fontWeight: 800 }}>
        {results.length} trades mounted · {bad.length} failed
      </p>
      {bad.map(r => (
        <p key={r.trade} style={{ color: '#c8112a' }}>
          {r.trade}: {r.err ?? 'rendered nothing'}
        </p>
      ))}
    </div>
  )
}

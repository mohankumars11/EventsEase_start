/**
 * Walk the Add-item flow to the end and submit it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS AND NOT repro-add-item.mjs
 * ══════════════════════════════════════════════════════════════════════
 *
 * repro-add-item.mjs serves dist/ over 127.0.0.1 and drives the real app.
 * It cannot reach the partner surface at all: currentSurface() decides
 * from the hostname, 127.0.0.1 is not a partner host, and the `?surface=`
 * override is behind import.meta.env.DEV which is constant-folded out of
 * a production build. So every step reported NOT FOUND against a heading
 * that never stopped saying "Sambramo" — twelve steps of red that were
 * the harness, not the app.
 *
 * check-flow-renders.jsx sidesteps that by importing the component and
 * mounting it. This does the same and then CLICKS: tick, Continue, tick,
 * Continue, to Review, type a name, hold to sign, Submit.
 *
 * ── What "works" means here ──────────────────────────────────────────
 * Mounting proves the screen draws. It does not prove a partner can get
 * off it. The bug that started this was a missing import; the next one
 * will be a disabled button nobody can satisfy, or a gate with no way
 * through, and neither shows up in a screenshot of the first screen.
 *
 * So the assertion is the thing a partner actually needs: onAdd was
 * called, with rows, carrying the ids and the signature.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ToastProvider } from '../../src/context/ToastContext'
import AddItemFlow from '../../src/components/vendor/AddItemFlow'

/* Four trades that exercise different shapes of the flow: the long
   catering funnel, a plain trade, the one with a distance fare, and one
   of the two that did not exist a day ago. */
const WALK = ['Photography', 'Transportation', 'Catering & Food', 'Wedding Planning']

const sleep = ms => new Promise(r => setTimeout(r, ms))
const root = () => document.querySelector('[data-add-item-flow]')

const text = el => (el?.textContent ?? '').trim()

/** Every button inside the flow, in document order. */
const buttons = () => [...(root()?.querySelectorAll('button') ?? [])]

/** The one action at the bottom. */
const primary = () =>
  buttons().find(b => /^(Continue|Submit for review)$/.test(text(b)))

/**
 * React does not see a value set straight on the input, because it tracks
 * the previous value on the node itself. The native setter plus a bubbled
 * input event is the documented way round it.
 */
function typeInto(input, value) {
  const proto = Object.getPrototypeOf(input)
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function sign() {
  const name = [...root().querySelectorAll('input')]
    .find(i => /full name/i.test(i.getAttribute('aria-label') ?? '')
      || /agreement/i.test(i.placeholder ?? ''))
  if (!name) return 'no name field on the review screen'
  typeInto(name, 'Test Partner')
  await sleep(60)

  const hold = buttons().find(b => /Hold to sign|Keep holding/.test(text(b)))
  if (!hold) return 'no hold-to-sign button'
  if (hold.disabled) return 'hold-to-sign stayed disabled after typing a name'

  hold.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  await sleep(1600)
  hold.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  await sleep(120)

  if (!/Signed by/.test(text(root()))) return 'held for 1.6s and it did not sign'
  return null
}

async function walkOne(trade) {
  for (const n of document.querySelectorAll('[data-add-item-flow]')) n.remove()

  const host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)

  /* onAdd is called ONCE PER OFFERING with a single row object, not
     once with an array. Reading .length off it gave undefined and this
     walker reported "submitted zero rows" for all four trades — a
     harness bug that read exactly like a broken submit. */
  const added = []
  let err = null
  let snap = ''
  let gateBit = false
  const seen = []

  /* What was on screen when it stopped. Without this a walker bug and
     an app bug read identically, and reporting the first as the second
     wastes somebody's afternoon. */
  const capture = () => {
    const r0 = root()
    snap = r0
      ? `[${buttons().map(b => (text(b) || b.getAttribute('aria-label') || '?')
          + (b.disabled ? ':off' : '')).slice(0, 14).join(' | ')}]`
      : '(nothing rendered)'
  }

  try {
    flushSync(() => {
      r.render(
        <ToastProvider>
          <AddItemFlow
            existing={[]}
            startTrade={trade}
            onAdd={row => { added.push(row) }}
            onClose={() => {}}
          />
        </ToastProvider>,
      )
    })

    /* Bounded, so a screen that cannot be satisfied ends the walk instead
       of spinning until the harness gives up and calls it a pass. */
    /* Set when the gated branch has just satisfied a screen, so the
       next pass presses Continue instead of tapping again — the options
       are toggles and no aria-pressed to read, so tapping the same one
       twice turns it back off and disables Continue. That is what the
       walker did, and it reported it as the app breaking. */
    let justAnswered = false

    for (let step = 0; step < 40 && !added.length; step++) {
      const go = primary()
      if (!go) { capture(); err = `no Continue button on screen ${step}`; break }

      if (text(go) === 'Submit for review') {
        const bad = await sign()
        if (bad) { capture(); err = bad; break }
        if (primary()?.disabled) { capture(); err = 'Submit stayed disabled after signing'; break }
        primary().click()
        await sleep(400)
        break
      }

      /* ── Did the gate actually bite? ────────────────────────────
         Reaching the end proves a partner CAN finish. It says nothing
         about whether they could have skipped everything, which is the
         thing being fixed. So the first screen made of question cards
         is checked: Continue must be OFF before anything is answered.

         Without this the walk would pass just as happily if the gate
         were deleted. */
      if (!gateBit && root()?.querySelector('[data-question]')
          && !root().querySelector('[aria-pressed="true"]')) {
        gateBit = true
        if (!go.disabled) {
          capture()
          err = `screen ${step} let Continue through with nothing answered`
          break
        }
      }

      if (go.disabled) {
        /* The screen wants an answer, and one tap is not always enough:
           the cuisine screen opens a region before it offers the kitchens
           inside it, so the first tap reveals the choice rather than
           making it. Tapped until Continue lights or the screen runs out
           of things to tap. */
        /* One option per QUESTION, not the first eight buttons on the
           screen. Every question now has to be answered, and the first
           version of this tapped eight choices inside a single question
           and then reported the app as stuck — a walker bug that read
           exactly like the gate being impossible to satisfy.

           `data-question` is on each question's card; a card with an
           aria-pressed button already has an answer. */
        const tapped = new Set()
        let freed = false
        for (let t = 0; t < 40 && !freed; t++) {
          const card = [...(root()?.querySelectorAll('[data-question]') ?? [])]
            .find(c => !c.querySelector('[aria-pressed="true"]')
              && !tapped.has(c.getAttribute('data-question')))
          const pick = card
            ? [...card.querySelectorAll('button')].find(b => !b.disabled && text(b))
            /* Screens that are not built from question cards — the trade
               grid, offerings, the kitchen and cuisine funnel. */
            : buttons().find(b =>
                b !== primary() && !b.disabled && text(b)
                && !/^(Continue|Submit for review)$/.test(text(b))
                && !['Back', 'Close'].includes(b.getAttribute('aria-label'))
                && !tapped.has(text(b)))
          if (!pick) break
          tapped.add(card ? card.getAttribute('data-question') : text(pick))
          seen.push(text(pick).slice(0, 24))
          pick.click()
          await sleep(90)
          freed = primary() && !primary().disabled
        }
        if (!freed) {
          capture()
          err = `stuck on screen ${step} after ${tapped.size} taps`
          break
        }
        justAnswered = true
        continue
      }

      /* Answer something on the way past, rather than pressing Continue
         through every optional screen. A walk that answers nothing
         submits a listing with no answer ids — which is correct, and
         proves nothing about the screens that collect them. */
      const opt = justAnswered ? null : buttons().find(b =>
        b !== go && !b.disabled && text(b)
        && !/^(Continue|Submit for review)$/.test(text(b))
        && !['Back', 'Close'].includes(b.getAttribute('aria-label'))
        && b.getAttribute('aria-pressed') !== 'true')
      if (opt) {
        seen.push(text(opt).slice(0, 24))
        opt.click()
        await sleep(120)
      }

      const on = primary()
      if (!on || on.disabled) {
        capture()
        err = `ticking "${text(opt).slice(0, 24)}" turned Continue off on screen ${step}`
        break
      }
      on.click()
      justAnswered = false
      await sleep(200)
    }
  } catch (e) {
    err = String(e?.message ?? e)
  }

  try { flushSync(() => r.unmount()) } catch { /* gone */ }
  host.remove()

  if (!err && !added.length) err = 'walked 40 screens and never submitted'

  /* The row is checked, not just counted. A submit that saves a listing
     with no signature and no answer ids is a submit that looks fine and
     loses the two things this week added. */
  if (!err) {
    const row = added[0]
    const specs = row?.specs ?? {}
    if (!row?.name) err = 'a row was submitted with no name'
    else if (row.category !== trade) err = `row category is "${row.category}", not "${trade}"`
    else if (!specs.signature?.signed_at) err = 'the row carries no signature'
    else if (!specs.answers?.length) err = 'the row carries no answer ids'
  }
  if (!err && !gateBit) err = 'never reached a question screen — the gate was not tested'
  return { trade, err, rows: added.length, ticked: seen.length, snap,
    answers: added[0]?.specs?.answers?.length ?? 0 }
}

export default function FlowWalk() {
  const [out, setOut] = React.useState([])

  React.useEffect(() => {
    let live = true
    /* setTimeout, not the effect body. flushSync called from inside a
       lifecycle is IGNORED with a warning, so the first trade rendered
       nothing and reported "no Continue button" — a walker bug that read
       exactly like an app bug. The trades after it worked only because
       the first await had already put them outside the lifecycle. */
    const t = setTimeout(async () => {
      const results = []
      for (const trade of WALK) {
        results.push(await walkOne(trade))
        if (!live) return
      }
      window.__WALK_RESULTS__ = results
      setOut(results)

      for (const r of results) {
        if (r.err) console.error(`WALK: ${r.trade} — ${r.err} ${r.snap ?? ''}`)
        else if (!r.rows) console.error(`WALK: ${r.trade} — submitted nothing after ${r.ticked} taps`)
      }
      /* Required by the check script. A run that stopped early is not a
         pass, however green the lines above it look. */
      console.error(`WALK-DONE ${results.length}/${WALK.length}`)
    }, 0)
    return () => { live = false; clearTimeout(t) }
  }, [])

  return (
    <div id="walk" style={{ width: 390, margin: '0 auto', padding: 16, font: '13px system-ui' }}>
      <p style={{ fontWeight: 800 }}>{out.length} of {WALK.length} walked</p>
      {out.map(r => (
        <p key={r.trade} style={{ color: r.err ? '#c8112a' : '#1a7f4b' }}>
          {r.trade}: {r.err ?? `${r.rows} row(s), ${r.answers} answer ids, signed, after ${r.ticked} taps`}
        </p>
      ))}
    </div>
  )
}

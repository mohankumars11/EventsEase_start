/**
 * Components photographed on their own, without a login.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THESE ARE NOT SHOT THROUGH THE APP
 * ══════════════════════════════════════════════════════════════════════
 *
 * The stepper and the status card only appear behind a partner session,
 * several taps into a modal, in states that need real rows in the
 * database — a rejected listing, a submission that went over 24 hours.
 * Getting the app into each of those to take one photograph means
 * writing production data, which is both slow and a thing that then has
 * to be cleaned up.
 *
 * These are the real components imported from src/, given props by hand.
 * If a scene here renders, the component renders; if a class is missing
 * from the stylesheet, it is missing in the app too, because the sheet is
 * the app's own build output.
 *
 * What this canNOT prove is that the app ever passes these props — that
 * is repro-add-item.mjs's job, walking the real flow. The two answer
 * different questions and both are needed.
 *
 *   node scripts/shoot-components.mjs out.png
 */
import React from 'react'
import {
  ListChecks, Flame, Soup, UtensilsCrossed,
  ClipboardList, IndianRupee, SendHorizonal,
} from 'lucide-react'

import FunnelStepper from '../../src/components/vendor/FunnelStepper'
import ListingStatusCard from '../../src/components/vendor/ListingStatusCard'

/* The same seven phases AddItemFlow builds. Copied rather than imported
   because they are declared inside the component body there; if they
   drift apart the photograph stops matching the app, which is the sort
   of thing the walk-through catches. */
const PHASES = [
  { id: 'what',     label: 'What you do',  icon: ListChecks },
  { id: 'kitchen',  label: 'Kitchen',      icon: Flame },
  { id: 'cuisines', label: 'Cuisines',     icon: Soup },
  { id: 'dishes',   label: 'Dishes',       icon: UtensilsCrossed },
  { id: 'ops',      label: 'How you work', icon: ClipboardList },
  { id: 'price',    label: 'Your rate',    icon: IndianRupee },
  { id: 'submit',   label: 'Submit',       icon: SendHorizonal },
]

const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString()

function Scene({ title, note, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <p style={{
        font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 3px',
      }}>{title}</p>
      {note && (
        <p style={{ font: '400 11.5px/1.4 system-ui', color: '#9a9a9a', margin: '0 0 8px' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  )
}

export default function VendorScenes() {
  return (
    <div style={{ width: 390, margin: '0 auto', padding: 16, background: '#fff' }}>

      {/* ── The stepper, in the three states that matter ───────────────── */}

      <Scene
        title="Stepper · mid-flow"
        note="Two behind, inside Dishes, four ahead."
      >
        <FunnelStepper
          phases={PHASES.map(p => (p.id === 'dishes' ? { ...p, subLabel: '3 of 5' } : p))}
          currentId="dishes"
          doneIds={['what', 'kitchen', 'cuisines']}
        />
      </Scene>

      <Scene
        title="Stepper · a step attempted and left empty"
        note="Red only after the partner has actually been on that screen."
      >
        <FunnelStepper
          phases={PHASES}
          currentId="cuisines"
          doneIds={['what']}
          blockedIds={['kitchen']}
        />
      </Scene>

      <Scene title="Stepper · everything answered, on Submit">
        <FunnelStepper
          phases={PHASES}
          currentId="submit"
          doneIds={['what', 'kitchen', 'cuisines', 'dishes', 'ops', 'price']}
        />
      </Scene>

      {/* ── The status card, in all four states ────────────────────────── */}

      <Scene title="Status · under review, 3 hours in">
        <ListingStatusCard status="review" count={1} submittedAt={hoursAgo(3)} />
      </Scene>

      <Scene
        title="Status · under review, over 24 hours"
        note="The copy changes rather than the clock freezing."
      >
        <ListingStatusCard status="review" count={2} submittedAt={hoursAgo(31)} />
      </Scene>

      <Scene title="Status · live">
        <ListingStatusCard status="live" count={1} />
      </Scene>

      <Scene title="Status · needs a change">
        <ListingStatusCard
          status="rejected"
          count={1}
          note="Your FSSAI number did not match the name on the licence. Send the correct one and it goes straight back for checking."
        />
      </Scene>
    </div>
  )
}

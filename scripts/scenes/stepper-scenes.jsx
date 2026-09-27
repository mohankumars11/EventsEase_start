/**
 * The stepper at four phases and at seven.
 *
 * Fixed 44px columns in a min-w-max row clustered four dots hard against
 * the left edge while seven filled the header — the same component
 * looking like two different designs depending on the trade.
 */
import React from 'react'
import FunnelStepper from '../../src/components/vendor/FunnelStepper'
import {
  ListChecks, Flame, Soup, UtensilsCrossed, ClipboardList, IndianRupee, SendHorizonal,
} from 'lucide-react'

const ALL = [
  { id: 'what',     label: 'What you do',  icon: ListChecks },
  { id: 'kitchen',  label: 'Kitchen',      icon: Flame },
  { id: 'cuisines', label: 'Cuisines',     icon: Soup },
  { id: 'dishes',   label: 'Dishes',       icon: UtensilsCrossed, subLabel: '3 of 5' },
  { id: 'ops',      label: 'How you work', icon: ClipboardList },
  { id: 'price',    label: 'Your rate',    icon: IndianRupee },
  { id: 'submit',   label: 'Submit',       icon: SendHorizonal },
]

function Row({ label, phases, currentId, doneIds = [], blockedIds = [] }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 6px' }}>{label}</p>
      <div style={{ background: '#fdfcfa', padding: '12px 16px', borderRadius: 14 }}>
        <FunnelStepper phases={phases} currentId={currentId}
          doneIds={doneIds} blockedIds={blockedIds} />
      </div>
    </section>
  )
}

const NON_CATERING = ALL.filter(p => !['kitchen', 'cuisines', 'dishes'].includes(p.id))

export default function StepperScenes() {
  return (
    <div id="stepper" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Row label="A photographer — four phases" phases={NON_CATERING}
        currentId="ops" doneIds={['what']} />
      <Row label="A photographer, one screen unfinished" phases={NON_CATERING}
        currentId="price" doneIds={['what']} blockedIds={['ops']} />
      <Row label="A caterer — seven phases" phases={ALL}
        currentId="dishes" doneIds={['what', 'kitchen', 'cuisines']} />
      <Row label="A caterer, kitchen left empty" phases={ALL}
        currentId="cuisines" doneIds={['what']} blockedIds={['kitchen']} />
    </div>
  )
}

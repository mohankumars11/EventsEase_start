/**
 * The Earnings screen's three states, photographed.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS PROVES
 * ══════════════════════════════════════════════════════════════════════
 *
 * Earnings.jsx used to destructure `{ data }` from three parallel reads
 * and throw all three `error`s away, so a request that did not arrive
 * rendered the "No earnings yet" card — the app telling a partner their
 * money was gone.
 *
 * The harness points VITE_SUPABASE_URL at 127.0.0.1:9, a dead port. So
 * mounting the real component here IS the failed read, and the middle
 * panel below is the photograph of the bug being fixed: before, it said
 * "No earnings yet"; now it says the request did not get through, and
 * offers a retry.
 *
 * The third panel is ScreenState's empty card with the words Earnings
 * actually passes — a genuinely empty account, which must stay visibly
 * different from the failure above it. If those two ever converge, the
 * bug is back.
 *
 * ── --wait 20000, and why it is not 900 ──────────────────────────────
 * The stub host is 127.0.0.1:9. A connection there does not refuse
 * quickly — supabase-js sits on the pending fetch for several seconds
 * before it rejects. At the harness default of 900ms, and even at
 * 2500ms, panel 2 photographs the SKELETON and looks like a pass of the
 * loading state rather than a failure of the error one. Shot at 20s it
 * shows the retry card, which is the thing worth photographing.
 *
 * ── The MemoryRouter is load-bearing ────────────────────────────────
 * Earnings keeps its range and its open transaction in the URL, via
 * useSearchParams. Without a Router above it the component throws at
 * mount and the harness photographs a blank page with a height of zero
 * — which is exactly how this scene broke when the screen was rebuilt.
 *
 *   node scripts/shoot-components.mjs shots/earnings-states.png \
 *     --scenes scripts/scenes/earnings-states.jsx --width 390 --wait 20000
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import Earnings from '../../src/components/vendor/Earnings'
import ScreenState from '../../src/components/ui/ScreenState'

function Panel({ title, note, children }) {
  return (
    <section className="mb-5">
      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {title}
      </p>
      <p className="mb-2.5 text-[12px] leading-snug text-ink-soft">{note}</p>
      <div className="rounded-[20px] bg-page-sunk p-3">{children}</div>
    </section>
  )
}

export default function EarningsStates() {
  return (
    <MemoryRouter initialEntries={['/dashboard/vendor?tab=earnings']}>
      <div className="mx-auto max-w-[420px] p-4">
        <Panel
          title="1 · Loading"
          note="First read only. The 20-second poll must not flash this again."
        >
          <ScreenState loading rows={4} what="your earnings" />
        </Panel>

        <Panel
          title="2 · The read failed"
          note="The real component against a dead Supabase. This used to say 'No earnings yet'."
        >
          <Earnings
            vendorId="00000000-0000-0000-0000-000000000000"
            vendor={{ business_name: 'Suresh Studios' }}
            onAddPayout={() => {}}
          />
        </Panel>

        <Panel
          title="3 · Genuinely empty"
          note="Must not look like panel 2. Nothing has gone wrong here."
        >
          <ScreenState
            empty
            title="No earnings yet"
            message="Keep your list and your calendar current — that is what decides how often you are matched."
          />
        </Panel>
      </div>
    </MemoryRouter>
  )
}

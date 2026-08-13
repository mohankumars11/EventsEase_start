import { useState } from 'react'
import DateDemandAdmin from './DateDemandAdmin'
import PeakDatesAdmin from './PeakDatesAdmin'
import IntakeCapacityAdmin from './IntakeCapacityAdmin'

/**
 * The date console — one admin section for everything a date can carry.
 *
 * Three screens, and they are separate tabs rather than one long page
 * because they answer three different questions and are used by different
 * people at different moments:
 *
 *   Demand    "how many families have asked about 22 Nov?"  — the only one
 *             of the three a customer ever sees the output of. Writes
 *             date_enquiry_log; drives the demand badge.
 *   Peak      "why is 22 Nov busy?"  — muhurtham, festival, long weekend,
 *             sourced from a published panchang. A signal, never a block.
 *   Capacity  "can we actually take a twelfth booking on 22 Nov?"  —
 *             internal operations only, and the tab itself says so.
 *
 * Demand stays first and stays the default, because it is the one that
 * changes what customers see and the one used daily.
 *
 * Each tab mounts only when opened. All three load a 400-day window plus,
 * in Capacity's case, both request tables — running those three loads on
 * every visit to the section would be a lot of Postgres for a coordinator
 * who came to log two WhatsApp enquiries.
 */

const TABS = [
  { id: 'demand',   label: 'Demand log', emoji: '📆', Panel: DateDemandAdmin,
    hint: 'What customers see' },
  { id: 'peak',     label: 'Peak dates', emoji: '🪔', Panel: PeakDatesAdmin,
    hint: 'Muhurtham & festivals' },
  { id: 'capacity', label: 'Capacity',   emoji: '🧮', Panel: IntakeCapacityAdmin,
    hint: 'Internal only' },
]

export default function DateConsole() {
  const [tab, setTab] = useState('demand')
  const active = TABS.find(t => t.id === tab) ?? TABS[0]
  const { Panel } = active

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Date tools" className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const on = t.id === tab
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-left transition-colors ${
                on
                  ? 'border-plum-500 bg-plum-50 text-plum-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
              }`}
            >
              <span aria-hidden="true">{t.emoji}</span>
              <span>
                <span className="block text-xs font-bold leading-tight">{t.label}</span>
                <span className={`block text-[10px] leading-tight ${on ? 'text-plum-600' : 'text-gray-400'}`}>
                  {t.hint}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Keyed so switching tabs remounts rather than handing the next panel
          the previous one's scroll position and selected date. */}
      <div role="tabpanel" key={active.id}>
        <Panel />
      </div>
    </div>
  )
}

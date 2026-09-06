/**
 * The empty listing card, which is the most important screen in the app.
 *
 * A partner reaches it once, in their first two minutes, and decides
 * whether the next ten are worth it. It is photographed in the three
 * states a real partner arrives in: knowing their trade, registered as
 * "Other", and having told us nothing.
 *
 *   node scripts/shoot-components.mjs shot.png --scenes scripts/scenes/listing-empty-scenes.jsx
 */
import React, { useState } from 'react'
import { QuickStart } from '../../src/components/vendor/VendorServiceList'
import { Sparkles, Check } from 'lucide-react'

function Card({ label, category }) {
  const [picked, setPicked] = useState(null)
  return (
    <section style={{ marginBottom: 22 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 8px' }}>{label}</p>

      <div className="overflow-hidden rounded-[24px] bg-kumkuma-600 text-white">
        <div className="p-5 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-kumkuma-700">
            <Sparkles size={12} /> Your listing is empty
          </span>
          <h3 className="mt-3 font-display text-[25px] font-extrabold leading-tight text-white">
            Nobody can book what they cannot see
          </h3>
          <p className="mt-1.5 text-[13.5px] font-semibold leading-relaxed text-white/85">
            A typical job on Sambramo pays ₹6,587. Every one of them goes to a
            partner whose listing says they can do it — and right now yours
            says nothing at all.
          </p>
          <QuickStart category={category} onPick={setPicked} />
        </div>
        <div className="border-t border-white/20 bg-black/[0.10] px-5 py-4 sm:px-6">
          {[
            ['Pick, never type', 'Everything comes from a list, so your listing cannot be missed because of a spelling.'],
            ['Say exactly what you do', 'Cuisines, menus, dishes — the more you say, the closer the jobs match.'],
            ['You choose every job', 'Nothing is booked over your head. Decline anything, with no penalty.'],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-2.5 py-1.5">
              <Check size={14} className="mt-0.5 shrink-0 text-white" />
              <p className="text-[12.5px] font-semibold leading-snug text-white/90">
                <span className="font-extrabold text-white">{t}. </span>{d}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p style={{ font: '600 11px system-ui', color: '#777', marginTop: 6 }}>
        tapped → {picked === true ? 'the full picker' : picked ?? 'nothing yet'}
      </p>
    </section>
  )
}

export default function ListingEmptyScenes() {
  return (
    <div id="empty" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Card label="A caterer" category="Catering & Food" />
      <Card label="A transporter" category="Transportation" />
      <Card label="Registered as Other" category="Other" />
    </div>
  )
}

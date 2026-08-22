import { useMemo, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { BRAND } from '../../config/sambramo'
import { formatINR } from '../../utils/format'
import { INK, STATUS, CATEGORICAL, compactINR, sequentialStep } from '../../config/dataviz'
import { areaDemand, normaliseCity } from '../../lib/analytics'
import {
  ChartCard, BarRows, ShareBar, StatTile, SectionHead, EmptyNote, DataTable,
} from './viz/Primitives'

/**
 * Demand by place.
 *
 * ── What replaced what ───────────────────────────────────────────────────
 * The old City Demand tab listed one thing: rows from `city_interest_requests`,
 * the waitlist form shown to anyone outside Bengaluru and Mysore. Useful, but
 * it answered only "where might we go next" and was silent on the question the
 * founder asks far more often — "how are the two cities we are actually in
 * doing, and which parts of them".
 *
 * ── Four signals, kept apart ─────────────────────────────────────────────
 * A place can send four different messages and they are not interchangeable,
 * so they never get summed into one "demand" figure:
 *
 *   deliveries  a shop order shipped there. The strongest signal — money.
 *   requests    a concierge celebration request with a city on it.
 *   enquiries   a service enquiry carrying a location.
 *   waitlist    someone outside the pilot asking to be served. Not a customer,
 *               and the only signal that means "open here next".
 *
 * The `signals` column adds them purely to give the ranking bar something to
 * sort by, and the table beside it always breaks them back out.
 *
 * ── Pincodes, and why they are separate ──────────────────────────────────
 * A six-digit pincode is the finest grain a delivery address reliably carries,
 * and it is the grain that actually changes decisions: which side of Bengaluru
 * to put a partner kitchen on is a pincode question, not a city one. It only
 * exists on shop orders, so it gets its own section rather than being crammed
 * into the city table with three empty columns.
 */

export default function AreaDemand({ data }) {
  const { events = [], enquiries = [], interest = [] } = data
  const [selectedCity, setSelectedCity] = useState(null)

  const geo = useMemo(
    () => areaDemand({ events, enquiries, interest }),
    [events, enquiries, interest],
  )

  const pilot = BRAND.pilotCities.map(normaliseCity)
  const served   = geo.cities.filter(c => pilot.includes(c.city))
  const outside  = geo.cities.filter(c => !pilot.includes(c.city))

  // A pilot city with no rows at all still gets a row, at zero: "Mysore has
  // had nothing" is a finding, and a city that simply vanishes from the list
  // reads as an oversight instead.
  const servedRows = pilot.map(city =>
    served.find(c => c.city === city) ?? {
      city, orders: 0, revenue: 0, units: 0, events: 0, enquiries: 0,
      interest: 0, pincodes: 0, customers: 0, signals: 0,
    })

  const waitlist = outside
    .filter(c => c.interest > 0)
    .sort((a, b) => b.interest - a.interest)



  /* What sells where — category mix for the selected (or busiest) city. */
  const cityForMix = selectedCity ?? servedRows.find(c => c.orders > 0)?.city ?? servedRows[0]?.city

  const totals = {
    deliveries: geo.cities.reduce((s, c) => s + c.orders, 0),
    revenue:    geo.cities.reduce((s, c) => s + c.revenue, 0),
    waitlist:   outside.reduce((s, c) => s + c.interest, 0),
    places:     geo.cities.length,
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Revenue by place" value={compactINR(totals.revenue)} sub="confirmed received" />
        <StatTile
          label="Waitlist signups" value={totals.waitlist}
          sub={`${waitlist.length} cit${waitlist.length === 1 ? 'y' : 'ies'} outside the pilot`}
          tone={totals.waitlist > 0 ? STATUS.good : undefined}
        />
      </div>

      {/* ── The two cities we actually serve ─────────────────────────── */}
      <ChartCard
        title={`The pilot: ${BRAND.pilotCities.join(' and ')}`}
        sub="The only cities anything can be booked in today. Everything else on this page is a signal about somewhere we do not serve yet."
        table={{
          columns: [
            { key: 'city', label: 'City' },
            { key: 'orders', label: 'Deliveries' },
            { key: 'revenue', label: 'Revenue', render: r => formatINR(r.revenue) },
            { key: 'units', label: 'Units' },
            { key: 'customers', label: 'Customers' },
            { key: 'events', label: 'Celebration requests' },
            { key: 'enquiries', label: 'Service enquiries' },
            { key: 'pincodes', label: 'Pincodes' },
          ],
          rows: servedRows.map(c => ({ ...c, key: c.city })),
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servedRows.map(c => (
            <button
              key={c.city}
              onClick={() => setSelectedCity(c.city)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                cityForMix === c.city ? 'border-plum-300 bg-plum-50/40' : 'border-gray-100 hover:border-plum-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-plum-600" />
                <span className="font-bold text-gray-900">{c.city}</span>
                {c.signals === 0 && (
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: INK.plane, color: INK.muted }}>
                    nothing yet
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                <CityStat label="Orders" value={c.orders} />
                <CityStat label="Revenue" value={compactINR(c.revenue)} />
                <CityStat label="Requests" value={c.events} />
                <CityStat label="Enquiries" value={c.enquiries} />
              </div>
              <p className="text-[11px] mt-2.5" style={{ color: INK.muted }}>
                {c.customers} customer{c.customers === 1 ? '' : 's'} · {c.pincodes} pincode{c.pincodes === 1 ? '' : 's'} reached
              </p>
            </button>
          ))}
        </div>
      </ChartCard>

      {/* ── Expansion ────────────────────────────────────────────────── */}
      <ChartCard
        title="Where people are asking us to open"
        sub={`Waitlist signups from outside ${BRAND.pilotCities.join(' and ')}. This is the only list on the page that is about a city we cannot serve — which is exactly what makes it the expansion list.`}
        table={{
          columns: [
            { key: 'city', label: 'City' },
            { key: 'interest', label: 'Signups' },
            { key: 'events', label: 'Requests anyway' },
            { key: 'orders', label: 'Orders anyway' },
          ],
          rows: waitlist.map(c => ({ ...c, key: c.city })),
        }}
      >
        {waitlist.length === 0 ? (
          <EmptyNote icon="🗺️">
            Nobody outside the pilot cities has asked to be served yet.
          </EmptyNote>
        ) : (
          <BarRows
            rows={waitlist.slice(0, 12).map(c => ({
              id: c.city, label: c.city, value: c.interest, color: CATEGORICAL[2],
              note: [
                c.events ? `${c.events} celebration request${c.events === 1 ? '' : 's'} anyway` : null,
                c.orders ? `${c.orders} order${c.orders === 1 ? '' : 's'} anyway` : null,
              ].filter(Boolean).join(' · ') || null,
            }))}
            format={v => `${v} signup${v === 1 ? '' : 's'}`}
          />
        )}
      </ChartCard>

      {/* ── Everything with a place on it ────────────────────────────── */}
      <div className="card p-5">
        <SectionHead
          title="Every place, every signal"
          sub="One row per place, with the four signals broken out. Sorted by total signal strength."
        />
        {geo.cities.length === 0 ? (
          <EmptyNote icon="📭">
            Nothing carries a place yet — no delivery addresses, no city on a request, no waitlist signups.
          </EmptyNote>
        ) : (
          <DataTable
            columns={[
              { key: 'city', label: 'Place', render: r => (
                <span className="flex items-center gap-1.5">
                  {r.city}
                  {BRAND.pilotCities.map(normaliseCity).includes(r.city) && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-plum-100 text-plum-700">PILOT</span>
                  )}
                </span>
              )},
              { key: 'orders', label: 'Deliveries' },
              { key: 'revenue', label: 'Revenue', render: r => formatINR(r.revenue) },
              { key: 'events', label: 'Requests' },
              { key: 'enquiries', label: 'Enquiries' },
              { key: 'interest', label: 'Waitlist' },
              { key: 'customers', label: 'Customers' },
            ]}
            rows={geo.cities.map(c => ({ ...c, key: c.city }))}
          />
        )}
        {/* A glossary, not a legend. Nothing in the table above is colour-coded,
            and swatches beside these would claim an encoding that does not
            exist — a legend has to point at marks a reader can find. */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-4 text-[11px]">
          {[
            ['Deliveries', 'a shop order shipped there'],
            ['Requests', 'a concierge celebration request carrying that city'],
            ['Enquiries', 'a service enquiry with a location on it'],
            ['Waitlist', 'someone outside the pilot asking us to open there'],
          ].map(([term, meaning]) => (
            <div key={term} className="flex gap-1.5">
              <dt className="font-semibold shrink-0" style={{ color: INK.secondary }}>{term} —</dt>
              <dd style={{ color: INK.muted }}>{meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function CityStat({ label, value }) {
  return (
    <div>
      <div className="text-sm font-bold tabular-nums" style={{ color: INK.primary }}>{value}</div>
      <div className="text-[10px]" style={{ color: INK.muted }}>{label}</div>
    </div>
  )
}

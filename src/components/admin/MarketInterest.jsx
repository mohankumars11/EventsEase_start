import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MARKETS, MARKET_STATUS, marketFor } from '../../config/markets'

/**
 * Which city should Sambramo open next?
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE QUESTION THIS ANSWERS, AND THE ONE IT REFUSES TO
 * ══════════════════════════════════════════════════════════════════════
 *
 * A launch needs SUPPLY, and supply is not a headcount. Twelve caterers
 * and no photographers is not a market — it is half of one, and opening
 * on it produces a city full of bookings nobody can fill. So every row
 * here carries the trade spread beside the partner count, and the city
 * detail breaks it down by trade.
 *
 * It refuses to guess readiness. There is no score, no "ready to
 * launch" pill and no projection. Those would be a number this screen
 * invented, shown next to numbers that are real, and an operator cannot
 * tell them apart at a glance.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EVERY FIGURE COMES FROM THE TABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Nothing is seeded and nothing is illustrative. An empty console means
 * nobody outside Bengaluru has opened the app yet, which is the true
 * answer on the day this ships — and a screen showing "Mysuru · 187
 * partners" that afternoon would be a screen nobody could trust again.
 *
 * `market_interest_by_city` (121) does the counting, because counting
 * PEOPLE rather than submissions is a DISTINCT over four fallback keys
 * and that does not belong in a component. If the view is not there yet
 * the raw rows are aggregated here instead, so this screen works the
 * hour the table lands and gets faster when the view does.
 */
export default function MarketInterest() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [city, setCity] = useState(null)
  const [people, setPeople] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const view = await supabase
      .from('market_interest_by_city')
      .select('city, state, partners, submissions, trade_count, trades, first_seen, last_seen')
      .order('partners', { ascending: false })

    if (!view.error) { setRows(view.data ?? []); return }

    /* No view. Either 121 is unapplied, or only part of it is. Try the
       table; if that is missing too, say so plainly rather than showing
       an empty list that reads as "nobody is interested". */
    const raw = await supabase
      .from('partner_market_interest')
      .select('requested_city, detected_state, trades, profile_id, email, phone, id, created_at')
      .eq('interested', true)

    if (raw.error) {
      setError('Market interest is not set up on this database yet — apply migration 121.')
      setRows([])
      return
    }

    const by = new Map()
    for (const r of raw.data ?? []) {
      const key = r.requested_city
      if (!by.has(key)) by.set(key, { city: key, state: r.detected_state, who: new Set(), trades: new Set(), submissions: 0, first_seen: r.created_at, last_seen: r.created_at })
      const g = by.get(key)
      g.submissions += 1
      g.who.add(r.profile_id ?? r.email?.toLowerCase() ?? r.phone ?? r.id)
      for (const t of r.trades ?? []) g.trades.add(t)
      if (r.created_at < g.first_seen) g.first_seen = r.created_at
      if (r.created_at > g.last_seen) g.last_seen = r.created_at
    }
    setRows([...by.values()]
      .map(g => ({ ...g, partners: g.who.size, trades: [...g.trades], trade_count: g.trades.size }))
      .sort((a, b) => b.partners - a.partners))
  }, [])

  useEffect(() => { load() }, [load])

  /* The people in one city, read only when a city is opened. This is
     names, emails and phone numbers of real businesses — it is not
     something to pull down for every city on page load. */
  useEffect(() => {
    if (!city) { setPeople(null); return }
    let alive = true
    supabase.from('partner_market_interest')
      .select('interest_code, partner_name, email, phone, trades, detected_city, detected_pincode, status, created_at')
      .eq('requested_city', city).eq('interested', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (alive) setPeople(data ?? []) })
    return () => { alive = false }
  }, [city])

  const totals = useMemo(() => ({
    cities: rows?.length ?? 0,
    partners: (rows ?? []).reduce((n, r) => n + Number(r.partners ?? 0), 0),
    top: (rows ?? [])[0] ?? null,
  }), [rows])

  const active = MARKETS.filter(m => m.status === MARKET_STATUS.ACTIVE)

  if (rows === null) {
    return <p className="p-6 text-sm text-gray-500">Loading market interest…</p>
  }

  return (
    <div className="space-y-6 p-1">

      {/* ── What is open today ─────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Active markets</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {active.map(m => (
            <span key={m.marketId} className="rounded-xl bg-emerald-50 px-3 py-1.5 text-[13px] font-bold text-emerald-800 ring-1 ring-emerald-200">
              {m.marketId} · {m.city}, {m.state}
            </span>
          ))}
          {MARKETS.filter(m => m.status !== MARKET_STATUS.ACTIVE).map(m => (
            <span key={m.marketId} className="rounded-xl bg-gray-100 px-3 py-1.5 text-[13px] font-semibold text-gray-600">
              {m.marketId} · {m.city} — coming soon
            </span>
          ))}
        </div>
      </section>

      {/* ── The three numbers, all of them counted ─────────────────── */}
      <section className="grid grid-cols-3 gap-3">
        <Tile label="Cities with interest" value={totals.cities} />
        <Tile label="Partners waiting" value={totals.partners} />
        <Tile
          label="Most interest"
          value={totals.top?.city ?? '—'}
          sub={totals.top ? `${totals.top.partners} partners · ${totals.top.trade_count} trades` : 'nothing yet'}
        />
      </section>

      {error && (
        <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900 ring-1 ring-amber-200">{error}</p>
      )}

      {/* ── City by city ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Market expansion interest</h2>

        {!rows.length && !error && (
          <p className="mt-2 rounded-xl bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-600">
            No interest captured yet. This fills up when somebody outside an active
            market opens the partner app and tells us they want Sambramo where they are.
          </p>
        )}

        {!!rows.length && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-bold">City</th>
                  <th className="py-2 pr-3 text-right font-bold tabular-nums">Partners</th>
                  <th className="py-2 pr-3 text-right font-bold tabular-nums">Trades</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 font-bold">Latest</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const m = marketFor(r.city)
                  return (
                    <tr
                      key={r.city}
                      onClick={() => setCity(r.city === city ? null : r.city)}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2.5 pr-3 font-bold text-gray-900">{r.city}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{r.partners}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{r.trade_count}</td>
                      <td className="py-2.5 pr-3">
                        {m?.status === MARKET_STATUS.ACTIVE ? 'Active' : m ? 'Coming soon' : 'Not on the map'}
                      </td>
                      <td className="py-2.5 text-gray-500">
                        {r.last_seen ? new Date(r.last_seen).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── One city, opened ───────────────────────────────────────── */}
      {city && (
        <section className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-bold text-gray-900">{city}</h3>
            <button onClick={() => setCity(null)} className="text-[12px] font-semibold text-gray-500">Close</button>
          </div>

          {people === null && <p className="mt-2 text-[13px] text-gray-500">Loading…</p>}

          {people && (
            <>
              {/* Trade distribution — the figure that decides a launch. */}
              <TradeSpread people={people} />

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10.5px] uppercase tracking-wide text-gray-500">
                      <th className="py-1.5 pr-3 font-bold">Ref</th>
                      <th className="py-1.5 pr-3 font-bold">Partner</th>
                      <th className="py-1.5 pr-3 font-bold">Contact</th>
                      <th className="py-1.5 pr-3 font-bold">Trades</th>
                      <th className="py-1.5 font-bold">Asked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map(p => (
                      <tr key={p.interest_code} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-mono text-[11px] text-gray-500">{p.interest_code}</td>
                        <td className="py-2 pr-3 font-semibold text-gray-900">{p.partner_name ?? '—'}</td>
                        <td className="py-2 pr-3 text-gray-600">{p.email ?? p.phone ?? '—'}</td>
                        <td className="py-2 pr-3 text-gray-600">{(p.trades ?? []).join(', ') || '—'}</td>
                        <td className="py-2 text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-[22px] font-bold tabular-nums text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11.5px] text-gray-500">{sub}</p>}
    </div>
  )
}

/**
 * How many partners per trade, in this city.
 *
 * A bar rather than a number per row because the shape is the point: one
 * trade towering over eleven empty ones is a city that is not ready, and
 * that reads instantly as a shape and slowly as a list.
 */
function TradeSpread({ people }) {
  const counts = new Map()
  for (const p of people) for (const t of p.trades ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  const list = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (!list.length) {
    return (
      <p className="mt-2 text-[12.5px] text-gray-500">
        No trades recorded — these were captured before they told us what they do.
      </p>
    )
  }
  const max = list[0][1]
  return (
    <div className="mt-3 space-y-1">
      {list.map(([trade, n]) => (
        <div key={trade} className="flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-[12px] text-gray-700">{trade}</span>
          <span className="h-2 rounded-full bg-plum-500" style={{ width: `${Math.max(6, (n / max) * 60)}%` }} />
          <span className="text-[11.5px] tabular-nums text-gray-500">{n}</span>
        </div>
      ))}
    </div>
  )
}

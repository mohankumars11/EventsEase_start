/**
 * Where a job comes from, and where the GPS goes.
 *
 * Drawn from the code rather than from memory: every table, function and
 * constant named below is the real one, and the file it lives in is
 * printed beside it so any claim here can be checked in a minute.
 *
 *   node scripts/shoot-components.mjs shots/dispatch-flow.png \
 *     --scenes scripts/scenes/dispatch-flow.jsx --width 980
 */
import React from 'react'

const INK = '#1b0b2e'
const MUTE = '#6b6478'
const LINE = '#e2dfe8'
const PLUM = '#5b21b6'
const GOLD = '#b45309'
const GREEN = '#166534'

const Step = ({ n, title, where, children, tone = PLUM, last = false }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 30 }}>
      <span style={{
        width: 30, height: 30, borderRadius: 15, background: tone, color: '#fff',
        font: '800 13px/30px system-ui', textAlign: 'center', flexShrink: 0,
      }}>{n}</span>
      {!last && <span style={{ flex: 1, width: 2, background: LINE, marginTop: 4 }} />}
    </div>
    <div style={{ paddingBottom: last ? 0 : 20, flex: 1 }}>
      <p style={{ font: '800 14.5px/1.3 system-ui', color: INK, margin: '5px 0 2px' }}>{title}</p>
      {where && (
        <p style={{ font: '600 11px/1.4 ui-monospace, monospace', color: tone, margin: '0 0 5px' }}>
          {where}
        </p>
      )}
      <div style={{ font: '400 12.5px/1.55 system-ui', color: MUTE }}>{children}</div>
    </div>
  </div>
)

const Note = ({ children, tone = '#fef3c7', edge = '#fcd34d', text = '#78350f' }) => (
  <p style={{
    font: '600 11.5px/1.5 system-ui', color: text, background: tone,
    border: `1px solid ${edge}`, borderRadius: 10, padding: '7px 10px', margin: '7px 0 0',
  }}>{children}</p>
)

const Col = ({ title, children }) => (
  <section style={{ flex: 1, minWidth: 0 }}>
    <p style={{
      font: '800 11px/1.3 system-ui', letterSpacing: '.1em', textTransform: 'uppercase',
      color: MUTE, margin: '0 0 14px', paddingBottom: 8, borderBottom: `2px solid ${LINE}`,
    }}>{title}</p>
    {children}
  </section>
)

export default function DispatchFlow() {
  return (
    <div style={{ width: 980, background: '#fff', padding: 28, boxSizing: 'border-box' }}>
      <p style={{ font: '800 21px/1.2 system-ui', color: INK, margin: '0 0 4px' }}>
        How a job reaches a partner, and where the GPS goes
      </p>
      <p style={{ font: '400 13px/1.5 system-ui', color: MUTE, margin: '0 0 24px' }}>
        Every table, function and number below is the one in the code. The file is named beside it.
      </p>

      <div style={{ display: 'flex', gap: 36 }}>
        <Col title="Dispatch — finding somebody">
          <Step n="1" title="A customer books a service"
                where="api/dispatch-booking.js">
            The request is priced server-side and a <b>booking_line</b> is written.
            The customer is waiting on this call, so it sends wave 1 and stops.
          </Step>

          <Step n="2" title="match_partners() decides who is eligible"
                where="migration 147 · SECURITY DEFINER">
            Located · approved · accepting jobs · within both radii · offers that
            trade · <b>not blocked on that date</b> · the standing week is open ·
            under the day&apos;s capacity · <b>no paused, suspended or hidden listing</b>.
            <Note>
              Blocking a date in the Calendar tab removes the partner from this
              query. That is the entire mechanism — there is no second list.
            </Note>
            <Note tone="#fef2f2" edge="#fca5a5" text="#991b1b">
              <b>Not live right now.</b> 134 and 147 both define this function with
              the same signature, and 134 was pasted last — so the paused-listing
              clause is currently absent from the database. Everything else in this
              box is in force. Re-paste 147 to restore it;
              <b> check-dispatch-end-to-end.mjs</b> proves it either way.
            </Note>
          </Step>

          <Step n="3" title="The nearest five get an offer"
                where="dispatch_offers · api/_lib/fcm.js">
            One row each, with a countdown. <b>notifyPartners()</b> pushes to every
            device that partner has registered, pruning dead tokens as it goes.
          </Step>

          <Step n="4" title="Nobody answered? Widen."
                where="api/dispatch-waves.js · daily cron">
            5 km → 10 → 15. Partners who <b>declined</b> are excluded; partners who
            simply did not answer are asked again — they were driving, not uninterested.
            After the last wave the line goes <b>standing</b> rather than expiring.
          </Step>

          <Step n="5" title="Accepted, then paid into escrow" last
                where="accept_offer() · escrow_ledger">
            <b>uq_offer_one_winner</b> makes a second winner impossible rather than
            unlikely. An accepted line nobody pays for releases the date again after
            <b> unpaid_hold_minutes()</b>.
          </Step>
        </Col>

        <Col title="The event date — location">
          <Step n="6" title="The partner taps Start trip" tone={GOLD}
                where="start_tracking() · LiveTracking.jsx">
            There is <b>no setting anywhere</b> that turns location on. Opening an
            accepted job and tapping this is the only way it is ever read.
            <Note>
              The banner saying &ldquo;your location is being shared&rdquo; is driven by
              <b> shouldBeWatching(session)</b> — the same function that decides whether
              the watch is actually held open. The sentence and the behaviour cannot
              come apart.
            </Note>
          </Step>

          <Step n="7" title="Fixes are batched, not streamed" tone={GOLD}
                where="watchAndPush() · src/lib/liveTracking.js">
            Flushed every <b>15 s</b> while moving, <b>90 s</b> when stopped, and a fix
            under <b>25 m</b> from the last one is dropped. A van stopped on Hosur Road
            for six minutes is one useful fact, not seventy-two — the difference is the
            partner&apos;s battery and their data.
          </Step>

          <Step n="8" title="Two places, two audiences" tone={GOLD}
                where="push_locations() · migration 127">
            <b>tracking_location_events</b> — the trail. Readable by the partner who
            laid it and by operators. Never by the customer.<br />
            <b>tracking_sessions.last_position</b> — just the current point, denormalised.
            <Note tone="#ecfdf5" edge="#86efac" text="#14532d">
              This split is the privacy design. A customer is owed &ldquo;where is my
              caterer now, and when will they arrive&rdquo;. They are not owed a map of
              everywhere that person has been today.
            </Note>
          </Step>

          <Step n="9" title="The customer sees it" tone={GREEN}
                where="PartnerOnTheWay.jsx · /track">
            Distance left and an ETA. <b>No trail, no breadcrumbs.</b> The query asks
            for every session and the database returns only theirs — a client-side
            filter would look safer and be worse, because it would work identically
            against a database with no policy at all.
          </Step>

          <Step n="10" title="Arriving is something a person says" last tone={GREEN}
                where="confirm_arrival() · end_tracking()">
            Inside <b>200 m</b> the button turns primary and the wording changes. It does
            not mark anybody arrived: a driver at the light outside the gate is inside
            the fence and is not there yet.
            <Note tone="#ecfdf5" edge="#86efac" text="#14532d">
              Tapping <b>I have arrived</b> ends the session, and the location watch stops
              in the same render. It also stops on its own if they forget.
            </Note>
          </Step>
        </Col>
      </div>

      <p style={{
        font: '600 11.5px/1.5 system-ui', color: '#78350f', background: '#fffbeb',
        border: '1px solid #fcd34d', borderRadius: 12, padding: '10px 12px', margin: '22px 0 0',
      }}>
        There are no street tiles under the partner&apos;s map, and deliberately never have
        been. A partner in traffic navigates from Google Maps, which has a voice and knows
        which flyover shut; the button hands the driving to it. The drawn line answers the
        two questions Maps cannot — how much is left, and is my location still being shared.
      </p>
    </div>
  )
}

/**
 * The alerts card in the three states it actually has.
 *
 * It sat at the top of the Jobs tab at 120-140px even when everything
 * was fine — above the offers the app exists to show — and everything in
 * it except the on/off state was diagnostic.
 */
import React from 'react'
import { Bell, BellOff, Loader2, TriangleAlert } from 'lucide-react'

/* The card's own markup, lifted, because JobAlerts talks to Capacitor
   and the push registry on mount and a scene cannot give it either. */
function Card({ on, problem, showDetails }) {
  return (
    <div className={`rounded-[22px] p-4 ring-1 ${on ? 'bg-forest-50 ring-forest-200/70' : 'bg-white ring-ink/[0.06]'}`}>
      <div className={`flex gap-3 ${on && !problem ? 'items-center' : 'items-start'}`}>
        <span className={`shrink-0 flex items-center justify-center rounded-full ${
          on && !problem ? 'h-7 w-7' : 'mt-0.5 h-10 w-10'
        } ${on ? 'bg-forest-600 text-white' : 'bg-saffron-400/20 text-saffron-700'}`}>
          {on ? <Bell size={on && !problem ? 14 : 17} /> : <BellOff size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-extrabold leading-tight text-ink ${on && !problem ? 'text-[13px]' : 'text-[14.5px]'}`}>
            {on ? 'Job alerts are on' : 'Turn on job alerts'}
          </p>
          {!(on && !problem) && (
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
              {on
                ? 'We will buzz your phone when a job near you comes up.'
                : 'A job is offered to a few masters at once and the first to accept gets it. Without alerts you will only see jobs while this page is open.'}
            </p>
          )}
          {problem && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold leading-snug text-amber-800">
              <TriangleAlert size={13} className="mt-0.5 shrink-0" />{problem}
            </p>
          )}
          {!(on && !problem) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[13px] font-extrabold ${
                on ? 'bg-white text-ink-soft ring-1 ring-ink/[0.08]' : 'bg-saffron-400 text-plum-950'}`}>
                {on ? 'Turn off' : 'Turn on alerts'}
              </button>
              {on && <button className="rounded-2xl bg-white px-4 py-2 text-[13px] font-extrabold text-ink ring-1 ring-ink/[0.08]">Test alert</button>}
              {on && <button className="ml-auto text-[11.5px] font-bold text-ink-mute">Details</button>}
            </div>
          )}
          {on && !problem && showDetails && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button className="rounded-2xl bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-ink-soft ring-1 ring-ink/[0.08]">Turn off</button>
              <button className="rounded-2xl bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-ink ring-1 ring-ink/[0.08]">Test alert</button>
            </div>
          )}
        </div>
        {on && !problem && (
          <button className="shrink-0 rounded-full px-2 py-1 text-[15px] font-extrabold leading-none text-ink-mute">···</button>
        )}
      </div>
    </div>
  )
}

function Case({ label, ...p }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <p style={{ font: '700 11px/1.3 system-ui', letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#8a8a8a', margin: '0 0 6px' }}>{label}</p>
      <Card {...p} />
    </section>
  )
}

export default function AlertsScenes() {
  return (
    <div id="alerts" style={{ width: 390, margin: '0 auto', padding: 16, background: '#faf9f7' }}>
      <Case label="On and working — one line" on />
      <Case label="On, the dot opened" on showDetails />
      <Case label="On, but something is wrong" on problem="This looks like a browser, not the app. Alerts only work in the installed app." />
      <Case label="Off — it has to earn the tap" on={false} />
    </div>
  )
}

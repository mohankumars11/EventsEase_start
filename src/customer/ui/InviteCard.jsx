/**
 * The invitation card, in any of the designs in data/inviteTemplates.js.
 * One component for the editor preview, the template picker thumbnails,
 * the host's dashboard and the guest's RSVP page — so what the host
 * picks is exactly what the guest sees.
 *
 *   <InviteCard inv={...} occasion={o} theme="royal|art|live" size="full|mini" />
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { occasionArt } from '../data/art'
import { parseTheme } from '../data/inviteTemplates'
import { Live, MoreOrnaments } from './inviteOrnaments'

const FONT = {
  script: "'Pinyon Script', 'Playfair Display', Georgia, serif",
  serif: "'Playfair Display', Georgia, serif",
  display: "'Sambramo Display', 'Archivo Black', 'Manrope', sans-serif",
  sans: "'Manrope', system-ui, sans-serif",
}
/* Ornaments that own the top edge push the words down a little. */
const PAD = { band: '6%', toran: '17%', bunting: '17%', stage: '14%' }
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long' })
const WEEKDAY = new Intl.DateTimeFormat('en-IN', { weekday: 'long' })
const time = t => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null)

export default function InviteCard({ inv, occasion = null, theme, size = 'full', className = '' }) {
  /* A thumbnail is the full card drawn at 320 px and scaled to fit — a true
     miniature, never a re-flowed small version. */
  if (size === 'mini') return <Mini className={className}><InviteCard inv={inv} occasion={occasion} theme={theme} /></Mini>
  const { t, art, live } = parseTheme(theme ?? inv?.theme, occasion)
  const mini = size === 'mini'
  const d = inv?.event_date || inv?.date ? new Date(`${inv.event_date || inv.date}T00:00:00`) : null
  const tm = time(inv?.start_time || inv?.time)
  const venue = inv?.venue_name || inv?.venue
  const hosts = inv?.hosts_line || inv?.hosts
  const title = inv?.title || occasion?.name || 'Our Celebration'
  const s = mini ? 0.42 : 1
  return (
    <div className={'relative isolate overflow-hidden ' + (mini ? 'aspect-[4/5] rounded-[14px]' : 'aspect-[4/5] rounded-[26px]') + ' ' + className}
      style={{ background: t.bg, color: t.ink, boxShadow: mini ? '0 0 0 1px rgba(0,0,0,.06)' : '0 24px 48px -28px rgba(30,10,60,.7), 0 0 0 1px rgba(0,0,0,.05)' }} data-invite-card={t.id}>
      <Ornament kind={t.ornament} t={t} />
      {live && <Live t={t} />}
      <div className="absolute inset-0 z-10 flex flex-col items-center px-[9%] text-center" style={{ paddingTop: PAD[t.ornament] ?? '11%', paddingBottom: '9%' }}>
        {t.ornament === 'band' && <p style={{ fontSize: 11 * s, letterSpacing: '0.3em', color: '#CBD5E1' }} className="font-extrabold uppercase">Invitation</p>}
        {art && occasion && occasionArt(occasion).src && (
          <span className={'relative block shrink-0 overflow-hidden rounded-full bg-white ' + (t.ornament === 'band' ? 'mt-[4%]' : '')}
            style={{ width: '30%', aspectRatio: '1', boxShadow: `0 0 0 ${Math.max(1, 2.5 * s)}px ${t.accent}` }}>
            <img src={occasionArt(occasion).src} alt="" loading="lazy" decoding="async" className={'absolute inset-0 h-full w-full ' + (occasionArt(occasion).kind === 'art' ? 'object-cover object-[50%_20%] mix-blend-multiply' : 'object-contain p-[14%]')} />
          </span>
        )}
        <p style={{ fontSize: 10.5 * s, letterSpacing: '0.32em', color: t.ornament === 'band' && !art ? '#E2E8F0' : t.soft, marginTop: art ? `${6 * s}px` : t.ornament === 'band' ? `${10 * s}px` : 0 }} className="font-extrabold uppercase">
          {hosts ? `${hosts} invite you` : 'You’re invited'}
        </p>
        <h3 style={{ fontFamily: FONT[t.font], fontSize: (t.font === 'script' ? 42 : t.font === 'display' ? 30 : 34) * s, lineHeight: 1.05, color: t.ornament === 'band' ? (art ? t.ink : '#FFFFFF') : t.ink,
          textShadow: t.ornament === 'neon' ? `0 0 ${12 * s}px ${t.soft}, 0 0 ${28 * s}px ${t.accent}` : 'none', marginTop: `${6 * s}px` }} className="max-w-full break-words font-bold">
          {title}
        </h3>
        <span style={{ width: `${46 * s}px`, height: Math.max(1, 1.5 * s), background: t.accent, margin: `${10 * s}px 0` }} />
        {d ? (
          <div className="flex items-center justify-center" style={{ gap: 10 * s }}>
            <span style={{ fontSize: 11 * s, color: t.soft }} className="w-[30%] text-right font-extrabold uppercase tracking-[0.12em]">{WEEKDAY.format(d)}</span>
            <span style={{ fontFamily: FONT.serif, fontSize: 40 * s, lineHeight: 1, borderLeft: `${Math.max(1, s)}px solid ${t.accent}`, borderRight: `${Math.max(1, s)}px solid ${t.accent}`, padding: `0 ${10 * s}px` }} className="font-bold">{d.getDate()}</span>
            <span style={{ fontSize: 11 * s, color: t.soft }} className="w-[30%] text-left font-extrabold uppercase tracking-[0.12em]">{MONTH.format(d)}<br />{d.getFullYear()}</span>
          </div>
        ) : <p style={{ fontSize: 12 * s, color: t.soft }} className="font-bold">Date to be announced</p>}
        {tm && <p style={{ fontSize: 13 * s, marginTop: 6 * s }} className="font-extrabold">{tm} onwards</p>}
        {venue && <p style={{ fontSize: 12.5 * s, color: t.soft, marginTop: 4 * s }} className="line-clamp-2 font-bold">{venue}</p>}
        {!mini && inv?.dress_code && <p style={{ fontSize: 11, color: t.soft, marginTop: 6 }} className="font-semibold italic">Dress: {inv.dress_code}</p>}
      </div>
    </div>
  )
}

/* ── Ornaments ─────────────────────────────────────────────────────── */
function Ornament({ kind, t }) {
  const a = t.accent
  if (kind === 'mandala') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
      <rect x="14" y="14" width="372" height="472" rx="18" fill="none" stroke={a} strokeOpacity=".7" strokeWidth="1.5" />
      <rect x="22" y="22" width="356" height="456" rx="14" fill="none" stroke={a} strokeOpacity=".35" strokeWidth="1" />
      {[[22, 22, 0], [378, 22, 90], [378, 478, 180], [22, 478, 270]].map(([x, y, r]) => (
        <g key={r} transform={`translate(${x} ${y}) rotate(${r})`} stroke={a} fill="none" strokeOpacity=".75">
          {[18, 30, 42, 54].map(rr => <path key={rr} d={`M ${rr} 0 A ${rr} ${rr} 0 0 1 0 ${rr}`} strokeWidth="1.2" />)}
          {[0, 15, 30, 45, 60, 75, 90].map(ang => <line key={ang} x1="0" y1="0" x2={62 * Math.cos(ang * Math.PI / 180)} y2={62 * Math.sin(ang * Math.PI / 180)} strokeWidth=".8" />)}
        </g>
      ))}
      <circle cx="200" cy="500" r="120" fill="none" stroke={a} strokeOpacity=".25" />
      <circle cx="200" cy="500" r="90" fill="none" stroke={a} strokeOpacity=".25" />
    </svg>
  )
  if (kind === 'florals') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {[[0, 0, 1, 1], [400, 0, -1, 1], [0, 500, 1, -1], [400, 500, -1, -1]].map(([x, y, sx, sy], k) => (
        <g key={k} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
          {[[40, 40, 30], [95, 22, 20], [22, 100, 22], [80, 85, 14]].map(([cx, cy, r], j) => (
            <g key={j}>{[0, 72, 144, 216, 288].map(ang => <ellipse key={ang} cx={cx + r * 0.55 * Math.cos(ang * Math.PI / 180)} cy={cy + r * 0.55 * Math.sin(ang * Math.PI / 180)} rx={r * 0.55} ry={r * 0.38} fill={j % 2 ? (t.bloom?.[1] ?? '#F9A8C4') : (t.bloom?.[0] ?? '#F472A6')} fillOpacity=".75" transform={`rotate(${ang} ${cx} ${cy})`} />)}<circle cx={cx} cy={cy} r={r * 0.22} fill="#FDE68A" /></g>
          ))}
          <path d="M 10 150 Q 60 90 140 60" stroke="#84CC16" strokeOpacity=".6" strokeWidth="3" fill="none" />
        </g>
      ))}
    </svg>
  )
  if (kind === 'stars') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 38 }, (_, k) => { const x = (k * 97) % 400, y = (k * 53) % 500, r = (k % 4) * 0.6 + 0.6; return <circle key={k} cx={x} cy={y} r={r} fill={k % 5 ? '#FFFFFF' : a} fillOpacity={k % 3 ? 0.55 : 0.9} /> })}
      <path d="M 320 70 a 34 34 0 1 0 22 60 a 28 28 0 1 1 -22 -60 z" fill={a} fillOpacity=".85" />
      <rect x="18" y="18" width="364" height="464" rx="16" fill="none" stroke={a} strokeOpacity=".45" />
    </svg>
  )
  if (kind === 'kolam') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
      <rect x="10" y="10" width="380" height="480" rx="10" fill="none" stroke="#9F1239" strokeWidth="3" />
      <rect x="20" y="20" width="360" height="460" rx="6" fill="none" stroke={a} strokeWidth="1.5" strokeDasharray="2 6" />
      {Array.from({ length: 9 }, (_, k) => <g key={k} transform={`translate(${40 + k * 40} 0)`}><path d="M 0 0 Q 10 34 20 0" fill={k % 2 ? a : '#9F1239'} fillOpacity=".85" /></g>)}
      {Array.from({ length: 9 }, (_, k) => <g key={k} transform={`translate(${40 + k * 40} 500) scale(1 -1)`}><path d="M 0 0 Q 10 34 20 0" fill={k % 2 ? a : '#9F1239'} fillOpacity=".85" /></g>)}
      <path d="M 200 470 l -12 -16 l 12 -16 l 12 16 z" fill="#9F1239" fillOpacity=".7" />
    </svg>
  )
  if (kind === 'confetti') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 46 }, (_, k) => { const x = (k * 89) % 400, y = (k * 37) % 500; const c = ['#F43F5E', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'][k % 6]; const edge = y < 110 || y > 400 || x < 50 || x > 350
        return edge ? (k % 3 ? <rect key={k} x={x} y={y} width="9" height="4" rx="2" fill={c} transform={`rotate(${k * 37} ${x} ${y})`} /> : <circle key={k} cx={x} cy={y} r="4" fill={c} />) : null })}
      {[[60, 70, '#F43F5E'], [340, 60, '#A855F7'], [355, 430, '#F59E0B']].map(([x, y, c]) => <g key={x}><ellipse cx={x} cy={y} rx="22" ry="27" fill={c} fillOpacity=".85" /><path d={`M ${x} ${y + 27} q 6 18 -4 36`} stroke={c} fill="none" /></g>)}
    </svg>
  )
  if (kind === 'frame') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
      <rect x="20" y="20" width="360" height="460" fill="none" stroke={a} strokeWidth="1" />
      <rect x="28" y="28" width="344" height="444" fill="none" stroke={a} strokeOpacity=".35" strokeWidth=".6" />
    </svg>
  )
  if (kind === 'neon') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
      <rect x="18" y="18" width="364" height="464" rx="22" fill="none" stroke={t.soft} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 6px ${t.soft})` }} />
      <rect x="28" y="28" width="344" height="444" rx="16" fill="none" stroke={a} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${a})` }} />
      {[[70, 430], [330, 90]].map(([x, y]) => <g key={x} stroke={a} strokeWidth="2" style={{ filter: `drop-shadow(0 0 4px ${a})` }}><line x1={x - 14} y1={y} x2={x + 14} y2={y} /><line x1={x} y1={y - 14} x2={x} y2={y + 14} /></g>)}
    </svg>
  )
  if (kind === 'diya') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="16" y="16" width="368" height="468" rx="14" fill="none" stroke={t.soft} strokeOpacity=".55" />
      {[90, 200, 310].map(x => (
        <g key={x} transform={`translate(${x} 452)`}>
          <circle cx="0" cy="-26" r="26" fill="#FCD34D" fillOpacity=".18" />
          <path d="M -26 0 Q 0 22 26 0 Q 0 6 -26 0 z" fill="#F59E0B" />
          <path d="M 0 -6 Q -8 -18 0 -34 Q 8 -18 0 -6 z" fill="#FDE68A" />
        </g>
      ))}
      {Array.from({ length: 13 }, (_, k) => <circle key={k} cx={30 + k * 28.5} cy="34" r="7" fill={k % 2 ? '#F97316' : '#FBBF24'} />)}
    </svg>
  )
  if (kind === 'band') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
      <rect x="0" y="146" width="400" height="5" fill={a} />
      <rect x="22" y="470" width="356" height="1" fill="#CBD5E1" />
    </svg>
  )
  if (kind === 'leaves') return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {[[0, 0, 0], [400, 500, 180]].map(([x, y, r]) => (
        <g key={r} transform={`translate(${x} ${y}) rotate(${r})`}>
          {[[30, 40, -30], [70, 20, -10], [20, 90, -60], [110, 30, 10], [60, 70, -40]].map(([lx, ly, la], k) => <ellipse key={k} cx={lx} cy={ly} rx="26" ry="10" fill={k % 2 ? (t.leaf?.[0] ?? '#86EFAC') : (t.leaf?.[1] ?? '#C4B5FD')} fillOpacity=".8" transform={`rotate(${la} ${lx} ${ly})`} />)}
        </g>
      ))}
    </svg>
  )
  const more = MoreOrnaments({ kind, t })
  if (more) return more
  /* arch — the default */
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
      <path d="M 40 490 L 40 170 A 160 150 0 0 1 360 170 L 360 490" fill="#FFFFFF" fillOpacity=".55" stroke={a} strokeOpacity=".4" strokeWidth="1.5" />
      <circle cx="200" cy="40" r="5" fill={a} fillOpacity=".6" />
    </svg>
  )
}

function Mini({ children, className = '' }) {
  const box = useRef(null)
  const [k, setK] = useState(0.3)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setK(el.clientWidth / 320)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} className={'relative aspect-[4/5] overflow-hidden rounded-[12px] ' + className} data-invite-mini>
      <div className="absolute left-0 top-0 w-[320px] origin-top-left" style={{ transform: `scale(${k})` }}>{children}</div>
    </div>
  )
}

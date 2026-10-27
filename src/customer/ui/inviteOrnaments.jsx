/**
 * The newer invitation ornaments, and the "live" layer that animates a
 * card (InviteCard.jsx draws the first eleven). Every drawing works in a
 * 400 × 500 box — the card's own 4:5 — and keeps to the corners and edges
 * so the words in the middle always read.
 */
const svg = (children, slice = false) => (
  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio={slice ? 'xMidYMid slice' : 'none'} aria-hidden>{children}</svg>
)
const heart = 'M0 6C0 0-8-2-10 4c-2 6 6 12 10 16 4-4 12-10 10-16C8-2 0 0 0 6Z'
const petalPath = 'M0 0C-16-22-12-52 0-70 12-52 16-22 0 0Z'
const paisley = 'M0 0C-4-30 24-46 42-32 58-18 50 8 28 14 12 18 2 10 0 0Z'

function balloon(x, y, c, r, k) {
  return (
    <g key={k}>
      <path d={`M${x} ${y + r * 1.2}q${-r * 0.5} ${r} ${r * 0.2} ${r * 2.2}`} stroke={c} strokeOpacity=".7" strokeWidth="1.4" fill="none" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.2} fill={c} />
      <path d={`M${x - 4} ${y + r * 1.2 + 5}l4 -6l4 6Z`} fill={c} />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.45} rx={r * 0.22} ry={r * 0.34} fill="#fff" fillOpacity=".5" transform={`rotate(-25 ${x - r * 0.35} ${y - r * 0.45})`} />
    </g>
  )
}

function laurel(x, flip, c) {
  return (
    <g transform={`translate(${x} 470) scale(${flip} 1)`}>
      <path d="M0 0C30-10 60-40 70-90" stroke={c} strokeWidth="2" fill="none" />
      {[0, 1, 2, 3, 4, 5].map(k => {
        const px = 8 + k * 11, py = -4 - k * 15
        return <g key={k}><ellipse cx={px - 6} cy={py} rx="9" ry="4" fill={c} transform={`rotate(-40 ${px - 6} ${py})`} /><ellipse cx={px + 7} cy={py + 4} rx="9" ry="4" fill={c} transform={`rotate(30 ${px + 7} ${py + 4})`} /></g>
      })}
    </g>
  )
}

export function MoreOrnaments({ kind, t }) {
  const a = t.accent, s = t.soft
  const pal = t.palette ?? [a, s, '#F59E0B', '#22C55E']
  switch (kind) {
    case 'toran': {
      const yAt = x => 16 + 12 * (1 - ((x - 200) / 200) ** 2)
      return svg(<>
        <rect x="16" y="16" width="368" height="468" rx="12" fill="none" stroke={a} strokeOpacity=".4" />
        <path d="M0 16Q200 40 400 16" stroke="#9A3412" strokeOpacity=".5" strokeWidth="1.5" fill="none" />
        {Array.from({ length: 10 }, (_, k) => { const x = 38 + k * 36; return <ellipse key={`l${k}`} cx={x} cy={yAt(x) + 15} rx="6" ry="14" fill={k % 2 ? '#15803D' : '#4D7C0F'} /> })}
        {Array.from({ length: 21 }, (_, k) => { const x = k * 20; return <g key={k}><circle cx={x} cy={yAt(x)} r="9.5" fill={k % 2 ? '#F97316' : '#FBBF24'} /><circle cx={x} cy={yAt(x)} r="4" fill={k % 2 ? '#FDBA74' : '#FDE68A'} /></g> })}
        {[13, 387].map(x => Array.from({ length: 8 }, (_, k) => <circle key={`${x}-${k}`} cx={x} cy={40 + k * 17} r="6.5" fill={k % 2 ? '#F97316' : '#FBBF24'} />))}
        <path d="M176 474h48" stroke={a} strokeWidth="2.4" strokeLinecap="round" />
      </>)
    }
    case 'paisley':
      return svg(<>
        <rect x="14" y="14" width="372" height="472" rx="16" fill="none" stroke={s} strokeOpacity=".5" strokeDasharray="1 7" strokeWidth="3" strokeLinecap="round" />
        {[[26, 70, -30, 1.1], [374, 70, 210, 1.1], [30, 440, 30, 1.2], [370, 440, 150, 1.2]].map(([x, y, r, k], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
            <path d={paisley} fill={a} fillOpacity=".9" />
            <path d={paisley} transform="translate(9 -5) scale(.55)" fill="none" stroke={t.ink} strokeOpacity=".5" strokeWidth="1.6" />
            <circle cx="30" cy="-12" r="3.5" fill={s} />
            {[0, 1, 2, 3].map(j => <circle key={j} cx={-6 + j * 12} cy={22} r="2" fill={s} fillOpacity=".8" />)}
          </g>
        ))}
      </>)
    case 'lotus':
      return svg(<>
        <rect x="18" y="18" width="364" height="464" rx="14" fill="none" stroke={a} strokeOpacity=".35" />
        <g transform="translate(200 484)">
          {[-66, -33, 0, 33, 66].map(r => <path key={r} d={petalPath} transform={`rotate(${r})`} fill={a} fillOpacity={r === 0 ? 0.9 : 0.6} stroke={a} strokeOpacity=".9" />)}
        </g>
        <path d="M60 492q35-12 70 0t70 0 70 0 70 0" stroke={a} strokeOpacity=".4" strokeWidth="1.5" fill="none" />
        <g transform="translate(200 40) scale(.32)">{[-50, -25, 0, 25, 50].map(r => <path key={r} d={petalPath} transform={`rotate(${r})`} fill={a} fillOpacity=".75" />)}</g>
      </>)
    case 'rings':
      return svg(<>
        <rect x="18" y="18" width="364" height="464" rx="14" fill="none" stroke={a} strokeOpacity=".55" />
        <rect x="26" y="26" width="348" height="448" rx="10" fill="none" stroke={a} strokeOpacity=".25" />
        <g transform="translate(200 440)" fill="none" stroke={a} strokeWidth="4.5">
          <circle cx="-15" cy="0" r="22" /><circle cx="15" cy="0" r="22" />
        </g>
        <path d="M177 414l6-8h12l6 8-12 11Z" fill={s} stroke={a} />
        {[[60, 60], [340, 60], [60, 440], [340, 440]].map(([x, y], k) => <path key={k} d={`M${x} ${y - 6}l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z`} fill={a} />)}
      </>)
    case 'crescent':
      return svg(<>
        <rect x="16" y="16" width="368" height="468" rx="14" fill="none" stroke={s} strokeOpacity=".45" />
        <path d="M344 36a38 38 0 1 0 24 68 32 32 0 1 1-24-68Z" fill={s} />
        {[[48, 22], [88, 50]].map(([x, len], k) => (
          <g key={k}>
            <circle cx={x} cy={len + 22} r="24" fill="#FDE68A" fillOpacity=".14" />
            <line x1={x} y1="0" x2={x} y2={len} stroke={s} strokeWidth="1.2" />
            <path d={`M${x - 9} ${len + 6}h18l-4-6h-10Z`} fill={a} />
            <rect x={x - 11} y={len + 6} width="22" height="30" rx="4" fill={a} />
            <rect x={x - 6} y={len + 11} width="12" height="20" rx="3" fill="#FFF7D6" fillOpacity=".9" />
            <path d={`M${x - 9} ${len + 36}h18l-5 6h-8Z`} fill={a} />
          </g>
        ))}
        {[[150, 30], [260, 24], [300, 130], [40, 150], [360, 200]].map(([x, y], k) => <path key={k} d={`M${x} ${y - 5}l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6Z`} fill={s} />)}
        <path d="M140 486v-30a60 46 0 0 1 120 0v30" fill="none" stroke={s} strokeOpacity=".5" strokeWidth="1.5" />
      </>)
    case 'tree': {
      const tree = (x, k, key) => (
        <g key={key} transform={`translate(${x} 492) scale(${k})`}>
          <rect x="-5" y="-14" width="10" height="14" fill="#78350F" />
          <path d="M-36-14L0-62 36-14Z" fill="#166534" /><path d="M-29-46L0-88 29-46Z" fill="#15803D" /><path d="M-21-74L0-110 21-74Z" fill="#16A34A" />
          <path d="M0-126l4 9h10l-8 6 3 10-9-6-9 6 3-10-8-6h10Z" fill="#FCD34D" />
          {[[-16, -24, '#EF4444'], [14, -30, '#FCD34D'], [-8, -56, '#FCD34D'], [10, -62, '#EF4444'], [0, -90, '#FFFFFF']].map(([bx, by, c], j) => <circle key={j} cx={bx} cy={by} r="3.6" fill={c} />)}
        </g>
      )
      return svg(<>
        <rect x="14" y="14" width="372" height="472" rx="14" fill="none" stroke={s} strokeOpacity=".5" strokeDasharray="6 5" />
        {Array.from({ length: 30 }, (_, k) => <circle key={k} cx={(k * 83) % 400} cy={(k * 47) % 330} r={(k % 3) + 1} fill="#FFFFFF" fillOpacity={t.ink === '#FFFFFF' ? 0.55 : 0} stroke={t.ink === '#FFFFFF' ? 'none' : a} strokeOpacity=".5" />)}
        {tree(56, 0.95, 'l')}{tree(346, 1.1, 'r')}
      </>)
    }
    case 'balloons':
      return svg(<>
        {balloon(46, 74, pal[0], 22, 'a')}{balloon(82, 52, pal[1 % pal.length], 18, 'b')}
        {balloon(330, 380, pal[2 % pal.length], 24, 'c')}{balloon(366, 352, pal[0], 20, 'd')}{balloon(352, 420, pal[3 % pal.length], 16, 'e')}
        {balloon(50, 400, pal[1 % pal.length], 20, 'f')}
        {Array.from({ length: 14 }, (_, k) => <circle key={k} cx={(k * 71 + 20) % 400} cy={(k * 37) % 500} r="2.4" fill={pal[k % pal.length]} fillOpacity=".7" />)}
      </>, true)
    case 'bunting': {
      const flags = (y0, sag, n, off, key) => (
        <g key={key}>
          <path d={`M0 ${y0}Q200 ${y0 + sag * 2} 400 ${y0}`} stroke={t.soft} strokeWidth="1.2" fill="none" />
          {Array.from({ length: n }, (_, k) => {
            const x = (k + 0.5) * (400 / n), y = y0 + sag * 2 * (x / 400) * (1 - x / 400) * 2
            return <path key={k} d={`M${x - 11} ${y}h22l-11 22Z`} fill={pal[(k + off) % pal.length]} />
          })}
        </g>
      )
      return svg(<>{flags(8, 14, 13, 0, 'a')}{flags(486, -12, 13, 2, 'b')}</>)
    }
    case 'baby':
      return svg(<>
        <path d="M64 34a30 30 0 1 0 20 52 25 25 0 1 1-20-52Z" fill={a} />
        {[[120, 40, 1], [330, 50, 1.4], [360, 120, 0.9], [40, 140, 0.8], [290, 30, 0.7]].map(([x, y, k], i) => <path key={i} transform={`translate(${x} ${y}) scale(${k})`} d="M0-9l2.6 5.8 6.4.7-4.8 4.3 1.4 6.3L0 4.1-5.6 7.1-4.2.8-9-3.5l6.4-.7Z" fill={a} />)}
        {[[20, 500, 46], [80, 506, 40], [140, 500, 30], [270, 504, 34], [330, 498, 44], [390, 504, 38]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" fillOpacity=".92" />)}
        <path d="M150 20q50 18 100 0" stroke={a} strokeOpacity=".5" fill="none" strokeDasharray="2 5" strokeWidth="2" strokeLinecap="round" />
      </>)
    case 'hearts':
      return svg(<>
        <rect x="16" y="16" width="368" height="468" rx="16" fill="none" stroke={a} strokeOpacity=".35" />
        {[[46, 52, 2.2, -15], [92, 34, 1.2, 12], [352, 60, 1.9, 18], [310, 34, 1, -10], [40, 446, 1.6, 10], [356, 440, 2.4, -14], [312, 470, 1, 20], [86, 470, 1.1, -8]].map(([x, y, k, r], i) => (
          <path key={i} d={heart} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} fill={i % 2 ? s : a} fillOpacity=".85" />
        ))}
      </>)
    case 'geo':
      return svg(<>
        <rect x="16" y="16" width="368" height="468" fill="none" stroke={a} strokeWidth="1.5" />
        <rect x="26" y="26" width="348" height="448" fill="none" stroke={a} strokeOpacity=".5" />
        {[[16, 16, 1, 1], [384, 16, -1, 1], [16, 484, 1, -1], [384, 484, -1, -1]].map(([x, y, sx, sy], k) => (
          <g key={k} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} stroke={a} fill="none">
            <path d="M0 70L70 0" strokeWidth="1.2" /><path d="M0 50L50 0" strokeOpacity=".6" /><path d="M0 30L30 0" strokeOpacity=".4" />
            <path d="M18 18h22v22h-22Z" fill={a} fillOpacity=".25" transform="rotate(45 29 29)" />
          </g>
        ))}
        <g transform="translate(200 484)" stroke={a} strokeOpacity=".55">{Array.from({ length: 9 }, (_, k) => { const an = Math.PI + (k + 1) * (Math.PI / 10); return <line key={k} x1="0" y1="0" x2={60 * Math.cos(an)} y2={60 * Math.sin(an)} /> })}</g>
      </>)
    case 'brush':
      return svg(<>
        <defs><filter id="ic-wash" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16" /></filter></defs>
        {[[30, 40, 95, 70, 0], [390, 90, 80, 60, 1], [20, 470, 110, 70, 2], [380, 470, 90, 80, 0], [210, -10, 70, 36, 1]].map(([x, y, rx, ry, c], k) => (
          <ellipse key={k} cx={x} cy={y} rx={rx} ry={ry} fill={pal[c % pal.length]} fillOpacity=".5" filter="url(#ic-wash)" />
        ))}
        {Array.from({ length: 18 }, (_, k) => <circle key={k} cx={(k * 61 + 12) % 400} cy={k % 2 ? 20 + (k * 13) % 90 : 400 + (k * 11) % 90} r={(k % 3) + 1.4} fill={pal[k % pal.length]} fillOpacity=".7" />)}
      </>, true)
    case 'stage':
      return svg(<>
        <path d="M110 0L210 500H140Z" fill={s} fillOpacity=".07" /><path d="M290 0L190 500H260Z" fill={s} fillOpacity=".07" />
        <path d="M0 0H52Q38 200 60 500H0Z" fill="#7F1D1D" /><path d="M400 0H348Q362 200 340 500H400Z" fill="#7F1D1D" />
        {[14, 30, 382, 368].map(x => <path key={x} d={`M${x} 30Q${x + (x < 200 ? 6 : -6)} 260 ${x + (x < 200 ? 10 : -10)} 500`} stroke="#991B1B" strokeWidth="3" fill="none" />)}
        {Array.from({ length: 10 }, (_, k) => <path key={k} d={`M${k * 40} 0h40v16q-20 16-40 0Z`} fill="#991B1B" />)}
        <path d="M0 18q20 14 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" stroke={a} strokeWidth="1.6" fill="none" />
        {[[110, 470], [290, 470], [200, 488]].map(([x, y], k) => <path key={k} d={`M${x} ${y - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z`} fill={a} />)}
      </>)
    case 'waves':
      return svg(<>
        <circle cx="338" cy="70" r="30" fill="#FDE68A" />
        {Array.from({ length: 10 }, (_, k) => { const an = (k / 10) * Math.PI * 2; return <line key={k} x1={338 + 38 * Math.cos(an)} y1={70 + 38 * Math.sin(an)} x2={338 + 48 * Math.cos(an)} y2={70 + 48 * Math.sin(an)} stroke="#FBBF24" strokeWidth="2.4" strokeLinecap="round" /> })}
        <path d="M54 66l8 6 8-6M86 50l6 5 6-5" stroke={t.soft} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M0 448q50-20 100 0t100 0 100 0 100 0V500H0Z" fill="#7DD3FC" fillOpacity=".6" />
        <path d="M0 466q50-18 100 0t100 0 100 0 100 0V500H0Z" fill="#38BDF8" fillOpacity=".55" />
        <path d="M0 484q50-14 100 0t100 0 100 0 100 0V500H0Z" fill="#0EA5E9" fillOpacity=".55" />
      </>)
    case 'cap':
      return svg(<>
        <rect x="16" y="16" width="368" height="468" rx="12" fill="none" stroke={a} strokeOpacity=".5" />
        {t.laurelOnly ? (
          <g transform="translate(342 70)">
            <path d="M-22-26h44v10a22 22 0 0 1-44 0Z" fill={a} /><path d="M-22-20h-10a10 12 0 0 0 10 16M22-20h10a10 12 0 0 1-10 16" stroke={a} strokeWidth="3" fill="none" />
            <rect x="-4" y="6" width="8" height="12" fill={a} /><rect x="-14" y="18" width="28" height="7" rx="2" fill={a} />
          </g>
        ) : (
          <g transform="translate(340 66) rotate(-12)">
            <path d="M-40 0L0-18 40 0 0 18Z" fill={t.ink === '#FFFFFF' ? '#0B1220' : '#1E293B'} stroke={a} strokeWidth="1.2" />
            <path d="M-22 8v14q22 12 44 0V8" fill={t.ink === '#FFFFFF' ? '#0B1220' : '#1E293B'} stroke={a} strokeWidth="1.2" />
            <path d="M0 0L30 6v22" stroke={a} strokeWidth="2" fill="none" /><circle cx="30" cy="30" r="3.5" fill={a} />
          </g>
        )}
        {laurel(200, -1, a)}{laurel(200, 1, a)}
      </>)
    case 'candle':
      return svg(<>
        <rect x="20" y="20" width="360" height="460" fill="none" stroke={a} strokeOpacity=".6" />
        <circle cx="200" cy="424" r="34" fill="#FDE68A" fillOpacity=".25" />
        <path d="M200 398q-9 13 0 26 9-13 0-26Z" fill="#F59E0B" /><path d="M200 408q-4 7 0 13 4-6 0-13Z" fill="#FEF3C7" />
        <rect x="190" y="426" width="20" height="50" rx="3" fill="#F5F5F4" stroke={a} />
        <path d="M150 478h100" stroke={a} strokeWidth="1.5" />
      </>)
    default:
      return null
  }
}

/* ── Live: each design's own motion ─────────────────────────────────── */
const SPARK = [[12, 18], [82, 14], [70, 62], [18, 72], [50, 8], [88, 86], [8, 46]]

export function Live({ t }) {
  const fx = t.fx ?? 'sparkle'
  if (fx === 'sparkle') return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {SPARK.map(([x, y], k) => <span key={k} className="cx-sparkle absolute block h-2 w-2 rotate-45 rounded-[2px]" style={{ left: `${x}%`, top: `${y}%`, background: t.accent, animationDelay: `${k * 0.45}s` }} />)}
    </div>
  )
  if (fx === 'glow') return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {[[14, 12], [86, 14], [20, 88], [80, 86], [50, 94]].map(([x, y], k) => (
        <span key={k} className="cx-flicker absolute block h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: `radial-gradient(circle, ${t.accent}88 0%, transparent 70%)`, animationDelay: `${k * 0.5}s` }} />
      ))}
    </div>
  )
  const up = fx === 'hearts' || fx === 'balloons'
  const pal = t.palette ?? [t.accent, t.soft, '#F59E0B', '#22C55E', '#3B82F6']
  const snow = t.ink === '#FFFFFF' ? '#FFFFFF' : t.accent
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden>
      {Array.from({ length: fx === 'snow' ? 16 : 11 }, (_, k) => {
        const dur = (up ? 7 : 6) + (k % 4) * 1.5
        let p
        if (fx === 'petals') p = <span className="block h-3 w-2.5 rounded-[70%_0_70%_0] opacity-90" style={{ background: t.petal ?? t.accent }} />
        else if (fx === 'confetti') p = <span className="block h-2.5 w-1.5 rounded-[1px]" style={{ background: pal[k % pal.length] }} />
        else if (fx === 'snow') p = <span className="block h-1.5 w-1.5 rounded-full opacity-90" style={{ background: snow }} />
        else if (fx === 'hearts') p = <span className="block text-[13px] leading-none" style={{ color: k % 2 ? t.soft : t.accent }}>♥</span>
        else p = <span className="block h-4 w-3 rounded-full" style={{ background: pal[k % pal.length], opacity: 0.85 }} />
        return (
          <span key={k} className={up ? 'cx-fx-rise' : 'cx-fx-fall'} style={{ left: `${(k * 37 + 7) % 94}%`, animationDuration: `${dur}s`, animationDelay: `${-k * 1.3}s` }}>
            <span className="cx-fx-sway block" style={{ animationDelay: `${-k * 0.4}s` }}>{p}</span>
          </span>
        )
      })}
    </div>
  )
}

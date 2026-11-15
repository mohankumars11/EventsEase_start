/**
 * The 3D pictograms — the home icon row, on the purple head of the page.
 *
 * Mohan, 2026-11-10: no plate, no cream tile behind the mark — the object
 * stands on the purple itself, the way a quick-commerce app sets a
 * category: a small modelled thing, lit from the top-left, with a shaded
 * far side, a white specular crown and a soft shadow under it.
 *
 * Because the ground is a saturated purple, nothing here is purple: every
 * body is a colour that holds against it (gold, coral, pink, cyan, mint,
 * silver), and every shadow is a deep violet so it sits ON the ground
 * rather than reading as a grey smudge.
 *
 *   <Glyph3D id="life" />          a celebration category (data/occasions)
 *   <Glyph3D id="svc:food" />      a service family (data/trades TRADE_GROUPS)
 *   <Glyph3D id="all" />           the All chip
 *
 * ── How a mark is built ──────────────────────────────────────────────
 * Grid 48×48, the object inside 4–44, the contact shadow on the 43 line
 * so every mark stands on the same floor. Each mark brings its own
 * gradients (objectBoundingBox, so one stop list paints any shape) under
 * a per-instance prefix from useId — two copies on one screen must never
 * share, and fight over, one gradient id.
 */
import { useId } from 'react'

/* ── Paint helpers ─────────────────────────────────────────────────── */
const stops = list => list.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)
/** Linear, left→right by default; pass 0,0,0,1 for top→bottom. */
const L = (id, list, x1 = 0, y1 = 0, x2 = 1, y2 = 0) => <linearGradient key={id} id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{stops(list)}</linearGradient>
/** Radial, with an optional focal point for a lit sphere. */
const R = (id, list, cx = 0.5, cy = 0.5, r = 0.5, fx, fy) => <radialGradient key={id} id={id} cx={cx} cy={cy} r={r} fx={fx ?? cx} fy={fy ?? cy}>{stops(list)}</radialGradient>

/* A sphere lit from the top-left: the three colours of one body. */
const ball = (id, hi, mid, lo) => R(id, [[0, hi], [0.38, mid], [1, lo]], 0.38, 0.34, 0.72, 0.3, 0.26)
/* A cylinder side: a lit band a third of the way in, dark at the far edge. */
const side = (id, a, b, c, d) => L(id, [[0, a], [0.3, b], [0.72, c], [1, d]])

const star4 = (x, y, s) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`
function star5(cx, cy, r1, r2) {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + (i * Math.PI) / 5
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  }
  return d + 'Z'
}
/* Frosting over a cake tier: the whole top, and drips down its front edge. */
function drip(cx, cy, rx, ry, drops, base = 1.3) {
  const pts = []
  for (let k = 0; k <= 40; k++) {
    const t = k / 40, th = Math.PI - t * Math.PI
    let y = cy + ry * Math.sin(th) + base * Math.sin(t * Math.PI)
    for (const [ti, len, w = 0.05] of drops) y += len * Math.exp(-(((t - ti) / w) ** 2))
    pts.push(`${(cx + rx * Math.cos(th)).toFixed(2)} ${y.toFixed(2)}`)
  }
  return `M${cx - rx} ${cy}L${pts.join('L')}A${rx} ${ry} 0 0 0 ${cx - rx} ${cy}Z`
}
function gear(cx, cy, R1, r1, teeth, hole) {
  const step = (Math.PI * 2) / teeth
  let d = ''
  for (let j = 0; j < teeth; j++) {
    const a = j * step
    ;[[r1, 0], [R1, 0.16], [R1, 0.44], [r1, 0.6]].forEach(([r, f], k) => {
      const t = a + f * step
      d += `${j === 0 && k === 0 ? 'M' : 'L'}${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`
    })
  }
  return `${d}Z M${cx + hole} ${cy}a${hole} ${hole} 0 1 0 ${-2 * hole} 0a${hole} ${hole} 0 1 0 ${2 * hole} 0Z`
}

/* The floor every mark stands on. */
const Floor = ({ u, rx = 14, cy = 43.2 }) => <ellipse cx="24" cy={cy} rx={rx} ry="2.7" fill={`url(#${u}floor)`} />
const Spark = ({ x, y, s = 2.6, c = '#FFFFFF', delay = 0 }) => <path className="cx-g3-spark" d={star4(x, y, s)} fill={c} style={{ animationDelay: `${delay}s` }} />

/* ── The marks ─────────────────────────────────────────────────────── */
const MARKS = {
  /* Personal celebrations — a two-tier birthday cake, candle lit. */
  life: (u, f) => <>
    <defs>
      {side(`${u}pk`, '#FF7DB6', '#FFB4D8', '#F2478F', '#A80F50')}
      {L(`${u}cr`, [[0, '#FFFFFF'], [1, '#FFE6F1']], 0, 0, 0, 1)}
      {L(`${u}pl`, [[0, '#FFFFFF'], [1, '#D3CBE4']], 0, 0, 0, 1)}
      {L(`${u}cd`, [[0, '#FFFFFF'], [0.5, '#F4F0FA'], [1, '#C9BFDC']])}
      {R(`${u}fl`, [[0, '#FFFBD6'], [0.45, '#FFC53A'], [1, '#FF6A1A']], 0.5, 0.75, 0.62)}
      {R(`${u}gw`, [[0, '#FFD54A', 0.85], [1, '#FFD54A', 0]])}
    </defs>
    <Floor u={u} rx={16} />
    <ellipse cx="24" cy="40.6" rx="17.6" ry="3.7" fill="#9C8FBC" />
    <ellipse cx="24" cy="39.8" rx="17.6" ry="3.5" fill={f('pl')} />
    <path d="M9 28.2V37.6A15 3.4 0 0 0 39 37.6V28.2Z" fill={f('pk')} />
    <path d={drip(24, 28.2, 15, 3.4, [[0.14, 1.6], [0.33, 3.2], [0.52, 2], [0.7, 3.6], [0.88, 1.8]])} fill={f('cr')} />
    <rect x="13" y="34" width="2.6" height="1.2" rx=".6" fill="#FFE066" transform="rotate(-24 14.3 34.6)" />
    <rect x="19.4" y="35.6" width="2.6" height="1.2" rx=".6" fill="#6EE7FF" transform="rotate(18 20.7 36.2)" />
    <rect x="29" y="35.4" width="2.6" height="1.2" rx=".6" fill="#FFE066" transform="rotate(-12 30.3 36)" />
    <rect x="34" y="33.2" width="2.4" height="1.2" rx=".6" fill="#FFFFFF" transform="rotate(30 35.2 33.8)" />
    <path d="M14.5 19V27A9.5 2.5 0 0 0 33.5 27V19Z" fill={f('pk')} />
    <path d={drip(24, 19, 9.5, 2.5, [[0.2, 1.4], [0.46, 2.6], [0.72, 1.6]], 1)} fill={f('cr')} />
    <rect x="18.4" y="24.6" width="2.4" height="1.1" rx=".55" fill="#6EE7FF" transform="rotate(20 19.6 25.1)" />
    <rect x="27.2" y="24.8" width="2.4" height="1.1" rx=".55" fill="#FFE066" transform="rotate(-20 28.4 25.3)" />
    <path d="M11.4 30.6V36.4" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M16.6 21.4V26" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="22.7" y="10.4" width="2.6" height="9" rx="1" fill={f('cd')} />
    <path d="M22.7 12.4l2.6-1.4M22.7 15.4l2.6-1.4M22.7 18.4l2.6-1.4" stroke="#FF5FA3" strokeWidth="1" />
    <ellipse className="cx-glow" cx="24" cy="7.6" rx="5.4" ry="5.8" fill={f('gw')} />
    <g className="cx-flame">
      <path d="M24 2.8c2 2 3 3.6 3 5a3 3 0 0 1-6 0c0-1.4 1-3 3-5z" fill={f('fl')} />
      <path d="M24 5.6c.9 1 1.4 1.8 1.4 2.5a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-2.5z" fill="#FFFDE8" />
    </g>
  </>,

  /* Indian weddings — a gold band set with a diamond. */
  wedding: (u, f) => <>
    <defs>
      {L(`${u}g`, [[0, '#FFF6C2'], [0.35, '#FFD54A'], [0.7, '#E59A0C'], [1, '#8A5200']], 0, 0, 1, 1)}
      {L(`${u}gi`, [[0, '#7E4A00'], [1, '#F2B53A']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={14.5} />
    <path d="M10 31.6a14 9.8 0 1 0 28 0a14 9.8 0 1 0-28 0ZM14 32.3a10 6.6 0 1 0 20 0a10 6.6 0 1 0-20 0Z" fill={f('g')} fillRule="evenodd" />
    <path d="M14 32.3A10 6.6 0 0 1 34 32.3A10 5.2 0 0 0 14 32.3Z" fill={f('gi')} />
    <path d="M12.4 27.4A13 8.6 0 0 1 21.6 22.4" fill="none" stroke="#FFFFFF" strokeOpacity=".85" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="35.6" cy="35" r=".9" fill="#FFFFFF" opacity=".8" />
    <path d="M20.4 23.2H27.6L26.2 19.8H21.8Z" fill={f('g')} />
    <path d="M17.4 13.6L21 9.4H27L30.6 13.6L24 21.8Z" fill="#7FD6FA" />
    <path d="M17.4 13.6L21 9.4L22.6 13.6Z" fill="#A8E9FF" />
    <path d="M21 9.4H27L25.4 13.6H22.6Z" fill="#F0FCFF" />
    <path d="M27 9.4L30.6 13.6H25.4Z" fill="#62C7F2" />
    <path d="M17.4 13.6H22.6L24 21.8Z" fill="#55BDEE" />
    <path d="M22.6 13.6H25.4L24 21.8Z" fill="#B4ECFF" />
    <path d="M25.4 13.6H30.6L24 21.8Z" fill="#2A88D2" />
    <path d="M17.4 13.6L21 9.4H27L30.6 13.6L24 21.8Z" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth=".55" strokeLinejoin="round" />
    <Spark x={34.4} y={8.4} s={3} />
    <Spark x={13} y={11} s={2} delay={0.8} />
  </>,

  /* Religious & cultural — a clay diya, its flame alive. */
  festivals: (u, f) => <>
    <defs>
      {side(`${u}c`, '#FFA65E', '#FFC892', '#E46A26', '#93360F')}
      {L(`${u}in`, [[0, '#B4471A'], [1, '#6A2408']], 0, 0, 0, 1)}
      {L(`${u}oil`, [[0, '#FFE69A'], [1, '#E8A21A']], 0, 0, 0, 1)}
      {R(`${u}fl`, [[0, '#FFFBD6'], [0.45, '#FFC53A'], [1, '#FF5A14']], 0.5, 0.78, 0.66)}
      {R(`${u}gw`, [[0, '#FFC93A', 0.9], [1, '#FFC93A', 0]])}
    </defs>
    <Floor u={u} rx={15} />
    <ellipse cx="23.4" cy="40.4" rx="6.4" ry="1.5" fill="#7A2C0C" />
    <path d="M7 27C7.4 34.6 14.4 39.8 23.4 39.8C31.4 39.8 37 35.8 39.4 30.6C40.8 29 42.4 27.4 44 25.6C41 26.6 38.4 27.2 36 27.4Z" fill={f('c')} />
    <ellipse cx="22.6" cy="27" rx="15.6" ry="4" fill="#FFCB96" />
    <ellipse cx="22.6" cy="27.3" rx="13.6" ry="3" fill={f('in')} />
    <ellipse cx="22.6" cy="27.9" rx="11.4" ry="2.1" fill={f('oil')} />
    <path d="M36 27.2C39 26.8 41.6 26.2 44 25.6C42.6 26.9 41 27.9 39.6 28.6" fill="none" stroke="#FFCB96" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M9.6 31.6C14 36.4 30 36.8 37.6 31.4" fill="none" stroke="#FFD66B" strokeWidth="1" />
    {[11.6, 15.2, 18.8, 22.4, 26, 29.6, 33.2].map((x, i) => <circle key={x} cx={x} cy={[33.2, 34.6, 35.4, 35.7, 35.6, 35.1, 34].at(i)} r=".85" fill="#FFE29A" />)}
    <path d="M10.4 30.2C11.6 33.8 14.8 36.4 18.6 37.4" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M23 27.8L23.7 24.4" stroke="#4A1C06" strokeWidth="1.3" strokeLinecap="round" />
    <ellipse className="cx-glow" cx="23.8" cy="17" rx="8.4" ry="9.4" fill={f('gw')} />
    <g className="cx-flame">
      <path d="M23.8 8.6C27.2 12.4 28.8 15.4 28.8 17.8A5 5 0 0 1 18.8 17.8C18.8 15.4 20.4 12.4 23.8 8.6Z" fill={f('fl')} />
      <path d="M23.8 13.6C25.4 15.6 26.2 17.1 26.2 18.3A2.4 2.4 0 0 1 21.4 18.3C21.4 17.1 22.2 15.6 23.8 13.6Z" fill="#FFFDE8" />
    </g>
  </>,

  /* School — a backpack, a pencil riding in it. */
  school: (u, f) => <>
    <defs>
      {side(`${u}b`, '#4AA8FF', '#86CBFF', '#2F7FEA', '#1A47A8')}
      {L(`${u}bt`, [[0, '#A6DBFF'], [1, '#4592F2']], 0, 0, 0, 1)}
      {side(`${u}y`, '#FFD84D', '#FFEC96', '#FFB81C', '#CC7F00')}
      {L(`${u}pc`, [[0, '#FFD24A'], [0.5, '#FFE48A'], [1, '#E39A0C']])}
    </defs>
    <Floor u={u} />
    <g transform="rotate(28 34 12)">
      <rect x="32.3" y="4.4" width="3.6" height="11" fill={f('pc')} />
      <rect x="32.3" y="2.4" width="3.6" height="2.2" fill="#D8D4E6" />
      <rect x="32.3" y=".2" width="3.6" height="2.6" rx="1.2" fill="#FF8FB1" />
    </g>
    <path d="M19 12.4C19 7.6 29 7.6 29 12.4" fill="none" stroke="#173D96" strokeWidth="2.8" strokeLinecap="round" />
    <rect x="8.8" y="19" width="3.2" height="18" rx="1.6" fill="#173D96" />
    <rect x="36" y="19" width="3.2" height="18" rx="1.6" fill="#173D96" />
    <path d="M11 19C11 14.6 14.6 11.4 19 11.4H29C33.4 11.4 37 14.6 37 19V37C37 38.7 35.7 40 34 40H14C12.3 40 11 38.7 11 37Z" fill={f('b')} />
    <path d="M11 19C11 14.6 14.6 11.4 19 11.4H29C33.4 11.4 37 14.6 37 19V21.6C30 23.6 18 23.6 11 21.6Z" fill={f('bt')} />
    <path d="M12.6 20.6C19 22.2 29 22.2 35.4 20.6" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".7" strokeDasharray="1.2 1.1" />
    <rect x="16.8" y="21.8" width="2.8" height="6.4" fill="#1D4FB8" /><rect x="28.4" y="21.8" width="2.8" height="6.4" fill="#1D4FB8" />
    <rect x="16.4" y="25.6" width="3.6" height="2.2" rx=".6" fill="#FFD84D" /><rect x="28" y="25.6" width="3.6" height="2.2" rx=".6" fill="#FFD84D" />
    <path d="M14 31.2C14 29 15.8 27.4 18 27.4H30C32.2 27.4 34 29 34 31.2V35.4C34 37.1 32.7 38.4 31 38.4H17C15.3 38.4 14 37.1 14 35.4Z" fill={f('y')} />
    <path d="M15.4 31H32.6" stroke="#B87800" strokeWidth=".8" />
    <rect x="29.6" y="31" width="1.8" height="3" rx=".7" fill="#7A4F00" />
    <path d="M13.6 20.4V35" stroke="#FFFFFF" strokeOpacity=".42" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16.4 32.6V36.4" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
  </>,

  /* College — the mortarboard, a diploma under it. */
  college: (u, f) => <>
    <defs>
      {L(`${u}bd`, [[0, '#7487D9'], [0.5, '#3B4C9E'], [1, '#1D2666']], 0, 0, 1, 1)}
      {side(`${u}cp`, '#33438F', '#5466C2', '#26307A', '#121848')}
      {L(`${u}t`, [[0, '#FFEB96'], [1, '#E0A010']], 0, 0, 0, 1)}
      {L(`${u}pp`, [[0, '#FFF6DE'], [0.45, '#FFFFFF'], [1, '#E2C88E']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={15} />
    <g transform="rotate(-10 24 36)">
      <rect x="8.6" y="32.6" width="30.8" height="6.6" rx="3.3" fill={f('pp')} />
      <ellipse cx="9.4" cy="35.9" rx="1.7" ry="3.3" fill="#EAD7A8" />
      <circle cx="9.4" cy="35.9" r=".8" fill="#C9A866" />
      <rect x="23.6" y="32.2" width="3.2" height="7.4" fill="#FF4D6D" />
    </g>
    <path d="M14.4 20H33.6L33 28.4C30 31 18 31 15 28.4Z" fill={f('cp')} />
    <path d="M5 17.2L24 25.2L43 17.2V18.9L24 26.9L5 18.9Z" fill="#11174A" />
    <path d="M24 9.2L43 17.2L24 25.2L5 17.2Z" fill={f('bd')} />
    <path d="M24 9.2L5 17.2L24 25.2Z" fill="#FFFFFF" opacity=".12" />
    <path d="M5.8 17.2L24 9.6L42.2 17.2" fill="none" stroke="#B7C6FF" strokeOpacity=".8" strokeWidth=".8" strokeLinejoin="round" />
    <path d="M24 17.2C30 17.6 36 18.6 38.6 19.6V27.2" fill="none" stroke="#FFD24A" strokeWidth="1.2" strokeLinecap="round" />
    <ellipse cx="24" cy="17.2" rx="1.8" ry="1.1" fill="#FFD24A" />
    <path d="M37 27H40.2L41.2 33.6C40 34.6 37.2 34.6 36 33.6Z" fill={f('t')} />
    <circle cx="38.6" cy="27" r="1.5" fill="#FFE36B" />
  </>,

  /* Corporate — a leather briefcase with a gold clasp. */
  corporate: (u, f) => <>
    <defs>
      {side(`${u}l`, '#F2B062', '#FFD6A0', '#D88434', '#8E4B16')}
      {L(`${u}lt`, [[0, '#FFDDAE'], [1, '#E79E50']], 0, 0, 0, 1)}
      {L(`${u}g`, [[0, '#FFF3B4'], [1, '#D9A01A']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={16} />
    <path d="M18 17V13.2C18 11.4 19.4 10 21.2 10H26.8C28.6 10 30 11.4 30 13.2V17" fill="none" stroke="#6E3510" strokeWidth="3" />
    <path d="M19.4 16.4V13.4C19.4 12.3 20.2 11.5 21.3 11.5" fill="none" stroke="#B5652A" strokeWidth=".9" />
    <path d="M6.4 21C6.4 18.2 8.6 16 11.4 16H36.6C39.4 16 41.6 18.2 41.6 21V35.4C41.6 37.7 39.7 39.6 37.4 39.6H10.6C8.3 39.6 6.4 37.7 6.4 35.4Z" fill={f('l')} />
    <path d="M6.4 21C6.4 18.2 8.6 16 11.4 16H36.6C39.4 16 41.6 18.2 41.6 21V22.8H6.4Z" fill={f('lt')} />
    <path d="M6.4 22.8H41.6" stroke="#A35A1E" strokeWidth=".9" />
    <path d="M8 25.2H40" stroke="#FFE2BA" strokeOpacity=".6" strokeWidth=".6" strokeDasharray="1.2 1.2" />
    <rect x="14" y="16" width="2.8" height="23.6" fill="#A35A1E" opacity=".55" />
    <rect x="31.2" y="16" width="2.8" height="23.6" fill="#A35A1E" opacity=".55" />
    <rect x="20.4" y="20.2" width="7.2" height="6" rx="1.6" fill={f('g')} />
    <rect x="23.3" y="22.2" width="1.4" height="2.4" rx=".7" fill="#7A4F00" />
    <path d="M9.4 26V35.6" stroke="#FFFFFF" strokeOpacity=".38" strokeWidth="2" strokeLinecap="round" />
  </>,

  /* Live & nightlife — a disco ball throwing colour. */
  nightlife: (u, f) => <>
    <defs>
      {R(`${u}s`, [[0, '#FFFFFF'], [0.25, '#EEF0F8'], [0.62, '#A9B0CB'], [1, '#4F5679']], 0.38, 0.32, 0.75, 0.32, 0.26)}
      <clipPath id={`${u}clip`}><circle cx="24" cy="26" r="14" /></clipPath>
    </defs>
    <Floor u={u} rx={13} />
    <path d="M24 1V11" stroke="#EDE7F7" strokeWidth="1" />
    <rect x="22.2" y="10" width="3.6" height="2.6" rx=".6" fill="#D8D4E6" />
    <circle cx="24" cy="26" r="14" fill={f('s')} />
    <g clipPath={`url(#${u}clip)`} fill="none" stroke="#4E5578" strokeOpacity=".5" strokeWidth=".55">
      {[-60, -40, -20, 0, 20, 40, 60].map(a => { const r = (a * Math.PI) / 180, rx = 14 * Math.cos(r); return <ellipse key={a} cx="24" cy={26 + 14 * Math.sin(r)} rx={rx} ry={rx * 0.16} /> })}
      {[15, 40, 65, 90].map(a => <ellipse key={a} cx="24" cy="26" rx={14 * Math.sin((a * Math.PI) / 180)} ry="14" />)}
    </g>
    <g clipPath={`url(#${u}clip)`}>
      {[[16.2, 18.6, '#7FF6FF'], [20.8, 15.2, '#FFFFFF'], [29.4, 21.6, '#FF7AD9'], [18.6, 30.4, '#FFF07A'], [31.2, 31.2, '#7FF6FF'], [25.6, 35.6, '#FF7AD9'], [13.4, 25.6, '#FFFFFF'], [34.6, 24.8, '#FFF07A']].map(([x, y, c], i) => <rect key={i} x={x} y={y} width="2.8" height="2.3" rx=".3" fill={c} opacity=".9" />)}
    </g>
    <ellipse cx="18.6" cy="19.6" rx="4.4" ry="3.2" fill="#FFFFFF" opacity=".72" transform="rotate(-30 18.6 19.6)" />
    <circle cx="24" cy="26" r="14" fill="none" stroke="#2E3358" strokeOpacity=".45" strokeWidth=".6" />
    <Spark x={40} y={12} s={3.4} />
    <Spark x={8} y={33} s={2.4} c="#FFF5B0" delay={0.9} />
    <Spark x={9} y={13} s={1.8} c="#7FF6FF" delay={1.6} />
  </>,

  /* Public shows — a stage microphone, sound coming off it. */
  public: (u, f) => <>
    <defs>
      {R(`${u}h`, [[0, '#FFFFFF'], [0.35, '#DDE0EC'], [0.75, '#8F96B2'], [1, '#575D80']], 0.4, 0.35, 0.72, 0.34, 0.28)}
      {L(`${u}g`, [[0, '#FFE89A'], [0.4, '#FFF6CF'], [1, '#C98F10']])}
      {side(`${u}b`, '#FF5C8A', '#FF9AB8', '#E0245A', '#860A30')}
      <clipPath id={`${u}clip`}><circle cx="24" cy="14.6" r="8.6" /></clipPath>
    </defs>
    <Floor u={u} rx={11} />
    <g transform="rotate(-18 24 27)">
      <path d="M19.6 25H28.4L26.4 41C26.2 42.4 21.8 42.4 21.6 41Z" fill={f('b')} />
      <rect x="22.6" y="30" width="2.8" height="4.4" rx="1" fill="#FFD3DF" />
      <path d="M21.4 27.4L22.4 39" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="19" y="21.8" width="10" height="4" rx="1.4" fill={f('g')} />
      <circle cx="24" cy="14.6" r="8.6" fill={f('h')} />
      <g clipPath={`url(#${u}clip)`} stroke="#666C8E" strokeOpacity=".55" strokeWidth=".5">
        {[-8, -5.6, -3.2, -0.8, 1.6, 4, 6.4, 8.8].map(o => <g key={o}><path d={`M${16 + o} 6l12 18`} /><path d={`M${32 - o} 6l-12 18`} /></g>)}
      </g>
      <ellipse cx="21" cy="11" rx="3.2" ry="2.4" fill="#FFFFFF" opacity=".78" transform="rotate(-30 21 11)" />
    </g>
    <path d="M35.4 12C37.8 14.4 37.8 18.6 35.4 21" fill="none" stroke="#FFE066" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M38.8 9.2C42.4 12.8 42.4 19.8 38.8 23.4" fill="none" stroke="#FFE066" strokeOpacity=".65" strokeWidth="1.7" strokeLinecap="round" />
  </>,

  /* Sports & wellness — the gold trophy. */
  sport: (u, f) => <>
    <defs>
      {L(`${u}g`, [[0, '#FFD84A'], [0.25, '#FFF4B8'], [0.55, '#FFC21F'], [0.85, '#D58A00'], [1, '#8E5600']])}
      {L(`${u}gv`, [[0, '#FFF6C8'], [1, '#E3A512']], 0, 0, 0, 1)}
      {side(`${u}w`, '#8E4E2C', '#B8754A', '#7A3E1E', '#4E240E')}
    </defs>
    <Floor u={u} rx={13} />
    <path d="M13.4 12H9.6C7.6 12 6.6 13.6 7.2 15.6C8.4 19.8 11.4 22.4 15 23.4" fill="none" stroke={f('gv')} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M34.6 12H38.4C40.4 12 41.4 13.6 40.8 15.6C39.6 19.8 36.6 22.4 33 23.4" fill="none" stroke="#D99A0E" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M13 9.6H35V14C35 22.4 30.2 27.6 24 27.6C17.8 27.6 13 22.4 13 14Z" fill={f('g')} />
    <ellipse cx="24" cy="9.6" rx="11" ry="2.2" fill="#FFF3B8" />
    <ellipse cx="24" cy="9.8" rx="9.4" ry="1.5" fill="#C78A12" />
    <path d={star5(24, 17.4, 3.8, 1.6)} fill="#FFFBE6" stroke="#E9A810" strokeWidth=".4" />
    <path d="M16.2 12.4C16.2 18 17.8 22 20.2 24.6" fill="none" stroke="#FFFFFF" strokeOpacity=".65" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M21.8 27.4H26.2L25.4 32.4H22.6Z" fill={f('g')} />
    <ellipse cx="24" cy="30" rx="3.2" ry="1.2" fill={f('gv')} />
    <rect x="17.4" y="32.2" width="13.2" height="2.6" rx=".8" fill={f('gv')} />
    <path d="M15 34.6H33L34.6 41H13.4Z" fill={f('w')} />
    <rect x="20" y="36.6" width="8" height="2.6" rx=".5" fill="#FFE48A" />
    <Spark x={40.6} y={6} s={2.8} />
  </>,

  /* Food & dining — a silver cloche on its plate. */
  food: (u, f) => <>
    <defs>
      {R(`${u}d`, [[0, '#FFFFFF'], [0.35, '#EEEBF5'], [0.75, '#ADA6C2'], [1, '#6E6688']], 0.36, 0.3, 0.8, 0.3, 0.22)}
      {L(`${u}p`, [[0, '#FFFFFF'], [1, '#CDC5DF']], 0, 0, 0, 1)}
      {ball(`${u}k`, '#FFF6C2', '#FFC93A', '#B57A00')}
    </defs>
    <Floor u={u} rx={18} />
    <ellipse cx="24" cy="37.8" rx="18.6" ry="4.4" fill="#9F93BD" />
    <ellipse cx="24" cy="37" rx="18.6" ry="4.2" fill={f('p')} />
    <path d="M8.6 36.2A15.4 14.4 0 0 1 39.4 36.2Z" fill={f('d')} />
    <ellipse cx="24" cy="36.2" rx="15.4" ry="2.2" fill="none" stroke="#8D85A8" strokeWidth="1" />
    <ellipse cx="24" cy="22.4" rx="2.4" ry="1" fill="#B88A20" />
    <circle cx="24" cy="20.2" r="2.8" fill={f('k')} />
    <path d="M13.2 31.4C13.6 26.6 16.8 23.6 20.6 22.8" fill="none" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M30.6 26.2C33.6 28.2 35.4 31 35.6 34" fill="none" stroke="#FFD9A0" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    <Spark x={37.6} y={13} s={3} c="#FFF5B0" />
    <Spark x={11} y={16} s={2} delay={1} />
  </>,

  /* Retail & fashion — a shopping bag, tissue spilling out. */
  retail: (u, f) => <>
    <defs>
      {side(`${u}fr`, '#FF5FA8', '#FF92C8', '#F0388A', '#C01868')}
      {L(`${u}sd`, [[0, '#B0105A'], [1, '#7E0840']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={15} />
    <path d="M13 17L16 9.4L19 15L22.6 8L26 14.6L29.6 8.8L32.4 16Z" fill="#7FE3FF" />
    <path d="M15.4 17L19.6 11.6L23.2 16L27.2 11L30.4 17Z" fill="#FFE066" />
    <path d="M19 15C19 7.8 30.4 7.8 30.4 15" fill="none" stroke="#8E0C48" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M10 16.6L15 14.4H39L34 16.6Z" fill="#5E0630" />
    <path d="M10 16.6H34V38.4C34 39.3 33.3 40 32.4 40H11.6C10.7 40 10 39.3 10 38.4Z" fill={f('fr')} />
    <path d="M34 16.6L39 14.4V37.4L34 40Z" fill={f('sd')} />
    <rect x="10" y="16.6" width="24" height="2.4" fill="#FFFFFF" opacity=".2" />
    <path d="M15.6 20C15.6 10.8 27.6 10.8 27.6 20" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    <circle cx="15.6" cy="20.2" r="1" fill="#FFE066" /><circle cx="27.6" cy="20.2" r="1" fill="#FFE066" />
    <circle cx="22" cy="29.6" r="5.4" fill="#FFFFFF" />
    <path d="M22 32.4C19.4 30.6 18.4 29.4 18.4 28.2C18.4 27.1 19.2 26.4 20.2 26.4C21 26.4 21.6 26.9 22 27.6C22.4 26.9 23 26.4 23.8 26.4C24.8 26.4 25.6 27.1 25.6 28.2C25.6 29.4 24.6 30.6 22 32.4Z" fill="#F0388A" />
    <path d="M12.6 22V36.6" stroke="#FFFFFF" strokeOpacity=".38" strokeWidth="1.8" strokeLinecap="round" />
  </>,

  /* Property & hospitality — a little house, lights on. */
  property: (u, f) => <>
    <defs>
      {L(`${u}fw`, [[0, '#FFFAF0'], [1, '#F3D9B2']])}
      {L(`${u}sw`, [[0, '#EFC994'], [1, '#C99256']], 0, 0, 0, 1)}
      {L(`${u}rf`, [[0, '#FF9F80'], [0.5, '#F0563A'], [1, '#A82718']], 0, 0, 1, 1)}
      {R(`${u}win`, [[0, '#FFF8C8'], [1, '#FFC12E']])}
      {L(`${u}dr`, [[0, '#C77B47'], [1, '#7A3B1A']])}
      {ball(`${u}bu`, '#B5F5BE', '#3DBA5C', '#17702F')}
    </defs>
    <Floor u={u} rx={18} />
    <rect x="34.4" y="8.6" width="3.6" height="7" fill="#D84C34" />
    <rect x="33.9" y="7.8" width="4.6" height="1.6" rx=".5" fill="#9E2418" />
    <path d="M30 24.6L41 21.6V37.6L30 40.6Z" fill={f('sw')} />
    <path d="M9 25.2L20 15.6L30 24.6V40.6H9Z" fill={f('fw')} />
    <path d="M20 13L31.6 9.6L43 20.8L31 24.6Z" fill={f('rf')} />
    <path d="M7.4 26.4L20 13L31 24.6" fill="none" stroke="#C33A25" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M7.6 25.4L20 12.2" stroke="#FFB9A2" strokeWidth=".8" strokeLinecap="round" />
    <circle cx="20" cy="21.8" r="2.4" fill={f('win')} stroke="#FFFFFF" strokeWidth=".8" />
    <path d="M16.6 40.6V32.6C16.6 30.8 18 29.6 19.6 29.6C21.2 29.6 22.6 30.8 22.6 32.6V40.6Z" fill={f('dr')} />
    <circle cx="21.3" cy="35.6" r=".65" fill="#FFD24A" />
    <rect x="24.2" y="29" width="4" height="4" rx=".5" fill={f('win')} />
    <path d="M26.2 29V33M24.2 31H28.2" stroke="#FFFFFF" strokeWidth=".5" />
    <path d="M33 28.6L38.2 27.2V32.2L33 33.6Z" fill={f('win')} />
    <path d="M35.6 27.9V32.9" stroke="#FFFFFF" strokeWidth=".5" />
    <circle cx="8" cy="38.2" r="3.4" fill={f('bu')} /><circle cx="11.8" cy="39.4" r="2.5" fill={f('bu')} /><circle cx="41" cy="38" r="2.8" fill={f('bu')} />
  </>,

  /* A venue — a banquet hall: dome, pillars, an arched door, a red carpet and
     warm windows (Mohan, 2026-11-11: "provide the venue, very clear"). */
  venue: (u, f) => <>
    <defs>
      {ball(`${u}dome`, '#FFF0B8', '#F3B832', '#A86A08')}
      {L(`${u}wall`, [[0, '#FFFBF2'], [1, '#EBD6B3']])}
      {L(`${u}wallS`, [[0, '#E6C898'], [1, '#B98A4E']], 0, 0, 0, 1)}
      {side(`${u}pil`, '#FFFFFF', '#F5E6C8', '#D9BD8C', '#A9854E')}
      {L(`${u}arch`, [[0, '#8E1A3A'], [1, '#4A0A1D']], 0, 0, 0, 1)}
      {L(`${u}carpet`, [[0, '#FF5A6E'], [0.5, '#D8142F'], [1, '#8A0A1C']], 0, 0, 0, 1)}
      {R(`${u}win`, [[0, '#FFF8C8'], [1, '#FFB52E']])}
      {L(`${u}roof`, [[0, '#F6D28B'], [1, '#C8902A']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={19} />
    {/* the carpet runs out to the floor */}
    <path d="M19 40.8H29L34 43.6H14Z" fill={f('carpet')} />
    {/* the hall */}
    <path d="M8 22H40V40.8H8Z" fill={f('wall')} />
    <path d="M40 22L44 24.4V40.8H40Z" fill={f('wallS')} />
    <path d="M6 22.6L24 14L42 22.6V23.6H6Z" fill={f('roof')} />
    <path d="M6 22.6L24 14L42 22.6" fill="none" stroke="#9C6A1A" strokeWidth="1" strokeLinejoin="round" />
    {/* dome and finial */}
    <path d="M16.5 14.6C16.5 9.6 20 6.4 24 6.4C28 6.4 31.5 9.6 31.5 14.6Z" fill={f('dome')} />
    <rect x="15.6" y="14" width="16.8" height="1.8" rx=".6" fill="#C8902A" />
    <path d="M24 6.6V3.8" stroke="#C8902A" strokeWidth="1.2" strokeLinecap="round" /><circle cx="24" cy="3.4" r="1.2" fill="#FFD54A" />
    {/* pillars */}
    {[11.5, 36.5].map(x => <g key={x}><rect x={x - 1.8} y="24" width="3.6" height="16.8" fill={f('pil')} /><rect x={x - 2.4} y="23.2" width="4.8" height="1.6" rx=".4" fill="#D9BD8C" /><rect x={x - 2.4} y="39.6" width="4.8" height="1.4" rx=".4" fill="#B98A4E" /></g>)}
    {/* the door, arched and lit */}
    <path d="M19 40.8V30C19 26.8 21.2 24.6 24 24.6C26.8 24.6 29 26.8 29 30V40.8Z" fill={f('arch')} />
    <path d="M20.6 40.8V30.4C20.6 28.2 22.1 26.6 24 26.6C25.9 26.6 27.4 28.2 27.4 30.4V40.8Z" fill={f('win')} opacity=".92" />
    <path d="M24 26.8V40.8" stroke="#D8142F" strokeWidth=".6" opacity=".5" />
    {/* windows */}
    <rect x="13.6" y="27" width="3.4" height="4.6" rx="1.4" fill={f('win')} /><rect x="31" y="27" width="3.4" height="4.6" rx="1.4" fill={f('win')} />
    <rect x="13.6" y="33.4" width="3.4" height="4.2" rx="1.2" fill={f('win')} /><rect x="31" y="33.4" width="3.4" height="4.2" rx="1.2" fill={f('win')} />
    {/* bunting across the front */}
    <path d="M7 23.6Q24 29 41 23.6" fill="none" stroke="#FFFFFF" strokeWidth=".7" opacity=".8" />
    {[10, 15, 20, 25, 30, 35].map((x, i) => <path key={x} d={`M${x} ${24.2 + Math.sin(((x - 7) / 34) * Math.PI) * 2.4}l1.4 2.2l1.4-2.2z`} fill={['#FF5A6E', '#FFD54A', '#4FD1C5', '#FF9F80'][i % 4]} />)}
    <Spark x={9} y={11} s={2.2} delay={0.2} /><Spark x={39} y={9} s={2.6} delay={1.1} />
  </>,

  /* Community & charity — three friends, a heart over them. */
  community: (u, f) => <>
    <defs>
      {ball(`${u}s1`, '#FFE8D2', '#F4BF94', '#C98352')}
      {ball(`${u}s2`, '#FADBC0', '#D99E70', '#A9663A')}
      {ball(`${u}s3`, '#FFE4CC', '#EDB287', '#BF7B4E')}
      {L(`${u}b1`, [[0, '#8AEBFF'], [1, '#1A92D0']], 0, 0, 1, 1)}
      {L(`${u}b2`, [[0, '#FFCB7E'], [1, '#EA720E']], 0, 0, 1, 1)}
      {L(`${u}b3`, [[0, '#FFABD0'], [1, '#D9307C']], 0, 0, 1, 1)}
      {ball(`${u}ht`, '#FFC2CF', '#FF4D6D', '#B5102E')}
    </defs>
    <Floor u={u} rx={17} />
    <path d="M6.4 38.4C6.4 30.6 9.6 26.8 14 26.8C18.4 26.8 21.6 30.6 21.6 38.4Z" fill={f('b1')} />
    <circle cx="14" cy="20.6" r="4.7" fill={f('s1')} />
    <path d="M9.3 20.2C9.3 15 18.7 15 18.7 20.2C17 18.2 11 18.2 9.3 20.2Z" fill="#3B2416" />
    <path d="M26.4 38.4C26.4 30.6 29.6 26.8 34 26.8C38.4 26.8 41.6 30.6 41.6 38.4Z" fill={f('b2')} />
    <circle cx="34" cy="20.6" r="4.7" fill={f('s2')} />
    <path d="M29.2 21.4C28.6 15 39.4 15 38.8 21.4V24.4C37.6 20 30.4 20 29.2 24.4Z" fill="#2A1B12" />
    <path d="M15.2 41.6C15.2 33.2 19 29.2 24 29.2C29 29.2 32.8 33.2 32.8 41.6Z" fill={f('b3')} />
    <circle cx="24" cy="22.6" r="5.5" fill={f('s3')} />
    <path d="M18.5 22C18.5 15.8 29.5 15.8 29.5 22C27.4 19.2 20.6 19.2 18.5 22Z" fill="#1E1410" />
    <path d="M18.4 33.4C19.4 31.6 20.8 30.6 22.4 30.2" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
    <g className="cx-beat">
      <path d="M24 13.6C20.4 11.2 19 9.6 19 7.8C19 6.4 20.1 5.4 21.4 5.4C22.5 5.4 23.4 6.1 24 7C24.6 6.1 25.5 5.4 26.6 5.4C27.9 5.4 29 6.4 29 7.8C29 9.6 27.6 11.2 24 13.6Z" fill={f('ht')} />
      <ellipse cx="21.6" cy="7.4" rx="1.1" ry=".7" fill="#FFFFFF" opacity=".8" />
    </g>
  </>,

  /* Industry & professional — a hard hat before its gear. */
  industry: (u, f) => <>
    <defs>
      {L(`${u}gr`, [[0, '#D6E6FA'], [0.5, '#86A3CE'], [1, '#3D5A8A']], 0, 0, 1, 1)}
      {side(`${u}y`, '#FFD43B', '#FFF0A0', '#FFC20E', '#C48200')}
      {L(`${u}br`, [[0, '#FFE680'], [1, '#D08A00']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={18} />
    <path d={gear(32.6, 15.4, 10.6, 8.2, 9, 3.2)} fill={f('gr')} fillRule="evenodd" />
    <path d="M9.6 34C9.6 24.6 15.8 18.4 24 18.4C32.2 18.4 38.4 24.6 38.4 34Z" fill={f('y')} />
    <path d="M21.6 18.8C21.2 24 21.2 29 21.6 34H26.4C26.8 29 26.8 24 26.4 18.8Z" fill="#FFE36B" stroke="#D49400" strokeWidth=".6" />
    <path d="M4.6 35.4C4.6 33.6 13 32.6 24 32.6C35 32.6 43.4 33.6 43.4 35.4C43.4 37.6 35 38.8 24 38.8C13 38.8 4.6 37.6 4.6 35.4Z" fill={f('br')} />
    <path d="M13.4 30C13.6 25.2 16.6 21.6 20 20.4" fill="none" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" />
  </>,

  /* Themed parties — a masquerade mask, feathers up. */
  themed: (u, f) => <>
    <defs>
      {L(`${u}m`, [[0, '#FFF4B0'], [0.4, '#FFD23F'], [0.8, '#E39A0C'], [1, '#9C5E00']], 0, 0, 1, 1)}
      {L(`${u}f1`, [[0, '#9AF8EA'], [1, '#0F9F92']], 0, 0, 1, 1)}
      {L(`${u}f2`, [[0, '#FFC0DE'], [1, '#D9307C']], 0, 0, 1, 1)}
    </defs>
    <Floor u={u} rx={15} />
    <path d="M15 23C8 18 6.4 11 9 5.6C13.6 9.6 16.8 15.6 15 23Z" fill={f('f1')} />
    <path d="M14.6 22.4C12.6 16 11 10.6 9.4 6.4" fill="none" stroke="#E8FFFB" strokeWidth=".6" />
    <path d="M17.6 22C14.6 15 15.8 8.4 20.2 4.6C21.8 10 21 16.6 17.6 22Z" fill={f('f2')} />
    <path d="M17.8 21.4C18 15 19 9.6 20 5.4" fill="none" stroke="#FFE6F2" strokeWidth=".6" />
    <path d="M36.6 31L40.4 42.4" stroke="#D99A0E" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 21C9 17.4 16 17.6 24 21.2C32 17.6 39 17.4 43 21C43.4 27.6 39.6 32.6 33.4 32.6C29.4 32.6 26.4 30.6 24 28C21.6 30.6 18.6 32.6 14.6 32.6C8.4 32.6 4.6 27.6 5 21Z" fill={f('m')} />
    <path d="M10.4 24.6C12.6 22.4 16.6 22.4 19.2 24.8C17.4 27.4 12.4 27.6 10.4 24.6Z" fill="#2E0B4A" />
    <path d="M37.6 24.6C35.4 22.4 31.4 22.4 28.8 24.8C30.6 27.4 35.6 27.6 37.6 24.6Z" fill="#2E0B4A" />
    <path d="M8.4 21.4C11.4 19.6 15.4 19.6 19.4 20.8" fill="none" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M9 29C11.6 30.8 14.6 30.8 17 29.4M39 29C36.4 30.8 33.4 30.8 31 29.4" fill="none" stroke="#FFF6C8" strokeWidth=".7" strokeLinecap="round" />
    <path d="M24 19.4L26 22L24 24.6L22 22Z" fill="#FF5FA8" />
    <path d="M24 19.4L25 20.8L24 22L23 20.8Z" fill="#FFD6EA" />
    <Spark x={39} y={10} s={3} />
  </>,

  /* Travel & outdoor — a tent under a pine, the sun up. */
  outdoor: (u, f) => <>
    <defs>
      {L(`${u}gd`, [[0, '#86E596'], [1, '#2A944A']], 0, 0, 0, 1)}
      {L(`${u}tr`, [[0, '#7BE896'], [0.5, '#2FB257'], [1, '#13722F']])}
      {L(`${u}sd`, [[0, '#FF9A3C'], [1, '#BD4A08']], 0, 0, 0, 1)}
      {side(`${u}fr`, '#FFAA4C', '#FFCB80', '#F57E18', '#C9560A')}
      {ball(`${u}sun`, '#FFF8C4', '#FFD84A', '#F59E0B')}
    </defs>
    <Floor u={u} rx={19} />
    <circle cx="9.6" cy="10" r="4" fill={f('sun')} />
    <ellipse cx="24" cy="40.4" rx="19.4" ry="3" fill={f('gd')} />
    <rect x="37.2" y="32" width="2.4" height="7.4" fill="#7A3E1A" />
    <path d="M38.4 23.6L45.6 35.2H31.2Z" fill={f('tr')} />
    <path d="M38.4 17.6L44.6 29.6H32.2Z" fill={f('tr')} />
    <path d="M38.4 11.6L43.4 23.6H33.4Z" fill={f('tr')} />
    <path d="M22 12.4L33.4 10.2L43 36.2L35.4 39.4Z" fill={f('sd')} />
    <path d="M7.4 39.4L22 12.4L35.4 39.4Z" fill={f('fr')} />
    <path d="M15.4 39.4L22 25.2L28.6 39.4Z" fill="#4A1C06" />
    <path d="M22 25.2L28.6 39.4H31.8L23.4 26Z" fill="#FFE2B6" />
    <path d="M22 12.4L33.4 10.2" stroke="#FFD9A0" strokeWidth="1" />
    <path d="M22 12.4V9" stroke="#6A3008" strokeWidth="1" />
    <path d="M22 9L25.4 10L22 11Z" fill="#FFE066" />
    <path d="M19.4 17.6L11.6 34.6" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
  </>,

  /* Virtual & hybrid — a laptop on a live call. */
  online: (u, f) => <>
    <defs>
      {L(`${u}fr`, [[0, '#4A5078'], [1, '#22263E']], 0, 0, 0, 1)}
      {L(`${u}sc`, [[0, '#8BEFFF'], [0.55, '#4AA8FF'], [1, '#5B5BFF']], 0, 0, 1, 1)}
      {L(`${u}bs`, [[0, '#F7F6FC'], [1, '#B6B9CC']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={19} />
    <rect x="8.6" y="8.2" width="30.8" height="22.4" rx="2.6" fill={f('fr')} />
    <rect x="10.6" y="10.2" width="26.8" height="18.2" rx="1.4" fill={f('sc')} />
    <path d="M10.6 10.2H22.4L13.2 28.4H10.6Z" fill="#FFFFFF" opacity=".16" />
    <circle cx="24" cy="19.4" r="5.2" fill="#FFFFFF" opacity=".95" />
    <path d="M22.4 16.6L27.2 19.4L22.4 22.2Z" fill="#4A6BFF" />
    <rect x="12.4" y="11.8" width="7.4" height="3" rx="1.5" fill="#FF3B5C" />
    <circle cx="14.2" cy="13.3" r=".7" fill="#FFFFFF" />
    <rect x="15.6" y="12.8" width="3.2" height="1" rx=".5" fill="#FFFFFF" />
    <rect x="8.6" y="30" width="30.8" height="1.4" fill="#1A1D32" />
    <path d="M5.2 37.6L9.4 31.2H38.6L42.8 37.6C42.8 38.8 41.8 39.6 40.6 39.6H7.4C6.2 39.6 5.2 38.8 5.2 37.6Z" fill={f('bs')} />
    {[32.6, 34.2, 35.8].map((y, i) => <path key={y} d={`M${11 - i * 1.1} ${y}H${37 + i * 1.1}`} stroke="#9DA1B8" strokeOpacity=".7" strokeWidth=".9" strokeDasharray="1.6 .9" />)}
    <rect x="20" y="36.8" width="8" height="1.6" rx=".6" fill="#D0D2E0" />
  </>,

  /* Special occasions — a gift box, bow on top. */
  special: (u, f) => <>
    <defs>
      {side(`${u}fr`, '#FF5A82', '#FF8FAC', '#EA2E5E', '#B0153D')}
      {L(`${u}sd`, [[0, '#C21848'], [1, '#860A2E']], 0, 0, 0, 1)}
      {L(`${u}lt`, [[0, '#FFA8BF'], [1, '#FF5C84']], 0, 0, 0, 1)}
      {side(`${u}g`, '#FFE070', '#FFF6C8', '#F0B21E', '#C98A00')}
    </defs>
    <Floor u={u} rx={17} />
    <path d="M33 22.6L40 19.8V37.6L33 40.4Z" fill={f('sd')} />
    <rect x="8.6" y="22.6" width="24.4" height="17.8" fill={f('fr')} />
    <path d="M7 17.6L14.4 14.8H41.8L34.4 17.6Z" fill={f('lt')} />
    <rect x="7" y="17.6" width="27.4" height="5.6" rx=".6" fill={f('fr')} />
    <path d="M34.4 17.6L41.8 14.8V20.4L34.4 23.2Z" fill={f('sd')} />
    <rect x="18.6" y="17.6" width="4.8" height="22.8" fill={f('g')} />
    <path d="M18.6 17.6H23.4L30.8 14.8H26Z" fill="#FFF2B0" />
    <path d="M33 30.4L40 27.6V31.2L33 34Z" fill="#D99A0E" />
    <path d="M24.6 14.4C20.4 8.4 14.6 9.6 16 12.6C17 14.8 21 15 24.6 14.4Z" fill={f('g')} />
    <path d="M24.6 14.4C28.8 8.4 34.6 9.6 33.2 12.6C32.2 14.8 28.2 15 24.6 14.4Z" fill="#F0B21E" />
    <ellipse cx="24.6" cy="14.2" rx="2.3" ry="1.7" fill="#FFD24A" />
    <path d="M11 25V37.6" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth="1.8" strokeLinecap="round" />
    <Spark x={40.4} y={8} s={3} />
    <Spark x={7.4} y={11} s={2} delay={1.1} />
  </>,

  /* All — four keycaps, one of each colour family. */
  all: (u, f) => <>
    <defs>
      {L(`${u}a`, [[0, '#FFC6E0'], [1, '#FF5FA3']], 0, 0, 1, 1)}
      {L(`${u}b`, [[0, '#FFF2A8'], [1, '#FFBE1F']], 0, 0, 1, 1)}
      {L(`${u}c`, [[0, '#BDF6FF'], [1, '#2FBCEA']], 0, 0, 1, 1)}
      {L(`${u}d`, [[0, '#C2F7CC'], [1, '#34C463']], 0, 0, 1, 1)}
    </defs>
    <Floor u={u} rx={15} />
    {[[7.6, 7, 'a', '#B8165E'], [25, 7, 'b', '#C08600'], [7.6, 24.4, 'c', '#0B76A8'], [25, 24.4, 'd', '#157A34']].map(([x, y, k, d]) => (
      <g key={k}>
        <rect x={x} y={y + 1.8} width="15.4" height="15.4" rx="4.6" fill={d} />
        <rect x={x} y={y} width="15.4" height="15.4" rx="4.6" fill={f(k)} />
        <rect x={x + 2.2} y={y + 1.6} width="9" height="3.6" rx="1.8" fill="#FFFFFF" opacity=".5" />
      </g>
    ))}
  </>,

  /* ── Service families ──────────────────────────────────────────── */

  /* Food & dining — the chef's toque. */
  'svc:food': (u, f) => <>
    <defs>
      {ball(`${u}p`, '#FFFFFF', '#F1EEF8', '#C2BAD8')}
      {side(`${u}b`, '#E6E1F0', '#FFFFFF', '#D2CBE2', '#A49BBE')}
    </defs>
    <Floor u={u} rx={13} />
    <circle cx="14.4" cy="21.6" r="6.6" fill={f('p')} />
    <circle cx="33.6" cy="21.6" r="6.6" fill={f('p')} />
    <circle cx="24" cy="16" r="8.8" fill={f('p')} />
    <ellipse cx="24" cy="24.6" rx="9" ry="6.4" fill={f('p')} />
    <path d="M14 27.4V37.4A10 2.6 0 0 0 34 37.4V27.4Z" fill={f('b')} />
    <ellipse cx="24" cy="27.4" rx="10" ry="2.4" fill="#E2DCEE" />
    {[18.2, 22, 26, 29.8].map(x => <path key={x} d={`M${x} 29.4V39`} stroke="#C2BAD6" strokeWidth=".7" />)}
    <ellipse cx="20.4" cy="11.4" rx="3" ry="2" fill="#FFFFFF" transform="rotate(-30 20.4 11.4)" />
    <Spark x={40} y={9} s={2.6} c="#FFF5B0" />
  </>,

  /* Venue & décor — three glossy balloons. */
  'svc:space': (u, f) => <>
    <defs>
      {ball(`${u}pk`, '#FFD4E8', '#FF7DB8', '#C2185B')}
      {ball(`${u}yl`, '#FFF8CA', '#FFD84A', '#CC8600')}
      {ball(`${u}cy`, '#D8FAFF', '#5AD8FF', '#0E7FB8')}
    </defs>
    <Floor u={u} rx={9} />
    <path d="M16 25C17 31 21 36 24 41.6M31.4 24C30.6 31 27 36 24 41.6M24 30.6V41.6" fill="none" stroke="#F1ECFA" strokeWidth=".7" />
    <g className="cx-g3-bob" style={{ animationDelay: '.4s' }}>
      <ellipse cx="31.6" cy="14.6" rx="7.4" ry="8.6" fill={f('cy')} />
      <path d="M31.6 23.2L30.4 25H32.8Z" fill="#0E7FB8" />
      <ellipse cx="28.8" cy="10.6" rx="2" ry="3" fill="#FFFFFF" opacity=".75" transform="rotate(20 28.8 10.6)" />
    </g>
    <g className="cx-g3-bob" style={{ animationDelay: '1.1s' }}>
      <ellipse cx="16" cy="15.6" rx="7.4" ry="8.6" fill={f('yl')} />
      <path d="M16 24.2L14.8 26H17.2Z" fill="#CC8600" />
      <ellipse cx="13.2" cy="11.6" rx="2" ry="3" fill="#FFFFFF" opacity=".75" transform="rotate(20 13.2 11.6)" />
    </g>
    <g className="cx-g3-bob">
      <ellipse cx="24" cy="21" rx="8.2" ry="9.4" fill={f('pk')} />
      <path d="M24 30.4L22.7 32.2H25.3Z" fill="#C2185B" />
      <ellipse cx="20.8" cy="16.6" rx="2.2" ry="3.4" fill="#FFFFFF" opacity=".78" transform="rotate(20 20.8 16.6)" />
    </g>
  </>,

  /* Moments · photo & film — a camera, lens catching the light. */
  'svc:media': (u, f) => <>
    <defs>
      {side(`${u}b`, '#FF8E6A', '#FFB59C', '#F0623A', '#AF3816')}
      {L(`${u}t`, [[0, '#FFFFFF'], [1, '#C9C5D8']], 0, 0, 0, 1)}
      {L(`${u}r`, [[0, '#FFFFFF'], [1, '#8C87A3']], 0, 0, 1, 1)}
      {R(`${u}gl`, [[0, '#86AEFF'], [0.4, '#3B4FA8'], [1, '#120E2A']], 0.38, 0.32, 0.7, 0.34, 0.28)}
    </defs>
    <Floor u={u} rx={18} />
    <path d="M16 15.4L18.6 10.8H29.4L32 15.4Z" fill="#B4AFC8" />
    <rect x="34" y="12.4" width="5" height="3" rx="1" fill="#3A3550" />
    <path d="M6 20.4C6 17.6 8.2 15.4 11 15.4H37C39.8 15.4 42 17.6 42 20.4V33.6C42 36 40 38 37.6 38H10.4C8 38 6 36 6 33.6Z" fill={f('b')} />
    <path d="M6 20.4C6 17.6 8.2 15.4 11 15.4H37C39.8 15.4 42 17.6 42 20.4V21.6H6Z" fill={f('t')} />
    <rect x="8.4" y="16.8" width="5" height="3" rx=".8" fill="#FFF3B0" />
    <circle cx="24" cy="28.4" r="9.8" fill={f('r')} />
    <circle cx="24" cy="28.4" r="7.9" fill="#26203C" />
    <circle cx="24" cy="28.4" r="6.1" fill={f('gl')} />
    <circle cx="24" cy="28.4" r="2.4" fill="#0A0818" />
    <ellipse cx="21.4" cy="25.8" rx="2.1" ry="1.4" fill="#FFFFFF" opacity=".85" transform="rotate(-30 21.4 25.8)" />
    <path d="M27.6 31.6A4.8 4.8 0 0 1 25 33" fill="none" stroke="#7FE7FF" strokeWidth=".9" strokeLinecap="round" />
    <path d="M8.6 24V34.4" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth="1.6" strokeLinecap="round" />
  </>,

  /* Music & stage — headphones, a note in the air. */
  'svc:stage': (u, f) => <>
    <defs>
      {L(`${u}bd`, [[0, '#FF8AC4'], [0.5, '#FF4F9A'], [1, '#C2186A']], 0, 0, 1, 1)}
      {side(`${u}c`, '#E8E4F4', '#FFFFFF', '#C9C2DE', '#938AB2')}
      {L(`${u}cu`, [[0, '#FF7DB8'], [1, '#C2185B']], 0, 0, 0, 1)}
    </defs>
    <Floor u={u} rx={16} />
    <path d="M9.4 28.6C9.4 16.4 15.8 9 24 9C32.2 9 38.6 16.4 38.6 28.6" fill="none" stroke={f('bd')} strokeWidth="4.4" strokeLinecap="round" />
    <path d="M11.8 23.4C13 16.4 17.8 11.8 24 11.4" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1" strokeLinecap="round" />
    <rect x="5.4" y="25" width="10.4" height="14.6" rx="4.8" fill={f('c')} />
    <rect x="12.8" y="26.4" width="4.2" height="11.8" rx="2" fill={f('cu')} />
    <circle cx="10.4" cy="32.2" r="2.2" fill="#5AE0FF" />
    <rect x="32.2" y="25" width="10.4" height="14.6" rx="4.8" fill={f('c')} />
    <rect x="31" y="26.4" width="4.2" height="11.8" rx="2" fill={f('cu')} />
    <circle cx="37.6" cy="32.2" r="2.2" fill="#5AE0FF" />
    <g className="cx-g3-bob">
      <path d="M22 26.6V18.6L28.4 17.2V24.8" fill="none" stroke="#FFE066" strokeWidth="1.3" strokeLinejoin="round" />
      <ellipse cx="20.8" cy="26.8" rx="1.9" ry="1.5" fill="#FFE066" transform="rotate(-20 20.8 26.8)" />
      <ellipse cx="27.2" cy="25" rx="1.9" ry="1.5" fill="#FFE066" transform="rotate(-20 27.2 25)" />
    </g>
  </>,

  /* Beauty & rituals — a lotus opening on water. */
  'svc:rituals': (u, f) => <>
    <defs>
      {L(`${u}pb`, [[0, '#FFD6E8'], [0.5, '#FF7DB8'], [1, '#C81C68']], 0, 0, 0, 1)}
      {L(`${u}pf`, [[0, '#FFF0F6'], [0.6, '#FFA6CE'], [1, '#E2478C']], 0, 0, 0, 1)}
      {L(`${u}lf`, [[0, '#9AF2AC'], [1, '#1C9446']], 0, 0, 0, 1)}
      {R(`${u}gw`, [[0, '#FFE066', 0.9], [1, '#FFE066', 0]])}
    </defs>
    <Floor u={u} rx={17} />
    <ellipse cx="24" cy="38.8" rx="16.4" ry="3.2" fill="#7FD8FF" opacity=".55" />
    <ellipse className="cx-glow" cx="24" cy="22" rx="10" ry="10" fill={f('gw')} />
    <path d="M4.8 34C9 28.6 17 28.6 22 33.6C16 37 9 37.4 4.8 34Z" fill={f('lf')} />
    <path d="M43.2 34C39 28.6 31 28.6 26 33.6C32 37 39 37.4 43.2 34Z" fill={f('lf')} />
    <path d="M24 8C29 14 29.4 22 24 30C18.6 22 19 14 24 8Z" fill={f('pb')} />
    <path d="M24 30C15 28.6 9.6 22 9.6 14.6C16.6 15.6 22.4 21.4 24 30Z" fill={f('pb')} />
    <path d="M24 30C33 28.6 38.4 22 38.4 14.6C31.4 15.6 25.6 21.4 24 30Z" fill={f('pb')} />
    <path d="M24 32.6C16 33.2 9.4 29.8 7.4 23.8C14 22.6 20.6 25.8 24 32.6Z" fill={f('pf')} />
    <path d="M24 32.6C32 33.2 38.6 29.8 40.6 23.8C34 22.6 27.4 25.8 24 32.6Z" fill={f('pf')} />
    <path d="M24 32.8C20.6 29.2 20.6 23.8 24 19.8C27.4 23.8 27.4 29.2 24 32.8Z" fill={f('pf')} />
    <path d="M24 12.4V26M12.6 17.6C16.4 20.4 19.6 24 21.6 27.6" fill="none" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth=".7" strokeLinecap="round" />
  </>,

  /* Planning — a clipboard, two of three ticked. */
  'svc:plan': (u, f) => <>
    <defs>
      {side(`${u}w`, '#E3A160', '#F7C894', '#C9813E', '#9A5622')}
      {L(`${u}pp`, [[0, '#FFFFFF'], [1, '#ECE8F4']], 0, 0, 0, 1)}
      {L(`${u}cl`, [[0, '#FFFFFF'], [0.5, '#D2CEE0'], [1, '#8E89A6']])}
      {ball(`${u}ok`, '#B6F7C8', '#2FC26A', '#127A3A')}
    </defs>
    <Floor u={u} rx={14} />
    <rect x="10.6" y="10.4" width="29" height="32" rx="3.6" fill="#7A4216" />
    <rect x="9.4" y="9" width="29" height="32" rx="3.6" fill={f('w')} />
    <rect x="12.6" y="13.4" width="22.6" height="25" rx="1.6" fill={f('pp')} />
    <path d="M17.4 13.8V10.8C17.4 9.6 18.4 8.6 19.6 8.6H21C21.4 6.4 22.6 5.2 24 5.2C25.4 5.2 26.6 6.4 27 8.6H28.4C29.6 8.6 30.6 9.6 30.6 10.8V13.8Z" fill={f('cl')} />
    <circle cx="24" cy="8.2" r="1" fill="#6E6888" />
    {[19.6, 26, 32.4].map((y, i) => (
      <g key={y}>
        {i < 2
          ? <><circle cx="17.6" cy={y} r="2.5" fill={f('ok')} /><path d={`M16.4 ${y}l.9 .9 1.7-1.9`} fill="none" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></>
          : <circle cx="17.6" cy={y} r="2.3" fill="#FFFFFF" stroke="#C9C2DC" strokeWidth="1" />}
        <rect x="21.6" y={y - 1.5} width="11" height="1.8" rx=".9" fill={i < 2 ? '#BDB4D4' : '#DCD6E8'} />
        <rect x="21.6" y={y + 0.8} width="6.6" height="1.2" rx=".6" fill="#E4DFEE" />
      </g>
    ))}
  </>,

  /* Guests & safety — a shield, checked. */
  'svc:guests': (u, f) => <>
    <defs>
      {side(`${u}s`, '#5DB6FF', '#94D4FF', '#3A8EF5', '#1646B2')}
    </defs>
    <Floor u={u} rx={12} />
    <path d="M25 7L39.6 12.4V23.4C39.6 32 33.4 38.6 25 42.4C16.6 38.6 10.4 32 10.4 23.4V12.4Z" fill="#0D3586" />
    <path d="M24 6L38.6 11.4V22.4C38.6 31 32.4 37.6 24 41.4C15.6 37.6 9.4 31 9.4 22.4V11.4Z" fill={f('s')} stroke="#FFD24A" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M24 7.6L37 12.4V22.4C37 30 31.6 36 24 39.6Z" fill="#0B2F80" opacity=".2" />
    <path d="M17.4 24.4L22 29L31 19.4" fill="none" stroke="#0E3A8A" strokeOpacity=".35" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17.4 23.4L22 28L31 18.4" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.6 13.6L23.4 9.6" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.4" strokeLinecap="round" />
  </>,

  /* Gifts & print — an invitation leaving its envelope, sealed in wax. */
  'svc:gifts': (u, f) => <>
    <defs>
      {L(`${u}e`, [[0, '#FFF3DC'], [1, '#E7CC9A']], 0, 0, 0, 1)}
      {side(`${u}fp`, '#FFF4E0', '#FFFFFF', '#F1DDB6', '#D9BC86')}
      {L(`${u}cd`, [[0, '#FFE4EF'], [1, '#FFB0CE']], 0, 0, 0, 1)}
      {ball(`${u}wx`, '#FF9C92', '#E53935', '#8E1818')}
    </defs>
    <Floor u={u} rx={18} />
    <path d="M6 16.4L24 5.6L42 16.4Z" fill="#E9CF9F" />
    <g transform="rotate(-5 24 16)">
      <rect x="13" y="7" width="22" height="19" rx="1.6" fill={f('cd')} />
      <rect x="16.4" y="10.6" width="11" height="1.6" rx=".8" fill="#E2478C" />
      <rect x="16.4" y="13.8" width="15" height="1.2" rx=".6" fill="#F4A3C4" />
    </g>
    <rect x="6" y="16" width="36" height="23.4" rx="2.4" fill={f('e')} />
    <path d="M6 18.4L24 30.4L42 18.4V37C42 38.3 40.9 39.4 39.6 39.4H8.4C7.1 39.4 6 38.3 6 37Z" fill={f('fp')} />
    <path d="M6.6 38.6L19.4 27.6M41.4 38.6L28.6 27.6" stroke="#DCC08A" strokeWidth=".8" />
    <circle cx="24" cy="30.4" r="4.8" fill={f('wx')} />
    <circle cx="24" cy="30.4" r="3.4" fill="none" stroke="#FFB4AD" strokeWidth=".6" />
    <path d="M24 32.4C22.3 31.2 21.6 30.4 21.6 29.6C21.6 28.9 22.1 28.4 22.8 28.4C23.3 28.4 23.7 28.7 24 29.2C24.3 28.7 24.7 28.4 25.2 28.4C25.9 28.4 26.4 28.9 26.4 29.6C26.4 30.4 25.7 31.2 24 32.4Z" fill="#FFD0CB" />
  </>,

  /* Power, transport & rentals — the yellow guest van, moving. */
  'svc:move': (u, f) => <>
    <defs>
      {L(`${u}b`, [[0, '#FFF09A'], [0.35, '#FFD93D'], [0.8, '#FFB300'], [1, '#C98200']], 0, 0, 1, 1)}
      {L(`${u}gl`, [[0, '#E6FBFF'], [1, '#6FC8F0']], 0, 0, 1, 1)}
      {ball(`${u}hb`, '#FFFFFF', '#D2CEE0', '#7E7898')}
    </defs>
    <Floor u={u} rx={19} />
    <path d="M1 21.4H4.4M0 25.6H3.6M1.4 29.8H4" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M6 33.6V19C6 16.2 8.2 14 11 14H31.4C33.4 14 35.2 15 36.2 16.8L41.6 25.4C42.4 26.6 42.8 28 42.8 29.4V33.6C42.8 35 41.8 36 40.4 36H8.4C7 36 6 35 6 33.6Z" fill={f('b')} />
    <path d="M8 15.8H31" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="9" y="17.4" width="7.4" height="6.4" rx="1.2" fill={f('gl')} />
    <rect x="18.2" y="17.4" width="7.4" height="6.4" rx="1.2" fill={f('gl')} />
    <path d="M27.4 17.4H31.4C32.4 17.4 33.2 17.9 33.8 18.8L37.8 24.6V25H27.4Z" fill={f('gl')} />
    <path d="M10.4 23.4L14.6 17.6M19.6 23.4L23.8 17.6M29 24.6L32.6 17.8" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth=".9" />
    <rect x="6" y="27" width="36.8" height="2.4" fill="#FF6B4A" />
    <path d="M26.4 17.4V34" stroke="#C98A00" strokeWidth=".7" />
    <rect x="23.4" y="30.4" width="2.2" height=".9" rx=".45" fill="#8A5A00" />
    <rect x="41" y="30" width="1.8" height="2.4" rx=".6" fill="#FFFDE0" />
    <rect x="6" y="20" width="1.4" height="3.4" rx=".6" fill="#FF3B3B" />
    <rect x="4.6" y="33.6" width="39.4" height="2.8" rx="1.4" fill="#4A4562" />
    {[13.4, 34.6].map(x => (
      <g key={x}>
        <circle cx={x} cy="36.8" r="5.6" fill="#B07400" />
        <circle cx={x} cy="36.8" r="4.6" fill="#24202F" />
        <circle cx={x} cy="36.8" r="2.1" fill={f('hb')} />
        <circle cx={x} cy="36.8" r=".8" fill="#3A3550" />
      </g>
    ))}
  </>,
}

/** Every mark this file draws — callers ask before they render. */
export const hasGlyph3D = id => Boolean(MARKS[id])

/**
 * One modelled mark, no plate. `size` is the box it fills; `lift` floats
 * it a touch on its shadow (the chosen chip).
 */
export default function Glyph3D({ id, size = 48, className = '', title = null, lift = false }) {
  const u = 'g3' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const draw = MARKS[id]
  if (!draw) return null
  const f = k => `url(#${u}${k})`
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} focusable="false" className={'shrink-0 overflow-visible ' + className}
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} aria-label={title ?? undefined}>
      <defs>{R(`${u}floor`, [[0, '#12002E', 0.55], [0.6, '#12002E', 0.22], [1, '#12002E', 0]])}</defs>
      <g style={lift ? { transform: 'translateY(-1.5px)', transition: 'transform .25s' } : { transition: 'transform .25s' }}>{draw(u, f)}</g>
    </svg>
  )
}

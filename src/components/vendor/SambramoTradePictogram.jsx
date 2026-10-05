import React, { useId } from 'react'
import './SambramoTradePictogram.css'

const PALETTES = [
  ['#C084FC', '#6D28D9', '#F5D0FE'],
  ['#A78BFA', '#4338CA', '#DDD6FE'],
  ['#67E8F9', '#0369A1', '#CFFAFE'],
  ['#FDA4AF', '#BE185D', '#FFE4E6'],
  ['#FDE68A', '#D97706', '#FFFBEB'],
  ['#86EFAC', '#15803D', '#DCFCE7'],
]

function paletteForTrade(trade) {
  let hash = 0
  for (const ch of String(trade ?? '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTES[hash % PALETTES.length]
}

function BaseSvg({ uid, children }) {
  const grad = uid + '-g'
  const grad2 = uid + '-g2'
  return (
    <svg className="sambramo-trade-art" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={grad} x1="14" y1="10" x2="88" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sam-highlight)" />
          <stop offset=".34" stopColor="var(--sam-a)" />
          <stop offset="1" stopColor="var(--sam-b)" />
        </linearGradient>
        <linearGradient id={grad2} x1="24" y1="18" x2="82" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".96" />
          <stop offset=".42" stopColor="#fff" stopOpacity=".3" />
          <stop offset="1" stopColor="#17052F" stopOpacity=".18" />
        </linearGradient>
        <filter id={uid + '-shadow'} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#2A085C" floodOpacity=".26" />
        </filter>
      </defs>
      <g filter={'url(#' + uid + '-shadow)'}>{children('url(#' + grad + ')', 'url(#' + grad2 + ')')}</g>
    </svg>
  )
}

const ICONS = {
  'Anchor & MC': ({a,b,g,g2}) => <>
    <path d="M50 20v44M35 34h30M35 64h30M25 52c0 13 11 23 25 23s25-10 25-23" fill="none" stroke="var(--sam-highlight)" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="50" cy="15" r="7" fill={g}/>
    <path d="M28 76c7 5 14 7 22 7s15-2 22-7" fill="none" stroke={b} strokeWidth="5" strokeLinecap="round"/>
  </>,
  'Bar & Beverages': ({a,b,g,g2}) => <>
    <path d="M27 27h46l-5 24c-2 10-9 16-18 16s-16-6-18-16z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M50 67v15M39 84h22" stroke={b} strokeWidth="6" strokeLinecap="round"/>
    <path d="M34 43c9-6 19 8 31-2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    <path d="M72 18c7 3 9 8 8 14M78 16c1-5 4-8 8-10" fill="none" stroke={a} strokeWidth="3.2" strokeLinecap="round"/>
  </>,
  'Bridal Makeup & Hair': ({a,b,g,g2}) => <>
    <ellipse cx="50" cy="51" rx="22" ry="27" fill={g2}/>
    <path d="M28 51c-4-17 6-30 22-31 17 1 26 14 22 31-5-6-10-10-15-15-8 5-17 10-29 15z" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="44" cy="52" r="2.4" fill={b}/><circle cx="57" cy="52" r="2.4" fill={b}/>
    <path d="M46 61c3 2 7 2 10 0" fill="none" stroke={b} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M71 69c8 0 13 5 13 12H58c0-7 5-12 13-12z" fill={a}/>
    <path d="M67 62h9v10h-9z" fill={g2} stroke={b} strokeWidth="2"/>
  </>,
  'Cake & Desserts': ({a,b,g,g2}) => <>
    <path d="M25 48h50l-4 19H29z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M22 68h56v8H22z" fill={a}/>
    <path d="M33 39h34v10H33z" fill={g2} stroke={b} strokeWidth="3"/>
    <path d="M42 29c2-7 6-9 8-9s6 2 8 9" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round"/>
    <circle cx="50" cy="22" r="4" fill={a}/>
    <path d="M32 52c5 4 8 4 12 0 5 4 8 4 13 0 4 4 7 4 11 0" fill="none" stroke="#fff" strokeWidth="3"/>
  </>,
  'Catering & Food': ({a,b,g,g2}) => <>
    <path d="M25 49c0-9 11-16 25-16s25 7 25 16v9H25z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M20 58h60v9H20z" fill={a}/>
    <path d="M31 67v14M69 67v14" stroke={b} strokeWidth="6" strokeLinecap="round"/>
    <path d="M38 42c7-7 17-7 24 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    <path d="M49 21c0 4-4 4-4 8M59 23c0 3-3 4-3 7" fill="none" stroke={a} strokeWidth="2.8" strokeLinecap="round"/>
  </>,
  'DJ & Music': ({a,b,g,g2}) => <>
    <rect x="18" y="29" width="64" height="45" rx="8" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="35" cy="51" r="11" fill={g2} stroke={b} strokeWidth="3"/><circle cx="35" cy="51" r="4" fill={b}/>
    <circle cx="65" cy="51" r="11" fill={g2} stroke={b} strokeWidth="3"/><circle cx="65" cy="51" r="4" fill={b}/>
    <path d="M47 42h7v19h-7zM49 35h3M49 64h3" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    <path d="M26 79h48" stroke={a} strokeWidth="5" strokeLinecap="round"/>
  </>,
  'Decoration & Floral': ({a,b,g,g2}) => <>
    <path d="M20 74V46c0-14 13-25 30-25s30 11 30 25v28" fill="none" stroke={b} strokeWidth="6" strokeLinecap="round"/>
    <path d="M23 44c8-12 15-16 27-16s19 4 27 16" fill="none" stroke={g} strokeWidth="9" strokeLinecap="round"/>
    <circle cx="28" cy="39" r="6" fill={a}/><circle cx="40" cy="28" r="6" fill="#fff"/>
    <circle cx="52" cy="25" r="6" fill={a}/><circle cx="65" cy="30" r="6" fill="#fff"/><circle cx="73" cy="40" r="6" fill={a}/>
    <path d="M20 74h60" stroke={b} strokeWidth="5" strokeLinecap="round"/>
  </>,
  'End-to-End Event Logistics': ({a,b,g,g2}) => <>
    <path d="M14 44h45v26H14zM59 51h15l11 11v8H59z" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="30" cy="73" r="8" fill={b}/><circle cx="73" cy="73" r="8" fill={b}/>
    <circle cx="30" cy="73" r="3" fill="#fff"/><circle cx="73" cy="73" r="3" fill="#fff"/>
    <path d="M63 25c0-8 6-14 14-14s14 6 14 14c0 11-14 20-14 20S63 36 63 25z" fill={a} stroke={b} strokeWidth="3"/>
    <circle cx="77" cy="25" r="5" fill="#fff"/>
    <path d="M17 34h24l-7-8" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </>,
  'Event Equipment Rental': ({a,b,g,g2}) => <>
    <rect x="19" y="27" width="62" height="45" rx="7" fill={g} stroke={b} strokeWidth="3"/>
    <rect x="27" y="35" width="46" height="23" rx="4" fill={g2} stroke={b} strokeWidth="2"/>
    <circle cx="36" cy="77" r="6" fill={b}/><circle cx="64" cy="77" r="6" fill={b}/>
    <path d="M34 46h10M49 46h14M34 52h28" stroke={b} strokeWidth="3" strokeLinecap="round"/>
  </>,
  'Event Lighting': ({a,b,g,g2}) => <>
    <path d="M29 31h42L60 55H40z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M42 55v21M58 55v21M36 78h28" stroke={b} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="50" cy="39" r="9" fill={g2} stroke={a} strokeWidth="3"/>
    <path d="M77 28l7-5M78 38h8M77 48l7 5" stroke={a} strokeWidth="4" strokeLinecap="round"/>
  </>,
  'Event Materials Supplier': ({a,b,g,g2}) => <>
    <path d="M25 34h50v36H25z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M25 46h50" stroke={a} strokeWidth="4"/>
    <path d="M33 54h15v10H33zM53 54h15v10H53z" fill={g2} stroke={b} strokeWidth="2"/>
    <path d="M33 27h34" stroke={a} strokeWidth="6" strokeLinecap="round"/>
  </>,
  'Gifts & Favours': ({a,b,g,g2}) => <>
    <path d="M21 43h58v33H21z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M50 43v33M21 54h58" stroke={a} strokeWidth="6"/>
    <path d="M50 43c-8-8-20-13-20-4 0 6 8 8 20 4zm0 0c8-8 20-13 20-4 0 6-8 8-20 4z" fill={g2} stroke={b} strokeWidth="2"/>
    <path d="M20 80h60" stroke={b} strokeWidth="4" strokeLinecap="round"/>
  </>,
  'Guest Services': ({a,b,g,g2}) => <>
    <path d="M25 51h50v24H25z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M20 51h60" stroke={a} strokeWidth="6" strokeLinecap="round"/>
    <path d="M38 29h24l4 22H34z" fill={g2} stroke={b} strokeWidth="3"/>
    <circle cx="50" cy="39" r="5" fill={a}/>
    <path d="M50 41v6M47 47h6" stroke={b} strokeWidth="3" strokeLinecap="round"/>
  </>,
  'Invitation & Printing': ({a,b,g,g2}) => <>
    <path d="M18 38l32-17 32 17-32 17z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M18 38v33l32 17 32-17V38" fill={g2} stroke={b} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M50 55v31" stroke={a} strokeWidth="4"/>
    <path d="M34 60h10M34 67h8" stroke={a} strokeWidth="3" strokeLinecap="round"/>
  </>,
  'Live Entertainment': ({a,b,g,g2}) => <>
    <path d="M31 29v38c0 7-5 12-11 12-8 0-10-10-4-14 5-3 10 0 15 0" fill="none" stroke={b} strokeWidth="6" strokeLinecap="round"/>
    <path d="M31 29l35-9v32c0 7-5 12-11 12-8 0-10-10-4-14 5-3 10 0 15 0" fill="none" stroke={a} strokeWidth="6" strokeLinecap="round"/>
    <path d="M73 22c6 3 8 8 8 13M79 17c5 2 8 6 8 11" fill="none" stroke={g} strokeWidth="4" strokeLinecap="round"/>
  </>,
  'Loading & Unloading Crew': ({a,b,g,g2}) => <>
    <path d="M18 50h31v27H18zM49 57h22l11 11v9H49z" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="31" cy="80" r="6" fill={b}/><circle cx="67" cy="80" r="6" fill={b}/>
    <path d="M35 43l11 8 7-8 8 8 7-8" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/>
    <rect x="44" y="35" width="17" height="15" rx="3" fill={g2} stroke={b} strokeWidth="2"/>
  </>,
  'Medium / Large Goods Vehicle': ({a,b,g,g2}) => <>
    <path d="M12 40h57v30H12zM69 48h13l10 10v12H69z" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="28" cy="75" r="9" fill={b}/><circle cx="76" cy="75" r="9" fill={b}/>
    <circle cx="28" cy="75" r="4" fill="#fff"/><circle cx="76" cy="75" r="4" fill="#fff"/>
    <path d="M75 52h8l6 7H75z" fill={g2}/>
  </>,
  'Mehendi Artist': ({a,b,g,g2}) => <>
    <path d="M50 22c-7 1-12 8-14 16-3 10 0 23 6 31 5 6 14 5 19-1 5-7 7-17 4-26-3-10-8-18-15-20z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M49 36c4 4 5 8 5 12-2 5-3 10-3 15M44 43c-3 2-5 5-5 9M59 45c3 2 5 5 5 9M45 58c3-2 8-2 11 0" fill="none" stroke={a} strokeWidth="2.7" strokeLinecap="round"/>
    <circle cx="49" cy="37" r="3" fill="#fff"/><circle cx="44" cy="43" r="2.5" fill="#fff"/><circle cx="59" cy="45" r="2.5" fill="#fff"/>
    <path d="M74 29c8 4 10 11 8 18" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round"/>
  </>,
  'Mini Truck / Pickup': ({a,b,g,g2}) => <>
    <path d="M13 48h43v22H13zM56 54h14l12 10v6H56z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M59 57h9l7 7H59z" fill={g2}/>
    <circle cx="27" cy="74" r="8" fill={b}/><circle cx="68" cy="74" r="8" fill={b}/>
    <circle cx="27" cy="74" r="3.5" fill="#fff"/><circle cx="68" cy="74" r="3.5" fill="#fff"/>
  </>,
  'Passenger Transport': ({a,b,g,g2}) => <>
    <rect x="14" y="35" width="72" height="37" rx="9" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M25 45h16v12H25zM45 45h13v12H45zM61 45h16v12H61z" fill={g2}/>
    <circle cx="30" cy="75" r="8" fill={b}/><circle cx="72" cy="75" r="8" fill={b}/>
    <path d="M22 34l5-10h43l6 10" fill="none" stroke={a} strokeWidth="5" strokeLinejoin="round"/>
  </>,
  'Photography': ({a,b,g,g2}) => <>
    <rect x="17" y="33" width="66" height="40" rx="8" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M30 33l5-8h15l5 8" fill={a} stroke={b} strokeWidth="3"/>
    <circle cx="50" cy="53" r="16" fill={g2} stroke={b} strokeWidth="3"/>
    <circle cx="50" cy="53" r="9" fill={b}/><circle cx="50" cy="53" r="4" fill="#fff"/>
    <circle cx="73" cy="41" r="3.5" fill="#fff"/>
  </>,
  'Power & Cooling': ({a,b,g,g2}) => <>
    <rect x="20" y="33" width="60" height="39" rx="6" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="50" cy="52" r="13" fill={g2} stroke={b} strokeWidth="3"/>
    <path d="M50 43v18M41 52h18M44 46l12 12M56 46L44 58" stroke={b} strokeWidth="2.3" strokeLinecap="round"/>
    <path d="M19 78h63" stroke={a} strokeWidth="5" strokeLinecap="round"/>
    <path d="M77 27c6-4 11 0 11 6M85 24c3-3 8-1 8 3" fill="none" stroke={a} strokeWidth="3.5" strokeLinecap="round"/>
  </>,
  'Priest & Rituals': ({a,b,g,g2}) => <>
    <path d="M25 74c7-14 13-21 25-21s18 7 25 21z" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="50" cy="36" r="15" fill={g2} stroke={b} strokeWidth="3"/>
    <path d="M50 14v10M45 19h10" stroke={a} strokeWidth="4" strokeLinecap="round"/>
    <path d="M38 60h24M34 68h32" stroke={a} strokeWidth="4" strokeLinecap="round"/>
    <path d="M50 45c-1-5 4-6 4-10 0 0-6 1-5-6-6 7-2 11 1 16z" fill={a}/>
  </>,
  'Safety & Facilities': ({a,b,g,g2}) => <>
    <path d="M50 18l28 10v22c0 16-11 26-28 33-17-7-28-17-28-33V28z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M50 34v29M35 48h30" stroke="#fff" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="79" cy="25" r="6" fill={a}/><path d="M79 21v8M75 25h8" stroke="#fff" strokeWidth="2.2"/>
  </>,
  'Security Services': ({a,b,g,g2}) => <>
    <path d="M50 18l29 11v22c0 16-12 26-29 31-17-5-29-15-29-31V29z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M37 48c0-7 5-12 13-12s13 5 13 12v18H37z" fill={g2} stroke={b} strokeWidth="3"/>
    <circle cx="50" cy="34" r="8" fill={a}/><path d="M41 66h18" stroke={a} strokeWidth="5" strokeLinecap="round"/>
  </>,
  'Sound & AV': ({a,b,g,g2}) => <>
    <rect x="18" y="24" width="24" height="53" rx="5" fill={g} stroke={b} strokeWidth="3"/>
    <rect x="58" y="24" width="24" height="53" rx="5" fill={g} stroke={b} strokeWidth="3"/>
    <circle cx="30" cy="42" r="7" fill={g2} stroke={b} strokeWidth="3"/><circle cx="70" cy="42" r="7" fill={g2} stroke={b} strokeWidth="3"/>
    <circle cx="30" cy="62" r="11" fill={g2} stroke={b} strokeWidth="3"/><circle cx="70" cy="62" r="11" fill={g2} stroke={b} strokeWidth="3"/>
    <path d="M45 49h10M45 54h10" stroke={a} strokeWidth="4" strokeLinecap="round"/>
  </>,
  'Tent & Furniture': ({a,b,g,g2}) => <>
    <path d="M15 72h70M24 72V46l26-21 26 21v26" fill={g} stroke={b} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M31 62h15v10H31zM54 62h15v10H54z" fill={g2} stroke={a} strokeWidth="2"/>
    <path d="M50 25v47" stroke={a} strokeWidth="4"/>
  </>,
  'Transportation': ({a,b,g,g2}) => <>
    <path d="M15 49l9-18h42l12 18v21H15z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M27 35h34l7 12H20z" fill={g2}/>
    <circle cx="29" cy="73" r="8" fill={b}/><circle cx="70" cy="73" r="8" fill={b}/>
    <path d="M78 82c-12-4-21-2-30-10M47 72l4-7 7 5" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </>,
  'Trousseau & Gift Packing': ({a,b,g,g2}) => <>
    <path d="M23 33h54v44H23z" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M50 33v44M23 48h54" stroke={a} strokeWidth="5"/>
    <path d="M30 25c7-7 15-5 20 3-5 4-13 4-20-3zM50 28c5-8 14-10 20-3-6 7-14 7-20 3z" fill={g2} stroke={b} strokeWidth="2"/>
    <path d="M32 56h36M37 64h26" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".75"/>
  </>,
  'Valet Parking': ({a,b,g,g2}) => <>
    <rect x="30" y="18" width="40" height="40" rx="5" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M41 28v20M48 28h8c6 0 6 10 0 10h-8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 70h64M25 78h50" stroke={a} strokeWidth="5" strokeLinecap="round"/>
    <path d="M78 52l6 6-6 6M84 58h-9" fill="none" stroke={b} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </>,
  'Venue': ({a,b,g,g2}) => <>
    <path d="M16 77h68M23 77V39h54v38M18 39l32-20 32 20z" fill={g} stroke={b} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M35 77V56h11v21M54 77V56h11v21" fill={g2} stroke={a} strokeWidth="2"/>
    <path d="M28 47h44" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
  </>,
  'Videography': ({a,b,g,g2}) => <>
    <rect x="18" y="36" width="49" height="37" rx="7" fill={g} stroke={b} strokeWidth="3"/>
    <path d="M67 45l18-8v35l-18-8z" fill={a} stroke={b} strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="42" cy="55" r="11" fill={g2} stroke={b} strokeWidth="3"/><circle cx="42" cy="55" r="5" fill={b}/>
    <path d="M27 28h18" stroke={a} strokeWidth="6" strokeLinecap="round"/>
  </>,
  'Warehouse / Storage': ({a,b,g,g2}) => <>
    <path d="M16 39l34-20 34 20v38H16z" fill={g} stroke={b} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M34 77V52h32v25" fill={g2} stroke={b} strokeWidth="3"/>
    <path d="M24 47h52" stroke={a} strokeWidth="5" strokeLinecap="round"/>
    <rect x="23" y="62" width="8" height="9" fill={a}/><rect x="69" y="62" width="8" height="9" fill={a}/>
  </>,
  'Wedding Planning': ({a,b,g,g2}) => <>
    <rect x="19" y="22" width="56" height="63" rx="7" fill={g} stroke={b} strokeWidth="3"/>
    <rect x="30" y="34" width="34" height="9" rx="3" fill={g2}/>
    <path d="M31 53h6M43 53h17M31 64h6M43 64h13M31 75h6M43 75h17" stroke={a} strokeWidth="3.6" strokeLinecap="round"/>
    <path d="M62 15v17M38 15v17" stroke={b} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="36" cy="53" r="2.7" fill={a}/><circle cx="36" cy="64" r="2.7" fill={a}/><circle cx="36" cy="75" r="2.7" fill={a}/>
  </>,
}

const ALIASES = {
  'Event Planning & Coordination': 'Wedding Planning',
  'Invitations & Print Media': 'Invitation & Printing',
  'Security & Bouncers': 'Security Services',
  'Cleaning & Housekeeping': 'Safety & Facilities',
  'Medical & Safety': 'Safety & Facilities',
  'Fire Safety & Compliance': 'Safety & Facilities',
  'Parking & Traffic Management': 'Valet Parking',
  'Toilets & Sanitation': 'Guest Services',
  'Signage & Branding': 'Invitation & Printing',
  'Live Counters & Food Stalls': 'Catering & Food',
}

export function tradePictogramIcon(trade) {
  return ICONS[ALIASES[trade] ?? trade] ?? ICONS['Event Equipment Rental']
}

export default function SambramoTradePictogram({
  trade,
  size = 'md',
  className = '',
  showSparkle = true,
  title = true,
}) {
  const [a, b, highlight] = paletteForTrade(trade)
  const uid = useId().replace(/:/g, '')
  const Icon = tradePictogramIcon(trade)

  return (
    <span
      className={'sambramo-trade-pictogram sambramo-trade-pictogram-' + size + ' ' + className}
      style={{ '--sam-a': a, '--sam-b': b, '--sam-highlight': highlight }}
      data-trade-pictogram={String(trade ?? 'trade')}
      aria-label={title ? String(trade ?? '') : undefined}
      role={title ? 'img' : undefined}
    >
      <span className="sambramo-trade-pictogram-glow" />
      <span className="sambramo-trade-pictogram-sheen" />
      <BaseSvg uid={uid}>{(g, g2) => Icon({a, b, g, g2})}</BaseSvg>
      {showSparkle ? <span className="sambramo-trade-pictogram-sparkle" aria-hidden="true">✦</span> : null}
    </span>
  )
}

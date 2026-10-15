import React, { useId } from 'react'

/**
 * Dedicated vector artwork for the six trade tiles whose legacy sprite crops
 * were incorrect. Each illustration uses the same 16:9 viewBox and centered
 * composition, so it stays crisp at every phone width.
 */
export default function TradeServiceArtwork({ trade }) {
  const uid = useId().replace(/:/g, '')
  const bg = `${uid}-bg`
  const gold = `${uid}-gold`
  const plum = `${uid}-plum`
  const shine = `${uid}-shine`

  let art
  if (trade === 'Trousseau & Gift Packing') {
    art = <>
      <ellipse cx="210" cy="151" rx="112" ry="12" fill="#4b216e" opacity=".12" />
      <g stroke="#8f5b14" strokeWidth="2" strokeLinejoin="round">
        <path d="M117 90 151 67 272 67 306 91 286 139 137 139Z" fill={gold} />
        <path d="M117 90 137 105 286 105 306 91 286 139 137 139Z" fill="#7c1d58" />
        <path d="M137 105 286 105 286 139 137 139Z" fill="#a72a70" />
        <path d="M108 75 146 52 274 52 312 75 292 91 128 91Z" fill="#f3cf77" />
        <path d="M128 91 292 91 292 103 128 103Z" fill="#7f1e5d" />
        <path d="M194 53 194 103 226 103 226 53" fill="#f2d48a" />
        <path d="M210 53 C177 32 179 17 197 20 C210 22 210 39 210 53 C211 30 231 14 242 25 C254 39 227 49 210 53Z" fill="#c12c79" />
        <path d="M145 117h133M145 127h133" stroke="#f8d78e" opacity=".8" />
        <circle cx="210" cy="120" r="9" fill="#f6d37d" /><circle cx="210" cy="120" r="4" fill="#9b255f" />
        <rect x="85" y="104" width="47" height="34" rx="3" fill="#e9b958" />
        <path d="M108 104v34M85 116h47" stroke="#fff0bf" strokeWidth="5" />
        <rect x="283" y="108" width="42" height="30" rx="3" fill="#f4d18a" />
        <path d="M304 108v30M283 119h42" stroke="#9b255f" strokeWidth="4" />
      </g>
      <g fill="#fff4d4" opacity=".8"><circle cx="91" cy="45" r="3"/><circle cx="329" cy="49" r="4"/><circle cx="314" cy="33" r="2"/></g>
    </>
  } else if (trade === 'Valet Parking') {
    art = <>
      <ellipse cx="212" cy="145" rx="130" ry="12" fill="#25163e" opacity=".14" />
      <path d="M45 145h330" stroke="#c6b4db" strokeWidth="2" />
      <path d="M62 134h296" stroke="#d6c5e7" strokeWidth="1" strokeDasharray="8 8" />
      <g stroke="#21152f" strokeWidth="3" strokeLinejoin="round">
        <path d="M91 112 115 79Q122 69 139 67h119q20 0 34 20l23 25 12 8v23H85v-19Z" fill="#26243a" />
        <path d="M128 80h125q13 0 23 14l9 13H108l12-19q3-7 8-8Z" fill="#c4d7e6" />
        <path d="M184 81v26M257 81l17 26" stroke="#6b5a82" strokeWidth="2" />
        <path d="M88 112h42v18H86Z" fill="#db3154" /><path d="M289 112h31l7 14h-38Z" fill="#ef405e" />
        <path d="M100 135h33M291 135h32" stroke="#f7d8a0" strokeWidth="3" />
        <circle cx="132" cy="137" r="16" fill="#272137"/><circle cx="132" cy="137" r="7" fill="#d9d3e4"/>
        <circle cx="286" cy="137" r="16" fill="#272137"/><circle cx="286" cy="137" r="7" fill="#d9d3e4"/>
      </g>
      <g><path d="M59 71v68M352 71v68" stroke="#b78332" strokeWidth="5"/><circle cx="59" cy="69" r="7" fill="#f1cf7b" stroke="#b78332" strokeWidth="2"/><circle cx="352" cy="69" r="7" fill="#f1cf7b" stroke="#b78332" strokeWidth="2"/><path d="M59 86Q200 174 352 86" fill="none" stroke="#7d2bb8" strokeWidth="5"/></g>
      <g transform="translate(322 27)" stroke="#252033" strokeWidth="2.5" strokeLinecap="round"><circle cx="0" cy="0" r="8" fill="#e5b28e"/><path d="M-8 -2q8-16 17 0" fill="#211a31"/><path d="M-10 12l-4 34 26 0-5-34Z" fill="#f4f0f7"/><path d="M-13 17l-10 19M8 17l10 18" stroke="#252033" strokeWidth="5"/><path d="M-8 46l-3 19M7 46l4 19" stroke="#252033" strokeWidth="5"/></g>
    </>
  } else if (trade === 'Venue') {
    art = <>
      <ellipse cx="210" cy="153" rx="132" ry="10" fill="#4b216e" opacity=".12" />
      <path d="M55 147h310" stroke="#c8b4df" strokeWidth="2" />
      <path d="M93 145V71h234v74" fill="#f9e6c8" stroke="#b78a49" strokeWidth="3" />
      <path d="M78 73 210 25 342 73Z" fill="#f7d88c" stroke="#b78a49" strokeWidth="3" />
      <path d="M106 70h208v75H106Z" fill="#fff7e9" stroke="#c59b5c" strokeWidth="2" />
      <path d="M173 145V91q0-26 37-26t37 26v54" fill="#8c286f" stroke="#e8c887" strokeWidth="4" />
      <path d="M187 145V95q0-14 23-14t23 14v50" fill="#f7c4d8" />
      {[118,143,267,292].map((x,i)=><g key={i}><rect x={x} y="81" width="12" height="64" rx="3" fill="#ead3a7"/><path d={`M${x-4} 83h20M${x-4} 145h20`} stroke="#b78a49" strokeWidth="3"/></g>)}
      <path d="M210 145 186 180h48Z" fill="#7d2bb8" opacity=".95" />
      <g fill="#d83d87" stroke="#f9e0eb" strokeWidth="2">{[98,121,146,274,299,322].map((x,i)=><g key={i}><circle cx={x} cy={i%2?65:72} r="9"/><circle cx={x-8} cy={i%2?66:73} r="5" fill="#f8d06e"/><circle cx={x+8} cy={i%2?66:73} r="5" fill="#f8d06e"/></g>)}</g>
      <g stroke="#6f4a2d" strokeWidth="2"><path d="M64 110v37M75 110v37M345 110v37M356 110v37" /><path d="M64 113h11M345 113h11" stroke="#f3d27f" strokeWidth="5"/></g>
    </>
  } else if (trade === 'Videography') {
    art = <>
      <ellipse cx="210" cy="151" rx="118" ry="11" fill="#34214b" opacity=".14" />
      <path d="M48 150h324" stroke="#d2c4e4" strokeWidth="2" />
      <g stroke="#242033" strokeWidth="3" strokeLinejoin="round">
        <path d="M113 70h165l20 18v49H91V91Z" fill="#29253c" />
        <path d="M113 70h165l20 18H91Z" fill="#514b64" />
        <rect x="106" y="92" width="72" height="39" rx="4" fill="#141522" />
        <rect x="185" y="93" width="78" height="35" rx="4" fill="#343047" />
        <rect x="197" y="100" width="24" height="12" rx="2" fill="#9b91b7" />
        <circle cx="147" cy="111" r="30" fill="#11131f" stroke="#a5a1b9" strokeWidth="4"/>
        <circle cx="147" cy="111" r="21" fill="#30224f" stroke="#5b4a84" strokeWidth="3"/>
        <circle cx="147" cy="111" r="13" fill="#7e42c4"/><circle cx="147" cy="111" r="6" fill="#aee8f6"/>
        <path d="M139 139h19l10 13h-39Z" fill="#302c43" />
        <path d="M135 151l-18 15M159 151l19 15M147 151v15" fill="none" stroke="#29253c" strokeWidth="5"/>
        <path d="M170 70l15-20h67l15 20" fill="#363248" />
        <rect x="192" y="45" width="48" height="10" rx="5" fill="#1e1b2b" />
        <rect x="210" y="35" width="8" height="12" rx="2" fill="#1e1b2b" />
        <rect x="232" y="100" width="18" height="10" rx="2" fill="#df426e" />
        <circle cx="274" cy="105" r="5" fill="#f1c96d" />
      </g>
      <g fill="#fff" opacity=".8"><circle cx="68" cy="45" r="3"/><circle cx="345" cy="42" r="4"/><circle cx="320" cy="64" r="2"/></g>
    </>
  } else if (trade === 'Warehouse / Storage') {
    art = <>
      <ellipse cx="210" cy="151" rx="136" ry="10" fill="#34214b" opacity=".12" />
      <path d="M47 149h326" stroke="#b9c8d7" strokeWidth="2" />
      <path d="M63 31v117M147 31v117M273 31v117M357 31v117" stroke="#2474bc" strokeWidth="8" />
      <path d="M59 40h302M59 81h302M59 122h302" stroke="#e69b2c" strokeWidth="5" />
      {[0,1,2].map(row=>[0,1,2,3,4,5].map(col=>{const x=70+col*46,y=45+row*39;return <g key={`${row}-${col}`}><rect x={x} y={y} width="38" height="31" rx="2" fill={['#d99b54','#e7b96f','#c98642'][col%3]} stroke="#9c6738" strokeWidth="1.5"/><path d={`M${x+19} ${y}v31M${x} ${y+10}h38`} stroke="#f4d6a2" strokeWidth="1.5"/></g>}))}
      <g stroke="#262638" strokeWidth="3" strokeLinejoin="round">
        <path d="M177 95h84v39h-84Z" fill="#f0b82f"/><path d="M187 74h49l15 21h-64Z" fill="#f6ca50"/><path d="M197 77h25v16h-25Z" fill="#8dc4e0"/><path d="M176 96h-13v38h99v-5h-86Z" fill="#e5a822"/><path d="M169 134v13M254 134v13" strokeWidth="6"/><circle cx="184" cy="140" r="10" fill="#252538"/><circle cx="244" cy="140" r="10" fill="#252538"/><circle cx="184" cy="140" r="4" fill="#a6a8b7"/><circle cx="244" cy="140" r="4" fill="#a6a8b7"/><path d="M261 94h8v53h-8M270 143h33" fill="none" stroke="#313143" strokeWidth="5"/>
      </g>
    </>
  } else {
    art = <>
      <ellipse cx="210" cy="151" rx="132" ry="10" fill="#4b216e" opacity=".12" />
      <path d="M48 149h324" stroke="#d6c5e7" strokeWidth="2" />
      <path d="M77 142V91l133-55 133 55v51" fill="#fff4e8" stroke="#d8b981" strokeWidth="3" />
      <path d="M92 92h236v50H92Z" fill="#f6d7df" />
      <path d="M113 142V94q0-19 25-19t25 19v48M257 142V94q0-19 25-19t25 19v48" fill="#fff8f2" stroke="#d8b981" strokeWidth="2" />
      <path d="M177 142V96q0-21 33-21t33 21v46" fill="#f1b6ce" stroke="#d8b981" strokeWidth="2" />
      <path d="M210 142 194 180h32Z" fill="#7b2ab7" opacity=".9" />
      <g fill="#d83d87" stroke="#fff0f4" strokeWidth="2">{[84,104,125,146,168,190,211,232,254,276,297,318,337].map((x,i)=><g key={i}><circle cx={x} cy={i%2?78:88} r="8"/><circle cx={x-6} cy={i%2?79:89} r="4" fill="#f4d06f"/><circle cx={x+6} cy={i%2?79:89} r="4" fill="#f4d06f"/></g>)}</g>
      <g transform="translate(318 48)" stroke="#282033" strokeWidth="2.5" strokeLinecap="round"><circle cx="0" cy="0" r="8" fill="#dba47e"/><path d="M-8 -2q8-15 16 0" fill="#282033"/><path d="M-9 12h18l5 34h-28Z" fill="#282033"/><path d="M-7 18l-14 18M7 18l14 18M-5 46l-5 17M5 46l5 17" fill="none" strokeWidth="5"/><path d="M-10 21l-14 8 7 12 12-11" fill="#e5bd50"/></g>
    </>
  }

  return (
    <span className="block h-[82px] w-full min-w-0 overflow-hidden rounded-[18px] border border-plum-100 bg-white">
      <svg viewBox="0 0 420 180" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={trade}>
        <defs>
          <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fcf8ff"/><stop offset="100%" stopColor="#eee4fa"/></linearGradient>
          <linearGradient id={gold} x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor="#f9e4a5"/><stop offset="100%" stopColor="#d39a36"/></linearGradient>
          <linearGradient id={plum} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#b45ee7"/><stop offset="100%" stopColor="#5b21b6"/></linearGradient>
          <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity=".55"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/></linearGradient>
        </defs>
        <rect width="420" height="180" fill={`url(#${bg})`} />
        <circle cx="44" cy="34" r="34" fill="#fff" opacity=".28"/><circle cx="374" cy="150" r="46" fill="#d8b9f2" opacity=".18"/>
        {art}
        <path d="M0 0H420V44C302 15 118 15 0 45Z" fill={`url(#${shine})`} opacity=".55"/>
      </svg>
    </span>
  )
}

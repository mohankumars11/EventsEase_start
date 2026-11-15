/**
 * The category pictograms — the home rail.
 *
 * Blinkit / Zepto draw a category as a small MODELLED OBJECT, not a line
 * icon: a chunky toy-like form, lit from the top-left, with a shaded far
 * side, a specular sheen and a soft contact shadow. That is what makes a
 * 44px tile read instantly at arm's length, and it is what this file
 * does — in SVG, so it costs no network request, stays crisp at any
 * density and recolours with the theme.
 *
 * It is deliberately NOT part of ui/Glyph.jsx. That file is one flat
 * system — one grid, one stroke, one palette — shared by every service
 * and add-on card; dropping modelled art into it would break the thing
 * that makes fifteen of them in a column read as one set.
 *
 * ── How a mark is built ──────────────────────────────────────────────
 * Grid 44×44, object inset to 5–39, contact shadow on the 38.5 line so
 * every mark sits on the same floor. Each mark is handed four paints and
 * uses nothing else, which is what keeps eighteen of them consistent:
 *
 *   b    the body gradient   light top-left → deep bottom-right
 *   s    the sheen gradient  white, fading down — the crown highlight
 *   lo   the light tone      flat, for front planes
 *   hi   the deep tone       flat, for far sides and detail
 */
import { useId } from 'react'

const DARK = '#2B0E66'

/* [plate, light, deep] — the plate tint and the two tones the body is
   modelled from. One triple per category id in data/occasions.js. */
const TINT = {
  life:      ['#FFE2ED', '#FF6AA4', '#B01B57'],
  wedding:   ['#FFEBD2', '#FFB73C', '#AE6708'],
  festivals: ['#FFE6C2', '#FF9F2E', '#A94708'],
  school:    ['#DFE9FF', '#6793FF', '#1E3B93'],
  college:   ['#E6DFFF', '#8974FF', '#3A2699'],
  corporate: ['#DFE8F3', '#7794B8', '#2A4468'],
  nightlife: ['#F0DAFF', '#B355FF', '#64149F'],
  public:    ['#FFDED2', '#FF7748', '#A82A0E'],
  sport:     ['#FFEBB8', '#FFB415', '#9C6600'],
  food:      ['#D2F0E5', '#38C098', '#07614A'],
  retail:    ['#FFDBE8', '#FF77A4', '#A62455'],
  property:  ['#D6EFDB', '#52C06D', '#0F6128'],
  community: ['#D6EAFF', '#4BA5EA', '#0F4F85'],
  industry:  ['#E1E6EC', '#8495A8', '#324155'],
  themed:    ['#E7DDFF', '#8763FF', '#3C1D95'],
  outdoor:   ['#D8EEDC', '#5CB76A', '#19602D'],
  online:    ['#DCE7FF', '#668EFF', '#1E3B93'],
  special:   ['#FFDEDA', '#FF776D', '#9E2522'],
}

/* Each mark is handed the four paints and draws on the 44 grid. */
const MARKS = {
  /* Personal celebrations — a two-tier cake on its stand. */
  life: ({ b, s, lo, hi }) => <>
    <path d="M9 32.8h26a2 2 0 0 1 2 2v.4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-.4a2 2 0 0 1 2-2z" fill={hi} opacity=".3" />
    <path d="M11 23.6h22v9.2H11z" fill={b} />
    <path d="M26 23.6h7v9.2h-7z" fill={DARK} opacity=".15" />
    <path d="M11 24.2c1.4 0 1.4-2.1 2.8-2.1s1.4 2.1 2.8 2.1 1.4-2.1 2.8-2.1 1.4 2.1 2.8 2.1 1.4-2.1 2.8-2.1 1.4 2.1 2.8 2.1 1.4-2.1 2.8-2.1 1.4 2.1 2.4 2.1v-3.4H11z" fill="#FFFAFC" />
    <path d="M15.5 15.4h13v5.4h-13z" fill={b} />
    <path d="M24 15.4h4.5v5.4H24z" fill={DARK} opacity=".15" />
    <path d="M15.5 16c1.2 0 1.2-1.7 2.4-1.7s1.2 1.7 2.4 1.7 1.2-1.7 2.4-1.7 1.2 1.7 2.4 1.7 1.2-1.7 2.4-1.7 1.3 1.7 2.1 1.7v-2.6h-13z" fill="#FFFAFC" />
    <rect x="21.1" y="8.6" width="1.9" height="5" rx=".9" fill={lo} />
    <ellipse className="cx-glow" cx="22" cy="7.6" rx="4.6" ry="5" fill="#FFB02E" opacity=".28" />
    <g className="cx-flame">
      <path d="M22 4.6c1.8 1.7 2.7 3 2.7 4.1a2.7 2.7 0 1 1-5.4 0c0-1.1.9-2.4 2.7-4.1z" fill="#FFB020" />
      <path d="M22 6.6c.9.9 1.4 1.7 1.4 2.3a1.4 1.4 0 1 1-2.8 0c0-.6.5-1.4 1.4-2.3z" fill="#FFE27A" />
    </g>
    <path d="M13 25.4h4.5v5.6H13z" fill={s} opacity=".5" />
  </>,

  /* Indian weddings — two bands, one through the other. */
  wedding: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12" ry="2.3" fill={DARK} opacity=".12" />
    <circle cx="17.4" cy="25" r="9.4" fill="none" stroke={hi} strokeWidth="4.4" opacity=".45" />
    <circle cx="17.4" cy="24.2" r="9.4" fill="none" stroke={b} strokeWidth="4.2" />
    <path d="M9.6 19.2a9.4 9.4 0 0 1 5.4-4.2" fill="none" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" opacity=".7" />
    <circle cx="28.2" cy="20.4" r="7.6" fill="none" stroke={hi} strokeWidth="3.8" opacity=".45" />
    <circle cx="28.2" cy="19.7" r="7.6" fill="none" stroke={lo} strokeWidth="3.6" />
    <path d="M22.4 15a7.6 7.6 0 0 1 4-3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity=".75" />
    <path d="m28.2 6.6 2.4 3.4h-4.8z" fill="#8FD8FF" />
    <path d="m28.2 13.2-2.4-3.2h4.8z" fill="#D9F1FF" />
  </>,

  /* Festivals & faith — a lit diya. */
  festivals: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="11.6" ry="2.3" fill={DARK} opacity=".12" />
    <ellipse className="cx-glow" cx="22" cy="15.4" rx="7" ry="7.6" fill="#FFB02E" opacity=".3" />
    <g className="cx-flame">
      <path d="M22 9.4c2.9 3.2 4.4 5.7 4.4 7.6a4.4 4.4 0 0 1-8.8 0c0-1.9 1.5-4.4 4.4-7.6z" fill="#FF8A1F" />
      <path d="M22 14.2c1.5 1.8 2.2 3.1 2.2 4a2.2 2.2 0 0 1-4.4 0c0-.9.7-2.2 2.2-4z" fill="#FFDE6A" />
    </g>
    <path d="M8.6 24.6h26.8c0 5.2-4.6 8.4-13.4 8.4S8.6 29.8 8.6 24.6z" fill={b} />
    <path d="M22 24.6h13.4c0 5.2-4.6 8.4-13.4 8.4z" fill={DARK} opacity=".16" />
    <ellipse cx="22" cy="24.6" rx="13.4" ry="3.2" fill={lo} />
    <ellipse cx="22" cy="24.4" rx="9.6" ry="2" fill={hi} opacity=".5" />
    <path d="M12.4 26.4c.6 2.2 2.6 3.6 4.6 4.2" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
    <path d="M20 22.8c.8-.5 3.2-.5 4 0" fill="none" stroke={hi} strokeWidth="1.5" strokeLinecap="round" />
  </>,

  /* School — a graduation cap, board and tassel. */
  school: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="11.4" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M14.6 22.4h14.8v7.2c0 2-3.3 3.4-7.4 3.4s-7.4-1.4-7.4-3.4z" fill={lo} />
    <path d="M22 22.4h7.4v7.2c0 2-3.3 3.4-7.4 3.4z" fill={DARK} opacity=".17" />
    <path d="M22 11.2 38 17.6 22 24 6 17.6z" fill={b} />
    <path d="M22 11.2 38 17.6 22 24z" fill={DARK} opacity=".14" />
    <path d="M22 13.4 32.6 17.6 22 21.8 11.4 17.6z" fill="#FFFFFF" opacity=".22" />
    <path d="M36.4 18.2v7.4" fill="none" stroke={hi} strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="36.4" cy="27" r="2.2" fill="#FFC24D" />
    <circle cx="35.7" cy="26.3" r=".8" fill="#FFE6A8" />
  </>,

  /* College — a stack of books with a bookmark. */
  college: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="11.4" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M8.6 28.4h26.8v5.4a1.4 1.4 0 0 1-1.4 1.4H10a1.4 1.4 0 0 1-1.4-1.4z" fill={hi} />
    <path d="M10.4 28.4h23.2v-1.2a1.4 1.4 0 0 0-1.4-1.4H11.8a1.4 1.4 0 0 0-1.4 1.4z" fill="#FFFFFF" opacity=".5" />
    <path d="M10.2 19.4h23.6v6.4H10.2z" fill={b} />
    <path d="M22 19.4h11.8v6.4H22z" fill={DARK} opacity=".14" />
    <path d="M12.4 13h19.2v6.4H12.4z" fill={lo} />
    <path d="M22 13h9.6v6.4H22z" fill={DARK} opacity=".12" />
    <path d="M12.4 13h19.2v1.6H12.4z" fill="#FFFFFF" opacity=".55" />
    <path d="M25.4 13h3.6v8.2l-1.8-1.6-1.8 1.6z" fill="#FF6B8A" />
  </>,

  /* Corporate — a tower, its lit windows, a flat roof. */
  corporate: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M9.6 14.6h15.2v22H9.6z" fill={b} />
    <path d="M24.8 20.4h10.2v16.2H24.8z" fill={lo} />
    <path d="M30.4 20.4h4.6v16.2h-4.6z" fill={DARK} opacity=".16" />
    <path d="M20.6 14.6h4.2v22h-4.2z" fill={DARK} opacity=".13" />
    <path d="M9.6 14.6h15.2v1.8H9.6z" fill="#FFFFFF" opacity=".45" />
    <path d="M24.8 20.4h10.2v1.6H24.8z" fill="#FFFFFF" opacity=".4" />
    <g fill="#FFFFFF" opacity=".8">
      <rect x="12.4" y="18.6" width="3.2" height="3" rx=".7" />
      <rect x="17.4" y="18.6" width="3.2" height="3" rx=".7" />
      <rect x="12.4" y="24" width="3.2" height="3" rx=".7" />
      <rect x="17.4" y="24" width="3.2" height="3" rx=".7" />
      <rect x="12.4" y="29.4" width="3.2" height="3" rx=".7" />
      <rect x="27.4" y="24.8" width="2.8" height="2.8" rx=".7" />
      <rect x="27.4" y="30" width="2.8" height="2.8" rx=".7" />
    </g>
    <rect x="16.8" y="10.6" width="1.6" height="4.2" rx=".8" fill={hi} />
    <path d="m18.4 10.4 4.4 1.5-4.4 1.5z" fill="#FF8A5C" />
  </>,

  /* Nightlife — a cocktail, its garnish and straw. */
  nightlife: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="10.6" ry="2.2" fill={DARK} opacity=".12" />
    <path d="M18.4 26.6h7.2v9.4h-7.2z" fill={hi} opacity=".35" />
    <rect x="15" y="35" width="14" height="2.6" rx="1.3" fill={hi} />
    <path d="M7.4 11.6h29.2L24.6 26.4h-5.2z" fill={b} />
    <path d="M22 11.6h14.6L24.6 26.4H22z" fill={DARK} opacity=".15" />
    <path d="M11.4 14.4h21.2l-3 3.6H14.4z" fill="#FFFFFF" opacity=".3" />
    <path d="M9.6 12.8h24.8l-1.6 2H11.2z" fill="#FFFFFF" opacity=".5" />
    <rect x="26.4" y="5.4" width="2" height="12" rx="1" transform="rotate(16 27.4 11.4)" fill="#FF7AA8" />
    <circle cx="31.6" cy="8.4" r="3.4" fill="#FF9F3C" />
    <circle cx="30.5" cy="7.3" r="1.2" fill="#FFD79A" />
  </>,

  /* Shows & public events — a stage mic on its stand. */
  public: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="10.8" ry="2.2" fill={DARK} opacity=".12" />
    <rect x="14.6" y="35" width="14.8" height="2.6" rx="1.3" fill={hi} />
    <rect x="20.8" y="26" width="2.4" height="9.6" rx="1.2" fill={hi} />
    <path d="M13.2 18.6a8.8 8.8 0 0 0 17.6 0" fill="none" stroke={lo} strokeWidth="2.6" strokeLinecap="round" />
    <rect x="16.6" y="5.4" width="10.8" height="18.4" rx="5.4" fill={b} />
    <rect x="22.6" y="5.4" width="4.8" height="18.4" rx="2.4" fill={DARK} opacity=".16" />
    <rect x="18.6" y="7.6" width="2.8" height="9" rx="1.4" fill="#FFFFFF" opacity=".55" />
    <g stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity=".7">
      <path d="M17.4 11.4h9.2M17.4 14.6h9.2M17.4 17.8h9.2" />
    </g>
  </>,

  /* Sport — a trophy on its plinth. */
  sport: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="11" ry="2.2" fill={DARK} opacity=".12" />
    <path d="M14 33.4h16l1.4 3.6H12.6z" fill={hi} />
    <path d="M22 33.4h8l1.4 3.6H22z" fill={DARK} opacity=".15" />
    <rect x="18.8" y="26.4" width="6.4" height="7.4" rx="1" fill={lo} />
    <rect x="22" y="26.4" width="3.2" height="7.4" rx="1" fill={DARK} opacity=".16" />
    <path d="M13.2 7h17.6v9.4a8.8 8.8 0 0 1-17.6 0z" fill={b} />
    <path d="M22 7h8.8v9.4a8.8 8.8 0 0 1-8.8 8.8z" fill={DARK} opacity=".15" />
    <path d="M13.2 9.6H9.4a4.6 4.6 0 0 0 4.4 6.8M30.8 9.6h3.8a4.6 4.6 0 0 1-4.4 6.8" fill="none" stroke={hi} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16.2 9.8v5.6a5.8 5.8 0 0 0 2.2 4.6" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
    <path d="m22 11.6 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#FFFFFF" opacity=".85" />
  </>,

  /* Dining — a cloche lifting off the plate. */
  food: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12.4" ry="2.3" fill={DARK} opacity=".12" />
    <ellipse cx="22" cy="33.6" rx="15" ry="3.4" fill={hi} opacity=".4" />
    <ellipse cx="22" cy="32.4" rx="15" ry="3.4" fill={lo} />
    <ellipse cx="22" cy="31.8" rx="10.6" ry="2.2" fill="#FFFFFF" opacity=".4" />
    <path d="M7.8 31.4a14.2 14.2 0 0 1 28.4 0z" fill={b} />
    <path d="M22 17.2a14.2 14.2 0 0 1 14.2 14.2H22z" fill={DARK} opacity=".14" />
    <path d="M12.6 27.4a10.4 10.4 0 0 1 6.4-7.6" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
    <circle cx="22" cy="15.6" r="2.6" fill={hi} />
    <circle cx="21.2" cy="14.8" r="1" fill="#FFFFFF" opacity=".8" />
  </>,

  /* Fashion & retail — a dress on its hanger. */
  retail: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="10.6" ry="2.2" fill={DARK} opacity=".12" />
    <path d="M22 6.4a2.6 2.6 0 0 1 2.6 2.6c0 1.3-1 2-2.6 2.6" fill="none" stroke={hi} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M22 11.6 33.4 18H10.6z" fill={hi} opacity=".5" />
    <path d="M17.6 15.4h8.8l5.4 6-4.2 3-1 12.2H17.4l-1-12.2-4.2-3z" fill={b} />
    <path d="M22 15.4h4.4l5.4 6-4.2 3-1 12.2H22z" fill={DARK} opacity=".15" />
    <path d="M17.6 15.4h8.8a4.4 4.4 0 0 1-8.8 0z" fill="#FFFFFF" opacity=".45" />
    <path d="M15.4 22.4 18 20.2" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
    <path d="M18.6 28.6h6.8" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
  </>,

  /* Property — a house, its roof and a lit door. */
  property: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M11.4 19.6h21.2v17H11.4z" fill={b} />
    <path d="M22 19.6h10.6v17H22z" fill={DARK} opacity=".14" />
    <path d="M22 6.6 37.6 20H6.4z" fill={lo} />
    <path d="M22 6.6 37.6 20H22z" fill={DARK} opacity=".16" />
    <path d="M22 10.2 32.6 19.2H11.4z" fill="#FFFFFF" opacity=".25" />
    <path d="M18.6 26.4h6.8v10.2h-6.8z" fill="#FFFFFF" opacity=".75" />
    <circle cx="24" cy="31.6" r=".9" fill={hi} />
    <rect x="13.8" y="23.4" width="4" height="4" rx=".8" fill="#FFE9A8" />
    <rect x="26.2" y="23.4" width="4" height="4" rx=".8" fill="#FFE9A8" opacity=".7" />
  </>,

  /* Community — three figures, the nearest in front. */
  community: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12.4" ry="2.3" fill={DARK} opacity=".12" />
    <circle cx="11.6" cy="16.6" r="4.6" fill={hi} opacity=".75" />
    <path d="M4.2 32.4c0-4.4 3.3-7.6 7.4-7.6s7.4 3.2 7.4 7.6z" fill={hi} opacity=".75" />
    <circle cx="32.4" cy="16.6" r="4.6" fill={hi} opacity=".75" />
    <path d="M25 32.4c0-4.4 3.3-7.6 7.4-7.6s7.4 3.2 7.4 7.6z" fill={hi} opacity=".75" />
    <circle cx="22" cy="14.6" r="6" fill={b} />
    <circle cx="20" cy="12.6" r="1.9" fill="#FFFFFF" opacity=".6" />
    <path d="M12.6 34.6c0-5.2 4.2-9.4 9.4-9.4s9.4 4.2 9.4 9.4z" fill={b} />
    <path d="M22 25.2c5.2 0 9.4 4.2 9.4 9.4H22z" fill={DARK} opacity=".14" />
  </>,

  /* Industry — a plant with its stacks. */
  industry: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12.4" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M6.6 21.4 15 17v4.4l8.4-4.4v4.4l8.4-4.4v19.6H6.6z" fill={b} />
    <path d="M22 18.2l1.4-.8v4.4l8.4-4.4v19.6H22z" fill={DARK} opacity=".15" />
    <path d="M31.8 12.2h4.6v24.4h-4.6z" fill={lo} />
    <path d="M34.2 12.2h2.2v24.4h-2.2z" fill={DARK} opacity=".16" />
    <g fill="#FFFFFF" opacity=".75">
      <rect x="10" y="26.4" width="3.4" height="3.4" rx=".7" />
      <rect x="18" y="26.4" width="3.4" height="3.4" rx=".7" />
      <rect x="26" y="26.4" width="3.4" height="3.4" rx=".7" />
    </g>
    <circle cx="34.1" cy="8" r="2.6" fill="#FFFFFF" opacity=".6" />
    <circle cx="30.4" cy="5.6" r="1.8" fill="#FFFFFF" opacity=".4" />
  </>,

  /* Themed parties — a magician's hat, mid-trick. */
  themed: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12.6" ry="2.3" fill={DARK} opacity=".12" />
    <ellipse cx="22" cy="31.6" rx="16" ry="4.4" fill={hi} opacity=".45" />
    <ellipse cx="22" cy="30.4" rx="16" ry="4.4" fill={lo} />
    <path d="M13.6 10.6h16.8v19.4a26 26 0 0 1-16.8 0z" fill={b} />
    <path d="M22 10.6h8.4v19.4a22 22 0 0 1-8.4 1.4z" fill={DARK} opacity=".15" />
    <path d="M13.6 22.4h16.8v4.6H13.6z" fill="#FF5C8A" />
    <path d="M22 22.4h8.4v4.6H22z" fill={DARK} opacity=".12" />
    <path d="M16.4 13.4v7.6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity=".5" />
    <path d="m33.6 7.2 1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#FFD95C" />
    <path d="m9.4 15.4.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" fill="#FFD95C" opacity=".8" />
  </>,

  /* Outdoor — a pitched tent and its pole. */
  outdoor: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="13" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M22 8.4 38 35.4H6z" fill={b} />
    <path d="M22 8.4 38 35.4H22z" fill={DARK} opacity=".15" />
    <path d="M22 17.6 30.6 35.4H13.4z" fill="#FFF8EC" />
    <path d="M22 17.6 30.6 35.4H22z" fill={DARK} opacity=".1" />
    <path d="M22 24.6 26.4 35.4h-8.8z" fill={hi} />
    <path d="M14.6 14.4 17 12" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity=".5" />
    <rect x="4.4" y="34.4" width="35.2" height="2.6" rx="1.3" fill={hi} opacity=".6" />
    <circle cx="33.6" cy="9.6" r="2.8" fill="#FFD95C" />
  </>,

  /* Online — a screen with a play mark. */
  online: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="13" ry="2.3" fill={DARK} opacity=".12" />
    <rect x="6.4" y="9.4" width="31.2" height="21.6" rx="2.6" fill={b} />
    <rect x="22" y="9.4" width="15.6" height="21.6" rx="2.6" fill={DARK} opacity=".13" />
    <rect x="9.2" y="12.2" width="25.6" height="16" rx="1.4" fill="#FFFFFF" opacity=".92" />
    <path d="M19.4 16.6l7.4 3.6-7.4 3.6z" fill={hi} />
    <path d="M10.4 13.4h10.2" fill="none" stroke={lo} strokeWidth="1.4" strokeLinecap="round" opacity=".5" />
    <path d="M14.6 31h14.8l1.6 4.4H13z" fill={hi} />
    <path d="M22 31h7.4l1.6 4.4H22z" fill={DARK} opacity=".14" />
    <rect x="9.6" y="35.2" width="24.8" height="2.4" rx="1.2" fill={lo} />
  </>,

  /* Special moments — a wrapped gift, ribbon crossed. */
  special: ({ b, s, lo, hi }) => <>
    <ellipse cx="22" cy="38.4" rx="12" ry="2.3" fill={DARK} opacity=".12" />
    <path d="M8.6 18.6h26.8v17.4a1.4 1.4 0 0 1-1.4 1.4H10a1.4 1.4 0 0 1-1.4-1.4z" fill={b} />
    <path d="M22 18.6h13.4v17.4a1.4 1.4 0 0 1-1.4 1.4H22z" fill={DARK} opacity=".14" />
    <rect x="6.6" y="13.4" width="30.8" height="6.4" rx="1.6" fill={lo} />
    <rect x="22" y="13.4" width="15.4" height="6.4" rx="1.6" fill={DARK} opacity=".12" />
    <rect x="19" y="13.4" width="6" height="24" fill="#FFD95C" />
    <rect x="19" y="13.4" width="2.6" height="24" fill="#FFFFFF" opacity=".45" />
    <path d="M22 13.2c-3.4-1-6.4-2-6.4-4.4a3.2 3.2 0 0 1 6.4 0 3.2 3.2 0 0 1 6.4 0c0 2.4-3 3.4-6.4 4.4z" fill="#FFD95C" />
    <circle cx="22" cy="10.4" r="1.6" fill="#FFF0B8" />
  </>,
}

/** Every category this file draws — the rail asks before it renders. */
export const hasCategoryGlyph = id => Boolean(MARKS[id])

/**
 * One modelled category mark on its tinted plate.
 *
 * `size` is the plate; the object is drawn on a 44-grid and scales with
 * it. The two gradients are built per instance (useId) because two of
 * these on one screen would otherwise share — and fight over — one id.
 */
export default function CategoryGlyph({ id, size = 46, plate = true, className = '', title = null }) {
  const uid = useId().replace(/:/g, '')
  const draw = MARKS[id]
  const [tint, lo, hi] = TINT[id] ?? ['#F4EEFF', '#A98BFF', '#5B33C4']
  if (!draw) return null
  return (
    <span
      className={'inline-grid shrink-0 place-items-center ' + className}
      style={plate ? { width: size, height: size, borderRadius: size * 0.3, background: tint } : { width: size, height: size }}
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} aria-label={title ?? undefined}
    >
      <svg viewBox="0 0 44 44" width={Math.round(size * 0.78)} height={Math.round(size * 0.78)} focusable="false">
        <defs>
          {/* The body: lit from the top-left, saturating down-right. */}
          <linearGradient id={`${uid}b`} x1=".15" y1="0" x2=".85" y2="1">
            <stop offset="0" stopColor={lo} />
            <stop offset="1" stopColor={hi} />
          </linearGradient>
          {/* The sheen: a white crown that fades before mid-height. */}
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".7" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {draw({ b: `url(#${uid}b)`, s: `url(#${uid}s)`, lo, hi })}
      </svg>
    </span>
  )
}

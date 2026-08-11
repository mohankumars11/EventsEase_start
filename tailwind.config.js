/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marigold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        crimson: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#c0392b',
          700: '#9b1a2a',
          800: '#881337',
          900: '#4c0519',
        },
        cream: '#FFF8F0',
        plum: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#dbc4ff',
          300: '#c59eff',
          400: '#a56eff',
          500: '#8b45f7',
          600: '#7c3aed',  // primary brand
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        berry: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        saffron: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // CTA accent
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        // ── Storefront palette ─────────────────────────────────────────
        // The shop is a marketplace surface and it reads as one: deep green
        // ground, red for anything that is a saving, gold for anything that
        // is a promise.
        //
        // Plum stays the product's brand colour everywhere else (navbar,
        // planner, dashboards) — this pair is scoped to /shop, where the
        // job is a dense scannable catalogue rather than a brand statement.
        // Green because every marketplace in this market is orange or red
        // and a customer's eye slides straight off another one; because it
        // reads "fresh / veg / trusted" in Indian food UI, where the veg
        // mark is already green; and because red then has nothing to
        // compete with, so a discount badge is the loudest thing on screen,
        // which is exactly what a discount badge is for.
        forest: {
          50:  '#eef8f3',
          100: '#d2ede0',
          200: '#a4dcc2',
          300: '#6cc39e',
          400: '#38a47b',
          500: '#1c8560',
          600: '#12694c',
          700: '#0e523c',
          800: '#0b3d2e',   // primary storefront ground
          900: '#072a20',
          950: '#041a14',
        },
        // The savings colour. Never used for anything that isn't money off
        // or genuinely urgent — the moment it decorates a heading it stops
        // meaning "offer".
        chilli: {
          50:  '#fef3f2',
          100: '#fde0dd',
          200: '#fbc4bf',
          300: '#f79389',
          400: '#f05f52',
          500: '#e03c2d',
          600: '#c62828',   // offer / CTA accent
          700: '#a11f20',
          800: '#7f1d1d',
          900: '#5d1414',
        },
      },
      fontFamily: {
        // Manrope is the font actually loaded in index.html and applied to
        // <body>; `sans` pointed at Inter, which is never fetched, so any
        // `font-sans` element silently fell back to system-ui and looked
        // different from the rest of the page.
        sans:    ['Manrope', 'system-ui', 'sans-serif'],
        serif:   ['Playfair Display', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:   '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blob: {
          '0%,100%': { borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%' },
          '50%':     { borderRadius: '30% 60% 70% 40%/50% 60% 30% 60%' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        // The rotating detail line inside a storefront card. Enter from
        // below, rest, leave upward — a departures board, not a carousel.
        'fact-in': {
          '0%':   { opacity: '0', transform: 'translateY(90%)' },
          '18%':  { opacity: '1', transform: 'translateY(0)' },
          '82%':  { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-90%)' },
        },
        // Slow diagonal sheen across an offer tile.
        sheen: {
          '0%':   { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(320%) skewX(-18deg)' },
        },
        // Expanding halo behind a live/urgency dot.
        'pulse-ring': {
          '0%':   { transform: 'scale(0.85)', opacity: '0.7' },
          '80%':  { transform: 'scale(1.9)',  opacity: '0' },
          '100%': { transform: 'scale(1.9)',  opacity: '0' },
        },
      },
      animation: {
        'fade-up':   'fade-up 0.6s ease forwards',
        'fade-in':   'fade-in 0.4s ease forwards',
        blob:        'blob 7s ease-in-out infinite',
        float:       'float 3s ease-in-out infinite',
        shimmer:     'shimmer 3s linear infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        sheen:       'sheen 3.2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}

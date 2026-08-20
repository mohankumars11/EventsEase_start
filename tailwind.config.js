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
        // ── Semantic tokens ────────────────────────────────────────────
        // Everything above this line is a *brand* colour: a fixed hex that
        // means the same thing everywhere (saffron is the CTA, chilli is a
        // saving). Everything below is a *role*, and its value depends on
        // which room you are standing in — `text-ink` is plum-black on the
        // concierge side and green-black in the shop, and the component
        // asking for it neither knows nor cares which.
        //
        // That is the whole point. The app used to say `text-white/70` about
        // 176 times, which encoded two facts at once: "this is secondary
        // text" and "the ground behind it is dark". Relighting meant editing
        // every one of them because the second fact had changed. A role name
        // carries only the first, so the ground can change in one place.
        //
        // ── Why `rgb(var(--x) / <alpha-value>)` and not `var(--x)` ────────
        // Tailwind substitutes `<alpha-value>` textually — with `1` for a
        // bare `text-ink`, and with `0.7` for `text-ink/70`. That only works
        // if the variable holds SPACE-SEPARATED sRGB CHANNELS and nothing
        // else: `--ink: 31 16 51`. A variable holding `#1F1033` or
        // `rgb(31,16,51)` produces `rgb(#1F1033 / 1)`, which is garbage, and
        // the declaration is dropped.
        //
        // ── Every one of these MUST have a :root default ─────────────────
        // If `--ink` is unset, `rgb(var(--ink) / 1)` is invalid at computed-
        // value time. `color` then falls back to `inherit` (which usually
        // looks plausible, so nobody notices) but `background-color` falls
        // back to TRANSPARENT — an invisible panel with no error anywhere.
        // The defaults live at the top of index.css; do not remove them.
        //
        // Shadows are deliberately NOT here: `<alpha-value>` is only wired
        // for `colors`, so a tinted shadow cannot be a token this way. They
        // live as whole `box-shadow` strings in `--shadow-1` / `--shadow-2`,
        // consumed by the card classes in index.css.
        ink:            'rgb(var(--ink) / <alpha-value>)',
        'ink-soft':     'rgb(var(--ink-soft) / <alpha-value>)',
        'ink-mute':     'rgb(var(--ink-mute) / <alpha-value>)',
        'ink-faint':    'rgb(var(--ink-faint) / <alpha-value>)',
        surface:        'rgb(var(--surface) / <alpha-value>)',
        'surface-sunk': 'rgb(var(--surface-sunk) / <alpha-value>)',
        hairline:       'rgb(var(--hairline) / <alpha-value>)',
        accent:         'rgb(var(--accent) / <alpha-value>)',

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
        // Hero-scale cards only (occasion mosaic tiles, plan CTA card) —
        // the redesign's "soft depth" reads better with one size up from
        // the previous ceiling at that scale.
        '4xl': '2.5rem',
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
        // The soft bloom behind .glow-ring — breathes rather than blinks,
        // so a hero CTA reads as lit rather than as an alert.
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%':      { opacity: '0.9',  transform: 'scale(1.06)' },
        },
        // A barely-there drift for hero-scale decorative shapes — same
        // transform-only compositor budget as `float`, slower and smaller
        // so it reads as depth rather than as a bounce.
        'drift-soft': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%':      { transform: 'translate(6px, -6px)' },
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
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'drift-soft': 'drift-soft 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

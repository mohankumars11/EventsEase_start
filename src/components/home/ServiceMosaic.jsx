import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import RotatingPhoto from './RotatingPhoto'
import { MOSAIC_TILES, TILE_SPAN } from '../../config/homeMosaic'

/**
 * Everything Sambramo sells, as one mosaic.
 *
 * The tiles, their sizes, their routes and their photography are all declared in
 * config/homeMosaic.js — that file carries the reasoning about WHAT is on the
 * grid and why the spans differ. This file is only concerned with how a tile is
 * painted, and there are four decisions in it worth keeping.
 *
 * ── One grid, four columns, three tile sizes ──────────────────────────────
 * A four-column grid on a 390px phone gives each column ~88px, which is far too
 * narrow for a tile — and that is the point. Nothing occupies one column: the
 * sizes are 4-wide and 2-wide only, so the grid is really a two-column layout
 * with the ability to go full-bleed on any row. Four columns is what buys that
 * without a second grid or a media query.
 *
 * Row height is fixed (`auto-rows-[96px]`) rather than content-driven, because
 * `row-span-2` is meaningless against auto rows — a tall tile would size itself
 * to its own text and the mosaic would degrade into a ragged list. Fixed rows
 * are what make a 2×2 actually square and a hero actually twice as tall.
 *
 * ── The scrim is per-tile, and tinted with the tile's own accent ──────────
 * Every tile is white text on an uncontrolled photograph. The photos are
 * searched, not art-directed, so a tile cannot assume a dark image — the
 * balloon shots come back near-white and the carving shots near-black. Two
 * layers solve it the way OccasionCard already does: a full-height ramp for
 * overall legibility, then a near-solid floor under the words.
 *
 * The accent enters as a low-alpha wash in that floor rather than as a border or
 * a chip colour alone. That is what gives fourteen tiles fourteen identities
 * while keeping them one family: the hue differs, the value structure does not.
 *
 * ── Nothing here falls back to an emoji ──────────────────────────────────
 * `RotatingPhoto` takes an optional emoji plate for exactly that purpose and it
 * is deliberately not passed. Every tile has four committed HD frames (verified
 * in the config), so the fallback would be dead code — and an emoji sitting in a
 * grid this size does not read as a graceful degradation, it reads as a missing
 * image. If a URL ever 404s the tile shows its accent plate, which is a finished
 * surface rather than a shrug.
 *
 * ── The motion ────────────────────────────────────────────────────────────
 * Three layers, all compositor-only, and each doing a different job:
 *
 *   the photos       cross-fade every few seconds, staggered per tile so the
 *                    grid never flips as one block (which reads as a glitch).
 *   the entrance     `rise-in` on a per-index delay, so the mosaic assembles
 *                    as a wave rather than appearing.
 *   the heroes       a slow specular sweep, once per cycle. Only the two hero
 *                    tiles get it — on all fourteen it would be a strobe.
 *
 * All three are disabled under prefers-reduced-motion: RotatingPhoto stops
 * advancing on its own, and the sweep and the entrance are covered by the
 * blanket rule at the end of index.css.
 */

/* Photo dwell. Deliberately longer than the tier deck's and the film's: those
   are single panels a customer is looking AT, and this is fourteen panels a
   customer is scrolling PAST. Fast cross-fades on a full grid turn the page
   into a flicker in peripheral vision, which is the one motion failure people
   describe as the app feeling cheap. */
const DWELL_MS = 5200

export default function ServiceMosaic() {
  return (
    <section aria-labelledby="mosaic-heading" className="px-4">
      <div>
        <h2 id="mosaic-heading" className="text-[15px] font-extrabold text-ink">
          Everything we do
        </h2>
        <p className="mt-0.5 text-[11px] text-ink-mute">
          A whole celebration, a single service, or something delivered tomorrow.
        </p>
      </div>

      {/* `auto-rows` is the load-bearing property here — see the header. */}
      <div className="mt-3 grid grid-cols-4 gap-2.5 auto-rows-[96px]">
        {MOSAIC_TILES.map((tile, i) => (
          <Tile key={tile.id} tile={tile} index={i} />
        ))}
      </div>
    </section>
  )
}

function Tile({ tile, index }) {
  const hero = tile.size === 'hero'
  const band = tile.size === 'band'
  // A band is one row tall and full width, so its copy has to sit in a single
  // line beside the arrow rather than stacked — the only layout difference
  // between the sizes.
  const compact = tile.size === 'half'

  return (
    <Link
      to={tile.to}
      aria-label={`${tile.title} — ${tile.eyebrow}`}
      className={`group rise-in relative isolate overflow-hidden rounded-2xl ring-1 ring-hairline/10 shadow-[0_10px_28px_-18px_rgba(43,15,82,0.55)] transition-transform active:scale-[0.985] ${TILE_SPAN[tile.size]}`}
      style={{
        '--rise-delay': `${index * 70}ms`,
        // The accent plate under the photo. It is what shows for the one frame
        // before the first image decodes, and it is what a 404 leaves behind —
        // a tile in its own colour rather than a grey hole.
        backgroundColor: tile.accent,
      }}
    >
      <RotatingPhoto
        photos={tile.photos}
        alt={tile.alt}
        className="absolute inset-0 h-full w-full"
        interval={DWELL_MS}
        /* Prime numbers of milliseconds apart, so tiles that started together
           do not re-sync a few cycles later the way even multiples do. */
        stagger={index * 430}
      />

      {/* Legibility, in two layers. One ramp is not enough on a grid whose
          photographs run from a near-white balloon wall to a black granite
          carving — see the header. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/30 to-plum-950/5"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5"
        style={{
          background: `linear-gradient(to top, ${tile.accent}f2 0%, ${tile.accent}80 45%, transparent 100%)`,
        }}
      />

      {/* The specular sweep, heroes only. `sheen-on-hover` is the app's existing
          hover version of this; the heroes run it on a loop because they are the
          two tiles that have to hold attention rather than reward a pointer, and
          a phone has no hover to reward. */}
      {hero && <span aria-hidden="true" className="mosaic-sweep" />}

      <span
        className={`absolute inset-x-0 bottom-0 flex items-end gap-2 ${
          hero ? 'p-4' : compact ? 'p-2.5' : 'p-3'
        }`}
      >
        <span className="min-w-0 flex-1">
          {/* `truncate` on everything below hero, and it is not belt-and-braces.
              A row is a fixed 96px, so an eyebrow that wraps to two lines does
              not push the tile taller — it pushes the TITLE down into the
              tile's own bottom edge and the two overlap. Uppercase at 0.14em
              tracking is wide, and "Stone, sandalwood, cast metal" wrapped on a
              half tile the first time this rendered. The copy in the config was
              shortened for the same reason; this is the guarantee that no
              future edit can reintroduce the collision. */}
          <span
            className={`block font-extrabold uppercase tracking-[0.14em] text-white/85 ${
              hero ? 'text-[10px]' : 'truncate text-[9px]'
            }`}
          >
            {tile.eyebrow}
          </span>

          <span
            className={`mt-1 block font-serif font-extrabold leading-[1.06] text-white drop-shadow-sm ${
              hero ? 'text-[23px] sm:text-[27px]' : compact ? 'text-[13px]' : 'text-[16px]'
            }`}
          >
            {tile.title}
          </span>

          {/* The supporting line is the first thing to go when the tile is
              small — on a half tile the title and the arrow are the payload,
              and a clamped third line is worse than no third line. */}
          {tile.body && !compact && (
            <span
              className={`mt-1 block leading-snug text-white/80 ${
                hero ? 'text-[12px]' : 'line-clamp-1 text-[10px]'
              }`}
            >
              {tile.body}
            </span>
          )}

          {/* Only the heroes get a real button. Fourteen buttons on one screen
              is fourteen things shouting, and every tile is already a link —
              the arrow is the affordance for the other twelve. */}
          {hero && tile.cta && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12px] font-extrabold text-plum-950 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)]">
              {tile.cta}
              <ArrowRight size={13} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </span>

        {!hero && (
          <span
            className={`flex shrink-0 items-center justify-center rounded-full bg-white/95 text-plum-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              band ? 'h-8 w-8' : 'h-7 w-7'
            }`}
          >
            <ArrowUpRight size={band ? 16 : 14} strokeWidth={2.8} />
          </span>
        )}
      </span>
    </Link>
  )
}

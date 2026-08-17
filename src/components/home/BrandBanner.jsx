import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'
import { BRAND } from '../../config/sambramo'
import { CATALOG_STATS, OCCASIONS } from '../../data/planCatalog'
import { CATALOGUE_PHOTOS } from '../../config/imagery'
import { formatINR } from '../../utils/format'

/**
 * The masthead bar, and — separately, underneath it — the two doors.
 *
 * ── Why these are now two things and not one panel ────────────────────────
 * They were one rounded plum card holding the logo, the caption and both
 * doors. That was wrong in a way worth naming, because it is a mistake that
 * looks tidy: it put two NAVIGATION CARDS inside a BRAND OBJECT. A masthead
 * and a pair of destinations are different kinds of thing — one you read once
 * and never touch, the other you press — and nesting the second in the first
 * made the doors look like decoration printed on a banner rather than the two
 * most important controls on the screen.
 *
 * It also meant the doors sat on plum. Every other card in this app sits on
 * white, so the two that matter most were the two that did not match, and
 * their photographs had to fight a dark ground before they could show anything.
 *
 * So:
 *
 *   the bar     Full-bleed, square-cornered, edge to edge. Logo, name, caption.
 *               It is a masthead — the thing at the top of a newspaper — and a
 *               masthead runs the full measure or it is just a box.
 *   the doors   Directly below it, on the page's own white, as two ordinary
 *               cards that happen to be large. Same card language as
 *               everything else on Home.
 *
 * ── Why the bar is square and full-bleed ──────────────────────────────────
 * A rounded card inset 16px reads as CONTENT — a thing on the page. A bar that
 * touches both edges and the chrome above it reads as STRUCTURE — a thing the
 * page is built from. The brand should be structure. The rounded version was,
 * quite literally, an advert for Sambramo placed inside Sambramo's own app,
 * which is the tell that it was the wrong object.
 *
 * ── The motion ────────────────────────────────────────────────────────────
 * The kolam turns, very slowly. Four-fold rotational symmetry means it maps
 * onto itself every 90°, so it can turn indefinitely without ever becoming a
 * different shape — the property that makes it safe to animate a logo at all.
 * The ground drifts on a 34s cycle, which nobody watches happen; they notice,
 * coming back, that it is not where it was.
 */

/* The photograph behind each door. Committed URLs, not a runtime search — the
   live-search budget is 24 per page load app-wide and the mosaic below already
   has fourteen tiles that need none of it. */
const PLAN_PHOTO = OCCASIONS.find(o => o.id === 'wedding')?.photos?.[0]
  ?? OCCASIONS.find(o => o.photos?.length)?.photos?.[0]
  ?? null
const SHOP_PHOTO = CATALOGUE_PHOTOS['Cakes']?.['Birthday']
  ?? CATALOGUE_PHOTOS['Flowers']?.['Anniversary']
  ?? null

export default function BrandBanner() {
  return (
    /* One child of Home's section flow, not two: the doors belong to the bar
       and must not be separated by the page's full inter-section gap. */
    <div className="space-y-2.5">
      {/* ── The bar ──────────────────────────────────────────────────
          No horizontal inset, no radius. It spans the glass and butts
          against the search bar above it, so the brand reads as part of
          the app's frame rather than as the first card in the feed. */}
      <section className="brand-banner relative isolate overflow-hidden px-4 py-3" aria-label={BRAND.name}>
        <span
          aria-hidden="true"
          className="animate-spin-slow pointer-events-none absolute -right-8 -top-12 opacity-[0.12]"
        >
          <SambramoMark size={140} title="" />
        </span>

        <div className="relative mx-auto flex max-w-3xl items-center gap-2.5">
          <SambramoMark size={28} className="shrink-0" />
          <h1 className="font-display text-[23px] font-bold leading-none tracking-tight text-white">
            {BRAND.name}
          </h1>
          <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-white/25" />
          <p className="min-w-0 flex-1 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-plum-200">
            {BRAND.emotion}
          </p>
        </div>
      </section>

      {/* ── The doors ────────────────────────────────────────────────
          On white, below the bar, as two ordinary cards. This is the only
          place on Home where both halves of the business are offered
          together — every other CTA belongs to one specific shelf.

          Side by side and equal in weight. Events are the primary revenue
          line and the temptation is to make that door bigger, but a
          customer who wants a cake tonight and is shown a wedding is a
          customer who leaves. The mosaic below already leads with events;
          this row's job is to make the fork legible, not to pick a side. */}
      <section className="px-4" aria-label="Plan a celebration, or shop the essentials">
        <div className="grid grid-cols-2 gap-2.5">
          <Door
            to="/plan"
            photo={PLAN_PHOTO}
            eyebrow="We arrange it"
            label="Plan a celebration"
            /* Computed, never typed. CATALOG_STATS is derived from the same
               EVENT_DATA the catalogue itself renders, so this cannot claim an
               occasion that is not on sale. */
            fact={`${CATALOG_STATS.occasions} occasions · from ${formatINR(CATALOG_STATS.fromPrice)}`}
            tint="rgba(109,40,217,0.34)"
          />
          <Door
            to="/shop"
            photo={SHOP_PHOTO}
            eyebrow="Delivered to you"
            label="Shop the essentials"
            fact="Cakes, gifts, flowers, pooja"
            tint="rgba(14,82,60,0.34)"
          />
        </div>
      </section>
    </div>
  )
}

/**
 * One door. A photograph you can see through, a label, and a fact.
 *
 * ── Why these are panels and not buttons ──────────────────────────────────
 * Two pills reading "Plan a celebration" and "Shop the essentials" are two
 * labels. They say the two things exist and nothing about either, so the choice
 * is made on the words alone — and to a first-time visitor those words are
 * nearly synonymous.
 *
 * These are doors you can see through. Each carries a real photograph from that
 * half of the catalogue and a real number: the count of occasions and the honest
 * entry price on one, the shelves on the other. The photograph persuades, the
 * number qualifies, and the label just names the door.
 *
 * The tint is a light per-door wash — plum for the concierge half, forest for
 * the shop — because that is the colour rule the whole app runs on. It is a
 * wash and not a scrim: all the text contrast comes from the bottom ramp, so
 * the tint can stay light enough that the photograph is still a photograph.
 */
function Door({ to, photo, eyebrow, label, fact, tint }) {
  return (
    <Link
      to={to}
      className="group relative isolate flex min-h-[104px] flex-col justify-end overflow-hidden rounded-2xl p-2.5 shadow-[var(--shadow-1)] ring-1 ring-hairline/10 transition-transform active:scale-[0.98]"
    >
      {photo && (
        <img
          src={photo}
          alt=""
          loading="eager"
          fetchpriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: tint }} />
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      <span className="flex items-start justify-between gap-1">
        <span className="min-w-0">
          <span className="block text-[8px] font-extrabold uppercase tracking-[0.12em] text-white/75">
            {eyebrow}
          </span>
          <span className="mt-0.5 block text-[12.5px] font-extrabold leading-tight text-white">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[9px] font-medium text-white/70">
            {fact}
          </span>
        </span>
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/95 text-plum-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight size={11} strokeWidth={3} />
        </span>
      </span>
    </Link>
  )
}

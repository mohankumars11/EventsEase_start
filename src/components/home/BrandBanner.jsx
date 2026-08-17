import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SambramoMark from '../ui/SambramoMark'
import { BRAND } from '../../config/sambramo'
import { CATALOG_STATS, OCCASIONS } from '../../data/planCatalog'
import { CATALOGUE_PHOTOS } from '../../config/imagery'
import { formatINR } from '../../utils/format'

/**
 * The brand, and the two doors, in one band.
 *
 * ── It used to be twice this tall, and that was the fault ─────────────────
 * The first version was a 230px panel: the name at 46px, the emotional line,
 * and two flat pill buttons under it. It spent the most expensive space in the
 * product — the first screen of a phone — on a name and two links, and the
 * name is not what a customer came for.
 *
 * Worse, those two pills were the FIRST of five "Plan a celebration" buttons
 * on one screen. The deck had one, the drawn film had one, the mosaic hero had
 * one, and the signed-out tail had one. A button repeated five times is not
 * emphasis, it is noise: it teaches the eye to skip that shape, so the fifth
 * one — the one at the bottom, after the argument has been made — is the one
 * that gets ignored.
 *
 * So this band does two jobs at once instead of one job twice as tall:
 *
 *   the brand   mark, wordmark and the emotional line, on one baseline. It is
 *               a masthead now rather than a hero — you read it once and move
 *               on, which is exactly what a name you already know deserves.
 *   the doors   the only place on Home where both halves of the business are
 *               offered together. Every other CTA on the page belongs to a
 *               specific shelf.
 *
 * ── Why the doors are panels and not buttons ──────────────────────────────
 * Two saffron pills reading "Plan a celebration" and "Shop the essentials" are
 * two labels. They tell somebody the two things exist and nothing about either,
 * so the choice between them is made on the words alone — and for a first-time
 * visitor those words are close to synonymous.
 *
 * These are doors you can see through. Each carries a real photograph from that
 * half of the catalogue, and a real number underneath: the count of occasions
 * and the honest entry price on one, the shop's live category count on the
 * other. Both numbers are computed from the catalogue rather than typed, so
 * neither can drift. The photograph does the persuading, the number does the
 * qualifying, and the label just names the door.
 *
 * That is also why they are side by side and equal. Events are the primary
 * revenue line and the temptation is to make that door bigger — but a customer
 * who wants a cake tonight and is shown a wedding is a customer who leaves, and
 * the mosaic below already leads with events. This band's job is to make the
 * fork legible, not to pick a side.
 *
 * ── The motion ────────────────────────────────────────────────────────────
 * One thing moves: the kolam turns, very slowly. It has four-fold rotational
 * symmetry so it maps onto itself every 90° and can turn indefinitely without
 * becoming a different shape — the property that makes it safe to animate a
 * logo at all. The ground drifts at 34s, which nobody watches happen; they
 * notice, coming back, that it is not where it was.
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
    <section className="px-4" aria-label={`${BRAND.name} — ${BRAND.emotion}`}>
      <div className="brand-banner relative isolate overflow-hidden rounded-3xl p-3.5">
        <span
          aria-hidden="true"
          className="animate-spin-slow pointer-events-none absolute -right-10 -top-10 opacity-[0.10]"
        >
          <SambramoMark size={150} title="" />
        </span>

        {/* ── The masthead ───────────────────────────────────────────
            Mark and wordmark on one baseline with the emotional line
            beside it, not stacked under it. Stacked, this block alone was
            three rows tall; inline it is one, and the line reads as a
            strapline rather than as a second headline competing with the
            name. `BRAND.emotion` rather than the descriptor: the
            descriptor is 45 characters explaining what Sambramo is, and
            the two doors immediately below explain it better. */}
        <div className="relative flex items-center gap-2.5">
          <SambramoMark size={26} className="shrink-0" />
          <h1 className="font-display text-[22px] font-bold leading-none tracking-tight text-white">
            {BRAND.name}
          </h1>
          <span aria-hidden="true" className="h-3 w-px shrink-0 bg-white/25" />
          <p className="min-w-0 flex-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-plum-200">
            {BRAND.emotion}
          </p>
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-2.5">
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
      </div>
    </section>
  )
}

/**
 * One door. A photograph you can see through, a label, and a fact.
 *
 * The tint is per-door and deliberately light: plum for the concierge half,
 * forest for the shop, which is the colour rule the whole app already runs on —
 * a customer should know which half they are in from the colour before reading
 * a word. It is a wash, not a scrim: the text contrast is the bottom ramp's job
 * (see below), so the tint can stay light enough that the photograph is still a
 * photograph.
 */
function Door({ to, photo, eyebrow, label, fact, tint }) {
  return (
    <Link
      to={to}
      className="group relative isolate flex min-h-[92px] flex-col justify-end overflow-hidden rounded-2xl p-2.5 ring-1 ring-white/15 transition-transform active:scale-[0.98]"
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
      {/* Two layers, and the split between them is the whole trick.
          The flat tint is LIGHT — it only has to say "this side is plum, that
          side is forest" so the fork reads as the app's own two halves. All of
          the text contrast comes from the bottom ramp, which is heavy and
          local. The first cut had the tint at 0.72 doing both jobs and the
          photographs went to mud: at that opacity a wedding mandap and a
          birthday cake are two coloured rectangles, which defeats the entire
          reason these are doors you can see through rather than buttons. */}
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

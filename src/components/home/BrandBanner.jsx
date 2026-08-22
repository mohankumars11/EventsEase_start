import SambramoMark from '../ui/SambramoMark'
import { BRAND } from '../../config/sambramo'

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

    </div>
  )
}

import { ArrowRight } from 'lucide-react'

/**
 * A section with nothing in it, saying why and what would fill it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * AN EMPTY SECTION IS THE SCREEN MOST PARTNERS SEE MOST OFTEN
 * ══════════════════════════════════════════════════════════════════════
 *
 * A new partner opens Jobs and every section is empty. That is the
 * normal, expected, correct state of the app for their first days on
 * it -- and it is the state that decides whether they come back.
 *
 * "No jobs yet" answers a question nobody asked. The partner can see
 * there are no jobs. What they cannot see is WHY, or whether it is
 * their fault, or what would change it. Silence there reads as "this
 * app does not work", and a partner who concludes that stops opening it
 * long before the first offer would have arrived.
 *
 * So each empty state says the same three things in order:
 *
 *   1. what belongs here
 *   2. what has to be true for something to appear
 *   3. the one thing they can do about it, if there is one
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT MUST NOT PROMISE WORK
 * ══════════════════════════════════════════════════════════════════════
 *
 * "Keep your calendar updated and you will get more jobs" is a
 * guarantee this marketplace cannot make -- demand is a customer's
 * decision, not ours. Every line here says what it ENABLES: "so we can
 * match you", "so we can offer you these days". That is true, it is the
 * actual mechanism, and it survives a month where nothing comes in.
 *
 * ── Why not ScreenState ─────────────────────────────────────────────
 * `ScreenState empty` is the right look and is used everywhere, but it
 * takes `action` as an opaque node, so every caller hand-rolls its own
 * button and they drift. This owns the button, takes a route, and keeps
 * ScreenState's exact visual language so the two are indistinguishable
 * on screen.
 */
export default function PartnerEmptyState({
  icon: Icon,
  title,
  message,
  ctaLabel = null,
  onCta = null,
  /* Rendered under the CTA in smaller type: the mechanism, for a
     partner who wants to know how the matching actually decides. Kept
     separate from `message` so it can be skipped on a crowded tab. */
  footnote = null,
  'data-empty': dataEmpty,
}) {
  return (
    <div
      data-empty={dataEmpty}
      className="rounded-[18px] bg-ink/[0.02] px-5 py-6 text-center"
    >
      {Icon && (
        <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-plum-600/10 text-plum-700">
          <Icon size={18} />
        </span>
      )}

      <p className="text-[13.5px] font-extrabold text-ink">{title}</p>

      {message && (
        <p className="mx-auto mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-ink-mute">
          {message}
        </p>
      )}

      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-plum-600 px-4 text-[12.5px] font-extrabold text-white transition active:scale-[0.98]"
        >
          {ctaLabel} <ArrowRight size={13} />
        </button>
      )}

      {footnote && (
        <p className="mx-auto mt-2.5 max-w-[36ch] text-[11.5px] leading-snug text-ink-faint">
          {footnote}
        </p>
      )}
    </div>
  )
}

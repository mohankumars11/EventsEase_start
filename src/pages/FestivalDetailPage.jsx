import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CalendarDays, Bell, Check, Sparkles, ArrowRight, Lock } from 'lucide-react'
import { FESTIVALS } from '../data/festivals'
import { UPCOMING_FESTIVALS } from '../data/eventServicesData'
import { BRAND } from '../config/sambramo'
import AppBar from '../components/layout/AppBar'
import RemoteImage from '../components/common/RemoteImage'
import { useCity } from '../context/CityContext'
import { recordInterest, answerFor, flushPending } from '../lib/festivalInterest'

/**
 * A festival, behind a locked door — and the door asks a question.
 *
 * ── Why this page is a lock and not a catalogue ───────────────────────────
 * It used to be a full festival page: the foods, the rituals, the menu
 * packages, the gift hampers. Every one of those was aspirational. We do not
 * yet sell a Diwali package, and a page that lists one is a promise the
 * business cannot keep — which is the same mistake the storefront made and
 * the reason it is gone.
 *
 * So it says what is true: we are building this, it is not open yet.
 *
 * ── Why an apology is not enough ──────────────────────────────────────────
 * A locked door that only apologises wastes the most valuable property it
 * has: it is standing in front of somebody who arrived already wanting this
 * exact thing, on their own initiative, before we advertised it. That is the
 * highest-intent traffic in the app and it is seasonal — it will not be back
 * for eleven months.
 *
 * So the door asks one question, and it is one tap to answer. Not a form: an
 * email field converts a fraction of what a button does, and we do not need
 * an email to learn what we are actually trying to learn.
 *
 * ── Why NO is a button and not an absence ─────────────────────────────────
 * The tempting design is a single "Notify me". It measures nothing. "Forty
 * people opened Diwali and two tapped notify" is a very different fact from
 * "forty opened it and thirty-eight said no", and only the second design can
 * tell them apart — the first reads both as two signups. A no is cheap for
 * the customer to give and is the answer that stops us building the wrong
 * festival first.
 */
export default function FestivalDetailPage() {
  const { id } = useParams()
  const { city } = useCity()
  /* Two lists, and the rail is built from the longer one. FESTIVALS has
     eight richly described festivals; UPCOMING_FESTIVALS has nine with a name,
     a date and an emoji — and five of those nine are not in FESTIVALS at all.
     Those five are exactly the ones that used to be routed into shop shelves
     because they had no page of their own.

     Falling back means every tile in "Coming up" lands on a page that knows
     what it is called and when it falls, instead of five of them reading
     "We're still building This festival". */
  const rich = FESTIVALS.find(f => f.id === id)
  const listed = UPCOMING_FESTIVALS.find(f => f.id === id)
  const festival = rich ?? listed ?? null

  const [answer, setAnswer] = useState(() => answerFor(id))
  const [busy, setBusy] = useState(false)

  // Replay anything captured while migration 055 was still unapplied. Silent,
  // and this is the one screen where the round trip is already being paid.
  useEffect(() => { flushPending() }, [])

  // Reset when moving between festivals; the component is reused across ids.
  useEffect(() => { setAnswer(answerFor(id)) }, [id])

  async function answerWith(value) {
    if (busy) return
    setBusy(true)
    setAnswer(value)            // optimistic: the tap must feel instant
    await recordInterest({
      festivalId: id,
      festivalName: festival?.name ?? id,
      answer: value,
      city,
    })
    setBusy(false)
  }

  // An id in neither list still gets a real page rather than "not found" —
  // a shared link outliving a renamed festival should land on the same honest
  // answer as everything else here, which is that we are not open for it yet.
  const name = festival?.name ?? 'This festival'
  const emoji = festival?.emoji ?? '🪔'
  /* FESTIVALS carries a human month ("October – November · 5 days");
     UPCOMING_FESTIVALS carries a real date. Prefer the prose, fall back to
     the date formatted the way the rest of the app formats dates. */
  const when = rich?.month
    ? `${rich.month}${rich.duration ? ` · ${rich.duration}` : ''}`
    : listed?.date
      ? new Date(listed.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

  return (
    <div className="a-canvas min-h-screen pb-bottom-nav">
      <AppBar backTo="/" title={name} subtitle={when ?? undefined} />

      <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 space-y-4">

        {/* ── The festival, as itself ──────────────────────────────────
            The lock is the message, but leading with it makes the page an
            error. The photograph and the date come first so the screen is
            still about the festival somebody came looking for. */}
        <div className="a-card overflow-hidden">
          <div className="brand-aqua relative h-40">
            <RemoteImage
              query={festival ? `${festival.name} festival India celebration` : 'Indian festival celebration'}
              emoji={emoji}
              alt=""
              className="absolute inset-0 h-full w-full"
              cinematic
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-royal-800 backdrop-blur-[2px]">
              <Lock size={10} strokeWidth={3} /> Not open yet
            </span>
          </div>

          <div className="px-4 py-3.5">
            <h1 className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">
              {name}
            </h1>
            {when && (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute">
                <CalendarDays size={13} className="shrink-0 text-royal-700" />
                {when}
              </p>
            )}
            {rich?.tagline && (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{rich.tagline}</p>
            )}
          </div>
        </div>

        {/* ── The lock, and the question ───────────────────────────────── */}
        <div className="a-card overflow-hidden">
          <div className="a-rail px-4 pb-4 pt-5">
            <h2 className="text-[16px] font-extrabold tracking-tight text-ink">
              We're still building {name}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Doing a festival properly means the priest, the decor, the food and
              the timings all lined up for that one date — and we would rather
              open it late than sell you a version of it that is not ready.
              It is being put together for {BRAND.pilotCities.join(' and ')} now.
            </p>

            {answer === null ? (
              <>
                <p className="mt-4 text-[13.5px] font-extrabold text-ink">
                  Are you waiting for this one?
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  One tap. It decides which festival we finish first.
                </p>

                <div className="mt-3 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => answerWith('yes')}
                    disabled={busy}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full brand-aqua-chip px-4 text-[13.5px] font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(12,53,67,0.95)] transition-transform active:scale-[0.97] disabled:opacity-60"
                  >
                    <Bell size={15} strokeWidth={2.6} /> Yes, notify me
                  </button>
                  <button
                    type="button"
                    onClick={() => answerWith('no')}
                    disabled={busy}
                    className="min-h-[48px] shrink-0 rounded-full px-5 text-[13.5px] font-extrabold text-ink-soft outline outline-1 -outline-offset-1 outline-ink/15 transition-transform active:scale-[0.97] disabled:opacity-60"
                  >
                    Not this one
                  </button>
                </div>
              </>
            ) : (
              /* ── After the tap ──────────────────────────────────────
                 Both answers are thanked, and neither is undone silently —
                 the control stays visible so somebody who mis-tapped can
                 change it, which is also how a no becomes a yes later. */
              <div className="mt-4">
                <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white">
                    <Check size={13} strokeWidth={3.2} />
                  </span>
                  {answer === 'yes' ? "You're on the list" : 'Noted — thank you'}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                  {answer === 'yes'
                    ? `We'll message you the moment ${name} opens in ${city ?? BRAND.pilotCities[0]}. No other mail, ever.`
                    : 'That is genuinely useful — it tells us where not to spend the next month.'}
                </p>
                <button
                  type="button"
                  onClick={() => answerWith(answer === 'yes' ? 'no' : 'yes')}
                  disabled={busy}
                  className="mt-2.5 text-[11.5px] font-extrabold text-royal-700 underline underline-offset-2 disabled:opacity-60"
                >
                  {answer === 'yes' ? 'Actually, take me off' : 'Changed my mind — notify me'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── The thing that IS open ───────────────────────────────────
            A locked page with no way forward is a dead end. Every occasion
            in the catalogue is priced and bookable today, and a festival is
            a gathering — most of what somebody wants for one is already
            here under another name. */}
        <Link
          to="/plan"
          className="a-card flex items-center gap-3.5 p-4 transition-transform active:scale-[0.985]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-plum-700 to-plum-500 text-white">
            <Sparkles size={19} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-extrabold leading-snug text-ink">
              A gathering at home, though — that we can do now
            </span>
            <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-soft">
              Decor, catering, a priest and photography, priced before you commit.
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-royal-700" />
        </Link>
      </div>
    </div>
  )
}

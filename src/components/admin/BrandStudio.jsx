import { useState, useEffect, useRef } from 'react'
import { UploadCloud, RotateCcw, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast, friendlyError } from '../../context/ToastContext'
import { fetchBranding, uploadLogo, clearLogo, invalidateBranding } from '../../lib/branding'
import { Monogram } from '../ui/SambramoWordmark'
import SambramoWordmark from '../ui/SambramoWordmark'
import { SectionHead } from './viz/Primitives'

/**
 * The logo, uploadable.
 *
 * ── Why this screen exists ────────────────────────────────────────────────
 * The mark the app draws is a Spencerian capital set in a licensed face. It
 * is close to the brand's own artwork and it is not that artwork, and no
 * amount of tuning a font makes it so — commissioned lettering and a
 * typeface glyph are different objects.
 *
 * So rather than keep approximating, the brand uploads the real file here
 * and every surface picks it up: both app bars, the tab bar, every
 * celebration card's hallmark, the planner, the admin rail, both auth
 * screens and the first-open splash. They all draw through one component, so
 * this replaces the mark in all of them at once.
 *
 * ── The previews are the real components ──────────────────────────────────
 * Not a styled <img> approximating them. Everything below renders the actual
 * Monogram and SambramoWordmark the app ships, on the two grounds it ships
 * on and at the four sizes it ships at — because the interesting failures of
 * a logo are all about size and ground. A mark that is beautiful at 132px on
 * navy and illegible at 20px on white is a mark somebody will upload, and
 * this screen is the only place that can be found out before customers do.
 */
export default function BrandStudio() {
  const { profile } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)

  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)   // forces previews to re-read

  useEffect(() => {
    fetchBranding().then(setCurrent)
  }, [nonce])

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''            // so re-picking the same file still fires
    if (!file) return

    setBusy(true)
    try {
      await uploadLogo(file, { userId: profile?.id })
      setNonce(n => n + 1)
      toast.success('Logo updated — it is live on every screen.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not upload that file.'))
    } finally {
      setBusy(false)
    }
  }

  async function onReset() {
    setBusy(true)
    try {
      await clearLogo()
      setNonce(n => n + 1)
      toast.success('Back to the drawn mark.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not reset the logo.'))
    } finally {
      setBusy(false)
    }
  }

  const hasUpload = !!current?.url

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <SectionHead
          title="The logo"
          sub="Upload the brand's own artwork. It replaces the drawn mark everywhere in the app — app bars, the tab bar, every celebration card, the auth screens and the first-open splash."
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl brand-aqua-chip px-4 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {hasUpload ? 'Replace logo' : 'Upload logo'}
          </button>

          {hasUpload && (
            <button
              type="button"
              onClick={onReset}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold text-gray-700 outline outline-1 -outline-offset-1 outline-gray-300 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <RotateCcw size={15} /> Use the drawn mark
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onPick}
            className="sr-only"
          />
        </div>

        <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-gray-500">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {/* Square and transparent are not style preferences — they are what
              the component does with the file. It draws into a square box
              with object-contain, so a wide file gets letterboxed, and it
              sits on navy in three places and white in five, so a baked-in
              background will show as a rectangle on one of them. */}
          <span>
            <strong className="font-bold text-gray-700">PNG with a transparent background, roughly square, at least 400×400.</strong>{' '}
            SVG is better if you have it. The mark is drawn into a square and sits on
            navy in some places and white in others, so a file with its own background
            will show as a rectangle on one of them.
          </span>
        </p>

        {hasUpload && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
            <Check size={14} /> A custom logo is live.
          </p>
        )}
      </div>

      {/* ── The two grounds ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-2.5 text-[12px] font-bold text-gray-600">
            On the aqua ground — the splash
          </div>
          <div key={`dark-${nonce}`} className="brand-aqua flex items-center justify-center px-6 py-10">
            <SambramoWordmark size={92} layout="stacked" onLight={false} registered />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-2.5 text-[12px] font-bold text-gray-600">
            On white — the app bar
          </div>
          <div key={`light-${nonce}`} className="flex items-center justify-center bg-white px-6 py-10">
            <SambramoWordmark size={40} layout="inline" />
          </div>
        </div>
      </div>

      {/* ── The sizes it is actually drawn at ────────────────────────────── */}
      <div className="card p-5">
        <SectionHead
          title="Every size it ships at"
          sub="The small ones are where a logo fails. 20px is the tab bar and the card hallmark; if the mark is unreadable there, it is unreadable in the two places a customer sees it most."
        />
        <div key={`sizes-${nonce}`} className="mt-4 flex flex-wrap items-end gap-6">
          {[132, 64, 40, 26, 20].map(px => (
            <div key={px} className="flex flex-col items-center gap-2">
              <div className="flex h-[140px] items-end">
                <Monogram size={px} />
              </div>
              <span className="text-[11px] font-semibold text-gray-500">{px}px</span>
            </div>
          ))}
        </div>

        <div key={`seal-${nonce}`} className="mt-6">
          <p className="mb-2 text-[12px] font-bold text-gray-600">The card seal, on the aqua ground</p>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px]">
            <Monogram size={26} />
          </span>
        </div>
      </div>
    </div>
  )
}

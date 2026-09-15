import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { uploadAvatar, removeAvatar, initialsFor } from '../../lib/partnerAvatar'

/**
 * The photograph, and the control for changing it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONE COMPONENT, TWO SIZES, SO THEY CANNOT DRIFT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The same face appears in the Jobs header at 40px and in More at 64px
 * with an edit affordance. Written twice, the fallback initials would
 * eventually be computed two different ways and a partner would see
 * different letters in two places on the same screen.
 *
 * `editable` is what separates them. Without it this is an image and
 * nothing else — no tap target in a header where every tap should go
 * somewhere deliberate.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT SAYS THAT IT IS PUBLIC
 * ══════════════════════════════════════════════════════════════════════
 *
 * The bucket is public, unlike the documents bucket, because an avatar
 * is meant to be seen and signing a URL per row in a list would be a
 * round trip a customer waits on. A partner uploading a photograph
 * should know that before they choose one, not after.
 */
export default function PartnerAvatar({
  vendorId, url, name, size = 40, editable = false, onChange,
}) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [hidden, setHidden] = useState(false)

  const initials = initialsFor(name)
  const px = `${size}px`

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''            // so the same file can be picked twice
    if (!file) return
    setBusy(true); setError(null)
    const res = await uploadAvatar(vendorId, file)
    setBusy(false)
    if (!res.ok) { setError(res.says); return }
    onChange?.(res.url)
  }

  async function clear() {
    setBusy(true); setError(null)
    const res = await removeAvatar(vendorId, url)
    setBusy(false)
    if (!res.ok) { setError(res.says ?? 'That did not save.'); return }
    onChange?.(null)
  }

  /* The circle itself. `hidden` covers a URL that 404s — a stored path
     whose object was removed underneath it renders as a broken image
     icon, which looks like a bug in the app rather than a missing
     picture. Falling back to initials is indistinguishable from never
     having uploaded one, which is the right outcome. */
  const face = (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-saffron-400 font-serif font-extrabold text-plum-950"
      style={{ width: px, height: px, fontSize: `${Math.round(size * 0.38)}px` }}
    >
      {url && !hidden ? (
        <img
          src={url}
          alt=""
          onError={() => setHidden(true)}
          className="h-full w-full object-cover"
        />
      ) : initials}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-plum-950/60">
          <Loader2 size={Math.round(size * 0.4)} className="animate-spin text-white" />
        </span>
      )}
    </span>
  )

  if (!editable) return face

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="relative"
          aria-label={url ? 'Change your photo' : 'Add a photo'}
        >
          {face}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-plum-700 text-white ring-2 ring-white">
            <Camera size={12} />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold leading-tight text-ink">
            {url ? 'Your photo' : 'Add a photo'}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">
            Customers and our team see this. It is not required — without one
            we show your initials.
          </p>
        </div>

        {url && !busy && (
          <button
            type="button" onClick={clear} aria-label="Remove your photo"
            className="shrink-0 rounded-full p-2 text-ink-mute"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-[12px] font-semibold text-rose-700">{error}</p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={pick}
        className="hidden"
      />
    </div>
  )
}

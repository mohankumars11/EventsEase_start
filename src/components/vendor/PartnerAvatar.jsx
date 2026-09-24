import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2, Images, Eye, X } from 'lucide-react'
import { uploadAvatar, removeAvatar, initialsFor } from '../../lib/partnerAvatar'
import ImageCropper from '../partner/ImageCropper'

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
  /* A SECOND file input, carrying `capture`. One input cannot both open
     the camera and open the gallery: `capture="user"` is a hint the
     Android picker obeys by launching the camera straight away, which
     is right for "Take photo" and wrong for "Choose from gallery". */
  const cameraInput = useRef(null)
  /* WhatsApp, Instagram and every other app that owns a profile picture
     open a sheet here rather than the raw file chooser. See the header. */
  const [sheet, setSheet] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [hidden, setHidden] = useState(false)
  /* The file the partner just chose, waiting to be positioned. Picking
     one no longer uploads it. */
  const [cropping, setCropping] = useState(null)

  const initials = initialsFor(name)
  const px = `${size}px`

  /* ── Chosen, then positioned, then uploaded ─────────────────────
     This used to upload the file the instant it was picked. A phone
     photograph is 4:3 and the avatar is a circle, so the app
     centre-cropped on the partner's behalf and their face came out
     half outside the ring, with no way back except taking another
     photograph. The cropper is where that decision moves to them. */
  function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''            // so the same file can be picked twice
    if (!file) return
    setError(null)
    setCropping(file)
  }

  async function upload(file) {
    setCropping(null)
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
          onClick={() => (url ? setSheet(true) : input.current?.click())}
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
      <input
        ref={cameraInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        onChange={pick}
        className="hidden"
      />

      {sheet && (
        <PhotoSheet
          hasPhoto={!!url && !hidden}
          onCamera={() => { setSheet(false); cameraInput.current?.click() }}
          onGallery={() => { setSheet(false); input.current?.click() }}
          onView={() => { setSheet(false); setViewing(true) }}
          onRemove={() => { setSheet(false); clear() }}
          onClose={() => setSheet(false)}
        />
      )}

      {viewing && url && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/90 p-6"
          onClick={() => setViewing(false)}
          role="dialog"
          aria-label="Your photo"
        >
          <img src={url} alt="" className="max-h-[80vh] max-w-full rounded-[20px] object-contain" />
          <button
            type="button"
            onClick={() => setViewing(false)}
            aria-label="Close"
            className="absolute right-4 top-[calc(16px+env(safe-area-inset-top,0px))] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {cropping && (
        <ImageCropper
          file={cropping}
          onCancel={() => setCropping(null)}
          onDone={upload}
        />
      )}
    </div>
  )
}

/**
 * The sheet WhatsApp opens when you tap your own picture.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A SHEET AND NOT THE FILE CHOOSER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Tapping the circle used to open Android's file chooser directly. That
 * is one press fewer, and it is worse in three ways that matter to
 * somebody who has already got a photo on there:
 *
 *   · Taking a new one means going through the chooser to find the
 *     camera, which is two more presses, not one fewer.
 *   · There is no way to LOOK at the photo you have. The only copy a
 *     partner can see is 64 pixels across, and whether their face is
 *     actually in the circle is the thing they most want to check.
 *   · Removing it is a bin icon in the corner of a row, which reads as
 *     "delete this row" more than "remove the photograph".
 *
 * Every app that owns a profile picture solves this the same way, and a
 * partner already knows how it works before they see it. That is the
 * argument: not that it is prettier, but that it is a thing they have
 * used a hundred times.
 *
 * Offered only when there IS a photo. With none, there is nothing to
 * view and nothing to remove, so two of the four rows would be dead and
 * the sheet would be a menu in front of a single choice.
 */
function PhotoSheet({ hasPhoto, onCamera, onGallery, onView, onRemove, onClose }) {
  const Row = ({ icon: Icon, label, onClick, tone = 'text-ink' }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 px-5 py-3.5 text-left text-[14px] font-bold active:bg-ink/[0.04] ${tone}`}
    >
      <Icon size={18} className="shrink-0" />
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[110] flex items-end" role="dialog" aria-label="Your photo">
      {/* Tapping away closes, which is how every sheet on the platform
          behaves and what a partner will try first. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/50"
      />
      <div className="relative w-full rounded-t-[24px] bg-white pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-2">
        <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-ink/15" />
        <p className="px-5 pb-1.5 pt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-faint">
          Profile photo
        </p>
        <Row icon={Camera} label="Take a photo" onClick={onCamera} />
        <Row icon={Images} label="Choose from gallery" onClick={onGallery} />
        {hasPhoto && <Row icon={Eye} label="View photo" onClick={onView} />}
        {hasPhoto && (
          <Row icon={Trash2} label="Remove photo" onClick={onRemove} tone="text-rose-700" />
        )}
      </div>
    </div>
  )
}

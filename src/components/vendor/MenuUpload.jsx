import { useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X, FileText, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { prepareImage } from '../../lib/imageUpload'
import { useToast, friendlyError } from '../../context/ToastContext'

/**
 * "You already have a menu card. Just give us that."
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS SITS NEXT TO A FORM THAT ASKS THE SAME THING
 * ══════════════════════════════════════════════════════════════════════
 *
 * The flow asks a caterer to tick twelve menus and 584 dishes. It is a
 * good form and it produces data that can be matched on. It is also
 * thirty minutes of work for somebody who has all of it printed,
 * designed, and open on the phone they are holding.
 *
 * Refusing the photo — insisting they retype what they already have — is
 * how a partner abandons the flow halfway and never comes back. So both:
 * the ticks are what dispatch matches on, and the card is what a
 * coordinator opens when a customer asks something the form never thought
 * to ask.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TWO CONTROLS, BECAUSE ONE WAS WRONG
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first version used a single input with `capture="environment"`,
 * reasoning that it opens the camera on Android and the file picker
 * everywhere else. Reported straight back: "only camera is opening, no
 * upload option."
 *
 * That is exactly what `capture` does. It is not a hint about a
 * preferred source — on Android it REPLACES the chooser with the camera,
 * so a caterer whose menu card is already a PDF in their downloads had
 * no way to reach it. The convenience of one button cost the more common
 * of the two paths.
 *
 * So: two inputs. One plain (files, PDFs, the gallery), one with
 * `capture` for photographing a card on the counter. Still no
 * `@capacitor/camera` and no permission prompt.
 *
 * ── Compressed before it leaves the phone ───────────────────────────
 * A 5 MB photo of a menu card over a Bengaluru mobile connection is a
 * partner who gives up watching a spinner. `prepareImage` already exists
 * for exactly this.
 */

const MAX = 6

export default function MenuUpload({ value = [], onChange }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const camRef = useRef(null)

  async function handle(e) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    if (value.length + files.length > MAX) {
      toast.error(`Up to ${MAX} pages. Pick the ones that matter most.`)
      return
    }

    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in again to upload.')

      const added = []
      for (const file of files) {
        /* PDFs go up as they are -- there is nothing to compress and
           re-encoding one would lose the pages. */
        const isPdf = file.type === 'application/pdf'
        /* prepareImage returns { blob }, not { file }. */
        const body = isPdf ? file : (await prepareImage(file, { mode: 'balanced' })).blob
        const ext = isPdf ? 'pdf' : 'jpg'
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error } = await supabase.storage
          .from('partner-uploads')
          .upload(path, body, { contentType: isPdf ? 'application/pdf' : 'image/jpeg' })
        if (error) throw error
        added.push({ path, kind: isPdf ? 'pdf' : 'image', name: file.name })
      }
      onChange([...value, ...added])
      toast.success(added.length === 1 ? 'Added.' : `${added.length} added.`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(path) {
    onChange(value.filter(v => v.path !== path))
    /* Best effort. A file left behind costs nothing; blocking the UI on
       a delete that failed would cost a partner their place in the flow. */
    await supabase.storage.from('partner-uploads').remove([path]).catch(() => {})
  }

  return (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-ink/[0.06]">
      <p className="text-[13.5px] font-extrabold text-ink">
        Have your menu card already?
      </p>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
        Upload the PDF, or photograph it on the counter. We read it and
        fill in anything you have not ticked.
      </p>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map(v => (
            <span
              key={v.path}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.04] py-1.5 pl-3 pr-1.5 text-[12px] font-bold text-ink-soft"
            >
              {v.kind === 'pdf' ? <FileText size={12} /> : <ImagePlus size={12} />}
              {(v.name ?? 'page').slice(0, 22)}
              <button
                type="button" onClick={() => remove(v.path)}
                aria-label={`Remove ${v.name ?? 'file'}`}
                className="rounded-full p-1 text-ink-mute hover:bg-ink/[0.06]"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* No `capture` on this one: that attribute REPLACES the chooser
          with the camera on Android, which is why "no upload option"
          was reported. This is the files, PDFs and gallery path. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handle}
        className="hidden"
      />
      {/* And this one is the camera, on purpose. */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handle}
        className="hidden"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || value.length >= MAX}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink/[0.03] py-3 text-[13.5px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {busy ? 'Uploading…' : 'Upload a file'}
        </button>
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          disabled={busy || value.length >= MAX}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink/[0.03] py-3 text-[13.5px] font-extrabold text-ink ring-1 ring-ink/[0.08] disabled:opacity-50"
        >
          <Camera size={15} /> Take a photo
        </button>
      </div>

      {value.length >= MAX && (
        <p className="mt-1.5 text-center text-[11.5px] text-ink-mute">
          That is {MAX}. Plenty for us to work from.
        </p>
      )}
    </div>
  )
}

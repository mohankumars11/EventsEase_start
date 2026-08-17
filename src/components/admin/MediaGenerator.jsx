import { useState } from 'react'
import { Sparkles, Loader2, Wand2, Image as ImageIcon, Film, AlertTriangle, X } from 'lucide-react'
import { useToast, friendlyError } from '../../context/ToastContext'
import { generate, PROMPT_STARTERS, VIDEO_STARTERS } from '../../lib/aiMedia'

/**
 * Make a picture or a short clip.
 *
 * ── Used in two places, doing two slightly different jobs ────────────────
 * On the Media tab it adds to a product's gallery. In the slide editor it
 * fills in one slide's background. `onDone(url)` is the difference; everything
 * else — the prompt box, the starters, the waiting — is the same.
 *
 * ── Nothing generated here is marked, anywhere ───────────────────────────
 * No badge over the picture on the storefront, and no watermark burned into
 * the file. The models this runs on — FLUX.1 [schnell] and Wan, both
 * open-weight — do not stamp anything into their output, unlike several
 * hosted video services whose free tiers do. Every prompt also carries an
 * explicit instruction against text, lettering and logos, because the one way
 * writing appears in a generated picture is the model inventing a sign or a
 * label inside the scene.
 *
 * `product_media.source` still records 'ai' on the row. That is a record in
 * the database, not a mark on the image: it is how the studio can show you
 * later which pictures are still generated and which have been replaced with
 * real photographs.
 *
 * ── What the note below is for ───────────────────────────────────────────
 * The one genuinely risky use is "generate a photo of the cake I am selling",
 * because the customer receives the cake and not the render. That guidance
 * lives here, in the admin, where it costs a customer nothing — and in the
 * prompt starters, which all describe a scene rather than a product, because
 * the starters are what most people actually press.
 */
export default function MediaGenerator({
  productId = null,
  allowVideo = true,
  defaultKind = 'image',
  aspect: fixedAspect = null,
  onDone,
  onClose,
  compact = false,
}) {
  const toast = useToast()
  const [kind, setKind] = useState(defaultKind)
  const [prompt, setPrompt] = useState('')
  const [aspect, setAspect] = useState(fixedAspect ?? '1:1')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  const starters = kind === 'video' ? VIDEO_STARTERS : PROMPT_STARTERS

  async function run() {
    setBusy(true)
    setProgress('')
    try {
      const result = await generate({
        kind,
        prompt,
        aspect,
        productId,
        onProgress: setProgress,
      })
      toast.success(kind === 'video' ? 'Clip made and saved.' : 'Picture made and saved.')
      await onDone?.(result)
      setPrompt('')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not make that.'))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-plum-200 bg-plum-50/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-plum-950">
            <Wand2 size={15} /> Make a {kind === 'video' ? 'clip' : 'picture'}
          </h4>
          {!compact && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">
              For the mood around the product — the wrapping, the hands, the doorway, the table.
            </p>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-700"><X size={15} /></button>
        )}
      </div>

      {/* Stated before the button, and stated to you — not to your customer.
          Nothing made here is marked on the storefront or in the file. */}
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <span>
          Best for the mood <em>around</em> the product — the wrapping, the hands, the doorway.
          Making a picture <em>of</em> the item itself is the risky one: the customer receives the
          real thing, not the drawing, and a photo that doesn't match what arrives is what refunds
          are made of.
        </span>
      </p>

      {allowVideo && (
        <div className="flex gap-1.5">
          <KindButton active={kind === 'image'} onClick={() => setKind('image')} icon={ImageIcon} label="Picture" />
          <KindButton active={kind === 'video'} onClick={() => setKind('video')} icon={Film} label="Clip (5s)" />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {starters.map(s => (
          <button
            key={s.id}
            onClick={() => setPrompt(s.prompt)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-plum-400 hover:text-plum-700"
          >
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        rows={3}
        placeholder="Describe the scene — what is in the picture, the light, the mood."
        className="w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed focus:border-plum-400 focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        {!fixedAspect && (
          <select
            value={aspect} onChange={e => setAspect(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold"
          >
            <option value="1:1">Square</option>
            <option value="16:9">Wide</option>
            <option value="4:5">Tall</option>
          </select>
        )}
        <button
          onClick={run}
          disabled={busy || !prompt.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-plum-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-plum-700 disabled:opacity-40"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? 'Making it…' : `Make the ${kind === 'video' ? 'clip' : 'picture'}`}
        </button>
        {busy && progress && (
          <span className="text-[11px] font-semibold text-plum-700">{progress}</span>
        )}
      </div>

      {busy && kind === 'video' && (
        <p className="text-[11px] text-gray-500">
          A clip takes a minute or two. Leave this open — it saves itself when it's done.
        </p>
      )}
    </div>
  )
}

function KindButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'border-plum-600 bg-plum-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, UserRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { prepareImage } from '../../lib/imageUpload'

/**
 * The partner's real storefront avatar. Stores a path in vendors.avatar_url;
 * signed URLs are short-lived and are never persisted as the source of truth.
 */
export default function PartnerAvatarInput({ vendor, draft, businessName, editable = false, compact = false }) {
  const source = vendor?.avatar_url || draft?.trade_inputs?.avatar_url || draft?.trade_inputs?.profile_photo_url || draft?.profile?.avatar_url || ''
  const input = useRef(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function resolve() {
      let candidate = source
      if (vendor?.id) {
        try {
          const { data } = await supabase.from('vendors').select('avatar_url').eq('id', vendor.id).maybeSingle()
          if (data?.avatar_url) candidate = data.avatar_url
        } catch {}
      }
      if (!candidate) { if (alive) setUrl(''); return }
      const value = String(candidate)
      if (value.startsWith('https://') || value.startsWith('http://')) { if (alive) setUrl(value); return }
      try {
        const { data, error: signedError } = await supabase.storage.from('partner-uploads').createSignedUrl(value, 900)
        if (alive) setUrl(signedError ? '' : data?.signedUrl || '')
      } catch { if (alive) setUrl('') }
    }
    resolve()
    return () => { alive = false }
  }, [source, vendor?.id])

  async function upload(file) {
    if (!file || !vendor?.id) return
    setBusy(true)
    setError('')
    let path = ''
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose a JPG, PNG or WebP image.')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sign in again before uploading a profile photo.')
      const prepared = await prepareImage(file, { mode: 'balanced' })
      path = user.id + '/profile/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg'
      const { error: uploadError } = await supabase.storage.from('partner-uploads').upload(path, prepared.blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError
      const { error: saveError } = await supabase.from('vendors').update({ avatar_url: path }).eq('id', vendor.id)
      if (saveError) {
        await supabase.storage.from('partner-uploads').remove([path])
        path = ''
        throw saveError
      }
      const { data, error: urlError } = await supabase.storage.from('partner-uploads').createSignedUrl(path, 900)
      if (urlError || !data?.signedUrl) throw new Error('The photo was saved, but the preview link could not be created. Reopen this preview to refresh it.')
      setUrl(data.signedUrl)
    } catch (e) {
      setError(e?.message || 'Could not upload this profile photo. Please try again.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const initials = String(businessName || 'Partner').trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="sppc-avatar-wrap">
      <div className="sppc-avatar">
        {url
          ? <img src={url} alt={businessName + ' profile'} onError={() => setUrl('')} />
          : <span className="sppc-avatar-fallback"><UserRound size={compact ? 22 : 25} /><b>{initials}</b></span>}
      </div>
      {editable && !compact && (
        <>
          <input ref={input} type="file" accept="image/*" hidden onChange={e => upload(e.target.files?.[0])} />
          <button type="button" className="sppc-avatar-upload" onClick={() => input.current?.click()} disabled={busy} aria-label="Upload partner profile photo">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            {busy ? 'Saving' : url ? 'Change photo' : 'Add photo'}
          </button>
          {error && <p className="sppc-avatar-error" role="status">{error}</p>}
        </>
      )}
    </div>
  )
}

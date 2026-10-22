import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

/**
 * The partner's photo, or their initials.
 *
 * `src` is either a URL or a storage path in partner-avatars (falling back
 * to partner-uploads, where older avatars live). A path is signed for ten
 * minutes, the same window the gallery uses. Initials sit underneath, so
 * a slow or failed sign shows a letter rather than an empty circle.
 */
export default function StoreAvatar({ src, name }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    async function resolve() {
      if (!src) { setUrl(''); return }
      if (/^(https?:|data:|blob:)/i.test(String(src))) { setUrl(src); return }
      try {
        let { data, error } = await supabase.storage.from('partner-avatars').createSignedUrl(String(src), 600)
        if (error) ({ data, error } = await supabase.storage.from('partner-uploads').createSignedUrl(String(src), 600))
        if (alive) setUrl(error ? '' : data?.signedUrl || '')
      } catch { if (alive) setUrl('') }
    }
    resolve()
    return () => { alive = false }
  }, [src])
  const initials = String(name ?? '').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'S'
  return (
    <span className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#EDE4FF] to-[#D9C8FF] text-[19px] font-extrabold text-[#5B21A8]">
      {initials}
      {url ? <img src={url} alt={`${name} profile`} className="absolute inset-0 h-full w-full object-cover" onError={() => setUrl('')} /> : null}
    </span>
  )
}

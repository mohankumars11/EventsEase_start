/**
 * A customer's own reference photo — "this is what I want" — uploaded to
 * the customer-references bucket (migration 199) under their own folder,
 * shrunk on the phone first (≤ 1600 px, JPEG) so a 12 MP camera shot does
 * not cost them their data. Returns the public link that goes into the
 * brief; the master sees it as a picture (vendor/BriefNote).
 *
 * Until 199 is pasted the bucket does not exist and this says so plainly.
 */
import { supabase } from '../../lib/supabase'

async function shrink(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise(r => c.toBlob(b => r(b ?? file), 'image/jpeg', 0.82))
  } catch { return file }
}

export async function uploadReference(file) {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) throw new Error('Sign in to add a photo.')
  const blob = await shrink(file)
  const path = `${u.user.id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('customer-references').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(/bucket/i.test(error.message) ? 'Photo upload is being switched on — type what you want for now.' : error.message)
  return supabase.storage.from('customer-references').getPublicUrl(path).data.publicUrl
}

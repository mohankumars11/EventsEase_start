/**
 * Anchor & MC endpoints, one serverless function.
 *
 *   POST /api/anchor?op=book            customer booking / preview   (_lib/anchorBook.js)
 *   POST /api/anchor?op=route-setup     partner Razorpay Route setup (_lib/routeSetup.js)
 *   GET  /api/anchor?op=route-release   daily cron: release / reverse (_lib/routeRelease.js)
 *
 * One file rather than three because a Vercel Hobby deployment allows 12
 * serverless functions, and api/ already had 11.
 */
import book from './_lib/anchorBook.js'
import routeSetup from './_lib/routeSetup.js'
import routeRelease from './_lib/routeRelease.js'

const OPS = { book, 'route-setup': routeSetup, 'route-release': routeRelease }

export default async function handler(req, res) {
  const op = String(req.query?.op ?? new URL(req.url, 'http://x').searchParams.get('op') ?? '')
  const fn = OPS[op]
  if (!fn) return res.status(404).json({ error: 'Unknown operation' })
  return fn(req, res)
}

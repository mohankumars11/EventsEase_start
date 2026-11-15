/**
 * Anchor & MC endpoints, one serverless function.
 *
 *   POST /api/anchor?op=book            customer booking / preview   (_lib/anchorBook.js)
 *   POST /api/anchor?op=confirm-payment customer app confirms a paid booking (_lib/confirmPayment.js)
 *   POST /api/anchor?op=route-setup     partner Razorpay Route setup (_lib/routeSetup.js)
 *   GET  /api/anchor?op=route-release   daily cron: release / reverse (_lib/routeRelease.js)
 *   POST /api/anchor?op=dispatch-batch  "find everything for my celebration" (_lib/dispatchBatch.js)
 *   POST /api/anchor?op=offers          the offer board: every qualifying package, priced (_lib/offers.js)
 *
 * One file rather than three because a Vercel Hobby deployment allows 12
 * serverless functions, and api/ already had 11.
 */
import book from './_lib/anchorBook.js'
import routeSetup from './_lib/routeSetup.js'
import routeRelease from './_lib/routeRelease.js'
import confirmPayment from './_lib/confirmPayment.js'
import dispatchBatch from './_lib/dispatchBatch.js'
import offers from './_lib/offers.js'

const OPS = { book, 'route-setup': routeSetup, 'route-release': routeRelease, 'confirm-payment': confirmPayment, 'dispatch-batch': dispatchBatch, offers }

export default async function handler(req, res) {
  const op = String(req.query?.op ?? new URL(req.url, 'http://x').searchParams.get('op') ?? '')
  const fn = OPS[op]
  if (!fn) return res.status(404).json({ error: 'Unknown operation' })
  return fn(req, res)
}

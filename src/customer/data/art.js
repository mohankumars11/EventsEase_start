/**
 * The 3D illustrations: one per category (cat-<id>), occasion (occ-<id>)
 * and service (svc-<tradeId>), plus the home hero.
 *
 * Files live in src/customer/art as <id>.webp, written by
 * scripts/customer-art.mjs from what scripts/generate_images.py produced.
 * They are found by name, so an image that has not been generated yet is
 * simply absent — and the card falls back to the trade's own 3D pictogram
 * (assets/sambramo/pictograms/hd-34) rather than a broken square.
 *
 * Occasions fall back to the pictogram of their SIGNATURE trade — the
 * first essential that is not the venue or the food, because those two
 * are in nearly everything and would make thirty cards look alike.
 */
import { getSambramoTradePictogramDataUri } from '../../assets/sambramo/pictograms/hd-34'
import { TRADE } from './trades'

const FILES = import.meta.glob('../art/*.webp', { eager: true, query: '?url', import: 'default' })
const ART = Object.fromEntries(Object.entries(FILES).map(([p, url]) => [p.slice(p.lastIndexOf('/') + 1, -5), url]))

export const artFor = id => ART[id] ?? null

/* 1024 px originals for the few places a picture is shown large (the home
   spotlight), written by `node scripts/customer-art.mjs hd <id…>`. */
const HD_FILES = import.meta.glob('../art/hd/*.webp', { eager: true, query: '?url', import: 'default' })
const HD = Object.fromEntries(Object.entries(HD_FILES).map(([p, url]) => [p.slice(p.lastIndexOf('/') + 1, -5), url]))
export const hdArtFor = id => HD[id] ?? ART[id] ?? null

const picto = {}
export function pictogram(tradeId) {
  if (!TRADE[tradeId]) return null
  if (!picto[tradeId]) picto[tradeId] = getSambramoTradePictogramDataUri(TRADE[tradeId].name)
  return picto[tradeId]
}

const COMMON = new Set(['venue', 'catering_food', 'decoration_floral', 'sound_av'])
export const signatureTrade = o => [...o.must, ...o.often].find(t => !COMMON.has(t)) ?? o.must[0]

/** { src, kind } — kind 'art' is a full illustration, 'icon' a pictogram to inset. */
export const serviceArt = tradeId => (ART[`svc-${tradeId}`] ? { src: ART[`svc-${tradeId}`], kind: 'art' } : { src: pictogram(tradeId), kind: 'icon' })
export const occasionArt = o => (ART[`occ-${o.id}`] ? { src: ART[`occ-${o.id}`], kind: 'art' } : { src: pictogram(signatureTrade(o)), kind: 'icon' })
export const categoryArt = c => (ART[`cat-${c.id}`] ? { src: ART[`cat-${c.id}`], kind: 'art' } : { src: pictogram(c.signature), kind: 'icon' })

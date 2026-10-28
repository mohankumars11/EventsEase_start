/* Invitation designs: every occasion gets a fitting list, and a design's colours and font round-trip through the saved theme. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { PALETTES, TEMPLATE, TEMPLATES, parseTheme, templatesFor, themeString } from '../src/customer/data/inviteTemplates.js'

test('a design with its palette and font survives being saved and read back', () => {
  const s = themeString('royal', { art: true, live: true, pal: 'emerald', font: 'regal' })
  assert.equal(s, 'royal|art|live|p:emerald|f:regal')
  const p = parseTheme(s)
  assert.equal(p.t.id, 'royal')
  assert.equal(p.t.font, 'regal')
  assert.equal(p.t.accent, PALETTES.find(x => x.id === 'emerald').accent)
  assert.deepEqual([p.art, p.live, p.pal, p.font], [true, true, 'emerald', 'regal'])
  assert.equal(p.base.accent, '#E8C77A')
})

test('unknown palette or font falls back to the design itself; old themes still read', () => {
  const p = parseTheme('royal|p:bogus|f:nope')
  assert.equal(p.pal, null)
  assert.equal(p.t.font, 'script')
  assert.equal(parseTheme('floral|art').t.id, 'floral')
})

test('a memorial is only ever offered the quiet designs', () => {
  const ids = templatesFor({ id: 'memorial-gathering', name: 'Memorial Gathering', category: 'special' }).map(t => t.id)
  assert.ok(ids.length >= 2)
  for (const id of ids) assert.ok(TEMPLATE[id].solemn || ['lotus-ivory', 'minimal'].includes(id), id)
  assert.ok(!templatesFor({ id: 'birthday-party', name: 'Birthday Party', category: 'life' }).some(t => t.solemn))
})

test('every design id is unique, and there are well over a hundred', () => {
  assert.equal(new Set(TEMPLATES.map(t => t.id)).size, TEMPLATES.length)
  assert.ok(TEMPLATES.length >= 1000)
  assert.equal(parseTheme('royal~emerald|art').t.name, 'Royal Heritage · Emerald & gold')
})

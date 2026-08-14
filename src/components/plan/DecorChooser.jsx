import { Check, ChevronDown, Info } from 'lucide-react'
import { VISIBLE_DECOR_LEVELS, DECOR_THEMES, DECOR_ADDONS, decorStretch } from '../../data/decorPackages'
import { formatINR } from '../../utils/format'

/**
 * Decor, asked as the three separate questions it actually is — see the
 * reasoning at the top of data/decorPackages.js.
 *
 * The level cards carry a live price rather than a range, because by the time
 * this screen is reached the guest count is known and a range would be a
 * pointless hedge over a number we can compute exactly.
 */
export default function DecorChooser({
  levelId, onLevel, themeId, onTheme, addonIds, onAddons, guestCount,
}) {
  function toggleAddon(id) {
    onAddons(addonIds.includes(id) ? addonIds.filter(a => a !== id) : [...addonIds, id])
  }

  return (
    <div className="space-y-5">
      {/* 1 — how much */}
      <div>
        <h3 className="font-bold text-gray-800 text-sm mb-1">How much decoration?</h3>
        <p className="text-xs text-gray-500 mb-3">This is the part that moves the price. The look, next, mostly does not.</p>
        <div className="space-y-3">
          {VISIBLE_DECOR_LEVELS.map(level => {
            const selected = levelId === level.id
            const stretch = decorStretch(level, guestCount)
            const cost = Math.round(level.fixedCost * stretch) + level.perGuestTouch * (guestCount || 0)
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onLevel(level.id)}
                className={`w-full text-left card p-5 transition-all ${
                  selected ? 'ring-2 ring-plum-500 ring-offset-2 bg-plum-50/40' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xl">{level.emoji}</span>
                      <h4 className="font-bold text-gray-900">{level.name}</h4>
                      {level.popular && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-saffron-100 text-saffron-700">
                          Most chosen
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{level.tagline}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{level.description}</p>
                    <ul className="mt-2.5 space-y-1">
                      {level.inclusions.map(i => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Check size={12} className="mt-0.5 shrink-0 text-green-600" />
                          {i}
                        </li>
                      ))}
                    </ul>
                    {stretch > 1 && (
                      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        Scaled up to fill a room this size. The next level up is designed for it — but if this is the look you
                        want, this is what it costs.
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-gray-500 leading-tight">At {guestCount || 0} guests</p>
                    <p className="text-sm font-bold text-plum-700 whitespace-nowrap">{formatINR(cost)}</p>
                    {selected && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-plum-700">
                        <Check size={12} /> Selected
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2 — what it looks like */}
      <div className="card p-5">
        <label className="block text-sm font-bold text-gray-800 mb-1.5">What should it look like?</label>
        <p className="text-xs text-gray-500 mb-3">
          Colour is free at this scale — the decorator buys the flowers either way. The three that cost extra say so.
        </p>
        <div className="relative">
          <select
            value={themeId ?? ''}
            onChange={e => onTheme(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 font-semibold text-gray-900 bg-white focus:border-saffron-400 focus:outline-none"
          >
            {DECOR_THEMES.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.delta > 0 ? ` — +${formatINR(t.delta)}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        {DECOR_THEMES.find(t => t.id === themeId)?.note && (
          <p className="mt-2 text-xs text-gray-500">{DECOR_THEMES.find(t => t.id === themeId).note}</p>
        )}
      </div>

      {/* 3 — what else */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1">Anything else?</h3>
        <p className="text-xs text-gray-500 mb-3">
          Each of these is something a decorator would otherwise ring you about three days before. Decide now, or leave them.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DECOR_ADDONS.map(addon => {
            const picked = addonIds.includes(addon.id)
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => toggleAddon(addon.id)}
                className={`flex items-start justify-between gap-2 text-left px-3 py-2.5 rounded-xl border-2 transition-colors ${
                  picked ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800">{addon.name}</span>
                  {addon.note && <span className="block text-[11px] text-gray-500">{addon.note}</span>}
                </span>
                <span className="shrink-0 text-xs font-bold text-plum-700">{formatINR(addon.price)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

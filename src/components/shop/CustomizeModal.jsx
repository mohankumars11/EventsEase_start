import { useState } from 'react'
import { X, Minus, Plus, ShoppingCart } from 'lucide-react'
import { formatINR } from '../../utils/format'

/**
 * Opens before a customizable product (Cakes/Hampers/Gifts/Flowers)
 * is added to cart — captures quantity + an optional gift message in
 * one step, so the customer never has to think about it again later.
 * fieldConfig: { label, placeholder } from CUSTOMIZABLE_CATEGORIES.
 */
export default function CustomizeModal({ product, fieldConfig, onClose, onConfirm }) {
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState('')

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Make it yours</h3>
            <p className="text-xs text-gray-500 mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Quantity</p>
            <div className="inline-flex items-center border-2 border-gray-200 rounded-xl">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} className="p-2.5 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                <Minus size={15} />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="p-2.5 text-gray-500 hover:text-gray-800">
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{fieldConfig.label} (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 200))}
              className="w-full min-h-[80px] resize-none px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-plum-400"
              placeholder={fieldConfig.placeholder}
            />
            <p className="text-[11px] text-gray-500 mt-1 text-right">{message.length}/200</p>
          </div>

          <button
            onClick={() => onConfirm({ qty, customization: message.trim() || null })}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-saffron-500 text-plum-950 font-bold hover:bg-saffron-600"
          >
            <ShoppingCart size={16} /> Add {qty > 1 ? `${qty} to Cart` : 'to Cart'}
            {product.price ? ` — ${formatINR(product.price * qty)}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

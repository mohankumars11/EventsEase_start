import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Sparkles } from 'lucide-react'
import { BRAND, SERVICE_CATEGORIES } from '../../config/sambramo'

const GREETING = "Hi! How can I help you today? 👋"

const MAIN_OPTIONS = [
  { label: '🎉 Plan a new celebration',         action: 'plan' },
  { label: '🔍 Browse individual services',     action: 'browse' },
  { label: '📋 Track my request',               action: 'track' },
  { label: '✨ What services do you offer?',     action: 'services' },
  { label: '💬 Talk to our team',                action: 'human' },
]

export default function ChatWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: GREETING }])
  const [showOptions, setShowOptions] = useState(true)

  function say(text) {
    setMessages(m => [...m, { from: 'bot', text }])
  }

  function pick({ label, action }) {
    setMessages(m => [...m, { from: 'user', text: label }])
    setShowOptions(false)

    switch (action) {
      case 'plan':
        say("Let's get your celebration started — taking you there now.")
        setTimeout(() => navigate('/plan'), 400)
        break
      case 'browse':
        say("Sure — here are vendors you can book directly, no full planning needed.")
        setTimeout(() => navigate('/dashboard/customer/browse'), 400)
        break
      case 'track':
        say("Here's the status of everything you've submitted so far.")
        setTimeout(() => navigate('/dashboard/customer/events'), 400)
        break
      case 'services':
        say(
          SERVICE_CATEGORIES
            .map(c => `${c.emoji} ${c.category}`)
            .join('   ·   ')
        )
        say("Want the full picture, or a hand with something specific?")
        setTimeout(() => setShowOptions(true), 200)
        break
      case 'human':
        window.open(`https://wa.me/${BRAND.whatsappNumber}`, '_blank', 'noopener,noreferrer')
        say("Opening WhatsApp — our team typically replies within a few hours.")
        setTimeout(() => setShowOptions(true), 200)
        break
      default:
        setShowOptions(true)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-plum-900 px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-saffron-400 rounded-full flex items-center justify-center">
                <Sparkles size={15} className="text-plum-950" />
              </div>
              <div>
                <p className="text-white font-display font-bold text-sm leading-tight">Sambramo Assistant</p>
                <p className="text-plum-300 text-[11px] leading-tight">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-plum-300 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.from === 'user'
                      ? 'bg-plum-700 text-white rounded-br-sm'
                      : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick replies */}
          {showOptions && (
            <div className="p-3 border-t border-gray-100 bg-white flex flex-wrap gap-2 shrink-0">
              {MAIN_OPTIONS.map(opt => (
                <button
                  key={opt.action}
                  onClick={() => pick(opt)}
                  className="text-xs font-medium px-3 py-2 rounded-full border border-gray-200 text-gray-700 hover:border-plum-300 hover:bg-plum-50 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-saffron-400 hover:bg-saffron-500 shadow-xl flex items-center justify-center transition-all hover:scale-105"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <X size={22} className="text-plum-950" /> : <MessageCircle size={22} className="text-plum-950" />}
      </button>
    </div>
  )
}

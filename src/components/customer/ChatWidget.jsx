import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, X, Sparkles, Send } from 'lucide-react'
import { BRAND, EVENT_TYPES } from '../../config/sambramo'
import { SHOP_CATEGORIES } from '../../config/shop'
import { FESTIVALS } from '../../data/festivals'
import { useChat } from '../../context/ChatContext'
import { isFocusedRoute } from '../../config/chrome'

const GREETING = "Hi! How can I help you today? 👋 Type what you need, or tap an option below."

/**
 * One registry, two consumers — the always-visible quick-action row and
 * the free-text keyword matcher both read from this list, so there is no
 * way for the buttons and the "what does typing X do" behavior to drift
 * apart the way a hardcoded switch + a separate options array did before.
 *
 * Rules are checked in order and the first match wins, so more specific
 * intents (a single product word like "cake") are listed before broad
 * ones ("shop") that would otherwise swallow them.
 */
const SHOP_LINKS = SHOP_CATEGORIES.map(c => ({ label: c.label, emoji: c.emoji, path: `/shop/${encodeURIComponent(c.id)}` }))
const FESTIVAL_LINKS = FESTIVALS.map(f => ({ label: f.name, emoji: f.emoji, path: `/festivals/${f.id}` }))

const SHOP_CATEGORY_KEYWORDS = {
  'Cakes':              ['cake', 'cakes'],
  // Hamper words resolve to Gifts: the two categories are one shelf now
  // (migration 031), so 'hamper' must not lead to a page that no longer exists.
  'Gifts':               ['gift', 'gifts', 'present', 'hamper', 'hampers', 'basket'],
  'Flowers':              ['flower', 'flowers', 'bouquet', 'rose', 'roses'],
  'Party Essentials':      ['balloon', 'balloons', 'decoration', 'decorations', 'party essentials', 'banner'],
  'Pooja & Essentials':     ['pooja', 'puja', 'diya', 'diyas', 'samagri', 'ritual'],
}

const RULES = [
  // ── Specific shop categories — checked first so "cake" resolves to the
  //    Cakes page directly instead of the generic 6-category shop menu.
  ...SHOP_CATEGORIES.map(cat => ({
    id: `shop-${cat.id}`,
    keywords: SHOP_CATEGORY_KEYWORDS[cat.id] ?? [cat.label.toLowerCase()],
    reply: `Here's ${cat.label} — real photos, ready to order:`,
    links: [{ label: cat.label, emoji: cat.emoji, path: `/shop/${encodeURIComponent(cat.id)}` }],
  })),

  // ── Specific occasions — route straight into the planning hub pre-filled.
  ...EVENT_TYPES.map(et => ({
    id: `event-${et.id}`,
    keywords: [et.label.toLowerCase(), ...(et.id === 'baby-shower' ? ['baby shower'] : []), ...(et.id === 'naming-ceremony' ? ['naming ceremony', 'naming'] : []), ...(et.id === 'get-together' ? ['get together', 'get-together'] : [])],
    reply: `Planning ${/^[aeiou]/i.test(et.label) ? 'an' : 'a'} ${et.label.toLowerCase()}? Here's where to start:`,
    links: [{ label: et.label, emoji: et.emoji, path: `/plan?type=${et.id}` }],
  })),

  {
    id: 'cart',
    keywords: ['cart', 'checkout', 'basket'],
    reply: "Here's your cart:",
    links: [{ label: 'View Cart', emoji: '🛒', path: '/shop/cart' }],
  },
  {
    id: 'orders',
    keywords: ['order', 'orders', 'delivery status', 'where is my order', 'track order'],
    reply: 'Here are your Shop orders and their delivery status:',
    links: [{ label: 'My Orders', emoji: '📦', path: '/dashboard/customer/orders' }],
  },
  {
    id: 'track',
    keywords: ['track', 'request', 'requests', 'quote', 'quotation', 'proposal', 'status'],
    reply: "Here's where you can check on things:",
    links: [
      { label: 'My Requests',     emoji: '📋', path: '/dashboard/customer/requests' },
      { label: 'My Celebrations', emoji: '🎊', path: '/dashboard/customer/events' },
    ],
  },
  {
    id: 'payment',
    keywords: ['payment', 'upi', 'pay', 'google pay', 'phonepe', 'paytm', 'refund'],
    reply: "Shop checkout accepts direct UPI — Google Pay, PhonePe, Paytm or any UPI app, plus a QR code. Full-celebration proposals are settled by UPI or bank transfer once you approve.",
    links: [{ label: 'Go to Cart', emoji: '🛒', path: '/shop/cart' }],
  },
  {
    id: 'price',
    keywords: ['price', 'cost', 'how much', 'charges', 'pricing'],
    reply: 'Shop items show a fixed price upfront. A full celebration is quoted after we know your date, guest count and budget — free to ask, no obligation.',
    links: [
      { label: 'Shop (fixed prices)',  emoji: '🛍️', path: '/shop' },
      { label: 'Get a free quote',      emoji: '🎉', path: '/plan' },
    ],
  },
  {
    id: 'festival',
    keywords: ['festival', 'festivals', 'diwali', 'ganesh', 'chaturthi', 'navratri', 'christmas', 'holi', 'rakhi', 'raksha bandhan', 'janmashtami', 'dussehra', 'pongal', 'onam', 'eid', 'new year'],
    reply: 'Here are our festival celebrations:',
    links: FESTIVAL_LINKS,
  },
  {
    id: 'services',
    keywords: ['service', 'services', 'package', 'packages', 'browse', 'individual', 'cook', 'cooks', 'decorator', 'photographer', 'caterer', 'catering', 'dj', 'makeup', 'mehendi', 'priest'],
    reply: 'Browse every service and ready-made package by occasion — pick only what you need:',
    links: [{ label: 'Browse Services & Packages', emoji: '🔍', path: '/services' }],
  },
  {
    id: 'shop',
    keywords: ['shop', 'buy', 'purchase', 'deliver', 'delivery'],
    reply: "Here's everything in the Shop:",
    links: SHOP_LINKS,
  },
  {
    id: 'plan',
    keywords: ['plan', 'celebration', 'celebrate', 'event', 'organize', 'organise', 'concierge', 'wedding planner'],
    reply: 'Two ways to get this done — hand it to a coordinator, or pick services yourself:',
    links: [{ label: 'Plan My Celebration', emoji: '🎉', path: '/plan' }],
  },
  {
    id: 'human',
    keywords: ['human', 'agent', 'talk', 'call', 'support', 'help me', 'whatsapp', 'contact'],
    reply: 'Opening WhatsApp — our team typically replies within a few hours.',
    whatsapp: true,
  },
]

const QUICK_ACTIONS = [
  { emoji: '🎉', label: 'Plan a celebration', ruleId: 'plan' },
  { emoji: '🛍️', label: 'Shop',               ruleId: 'shop' },
  { emoji: '🔍', label: 'Browse services',    ruleId: 'services' },
  { emoji: '📋', label: 'Track my request',   ruleId: 'track' },
  { emoji: '💬', label: 'Talk to our team',   ruleId: 'human' },
]

function matchRule(text) {
  const q = text.toLowerCase()
  return RULES.find(r => r.keywords.some(k => q.includes(k)))
}

let uid = 0
function nextId() { return ++uid }

export default function ChatWidget() {
  const { open, closeChat, toggleChat } = useChat()
  const { pathname } = useLocation()
  const [messages, setMessages] = useState([{ id: nextId(), from: 'bot', text: GREETING }])
  const [input, setInput] = useState('')
  const [botTyping, setBotTyping] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  // Tapping a link inside the panel navigates — and leaving the sheet up over
  // the page somebody just asked to see would defeat the point of sending
  // them there.
  useEffect(() => { closeChat() }, [pathname, closeChat])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, botTyping])

  // Autofocus the input the moment the panel opens — a chat window that
  // opens without the cursor already in the box makes people hunt for it.
  //
  // Desktop only: on a phone this raises the keyboard over a sheet that is
  // already only 70% of the screen, so the greeting and the quick actions —
  // the things most people tap instead of typing — get pushed out of sight.
  useEffect(() => {
    if (!open) return
    if (!window.matchMedia('(min-width: 768px)').matches) return
    const t = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(t)
  }, [open])

  // Esc closes the panel, matching every other overlay in the app.
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') closeChat() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeChat])

  function respond(rule) {
    setBotTyping(true)
    setTimeout(() => {
      setBotTyping(false)
      if (rule.whatsapp) {
        window.open(`https://wa.me/${BRAND.whatsappNumber}`, '_blank', 'noopener,noreferrer')
      }
      setMessages(m => [...m, { id: nextId(), from: 'bot', text: rule.reply, links: rule.links }])
    }, 450 + Math.random() * 250)
  }

  function handleQuickAction(qa) {
    const rule = RULES.find(r => r.id === qa.ruleId)
    setMessages(m => [...m, { id: nextId(), from: 'user', text: qa.label }])
    respond(rule)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { id: nextId(), from: 'user', text }])
    setInput('')

    const rule = matchRule(text)
    if (rule) {
      respond(rule)
    } else {
      setBotTyping(true)
      setTimeout(() => {
        setBotTyping(false)
        setMessages(m => [...m, {
          id: nextId(),
          from: 'bot',
          text: "I couldn't quite match that to something specific — here's everything I can help with:",
        }])
      }, 450)
    }
  }

  // Focused screens — the wizard, the login — own the whole viewport, and the
  // tab bar that carries the Help entry is gone there too. See config/chrome.js.
  if (isFocusedRoute(pathname)) return null

  return (
    <>
      {/* Phone: a sheet that sits ON TOP of the page but ABOVE the tab bar,
          so the Help tab that opened it stays visible and tapping it again
          closes it. The backdrop stops at the tab bar for the same reason,
          and closes the panel wherever else it is tapped.

          Desktop: no tab bar exists, so the launcher lives in the `chat-dock`
          corner (index.css) and the panel opens above it. */}
      {open && (
        <button
          type="button"
          aria-label="Close the assistant"
          onClick={closeChat}
          className="md:hidden fixed inset-x-0 top-0 bottom-[var(--bottom-nav-h,4.25rem)] z-[52] bg-black/40"
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Sambramo Assistant"
          className="fixed inset-x-0 bottom-[var(--bottom-nav-h,4.25rem)] z-[55] h-[70dvh] max-h-[calc(100dvh-7rem)] rounded-t-3xl bg-white shadow-2xl border border-gray-100 flex flex-col overflow-hidden
                     md:inset-x-auto md:right-5 md:bottom-[5.5rem] md:z-[45] md:w-[22rem] md:h-[32rem] md:rounded-3xl"
        >
          {/* Header */}
          <div className="bg-plum-900 px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 bg-saffron-400 rounded-full flex items-center justify-center shrink-0">
                <Sparkles size={15} className="text-plum-950" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-plum-900 rounded-full" />
              </div>
              <div>
                <p className="text-ink font-display font-bold text-sm leading-tight">Sambramo Assistant</p>
                <p className="text-plum-700 text-[11px] leading-tight">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="text-plum-700 hover:text-ink transition-colors p-1"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${m.from === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.from === 'user'
                        ? 'bg-plum-700 text-white rounded-br-sm inline-block'
                        : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Rich link chips — the whole point of "if user clicks,
                      get him there": every destination the bot mentions is
                      an actual clickable route, not text to re-type. */}
                  {m.links?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.links.map(l => (
                        <Link
                          key={l.path}
                          to={l.path}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-plum-200 text-plum-700 hover:bg-plum-50 hover:border-plum-400 shadow-sm transition-colors"
                        >
                          <span>{l.emoji}</span> {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator — makes the deliberate response delay read
                as "thinking" instead of the panel looking frozen. */}
            {botTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Quick actions — always available, not a one-shot menu that
              vanishes after the first tap (the old behavior made every
              later turn dead-end at a plain text box with nothing to
              click). */}
          <div className="px-3 pt-2.5 border-t border-gray-100 bg-white shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa.ruleId}
                  onClick={() => handleQuickAction(qa)}
                  className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:border-plum-300 hover:bg-plum-50 transition-colors whitespace-nowrap"
                >
                  {qa.emoji} {qa.label}
                </button>
              ))}
            </div>

            {/* Free-text input — a chat panel with nowhere to type isn't a
                chat panel. Enter submits; the button is a plain fallback. */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 pb-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type what you need — e.g. 'cake' or 'wedding'…"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="shrink-0 w-10 h-10 rounded-full bg-plum-700 hover:bg-plum-800 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop launcher only — `hidden md:flex`.
          On a phone the Help tab in the bottom bar is the launcher, so there
          is deliberately nothing floating over the page there. Desktop has no
          tab bar and an empty bottom-right corner, and the two bars that do
          reach it (`pr-chat-dock`) keep their buttons clear of it. */}
      <button
        onClick={toggleChat}
        className="chat-dock hidden md:flex w-14 h-14 rounded-full bg-saffron-400 hover:bg-saffron-500 shadow-xl items-center justify-center transition-all hover:scale-105"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <X size={22} className="text-plum-950" /> : <MessageCircle size={22} className="text-plum-950" />}
      </button>
    </>
  )
}

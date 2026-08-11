import { createContext, useContext, useState, useCallback, useMemo } from 'react'

/**
 * Whether the assistant is open, held outside the widget.
 *
 * The launcher used to be a floating bubble that owned its own state, which
 * is why it had to sit on top of the page to be reachable — and it landed on
 * the cart bar's button, the builder's submit row and the corner of every
 * modal. Chat is a tab in the bottom bar now, so the thing that opens the
 * panel and the panel itself are two different components and the open flag
 * has to live above both.
 */
const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false)

  const openChat   = useCallback(() => setOpen(true), [])
  const closeChat  = useCallback(() => setOpen(false), [])
  const toggleChat = useCallback(() => setOpen(o => !o), [])

  const value = useMemo(
    () => ({ open, openChat, closeChat, toggleChat }),
    [open, openChat, closeChat, toggleChat],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>')
  return ctx
}

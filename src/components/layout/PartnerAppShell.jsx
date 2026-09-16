/**
 * The one shell the partner app renders inside.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES
 * ══════════════════════════════════════════════════════════════════════
 *
 * `DashboardShell`, which put `<Navbar />` above the page. Navbar is the
 * CUSTOMER app's header: a logo, desktop links, a city picker and — on a
 * phone — a hamburger that opens a drawer of customer destinations. It
 * was given a dark skin on the partner surface and left otherwise
 * intact, so a partner opening Jobs got three navigation systems stacked
 * on one screen:
 *
 *     Navbar        hamburger, drawer, logo        ← customer app
 *     JobsHeader    business, status, avatar       ← partner app
 *     PartnerBottomNav   Jobs Calendar Earnings More
 *
 * Two of those are duplicates of the third. The drawer could reach
 * screens the bottom bar also reaches, by different routes, with
 * different labels — which is how a partner ends up on a page they
 * cannot get back from.
 *
 * So the partner app has one shell, and the shell has no header of its
 * own. Each screen owns its own top strip, because Jobs wants a
 * branded operations header and Job Details wants a back button, and a
 * shared bar that tries to be both is worse than either.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IT OWNS THE SAFE AREA, ONCE
 * ══════════════════════════════════════════════════════════════════════
 *
 * `min-h-[100dvh]` rather than `min-h-screen`: `vh` on Android is the
 * viewport WITHOUT the browser chrome subtracted, so a `100vh` column
 * inside a WebView is taller than the window and pushes its own last
 * card under the navigation bar. `dvh` is the dynamic one and is what a
 * phone actually has.
 *
 * The bottom padding is the tab bar's height plus the gesture inset, so
 * the final card in any scroller clears the navigation instead of
 * hiding behind it. Set here and nowhere else — a screen that adds its
 * own gets double the gap, and a screen that forgets gets none.
 */
export default function PartnerAppShell({ children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      <main
        className="flex-1"
        style={{
          /* Tab bar (56) + label row (12) + the device's own gesture
             inset, whatever it is on this handset. */
          paddingBottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </main>
    </div>
  )
}

/**
 * Customer surface shell.
 *
 * Mirrors PartnerAppShell's responsibility: own the native viewport,
 * the page landmark and the one global safe-area contract. Pages keep
 * ownership of their content chrome; the shell never adds a second header.
 *
 * Focused booking flows intentionally do not use this shell, just as
 * partner onboarding and job-detail flows do not use the partner shell.
 */
export default function CustomerAppShell({ children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-page" data-app-surface="customer">
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

/**
 * "Start with Photography" took the partner to the error boundary.
 *
 * Mounts AddItemFlow exactly the way QuickStart does — a trade handed in
 * and the flow opening on the second screen — so the throw is a console
 * error here instead of a screenshot of a sad face on a phone.
 */
import React from 'react'
import { ToastProvider } from '../../src/context/ToastContext'
import AddItemFlow from '../../src/components/vendor/AddItemFlow'

export default function Repro() {
  return (
    <div id="repro" style={{ width: 390, margin: '0 auto', minHeight: 600 }}>
      <ToastProvider>
        <AddItemFlow
          existing={[]}
          startTrade="Photography"
          onAdd={() => {}}
          onClose={() => {}}
        />
      </ToastProvider>
    </div>
  )
}

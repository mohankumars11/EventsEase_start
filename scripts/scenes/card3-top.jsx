/** The top of the rendered card 3, to confirm the fake status bar is gone. */
import React from 'react'
export default function Scene() {
  return (
    <div style={{ width: 853, height: 300, overflow: 'hidden', background: '#000' }}>
      <img src="/onboarding/card-3-earnings-853.webp" alt="" style={{ width: 853, display: 'block' }} />
      <p data-ready style={{ position: 'absolute', font: '700 9px system-ui', color: '#fff' }}> </p>
    </div>
  )
}

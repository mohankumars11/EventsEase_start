/** Advance width of SAMBRAMO at 100px, in both faces. */
import React from 'react'
export default function Scene() {
  return (
    <div style={{ width: 430 }}>
      <span id="archivo" style={{ fontFamily: "'Sambramo Display'", fontWeight: 400, fontSize: 100, letterSpacing: '-0.005em', whiteSpace: 'nowrap', position: 'absolute', visibility: 'hidden' }}>SAMBRAMO</span>
      <span id="manrope" style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 100, letterSpacing: '-0.005em', whiteSpace: 'nowrap', position: 'absolute', visibility: 'hidden' }}>SAMBRAMO</span>
      <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
    </div>
  )
}

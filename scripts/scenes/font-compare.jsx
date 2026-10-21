/** SAMBRAMO in both candidate faces, for comparison against the device. */
import React from 'react'
export default function Scene() {
  const row = (label, style) => (
    <div style={{ padding: '18px 16px', background: '#2A085C' }}>
      <p style={{ font: '700 11px system-ui', color: 'rgba(255,255,255,.55)', margin: '0 0 6px' }}>{label}</p>
      <div style={{ color: '#fff', whiteSpace: 'nowrap', ...style }}>SAMBRAMO</div>
    </div>
  )
  return (
    <div style={{ width: 430, margin: '0 auto' }}>
      {row('Archivo Black  (Sambramo Display) — what the splash uses now', {
        fontFamily: "'Sambramo Display', 'Arial Black', sans-serif", fontWeight: 400,
        fontSize: 44, letterSpacing: '.035em', lineHeight: 1,
      })}
      {row('Manrope 900 — what the old splash used', {
        fontFamily: 'Manrope, Inter, system-ui, sans-serif', fontWeight: 900,
        fontSize: 44, letterSpacing: '.045em', lineHeight: 1,
      })}
      <p data-ready style={{ font: '700 11px system-ui', color: '#999', padding: 6 }}>rendered</p>
    </div>
  )
}

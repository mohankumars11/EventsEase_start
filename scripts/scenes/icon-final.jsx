/** The REAL generated partner launcher files, through each launcher mask. */
import React from 'react'

const BG = '#953BFB'
function Adaptive({ size, radius, src = '/_preview/fg.png' }) {
  const full = size * 108 / 72
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'relative', background: BG, boxShadow: '0 2px 8px rgba(0,0,0,.35)' }}>
      <img src={src} alt="" style={{ position: 'absolute', maxWidth: 'none', width: full, height: full, left: (size - full) / 2, top: (size - full) / 2 }} />
    </div>
  )
}
const cap = { font: '600 11px system-ui', color: 'rgba(255,255,255,.85)', margin: '6px 0 0' }
export default function Scene() {
  return (
    <div style={{ width: 600, padding: 22, background: 'linear-gradient(160deg,#3a3d42,#26282c)' }}>
      <p style={{ font: '800 16px system-ui', color: '#fff', margin: '0 0 14px' }}>Generated files — adaptive layer through each mask</p>
      <div style={{ display: 'flex', gap: 20, marginBottom: 22 }}>
        {[['Circle', '50%'], ['Squircle', '34%'], ['Rounded square', '22%'], ['Square (worst)', '8%']].map(([n, r]) => (
          <div key={n} style={{ textAlign: 'center', width: 120 }}><Adaptive size={120} radius={r} /><p style={cap}>{n}</p></div>
        ))}
      </div>
      <p style={{ font: '800 14px system-ui', color: '#fff', margin: '0 0 10px' }}>Legacy files · mdpi layer at real size</p>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <img src="/_preview/square.png" alt="" style={{ width: 96, height: 96 }} />
        <img src="/_preview/round.png" alt="" style={{ width: 96, height: 96 }} />
        <Adaptive size={48} radius="50%" src="/_preview/fg-mdpi.png" />
        <Adaptive size={48} radius="22%" src="/_preview/fg-mdpi.png" />
      </div>
    </div>
  )
}

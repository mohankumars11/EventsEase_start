/** ResubmitNotice in each state, above a mock Submit button. */
import React from 'react'
import ResubmitNotice from '../../src/components/vendor/listing/ResubmitNotice'
const Btn = () => (
  <div style={{ height: 54, borderRadius: 999, background: 'linear-gradient(90deg,#12694c,#10b981)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 15px system-ui' }}>Submit for review</div>
)
export default function Scene() {
  return (
    <div style={{ width: 400, margin: '0 auto', padding: 14, background: '#fff', display: 'grid', gap: 22 }}>
      {['live', 'under_review', 'rejected'].map(s => (
        <div key={s}>
          <p style={{ font: '700 11px system-ui', color: '#888', margin: '0 0 6px' }}>listing is {s}</p>
          <ResubmitNotice status={s} />
          <Btn />
        </div>
      ))}
      <p data-ready style={{ font: '700 11px system-ui', color: '#999' }}>rendered</p>
    </div>
  )
}

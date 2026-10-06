/**
 * The cropper, over a generated photograph.
 *
 * The image is drawn here rather than loaded: a scene that needs a file
 * on disk is a scene that breaks on a clean checkout, and what is being
 * looked at is the overlay, not the subject.
 *
 *   node scripts/shoot-components.mjs shots/image-cropper.png \
 *     --scenes scripts/scenes/image-cropper.jsx --width 430 --wait 2200
 */
import React, { useEffect, useState } from 'react'
import ImageCropper from '../../src/components/partner/ImageCropper'

/* A 4:3 photograph, which is what a phone camera hands over and the
   shape the old code centre-cropped without asking. */
function makePhoto() {
  return new Promise(resolve => {
    const c = document.createElement('canvas')
    c.width = 1200; c.height = 900
    const x = c.getContext('2d')

    const sky = x.createLinearGradient(0, 0, 0, 900)
    sky.addColorStop(0, '#8b5cf6')
    sky.addColorStop(1, '#f59e0b')
    x.fillStyle = sky
    x.fillRect(0, 0, 1200, 900)

    /* Something recognisable and off-centre, so the grid has a subject
       to be judged against. */
    x.fillStyle = '#fde68a'
    x.beginPath(); x.arc(760, 330, 150, 0, Math.PI * 2); x.fill()
    x.fillStyle = '#4c1d95'
    x.beginPath(); x.arc(715, 300, 18, 0, Math.PI * 2); x.fill()
    x.beginPath(); x.arc(805, 300, 18, 0, Math.PI * 2); x.fill()
    x.strokeStyle = '#4c1d95'; x.lineWidth = 10; x.lineCap = 'round'
    x.beginPath(); x.arc(760, 350, 60, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke()

    x.fillStyle = 'rgba(255,255,255,0.35)'
    x.font = 'bold 44px system-ui'
    x.fillText('4:3 as the camera took it', 60, 840)

    c.toBlob(b => resolve(new File([b], 'photo.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9)
  })
}

export default function ImageCropperScene() {
  const [file, setFile] = useState(null)
  useEffect(() => { makePhoto().then(setFile) }, [])

  /* A marker the driving script can poll for, rather than trusting a
     fixed wait: the file is produced asynchronously. */
  return (
    <div style={{ width: 430, height: 880, position: 'relative', background: '#000' }}
         data-ready={file ? 'yes' : 'no'}>
      {file && <ImageCropper file={file} onCancel={() => {}} onDone={() => {}} />}
    </div>
  )
}

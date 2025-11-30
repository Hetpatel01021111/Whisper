import React, { useRef, useState, useEffect } from 'react'

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [facingMode, setFacingMode] = useState('user') // 'user' or 'environment'
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access error:', error)
      alert('Could not access camera. Please check permissions.')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video && canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      
      canvas.toBlob((blob) => {
        onCapture(blob, 'photo')
        cleanup()
      }, 'image/jpeg', 0.95)
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Video Preview */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Top Controls */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={cleanup}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              color: '#fff',
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <button
            onClick={switchCamera}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              color: '#fff',
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div style={{
        padding: '30px 20px',
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px'
      }}>
        {/* Capture Button */}
        <button
          onClick={capturePhoto}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '35px',
            background: '#fff',
            border: '4px solid #00a8ff',
            cursor: 'pointer',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
      </div>
    </div>
  )
}

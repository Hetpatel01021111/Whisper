import React, { useEffect, useRef, useState } from 'react'
import { callManager, CallState } from '../webrtc'

export default function VideoCallScreen({ 
  callState, 
  localStream, 
  remoteStream, 
  isVideo,
  callerName,
  onEndCall 
}) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Call duration timer
  useEffect(() => {
    if (callState === CallState.CONNECTED) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [callState])

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (callState === CallState.CONNECTED) {
      const timeout = setTimeout(() => setShowControls(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [callState, showControls])

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream && isVideo) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => setShowControls(true)}
    >
      {/* Remote Video (Full Screen) */}
      <div style={{ flex: 1, position: 'relative', background: '#1a1a1a' }}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '60px',
              background: '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              {callerName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {callerName}
            </div>
            <div style={{ fontSize: '16px', color: '#888' }}>
              {callState === CallState.CALLING && 'Calling...'}
              {callState === CallState.RINGING && 'Ringing...'}
              {callState === CallState.CONNECTED && 'Connecting...'}
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {localStream && isVideo && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '120px',
            height: '160px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '2px solid #00a8ff'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror effect
              }}
            />
            {isVideoOff && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Call Info Overlay */}
        {showControls && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '20px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: '#fff' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{callerName}</div>
              {callState === CallState.CONNECTED && (
                <div style={{ fontSize: '14px', color: '#00a8ff' }}>
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="11" width="14" height="10" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              End-to-end encrypted
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      {showControls && (
        <div style={{
          padding: '30px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}>
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '30px',
              background: isMuted ? '#ff4444' : 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            {isMuted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>

          {/* Video Toggle (only for video calls) */}
          {isVideo && (
            <button
              onClick={toggleVideo}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '30px',
                background: isVideoOff ? '#ff4444' : 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {isVideoOff ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              )}
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '30px',
              background: '#ff4444',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              transform: 'scale(1.1)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" transform="rotate(135 12 12)"/>
            </svg>
          </button>

          {/* Speaker Button (placeholder) */}
          <button
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '30px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

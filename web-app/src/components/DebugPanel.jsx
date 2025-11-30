import React, { useState, useEffect } from 'react'

export default function DebugPanel({ socket, user, conversation }) {
  const [show, setShow] = useState(false)
  const [socketStatus, setSocketStatus] = useState({})
  const [testResults, setTestResults] = useState([])

  useEffect(() => {
    if (socket) {
      const updateStatus = () => {
        setSocketStatus({
          connected: socket.connected,
          id: socket.id,
          hasEmit: typeof socket.emit === 'function'
        })
      }
      
      updateStatus()
      const interval = setInterval(updateStatus, 1000)
      return () => clearInterval(interval)
    }
  }, [socket])

  const testEvent = (eventName, data) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`🧪 [${timestamp}] Testing ${eventName}:`, data)
    
    try {
      socket.emit(eventName, data)
      setTestResults(prev => [...prev, {
        time: timestamp,
        event: eventName,
        status: 'sent',
        data
      }])
      console.log(`✅ [${timestamp}] Event emitted successfully`)
    } catch (error) {
      setTestResults(prev => [...prev, {
        time: timestamp,
        event: eventName,
        status: 'error',
        error: error.message
      }])
      console.error(`❌ [${timestamp}] Error:`, error)
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#ff4444',
          color: '#fff',
          border: 'none',
          padding: '12px 20px',
          borderRadius: '50px',
          cursor: 'pointer',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        🐛 Debug
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      background: '#1a1a1a',
      border: '2px solid #00a8ff',
      borderRadius: '12px',
      padding: '16px',
      zIndex: 9999,
      overflow: 'auto',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ color: '#00a8ff', margin: 0 }}>🐛 Debug Panel</h3>
        <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>✕</button>
      </div>

      {/* Socket Status */}
      <div style={{ background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ color: '#00a8ff', fontWeight: 'bold', marginBottom: '8px' }}>Socket Status</div>
        <div style={{ fontSize: '12px', color: '#fff' }}>
          <div>Connected: {socketStatus.connected ? '✅ Yes' : '❌ No'}</div>
          <div>Socket ID: {socketStatus.id || 'N/A'}</div>
          <div>Has emit(): {socketStatus.hasEmit ? '✅ Yes' : '❌ No'}</div>
        </div>
      </div>

      {/* User Info */}
      <div style={{ background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ color: '#00a8ff', fontWeight: 'bold', marginBottom: '8px' }}>User Info</div>
        <div style={{ fontSize: '12px', color: '#fff' }}>
          <div>My ID: {user?.id || 'N/A'}</div>
          <div>Target ID: {conversation?.userId || 'N/A'}</div>
        </div>
      </div>

      {/* Test Buttons */}
      <div style={{ background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ color: '#00a8ff', fontWeight: 'bold', marginBottom: '8px' }}>Test Events</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => testEvent('typing-start', { targetId: conversation.userId, senderId: user.id })}
            style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Test Typing
          </button>
          <button
            onClick={() => testEvent('message-reaction', { targetId: conversation.userId, senderId: user.id, emoji: '❤️', messageId: 'test' })}
            style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Test Reaction
          </button>
          <button
            onClick={() => testEvent('call-offer', { targetId: conversation.userId, senderId: user.id, isVideo: false, callId: Date.now() })}
            style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Test Call
          </button>
          <button
            onClick={() => testEvent('test-event', { test: 'data', from: user.id })}
            style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Test Generic Event
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div style={{ background: '#222', padding: '12px', borderRadius: '8px' }}>
        <div style={{ color: '#00a8ff', fontWeight: 'bold', marginBottom: '8px' }}>Test Results</div>
        <div style={{ maxHeight: '200px', overflow: 'auto' }}>
          {testResults.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#666' }}>No tests run yet</div>
          ) : (
            testResults.slice().reverse().map((result, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', padding: '4px', background: '#333', borderRadius: '4px' }}>
                <div style={{ color: result.status === 'sent' ? '#00a8ff' : '#ff4444' }}>
                  [{result.time}] {result.event} - {result.status}
                </div>
                {result.error && <div style={{ color: '#ff4444' }}>Error: {result.error}</div>}
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => setTestResults([])}
          style={{ marginTop: '8px', background: '#ff4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', width: '100%' }}
        >
          Clear Results
        </button>
      </div>
    </div>
  )
}

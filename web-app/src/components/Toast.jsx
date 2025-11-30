import React, { useState, useEffect } from 'react'

let showToastFn = null

export function useToast() {
  return (message, type = 'info') => {
    if (showToastFn) showToastFn(message, type)
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    showToastFn = (message, type) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: toast.type === 'error' ? '#ff4444' : toast.type === 'success' ? '#00a8ff' : '#333',
            color: toast.type === 'success' ? '#000' : '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
            fontSize: '14px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

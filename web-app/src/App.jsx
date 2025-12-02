import React, { useState, useEffect } from 'react'
import { auth, boards } from './api'
import './index.css'
import ConversationList from './components/ConversationList'
import ChatScreen from './components/ChatScreen'
import { initSocket, getSocket, disconnectSocket } from './socket'
import { initializeEncryption, encryptMessage, decryptMessage, getStoredKeys, generatePreKeyBundle } from './crypto'
import keyStorageAPI from './keyStorageAPI'
import { privacyNetwork, sendPrivateMessage, onPrivateMessage } from './privacyNetwork'
import { fileTransferManager } from './fileTransfer'
import WebGLShader from './components/WebGLShader'

// Eclipse Logo SVG Component
function EclipseLogo() {
  return (
    <svg className="logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left vertical bar with perspective */}
      <path d="M15 20 L25 15 L25 85 L15 80 Z" fill="#ffffff" />
      
      {/* Top horizontal bar */}
      <path d="M25 15 L75 15 L70 25 L25 25 Z" fill="#ffffff" />
      
      {/* Middle horizontal bar */}
      <path d="M25 45 L65 45 L60 55 L25 55 Z" fill="#ffffff" />
      
      {/* Bottom horizontal bar */}
      <path d="M25 75 L75 75 L70 85 L25 85 Z" fill="#ffffff" />
      
      {/* Small right edge on top */}
      <path d="M70 25 L75 15 L80 20 L75 30 Z" fill="#ffffff" />
      
      {/* Small right edge on middle */}
      <path d="M60 55 L65 45 L70 50 L65 60 Z" fill="#ffffff" />
      
      {/* Small right edge on bottom */}
      <path d="M70 85 L75 75 L80 80 L75 90 Z" fill="#ffffff" />
    </svg>
  )
}

function SignIn({ onNewAccount, onHaveKey }) {
  return (
    <>
      <WebGLShader />
      <div className="auth-container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <EclipseLogo />
          <div className="logo-text">ECLIPSE</div>
        </div>
        <h1 className="title">Welcome to Eclipse</h1>
        <p className="subtitle">Anonymous, decentralized messaging</p>
        
        <button onClick={onNewAccount} style={{ marginBottom: '16px' }}>
          Create New Account
        </button>
        <button className="secondary" onClick={onHaveKey}>
          I Have an Access Key
        </button>
      </div>
    </>
  )
}

function CreateAccount({ onSuccess }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return alert('Please enter your display name')
    setLoading(true)
    try {
      const result = await auth.create(name.trim())
      // Don't save to localStorage yet - user must save key first
      onSuccess(result.accessKey, result.user, result.sessionToken)
    } catch (err) {
      alert(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <EclipseLogo />
        <div className="logo-text">ECLIPSE</div>
      </div>
      <h1 className="title">Create Account</h1>
      <p className="subtitle">Choose your display name</p>
      <input
        placeholder="Display Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
        autoFocus
      />
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating Account...' : 'Continue'}
      </button>
    </div>
  )
}

function SaveKey({ accessKey, user, sessionToken, onContinue }) {
  const [downloaded, setDownloaded] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const downloadKey = () => {
    const element = document.createElement('a')
    const text = `ECLIPSE ACCOUNT RECOVERY KEY\n\nDisplay Name: ${user.displayName}\nAccess Key: ${accessKey}\n\nIMPORTANT:\n- This is your ONLY way to access your account\n- Keep this key safe and private\n- No password recovery is available\n- You will need this key to login\n\nCreated: ${new Date().toLocaleString()}`
    
    const file = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(file)
    element.href = url
    element.download = `session-recovery-key-${user.displayName}.txt`
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    
    // Clean up the blob URL to prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 100)
    setDownloaded(true)
  }

  const copyKey = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(accessKey)
        alert('Access key copied to clipboard!')
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = accessKey
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Access key copied to clipboard!')
      }
    } catch (error) {
      console.error('Copy failed:', error)
      alert('Copy failed. Please manually copy the key: ' + accessKey)
    }
  }

  const handleContinue = () => {
    if (!confirmed) {
      alert('Please confirm you have saved your access key')
      return
    }
    // Now save to localStorage
    localStorage.setItem('sessionToken', sessionToken)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('currentAccessKey', accessKey)
    
    // Initialize encryption keys
    initializeEncryption(accessKey)
    
    onContinue()
  }

  return (
    <div className="auth-container">
      <h1 className="title">Save Your Recovery Key</h1>
      <div className="warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        This key is shown ONLY ONCE. Download it now!
      </div>
      <div className="key-box">
        <p className="key-label">Your 32-Digit Access Key</p>
        <p className="key-text">{accessKey}</p>
      </div>
      
      <button onClick={downloadKey} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {downloaded ? (
          <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><polyline points="20 6 9 17 4 12"/></svg> Downloaded</>
        ) : (
          <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Recovery Key</>
        )}
      </button>
      <button className="secondary" onClick={copyKey} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy to Clipboard
      </button>

      <div style={{
        padding: '16px',
        background: '#1a1a1a',
        borderRadius: '12px',
        marginBottom: '20px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#888'
      }}>
        <strong style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>Important:</strong>
        • You need this key to login<br/>
        • No password recovery available<br/>
        • Keep it safe and private<br/>
        • This is your anonymous identity
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '12px',
        background: '#1a1a1a',
        borderRadius: '8px'
      }}>
        <input 
          type="checkbox" 
          id="confirm-saved"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ marginRight: '12px' }}
        />
        <label htmlFor="confirm-saved" style={{ color: '#fff', fontSize: '14px' }}>
          I have safely saved my recovery key
        </label>
      </div>

      <button onClick={handleContinue} disabled={!downloaded || !confirmed}>
        {!downloaded ? 'Download Key First' : !confirmed ? 'Confirm You Saved Key' : 'Continue to Eclipse'}
      </button>
    </div>
  )
}

function Login({ onSuccess, onBack }) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const cleanKey = key.replace(/\s/g, '')
    if (cleanKey.length !== 32) {
      alert('Invalid access key. Must be 32 characters.')
      return
    }
    setLoading(true)
    try {
      const result = await auth.login(cleanKey)
      localStorage.setItem('sessionToken', result.sessionToken)
      localStorage.setItem('user', JSON.stringify(result.user))
      localStorage.setItem('currentAccessKey', cleanKey)
      
      // Initialize encryption keys
      initializeEncryption(cleanKey)
      
      onSuccess(result.user)
    } catch (err) {
      alert('Invalid access key. Please check and try again.')
      setKey('')
    }
    setLoading(false)
  }

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText()
        const cleaned = text.replace(/\s/g, '')
        if (cleaned.length === 32) {
          setKey(cleaned)
        } else {
          alert('Clipboard does not contain a valid 32-character key')
        }
      } else {
        alert('Clipboard access not available. Please paste manually using Ctrl+V or Cmd+V.')
      }
    } catch (err) {
      alert('Failed to read clipboard. Please paste manually using Ctrl+V or Cmd+V.')
    }
  }

  return (
    <div className="auth-container">
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <EclipseLogo />
        <div className="logo-text">ECLIPSE</div>
      </div>
      <h1 className="title">Enter Recovery Key</h1>
      <p className="subtitle">Enter your 32-digit access key to sign in</p>
      
      <div style={{ position: 'relative' }}>
        <input
          placeholder="Paste your access key here"
          value={key}
          onChange={(e) => setKey(e.target.value.replace(/\s/g, ''))}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          style={{ 
            fontFamily: 'Courier New, monospace', 
            letterSpacing: '1px',
            fontSize: '14px'
          }}
          autoFocus
        />
      </div>
      
      <button className="secondary" onClick={handlePaste} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Paste from Clipboard
      </button>
      
      <button onClick={handleLogin} disabled={loading || key.length !== 32}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      
      <p className="link" onClick={onBack} style={{ marginTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </p>
    </div>
  )
}

function Home({ user, onProfile, onSettings, conversations = [], onSelectConversation, onNewChat, hasActiveChat = false }) {
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div 
          className="header-icon" 
          onClick={onProfile}
          title={user.displayName}
        >
          {getInitials(user.displayName)}
        </div>
        <div className="header-title">ECLIPSE</div>
        <div className="search-icon" onClick={onSettings}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
      </div>

      {/* Privacy Status Banner */}
      <div style={{ padding: '12px 16px 0' }}>
        <PrivacyStatus />
      </div>

      {(!conversations || conversations.length === 0) ? (
        /* Empty State */
        <div className="empty-state">
          <div className="logo-container">
            <EclipseLogo />
            <div className="logo-text">ECLIPSE</div>
          </div>
          <h2 className="empty-title">You don't have any conversations yet</h2>
          <p className="empty-subtitle">
            Hit the plus button to start a chat with your connections!
          </p>
        </div>
      ) : (
        /* Conversations List */
        <ConversationList 
          conversations={conversations}
          onSelectConversation={onSelectConversation}
          onNewChat={onNewChat}
        />
      )}

      {/* FAB - Hide on desktop when chat is active */}
      {!hasActiveChat && (
        <button className="fab" onClick={onNewChat}>+</button>
      )}
    </div>
  )
}

// SVG Icons
function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconUserPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  )
}

function IconBack() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

// SVG Icons for Settings
function IconEclipseNetwork() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M8 12h8M12 8v8"/>
    </svg>
  )
}

function IconPrivacy() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <circle cx="12" cy="16" r="1"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function IconNotifications() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function IconConversations() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconAppearance() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function IconMessageRequests() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function IconRecovery() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconHelp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconClearData() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  )
}

// 🔒 Privacy Status Component - Shows onion routing and P2P status
function PrivacyStatus() {
  const [stats, setStats] = React.useState(null)
  
  React.useEffect(() => {
    const updateStats = () => {
      try {
        const networkStats = privacyNetwork.getStats()
        setStats(networkStats)
      } catch (e) {
        setStats(null)
      }
    }
    
    updateStats()
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])
  
  if (!stats || !stats.initialized) {
    return (
      <div className="privacy-status" style={{ 
        padding: '12px', 
        background: '#1a1a1a', 
        borderRadius: '8px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔒</span>
          <span style={{ color: '#888' }}>Privacy Network: Initializing...</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="privacy-status" style={{ 
      padding: '12px', 
      background: '#1a1a1a', 
      borderRadius: '8px',
      marginBottom: '12px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#00a8ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="11" width="14" height="10" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Privacy Network Active
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stats.onionRouting?.enabled ? '#00a8ff' : '#888'} strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <span style={{ color: stats.onionRouting?.enabled ? '#00a8ff' : '#888' }}>
            Onion: {stats.onionRouting?.knownRelays || 0} relays
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stats.p2p?.enabled ? '#00a8ff' : '#888'} strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span style={{ color: stats.p2p?.enabled ? '#00a8ff' : '#888' }}>
            P2P: {stats.p2p?.connectedPeers || 0} peers
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#00a8ff' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{ color: '#00a8ff' }}>E2E Encrypted</span>
        </div>
      </div>
    </div>
  )
}

function Settings({ user, onBack, onProfile, onLogout, onPrivacy }) {
  const handleClearData = () => {
    if (window.confirm('This will delete all your data and log you out. You will need your recovery key to sign back in. Continue?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="search-icon" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <div className="header-title">Settings</div>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* First Section - Eclipse Network */}
      <div className="section-group" style={{ marginTop: '12px' }}>
        <div className="section-item" onClick={onProfile}>
          <span className="settings-icon"><IconEclipseNetwork /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Eclipse Network</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
      </div>

      {/* Main Settings Group */}
      <div className="section-group">
        <div className="section-item" onClick={onPrivacy}>
          <span className="settings-icon"><IconPrivacy /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Privacy</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
        
        <div className="section-item">
          <span className="settings-icon"><IconNotifications /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Notifications</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
        
        <div className="section-item">
          <span className="settings-icon"><IconConversations /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Conversations</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
        
        <div className="section-item">
          <span className="settings-icon"><IconAppearance /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Appearance</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
        
        <div className="section-item">
          <span className="settings-icon"><IconMessageRequests /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Message Requests</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
      </div>

      {/* Recovery & Help Group */}
      <div className="section-group">
        <div className="section-item">
          <span className="settings-icon"><IconRecovery /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Recovery Password</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
        
        <div className="section-item">
          <span className="settings-icon"><IconHelp /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Help</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
        
        <div className="section-item" onClick={handleClearData}>
          <span className="settings-icon"><IconClearData /></span>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ color: '#ff4444' }}>Clear Data</div>
          </div>
          <span style={{ color: '#666', fontSize: '20px' }}>›</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
            <path d="M15 20 L25 15 L25 85 L15 80 Z" fill="#00a8ff" />
            <path d="M25 15 L75 15 L70 25 L25 25 Z" fill="#00a8ff" />
            <path d="M25 45 L65 45 L60 55 L25 55 Z" fill="#00a8ff" />
            <path d="M25 75 L75 75 L70 85 L25 85 Z" fill="#00a8ff" />
            <path d="M70 25 L75 15 L80 20 L75 30 Z" fill="#00a8ff" />
            <path d="M60 55 L65 45 L70 50 L65 60 Z" fill="#00a8ff" />
            <path d="M70 85 L75 75 L80 80 L75 90 Z" fill="#00a8ff" />
          </svg>
          <span style={{ fontSize: '16px', letterSpacing: '2px' }}>
            <span style={{ color: '#fff' }}>ECLIPSE</span>
            <span style={{ color: '#666' }}>TOKEN</span>
          </span>
        </div>
        <div style={{ fontSize: '12px' }}>Version 1.0.0</div>
      </div>
    </div>
  )
}

function LockScreen({ onUnlock }) {
  const [isUnlocking, setIsUnlocking] = useState(false)

  const handleUnlock = async () => {
    setIsUnlocking(true)
    
    // Try Web Authentication API (biometric) first
    if (window.PublicKeyCredential) {
      try {
        // This is a simplified version - in production you'd have proper credential setup
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            allowCredentials: [],
            userVerification: 'required'
          }
        })
        
        if (credential) {
          onUnlock()
          return
        }
      } catch (error) {
        console.log('Biometric auth failed, falling back to prompt')
      }
    }
    
    // Fallback to password prompt
    const password = prompt('Enter your device password or PIN:')
    if (password) {
      // In a real app, you'd verify this properly
      onUnlock()
    }
    
    setIsUnlocking(false)
  }

  return (
    <div className="lock-screen">
      <div className="lock-content">
        <EclipseLogo />
        <div className="logo-text" style={{ marginBottom: '40px' }}>ECLIPSE</div>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ color: '#fff', marginBottom: '10px' }}>App Locked</h2>
          <p style={{ color: '#888' }}>Use biometric authentication or enter your PIN to unlock</p>
        </div>
        
        <button 
          onClick={handleUnlock}
          disabled={isUnlocking}
          style={{ 
            width: '200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isUnlocking ? (
            <>⏳ Unlocking...</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Unlock
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Privacy({ onBack }) {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('privacySettings')
    return saved ? JSON.parse(saved) : {
      voiceVideoCalls: false,
      lockApp: false,
      communityMessageRequests: false,
      readReceipts: false,
      typingIndicators: false,
      linkPreviews: false,
      incognitoKeyboard: true
    }
  })

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('privacySettings', JSON.stringify(settings))
  }, [settings])

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="search-icon" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
        <div className="header-title">Privacy</div>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Voice and Video Calls Section */}
      <div className="privacy-section-label">Voice and Video Calls (Beta)</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('voiceVideoCalls')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Voice and Video Calls</div>
            <div className="card-subtitle">Enables voice and video calls to and from other users.</div>
          </div>
          <div className={`toggle ${settings.voiceVideoCalls ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Screen Security Section */}
      <div className="privacy-section-label">Screen Security</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('lockApp')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Lock App</div>
            <div className="card-subtitle">Require fingerprint, PIN, pattern or password to unlock Eclipse.</div>
          </div>
          <div className={`toggle ${settings.lockApp ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Message Requests Section */}
      <div className="privacy-section-label">Message Requests</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('communityMessageRequests')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Community Message Requests</div>
            <div className="card-subtitle">Allow message requests from Community conversations.</div>
          </div>
          <div className={`toggle ${settings.communityMessageRequests ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Read Receipts Section */}
      <div className="privacy-section-label">Read Receipts</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('readReceipts')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Read Receipts</div>
            <div className="card-subtitle">Show read receipts for all messages you send and receive.</div>
          </div>
          <div className={`toggle ${settings.readReceipts ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Typing Indicators Section */}
      <div className="privacy-section-label">Typing Indicators</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('typingIndicators')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Typing Indicators</div>
            <div className="card-subtitle">See and share typing indicators.</div>
          </div>
          <div className={`toggle ${settings.typingIndicators ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Link Previews Section */}
      <div className="privacy-section-label">Link Previews</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('linkPreviews')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Send Link Previews</div>
            <div className="card-subtitle">Show link previews for supported URLs.</div>
          </div>
          <div className={`toggle ${settings.linkPreviews ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Incognito Keyboard Section */}
      <div className="privacy-section-label">Incognito Keyboard</div>
      <div className="section-group">
        <div className="section-item" onClick={() => toggleSetting('incognitoKeyboard')}>
          <div style={{ flex: 1 }}>
            <div className="card-title">Incognito Keyboard</div>
            <div className="card-subtitle">Request incognito mode if available. Depending on the keyboard you are using, your keyboard may ignore this request.</div>
          </div>
          <div className={`toggle ${settings.incognitoKeyboard ? 'toggle-on' : ''}`}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      <div style={{ height: '40px' }}></div>
    </div>
  )
}

function Profile({ user, onBack, onSettings }) {
  const [accountId, setAccountId] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [connections, setConnections] = useState([])
  const [connectCode, setConnectCode] = useState('')

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  useEffect(() => {
    loadConnections()
  }, [])

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) {
        setAccountId(null)
        setExpiresAt(null)
        setTimeLeft(null)
      } else {
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const loadConnections = async () => {
    try {
      const result = await auth.getConnections()
      setConnections(result.connections)
    } catch (err) {}
  }

  const generateId = async () => {
    // Check if user is logged in
    const token = localStorage.getItem('sessionToken')
    if (!token) {
      alert('Please create an account or login first to invite friends')
      return
    }
    
    try {
      const result = await auth.generateAccountId()
      setAccountId(result.accountId)
      setExpiresAt(result.expiresAt)
    } catch (err) {
      if (err.message.includes('Invalid session') || err.message.includes('401')) {
        alert('Your session has expired. Please login again.')
        // Clear invalid session
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
        window.location.reload()
      } else {
        alert(err.message)
      }
    }
  }

  const connect = async () => {
    if (!connectCode.trim()) return
    
    // Check if user is logged in
    const token = localStorage.getItem('sessionToken')
    if (!token) {
      alert('Please create an account or login first to connect with friends')
      return
    }
    
    try {
      const result = await auth.connectByAccountId(connectCode.trim())
      alert(`Connected to ${result.connectedUser.displayName}!`)
      setConnectCode('')
      loadConnections()
    } catch (err) {
      if (err.message.includes('Invalid session') || err.message.includes('401')) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
        window.location.reload()
      } else {
        alert(err.message)
      }
    }
  }

  const copyAccountId = async () => {
    if (!accountId) return
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(accountId)
        alert('Account ID copied!')
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = accountId
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Account ID copied!')
      }
    } catch (error) {
      console.error('Copy failed:', error)
      alert('Copy failed. Please manually copy the Account ID: ' + accountId)
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="search-icon" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
        <div className="header-title">Settings</div>
        <div className="search-icon" onClick={onSettings}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar">
          {getInitials(user.displayName)}
          <div className="avatar-badge">+</div>
        </div>
        <div className="display-name">{user.displayName}</div>
        <div className="account-id-label">Your Account ID</div>
      </div>

      {/* Account ID Display */}
      <div style={{ padding: '0 20px' }}>
        <div className="key-box">
          <p className="key-text" style={{ fontSize: '13px', lineHeight: '1.8' }}>
            {user.id}
          </p>
          <div className="key-actions">
            <button className="secondary">Share</button>
            <button className="secondary">Copy</button>
          </div>
        </div>
      </div>

      {/* Account ID Generator Section */}
      <div className="section-group">
        <div className="section-item" onClick={() => !accountId && generateId()}>
          <span className="settings-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Invite a Friend</div>
            {accountId && (
              <>
                <div style={{ marginTop: '8px', padding: '12px', background: '#0a0a0a', borderRadius: '8px', border: '2px solid #00a8ff' }}>
                  <div className="key-text" style={{ fontSize: '20px', textAlign: 'center' }}>{accountId}</div>
                  {timeLeft && <div className="timer">Expires in {timeLeft}</div>}
                </div>
                <button onClick={copyAccountId} style={{ marginTop: '8px', width: '100%' }}>Copy Account ID</button>
              </>
            )}
          </div>
          {!accountId && <span style={{ color: '#666' }}>›</span>}
        </div>
      </div>

      {/* Connect Section */}
      <div style={{ padding: '0 20px', marginTop: '12px' }}>
        <input
          placeholder="Enter friend's Account ID"
          value={connectCode}
          onChange={(e) => setConnectCode(e.target.value)}
        />
        <button onClick={connect}>Connect</button>
      </div>

      {/* Connections */}
      <div style={{ padding: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
          Connections ({connections.length})
        </h3>
        {connections.map((c) => (
          <div key={c.id} className="connection-item">
            <span className="connection-name">{c.user.displayName}</span>
            <span className="connection-date">{new Date(c.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
        {connections.length === 0 && <p className="empty-text">No connections yet</p>}
      </div>
    </div>
  )
}

function NewChatModal({ connections, onClose, onStartChat }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">New Conversation</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        {connections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            <p style={{ marginBottom: '16px' }}>No connections yet</p>
            <p style={{ fontSize: '14px' }}>
              Go to Settings → Your Profile to generate an Account ID and connect with friends!
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#888', marginBottom: '16px', fontSize: '14px' }}>
              Select a connection to start chatting:
            </p>
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="section-item"
                onClick={() => {
                  onStartChat(conn)
                  onClose()
                }}
                style={{ marginBottom: '8px', borderRadius: '12px', background: '#0a0a0a' }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff8c69, #ffb347)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  {conn.user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{conn.user.displayName}</div>
                  <div className="card-subtitle">Connected {new Date(conn.createdAt).toLocaleDateString()}</div>
                </div>
                <span style={{ color: '#666' }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to calculate message expiration time
function getExpirationTime(disappearTimer) {
  if (disappearTimer === 'off') return null
  
  const now = new Date()
  switch(disappearTimer) {
    case '5min': return new Date(now.getTime() + 5 * 60 * 1000).toISOString()
    case '1hr': return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    case '24hr': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case '7days': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    default: return null
  }
}

// Helper function to clean up expired messages
function cleanupExpiredMessages(messages) {
  const now = new Date()
  const cleaned = {}
  
  Object.keys(messages).forEach(conversationKey => {
    cleaned[conversationKey] = messages[conversationKey].filter(msg => {
      if (!msg.expiresAt) return true
      return new Date(msg.expiresAt) > now
    })
  })
  
  return cleaned
}

export default function App() {
  const [screen, setScreen] = useState('signin')
  const [accessKey, setAccessKey] = useState(null)
  const [sessionToken, setEclipseToken] = useState(null)
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState({})
  const [currentChat, setCurrentChat] = useState(null)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [connections, setConnections] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())

  // Screenshot protection
  useEffect(() => {
    // Detect screenshot attempts (web only - shows warning)
    const handleKeyDown = (e) => {
      // Common screenshot shortcuts
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4')) {
        e.preventDefault()
        alert('🚫 Screenshots are disabled for your privacy and security')
        return false
      }
      // Print screen
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        alert('🚫 Screenshots are disabled for your privacy and security')
        return false
      }
    }

    // Detect developer tools (F12, Ctrl+Shift+I, etc.)
    const handleDevTools = (e) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault()
        alert('🚫 Developer tools are disabled for security')
        return false
      }
    }

    // Blur content when window loses focus (screenshot protection)
    const handleVisibilityChange = () => {
      const appElement = document.getElementById('app-root')
      if (document.hidden) {
        if (appElement) appElement.style.filter = 'blur(10px)'
      } else {
        if (appElement) appElement.style.filter = 'none'
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleDevTools)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleDevTools)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const initializeApp = async () => {
      const savedUser = localStorage.getItem('user')
      const savedToken = localStorage.getItem('sessionToken')
      const savedConversations = localStorage.getItem('conversations')
      const savedMessages = localStorage.getItem('messages')
      
      if (savedUser && savedToken) {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setScreen('home')
        
        // Initialize encryption keys
        const savedAccessKey = localStorage.getItem('currentAccessKey')
        const userKeys = initializeEncryption(savedAccessKey)
        
        // Initialize Privacy Network (Onion Routing + P2P)
        try {
          await privacyNetwork.initialize(userKeys)
          privacyNetwork.registerAsRelay() // Contribute to the network
          console.log('🔒 Privacy Network initialized:', privacyNetwork.getStats())
          
          // Listen for private messages
          onPrivateMessage((message) => {
            console.log('🔒 Received private message:', message)
            // Handle incoming private message
            if (message.type === 'private_message') {
              const senderId = message.senderId
              setMessages(prev => {
                const chatMessages = prev[senderId] || []
                return {
                  ...prev,
                  [senderId]: [...chatMessages, {
                    id: Date.now(),
                    senderId: senderId,
                    content: message.content,
                    timestamp: message.timestamp,
                    encrypted: true,
                    onionRouted: true
                  }]
                }
              })
            }
          })
        } catch (error) {
          console.warn('🔒 Privacy Network initialization failed:', error)
        }
        
        // Upload keys to server if not already done
        const keysUploaded = localStorage.getItem('keysUploaded')
        if (!keysUploaded && userKeys) {
          try {
            const preKeyBundle = generatePreKeyBundle(userKeys)
            await keyStorageAPI.uploadUserKeys(userData.id, userKeys.publicKey, preKeyBundle)
            localStorage.setItem('keysUploaded', 'true')
            console.log('✅ Keys uploaded to secure server')
          } catch (error) {
            console.warn('Failed to upload keys to server:', error)
          }
        }
      
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations))
      }
      
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages)
        // Clean up expired messages on load
        const cleanedMessages = cleanupExpiredMessages(parsedMessages)
        setMessages(cleanedMessages)
        localStorage.setItem('messages', JSON.stringify(cleanedMessages))
      }
      
      // Initialize socket connection
      const socket = initSocket()
      
      // Remove any existing listeners first (prevent duplicates from HMR)
      socket.off('new-dm')
      socket.off('dm-sent')
      
      // Join user's personal room
      socket.emit('join-user-room', userData.id)
      
      // Initialize file transfer manager with socket
      // Note: fileTransferManager.initialize() sets up all socket handlers internally
      const keyPair = userKeys ? { publicKey: userKeys.publicKey, secretKey: userKeys.secretKey } : null
      fileTransferManager.initialize(keyPair, userData.id, socket)
      
      // Listen for incoming direct messages
      socket.on('new-dm', (message) => {
        console.log('Received new message:', message)
        
        // Decrypt message if encrypted
        let decryptedMessage = { ...message }
        if (message.isEncrypted && userKeys) {
          try {
            const senderPublicKey = localStorage.getItem(`publicKey_${message.senderId}`)
            if (senderPublicKey) {
              const encryptedData = JSON.parse(message.content)
              const decryptedContent = decryptMessage(encryptedData, senderPublicKey, userKeys.secretKey)
              decryptedMessage.content = decryptedContent
              decryptedMessage.isEncrypted = false // Mark as decrypted for UI
            }
          } catch (error) {
            console.error('Failed to decrypt message:', error)
            decryptedMessage.content = '[Encrypted message - failed to decrypt]'
          }
        }
        
        // Update messages state
        setMessages(prevMessages => {
          const conversationKey = message.senderId
          const existing = prevMessages[conversationKey] || []
          const updated = {
            ...prevMessages,
            [conversationKey]: [...existing, decryptedMessage]
          }
          localStorage.setItem('messages', JSON.stringify(updated))
          return updated
        })
        
        // Update or create conversation
        setConversations(prevConvs => {
          const existingConv = prevConvs.find(c => c.userId === message.senderId)
          
          if (existingConv) {
            const updated = prevConvs.map(conv =>
              conv.userId === message.senderId
                ? { ...conv, lastMessage: { content: message.content, timestamp: message.timestamp } }
                : conv
            )
            localStorage.setItem('conversations', JSON.stringify(updated))
            return updated
          } else {
            // Create new conversation for incoming message
            const newConv = {
              id: `conv_${Date.now()}`,
              userId: message.senderId,
              displayName: message.senderName,
              lastMessage: { content: message.content, timestamp: message.timestamp },
              unreadCount: 1
            }
            const updated = [...prevConvs, newConv]
            localStorage.setItem('conversations', JSON.stringify(updated))
            return updated
          }
        })
      })
      
      // Confirm message sent
      socket.on('dm-sent', (message) => {
        console.log('Message sent confirmation:', message)
      })
      } // End of if (savedUser && savedToken)
      
      // Set up periodic cleanup of expired messages (every minute)
      const cleanupInterval = setInterval(() => {
        setMessages(prevMessages => {
          const cleaned = cleanupExpiredMessages(prevMessages)
          localStorage.setItem('messages', JSON.stringify(cleaned))
          return cleaned
        })
      }, 60000) // 1 minute
      
      // Set up activity tracking and auto-lock
      const updateActivity = () => setLastActivity(Date.now())
      
      // Track user activity
      document.addEventListener('mousedown', updateActivity)
      document.addEventListener('keydown', updateActivity)
      document.addEventListener('touchstart', updateActivity)
      
      // Check for inactivity every 30 seconds
      const lockCheckInterval = setInterval(() => {
        const privacySettings = JSON.parse(localStorage.getItem('privacySettings') || '{}')
        if (privacySettings.lockApp) {
          const inactiveTime = Date.now() - lastActivity
          const lockTimeout = 5 * 60 * 1000 // 5 minutes
          
          if (inactiveTime > lockTimeout) {
            setIsLocked(true)
          }
        }
      }, 30000) // 30 seconds
      
      // Cleanup function
      return () => {
        clearInterval(cleanupInterval)
        clearInterval(lockCheckInterval)
        document.removeEventListener('mousedown', updateActivity)
        document.removeEventListener('keydown', updateActivity)
        document.removeEventListener('touchstart', updateActivity)
        
        // Remove socket listeners on cleanup
        const socket = getSocket()
        if (socket) {
          socket.off('file-transfer-request')
          socket.off('file-transfer-response')
          socket.off('file-chunk')
          socket.off('file-chunk-ack')
          socket.off('file-transfer-complete')
          socket.off('file-transfer-cancel')
          socket.off('new-dm')
          socket.off('dm-sent')
        }
      }
    }
    
    // Call the async initialization function
    initializeApp()
  }, [])

  const loadConnections = async () => {
    try {
      const result = await auth.getConnections()
      setConnections(result.connections)
      return result.connections
    } catch (err) {
      console.error('Failed to load connections:', err)
      return []
    }
  }

  const handleNewChat = async () => {
    const conns = await loadConnections()
    if (conns.length === 0) {
      alert('You have no connections yet. Go to Settings → Your Profile to connect with friends!')
      setScreen('profile')
    } else {
      setShowNewChatModal(true)
    }
  }

  const handleStartChat = (connection) => {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.userId === connection.user.id)
    
    if (existingConv) {
      setCurrentChat(existingConv)
      setScreen('chat')
    } else {
      // Create new conversation
      const newConv = {
        id: `conv_${Date.now()}`,
        userId: connection.user.id,
        displayName: connection.user.displayName,
        lastMessage: null,
        unreadCount: 0
      }
      
      const updatedConversations = [...conversations, newConv]
      setConversations(updatedConversations)
      localStorage.setItem('conversations', JSON.stringify(updatedConversations))
      
      setCurrentChat(newConv)
      setScreen('chat')
    }
  }

  const handleSendMessage = async (recipientId, messageData) => {
    const socket = getSocket()
    
    // Handle both old format (string) and new format (object)
    const content = typeof messageData === 'string' ? messageData : messageData.content
    const disappearTimer = typeof messageData === 'object' ? messageData.disappearTimer : 'off'
    
    // Create message object
    const message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: user.id,
      senderName: user.displayName,
      recipientId,
      content,
      disappearTimer,
      timestamp: new Date().toISOString(),
      expiresAt: getExpirationTime(disappearTimer),
      isEncrypted: false
    }

    // Send message immediately via socket
    socket.emit('send-dm', {
      senderId: user.id,
      senderName: user.displayName,
      recipientId,
      content,
      disappearTimer,
      timestamp: Date.now()
    })
    
    console.log('📤 Message sent:', content)

    // Update UI immediately
    const conversationKey = currentChat.userId
    const existingMessages = messages[conversationKey] || []
    const updatedMessages = {
      ...messages,
      [conversationKey]: [...existingMessages, message]
    }
    
    setMessages(updatedMessages)
    localStorage.setItem('messages', JSON.stringify(updatedMessages))

    // Update conversation last message
    const updatedConversations = conversations.map(conv => 
      conv.userId === recipientId 
        ? { ...conv, lastMessage: { content, timestamp: message.timestamp } }
        : conv
    )
    setConversations(updatedConversations)
    localStorage.setItem('conversations', JSON.stringify(updatedConversations))
  }

  const handleSelectConversation = (conversation) => {
    setCurrentChat(conversation)
    setScreen('chat')
  }

  // Show lock screen if app is locked
  if (isLocked && user) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />
  }

  // Sign In (Landing)
  if (screen === 'signin') {
    return <SignIn 
      onNewAccount={() => setScreen('create')}
      onHaveKey={() => setScreen('login')}
    />
  }

  // Create New Account
  if (screen === 'create') {
    return <CreateAccount 
      onSuccess={(key, u, token) => { 
        setAccessKey(key)
        setUser(u)
        setEclipseToken(token)
        setScreen('saveKey')
      }}
    />
  }

  // Save Recovery Key (Must Download)
  if (screen === 'saveKey') {
    return <SaveKey 
      accessKey={accessKey} 
      user={user}
      sessionToken={sessionToken}
      onContinue={() => setScreen('home')} 
    />
  }

  // Login with Existing Key
  if (screen === 'login') {
    return <Login 
      onSuccess={(u) => { setUser(u); setScreen('home') }}
      onBack={() => setScreen('signin')}
    />
  }

  // Settings Screen
  if (screen === 'settings') {
    return <Settings 
      user={user} 
      onBack={() => setScreen('home')} 
      onProfile={() => setScreen('profile')}
      onPrivacy={() => setScreen('privacy')}
      onLogout={() => {
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
        setUser(null)
        setScreen('signin')
      }}
    />
  }

  // Privacy Screen
  if (screen === 'privacy') {
    return <Privacy 
      onBack={() => setScreen('settings')} 
    />
  }

  // Profile Screen
  if (screen === 'profile') {
    return <Profile 
      user={user} 
      onBack={() => setScreen('settings')} 
      onSettings={() => setScreen('settings')}
    />
  }

  // Home Screen with Split View (Desktop) or Full Screen (Mobile)
  return <div id="app-root" className="split-layout">
    {/* Left Panel - Conversation List */}
    <div className={`conversations-panel ${currentChat ? 'has-active-chat' : ''}`}>
      <Home 
        user={user} 
        onProfile={() => setScreen('profile')} 
        onSettings={() => setScreen('settings')}
        conversations={conversations}
        onSelectConversation={(conv) => setCurrentChat(conv)}
        onNewChat={handleNewChat}
        hasActiveChat={!!currentChat}
      />
      {showNewChatModal && (
        <NewChatModal 
          connections={connections}
          onClose={() => setShowNewChatModal(false)}
          onStartChat={handleStartChat}
        />
      )}
    </div>

    {/* Right Panel - Chat Screen */}
    <div className={`chat-panel ${currentChat ? 'active' : ''}`}>
      {currentChat ? (
        <ChatScreen 
          conversation={currentChat}
          user={user}
          onBack={() => setCurrentChat(null)}
          onSendMessage={handleSendMessage}
          messages={messages[currentChat.userId] || []}
          socket={getSocket()}
        />
      ) : (
        <div className="no-chat-selected">
          <div style={{ textAlign: 'center', color: '#666', maxWidth: '360px' }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#3b4a54" strokeWidth="0.5" style={{ margin: '0 auto 24px', display: 'block', opacity: 0.6 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h2 style={{ color: '#e9edef', marginBottom: '16px', fontSize: '32px', fontWeight: '300' }}>Eclipse Messenger</h2>
            <p style={{ color: '#8696a0', fontSize: '14px', lineHeight: '20px', marginBottom: '24px' }}>
              Select a conversation to start messaging
            </p>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              color: '#8696a0',
              fontSize: '13px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="11" width="14" height="10" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span>End-to-end encrypted</span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
}

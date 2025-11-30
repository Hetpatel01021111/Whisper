import React, { useState, useEffect, useRef } from 'react'
import { fileTransferManager, TransferState } from '../fileTransfer'
import { voiceRecorder } from '../voiceMessage'
import { callManager, CallState } from '../webrtc'
import { messageFeaturesManager } from '../messageFeatures'
import { ToastContainer, useToast } from './Toast'
import DebugPanel from './DebugPanel'
import VideoCallScreen from './VideoCallScreen'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import StickerPicker from './StickerPicker'
import CameraCapture from './CameraCapture'

// Icons
const IconLock = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const IconShield = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconEye = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconFire = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff6b35"><path d="M12 23s-7-4-7-12c0-3 2-6 4-8 1 2 3 3 3 6 0-4 3-7 5-8 2 3 3 6 3 9 0 8-8 13-8 13z"/></svg>
const IconClock = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>

// Message Status Icons
function StatusIcon({ status }) {
  if (status === 'sent') return <span style={{ color: '#666' }}>✓</span>
  if (status === 'delivered') return <span style={{ color: '#666' }}>✓✓</span>
  if (status === 'read') return <span style={{ color: '#00a8ff' }}>✓✓</span>
  return null
}

export default function ChatScreen({ conversation, user, onBack, onSendMessage, messages, socket }) {
  const showToast = useToast()
  const [message, setMessage] = useState('')
  const [disappearTimer, setDisappearTimer] = useState('off')
  const [showTimerMenu, setShowTimerMenu] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [transfers, setTransfers] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [showReactions, setShowReactions] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [callState, setCallState] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [isVideoCall, setIsVideoCall] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const [longPressTimer, setLongPressTimer] = useState(null)
  const [featuresReady, setFeaturesReady] = useState(false)
  const [showFeatureTour, setShowFeatureTour] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const recordingIntervalRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    scrollToBottom()
  }, [messages, transfers])

  // Show feature tour on first visit
  useEffect(() => {
    const tourShown = localStorage.getItem('featureTourShown')
    if (!tourShown && featuresReady) {
      setShowFeatureTour(true)
      localStorage.setItem('featureTourShown', 'true')
    }
  }, [featuresReady])

  // Initialize managers
  useEffect(() => {
    if (socket && user) {
      console.log('🎯 Initializing ChatScreen features for user:', user.id)
      console.log('🎯 Socket object:', socket)
      console.log('🎯 Socket connected:', socket.connected)
      console.log('🎯 Socket ID:', socket.id)
      
      // Test socket emit
      console.log('🧪 Testing socket emit...')
      socket.emit('test-event', { test: 'data' })
      
      try {
        messageFeaturesManager.initialize(user.id, socket)
        callManager.initialize(user.id, socket)
        setFeaturesReady(true)
        console.log('✅ ChatScreen features initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize features:', error)
      }
    } else {
      console.warn('⚠️ ChatScreen missing socket or user:', { socket: !!socket, user: !!user })
      setFeaturesReady(false)
    }
  }, [socket, user])

  // Typing indicators
  useEffect(() => {
    const handleTyping = (data) => {
      console.log('⌨️ Received typing event:', data)
      if (data.senderId === conversation.userId) {
        setPeerTyping(true)
        showToast(`${conversation.displayName} is typing...`, 'info')
      }
    }
    const handleStopTyping = (data) => {
      console.log('⌨️ Received stop typing event:', data)
      if (data.senderId === conversation.userId) {
        setPeerTyping(false)
      }
    }
    
    messageFeaturesManager.on('onTyping', handleTyping)
    messageFeaturesManager.on('onStopTyping', handleStopTyping)
   
    return () => {
      messageFeaturesManager.off('onTyping', handleTyping)
      messageFeaturesManager.off('onStopTyping', handleStopTyping)
    }
  }, [conversation.userId])

  // Message feature handlers
  useEffect(() => {
    const handleReaction = (data) => {
      console.log('❤️ Received reaction:', data)
      showToast(`${conversation.displayName} reacted with ${data.emoji}`, 'success')
    }
    
    const handleDelete = (data) => {
      console.log('🗑️ Received delete:', data)
      showToast(`${conversation.displayName} deleted a message`, 'info')
    }
    
    messageFeaturesManager.on('onReaction', handleReaction)
    messageFeaturesManager.on('onDelete', handleDelete)
    
    return () => {
      messageFeaturesManager.off('onReaction', handleReaction)
      messageFeaturesManager.off('onDelete', handleDelete)
    }
  }, [conversation.userId])

  // Call handlers
  useEffect(() => {
    const handleStateChange = (state) => {
      setCallState(state)
      console.log('📞 Call state changed:', state)
    }
    
    const handleLocalStream = (stream) => {
      setLocalStream(stream)
      console.log('📞 Got local stream')
    }
    
    const handleRemoteStream = (stream) => {
      setRemoteStream(stream)
      showToast('📞 Call connected!', 'success')
      console.log('📞 Got remote stream')
    }
    
    const handleIncomingCall = (data) => {
      console.log('📞 Incoming call:', data)
      setIsVideoCall(data.isVideo)
      showToast(`📞 Incoming ${data.isVideo ? 'video' : 'voice'} call from ${conversation.displayName}`, 'info')
      
      if (window.confirm(`Incoming ${data.isVideo ? 'video' : 'voice'} call from ${conversation.displayName}`)) {
        callManager.answerCall(data.callId)
      } else {
        callManager.rejectCall(data.callId)
      }
    }

    callManager.on('onStateChange', handleStateChange)
    callManager.on('onLocalStream', handleLocalStream)
    callManager.on('onRemoteStream', handleRemoteStream)
    callManager.on('onIncomingCall', handleIncomingCall)

    return () => {
      callManager.off('onStateChange', handleStateChange)
      callManager.off('onLocalStream', handleLocalStream)
      callManager.off('onRemoteStream', handleRemoteStream)
      callManager.off('onIncomingCall', handleIncomingCall)
    }
  }, [conversation.userId])

  // File transfer handlers
  useEffect(() => {
    const handleRequest = (data) => {
      if (data.transfer.senderId === conversation.userId) {
        setPendingRequests(prev => [...prev, data])
      }
    }
    
    const handleProgress = (data) => {
      setTransfers(prev => prev.map(t => 
        t.id === data.transfer.id ? { ...t, progress: data.progress } : t
      ))
    }
    
    const handleComplete = (transfer) => {
      setTransfers(prev => prev.map(t => 
        t.id === transfer.id ? { ...t, state: TransferState.COMPLETED } : t
      ))
    }
    
    const handleAccepted = (transfer) => {
      setTransfers(prev => {
        const exists = prev.find(t => t.id === transfer.id)
        if (exists) return prev.map(t => t.id === transfer.id ? { ...t, state: TransferState.ACCEPTED } : t)
        return [...prev, transfer]
      })
    }

    fileTransferManager.on('onTransferRequest', handleRequest)
    fileTransferManager.on('onTransferProgress', handleProgress)
    fileTransferManager.on('onTransferComplete', handleComplete)
    fileTransferManager.on('onTransferAccepted', handleAccepted)

    return () => {
      fileTransferManager.off('onTransferRequest', handleRequest)
      fileTransferManager.off('onTransferProgress', handleProgress)
      fileTransferManager.off('onTransferComplete', handleComplete)
      fileTransferManager.off('onTransferAccepted', handleAccepted)
    }
  }, [conversation.userId])

  // Handle typing
  const handleTyping = (e) => {
    setMessage(e.target.value)
    
    if (!isTyping) {
      setIsTyping(true)
      messageFeaturesManager.sendTyping(conversation.userId)
    }

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      messageFeaturesManager.stopTyping(conversation.userId)
    }, 2000)
  }

  // Send message
  const handleSend = () => {
    if (!message.trim()) return
    
    const messageData = {
      content: message.trim(),
      disappearTimer: disappearTimer,
      timestamp: new Date().toISOString()
    }
    
    onSendMessage(conversation.userId, messageData)
    setMessage('')
    setReplyTo(null)
    setIsTyping(false)
    messageFeaturesManager.stopTyping(conversation.userId)
  }

  // Voice recording
  const startRecording = async () => {
    showToast('🎤 Recording...', 'info')
    const started = await voiceRecorder.startRecording()
    if (started) {
      setIsRecording(true)
      setRecordingDuration(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(voiceRecorder.getDuration())
      }, 1000)
    } else {
      showToast('Failed to start recording', 'error')
    }
  }

  const stopRecording = async () => {
    clearInterval(recordingIntervalRef.current)
    const audioBlob = await voiceRecorder.stopRecording()
    setIsRecording(false)
    
    if (audioBlob) {
      showToast('✅ Voice message recorded!', 'success')
      console.log('Voice message recorded:', audioBlob)
      // TODO: Send voice message
    }
  }

  // File handling
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    setShowAttachMenu(false)
    
    if (files.length === 0) return
    
    showToast(`📁 Sending ${files.length} file(s)...`, 'info')
    
    for (const file of files) {
      try {
        await fileTransferManager.sendFile(file, conversation.userId, conversation.publicKey)
        showToast(`✅ ${file.name} sent!`, 'success')
      } catch (error) {
        showToast(`❌ Failed to send ${file.name}`, 'error')
        console.error('File send error:', error)
      }
    }
  }

  const acceptTransfer = (request) => {
    request.accept()
    setPendingRequests(prev => prev.filter(r => r.transfer.id !== request.transfer.id))
  }

  const rejectTransfer = (request) => {
    request.reject()
    setPendingRequests(prev => prev.filter(r => r.transfer.id !== request.transfer.id))
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const getTimerLabel = (timer) => {
    switch(timer) {
      case '5min': return '5 minutes'
      case '1hr': return '1 hour'
      case '24hr': return '24 hours'
      case '7days': return '7 days'
      default: return 'Off'
    }
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  // Message interaction handlers
  const handleMessageLongPress = (msg, index) => {
    setShowMessageMenu(index)
    showToast('Select an action', 'info')
  }

  const handleReaction = (msgIndex, emoji) => {
    messageFeaturesManager.addReaction(msgIndex, conversation.userId, emoji)
    setShowMessageMenu(null)
    showToast(`Reacted with ${emoji}`, 'success')
  }

  const handleReply = (msg) => {
    setReplyTo(msg)
    setShowMessageMenu(null)
    showToast('Replying to message', 'success')
  }

  const handleDelete = (msgIndex) => {
    messageFeaturesManager.deleteMessage(msgIndex, conversation.userId)
    setShowMessageMenu(null)
    showToast('Message deleted', 'success')
  }

  // Helper: Get date label for message grouping
  const getDateLabel = (timestamp) => {
    const messageDate = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Reset time to compare dates only
    const resetTime = (date) => {
      date.setHours(0, 0, 0, 0)
      return date
    }
    
    const msgDate = resetTime(new Date(messageDate))
    const todayDate = resetTime(new Date(today))
    const yesterdayDate = resetTime(new Date(yesterday))
    
    if (msgDate.getTime() === todayDate.getTime()) {
      return 'Today'
    } else if (msgDate.getTime() === yesterdayDate.getTime()) {
      return 'Yesterday'
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      })
    }
  }

  // Helper: Check if we need a date separator
  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true
    
    const currentDate = new Date(currentMsg.timestamp).toDateString()
    const previousDate = new Date(previousMsg.timestamp).toDateString()
    
    return currentDate !== previousDate
  }

  // Helper: Render call history item
  const renderCallItem = (call) => {
    const isOutgoing = call.callerId === user.id
    const isMissed = call.status === 'missed'
    const isDeclined = call.status === 'declined'
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 20px',
        margin: '8px 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#1a1a1a',
          borderRadius: '20px',
          fontSize: '13px',
          color: isMissed || isDeclined ? '#ff4444' : '#888'
        }}>
          {/* Call Icon */}
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={isMissed || isDeclined ? '#ff4444' : '#00a8ff'} 
            strokeWidth="2"
            style={{ transform: isOutgoing ? 'rotate(-45deg)' : 'rotate(135deg)' }}
          >
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
          
          {/* Call Type Icon (Video) */}
          {call.isVideo && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          )}
          
          {/* Call Status Text */}
          <span>
            {isMissed ? 'Missed' : isDeclined ? 'Declined' : isOutgoing ? 'Outgoing' : 'Incoming'} 
            {call.isVideo ? ' video call' : ' call'}
          </span>
          
          {/* Call Duration (if answered) */}
          {call.duration && (
            <span style={{ color: '#666' }}>
              • {call.duration}
            </span>
          )}
          
          {/* Call Time */}
          <span style={{ color: '#666' }}>
            • {new Date(call.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-screen">
      <ToastContainer />
      {/* Chat Header */}
      <div className="header">
        <div className="search-icon" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
        <div className="conversation-avatar-small">
          {getInitials(conversation.displayName)}
        </div>
        <div style={{ flex: 1, marginLeft: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
            {conversation.displayName}
          </div>
          {disappearTimer !== 'off' && (
            <div style={{ fontSize: '12px', color: '#00a8ff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconFire />
              Disappearing: {getTimerLabel(disappearTimer)}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconLock />
            E2E encrypted
          </div>
        </div>
        <div className="search-icon" onClick={() => setShowTimerMenu(!showTimerMenu)} title="Disappearing messages">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div className="search-icon" onClick={() => setShowFeatureTour(true)} title="Show features">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>

      {/* Timer Menu */}
      {showTimerMenu && (
        <div className="timer-menu">
          <div className="timer-menu-header">Disappearing Messages</div>
          {['off', '5min', '1hr', '24hr', '7days'].map(timer => (
            <div 
              key={timer}
              className={`timer-option ${disappearTimer === timer ? 'timer-option-active' : ''}`}
              onClick={() => {
                setDisappearTimer(timer)
                setShowTimerMenu(false)
              }}
            >
              <span>{timer === 'off' ? <IconClock /> : <IconFire />}</span>
              <span>{getTimerLabel(timer)}</span>
              {disappearTimer === timer && <span style={{ color: '#00a8ff' }}><IconCheck /></span>}
            </div>
          ))}
        </div>
      )}

      {/* Debug: Feature Status (remove in production) */}
      {!featuresReady && (
        <div style={{
          background: '#ff4444',
          color: '#fff',
          padding: '8px 16px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          ⚠️ Features not initialized - {!socket ? 'No socket' : !user ? 'No user' : 'Unknown error'}
        </div>
      )}

      {/* Active Call Indicator */}
      {callState && callState !== CallState.IDLE && callState !== CallState.ENDED && (
        <div style={{
          background: '#00a8ff',
          color: '#000',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 'bold'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📞</span>
            <span>
              {callState === CallState.CALLING && 'Calling...'}
              {callState === CallState.RINGING && 'Incoming call...'}
              {callState === CallState.CONNECTED && 'Call in progress'}
            </span>
          </div>
          <button 
            onClick={() => callManager.endCall()}
            style={{
              background: '#ff4444',
              color: '#fff',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            End Call
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div className="messages-container">
        {/* Regular Messages with Date Separators and Call History */}
        {messages.map((msg, index) => {
          const isMe = msg.senderId === user.id
          const previousMsg = index > 0 ? messages[index - 1] : null
          const showDateSeparator = shouldShowDateSeparator(msg, previousMsg)
          
          return (
            <React.Fragment key={index}>
              {/* Date Separator */}
              {showDateSeparator && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '20px 0 12px 0'
                }}>
                  <div style={{
                    background: '#1a1a1a',
                    color: '#888',
                    padding: '6px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {getDateLabel(msg.timestamp)}
                  </div>
                </div>
              )}
              
              {/* Call History Item */}
              {msg.type === 'call' && renderCallItem(msg)}
              
              {/* Regular Message */}
              {msg.type !== 'call' && (
                <div
                  className={`message ${isMe ? 'message-sent' : 'message-received'}`}
                  style={{ position: 'relative' }}
                >
                  {!isMe && (
                    <div className="message-avatar-tiny">
                      {getInitials(conversation.displayName)}
                    </div>
                  )}
                  <div 
                    className={`message-bubble ${isMe ? 'bubble-sent' : 'bubble-received'}`}
                    onClick={() => handleMessageLongPress(msg, index)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {msg.content}
                    <div className="message-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {msg.isEncrypted && <IconLock />}
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.disappearTimer && msg.disappearTimer !== 'off' && <IconFire />}
                    </div>
                
                {/* Message Menu */}
                {showMessageMenu === index && (
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: isMe ? '0' : 'auto',
                    left: isMe ? 'auto' : '0',
                    background: '#1a1a1a',
                    borderRadius: '20px',
                    padding: '8px 12px',
                    display: 'flex',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10
                  }}>
                    <button onClick={() => handleReaction(index, '❤️')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>❤️</button>
                    <button onClick={() => handleReaction(index, '👍')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>👍</button>
                    <button onClick={() => handleReaction(index, '😂')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>😂</button>
                    <button onClick={() => handleReaction(index, '😮')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>😮</button>
                    <button onClick={() => handleReaction(index, '😢')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>😢</button>
                    <button onClick={() => handleReaction(index, '🙏')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>🙏</button>
                    <button 
                      onClick={() => handleReply(msg)} 
                      style={{ background: 'none', border: 'none', color: '#00a8ff', cursor: 'pointer', marginLeft: '8px' }}
                      title="Reply"
                    >
                      ↩️
                    </button>
                    {isMe && (
                      <button 
                        onClick={() => handleDelete(index)} 
                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
              )}
            </React.Fragment>
          )
        })}

        {/* Pending File Transfer Requests (incoming) */}
        {pendingRequests.map(request => (
          <div key={request.transfer.id} className="message message-received">
            <div className="message-avatar-tiny">
              {getInitials(conversation.displayName)}
            </div>
            <div className="file-transfer-bubble">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{request.transfer.fileName}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{formatSize(request.transfer.fileSize)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => acceptTransfer(request)}
                  style={{ flex: 1, background: '#00a8ff', color: '#000', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Accept
                </button>
                <button 
                  onClick={() => rejectTransfer(request)}
                  style={{ flex: 1, background: '#333', color: '#fff', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Active File Transfers */}
        {transfers.map(transfer => {
          const isMe = transfer.senderId === user.id
          return (
            <div key={transfer.id} className={`message ${isMe ? 'message-sent' : 'message-received'}`}>
              {!isMe && (
                <div className="message-avatar-tiny">
                  {getInitials(conversation.displayName)}
                </div>
              )}
              <div className={`file-transfer-bubble ${isMe ? 'bubble-sent' : 'bubble-received'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {transfer.state === TransferState.COMPLETED ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00a8ff" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : transfer.state === TransferState.FAILED ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  ) : transfer.state === TransferState.CANCELLED || transfer.state === TransferState.REJECTED ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                      <polyline points="13 2 13 9 20 9"/>
                    </svg>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{transfer.fileName}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {formatSize(transfer.fileSize)} • 
                      {transfer.state === TransferState.COMPLETED ? ' Complete' :
                       transfer.state === TransferState.FAILED ? ' Failed' :
                       transfer.state === TransferState.CANCELLED ? ' Cancelled' :
                       transfer.state === TransferState.REJECTED ? ' Declined' :
                       transfer.state === TransferState.WAITING_ACCEPT ? ' Waiting...' :
                       ` ${(transfer.progress || 0).toFixed(0)}%`}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {transfer.state === TransferState.TRANSFERRING && (
                  <div style={{ background: '#333', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                    <div style={{
                      background: '#00a8ff',
                      height: '100%',
                      width: `${transfer.progress || 0}%`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                )}
                
                {/* Cancel Button */}
                {(transfer.state === TransferState.TRANSFERRING || transfer.state === TransferState.WAITING_ACCEPT) && isMe && (
                  <button
                    onClick={() => fileTransferManager.cancelTransfer(transfer.id)}
                    style={{
                      marginTop: '8px',
                      background: 'transparent',
                      color: '#ff4444',
                      border: '1px solid #ff4444',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      width: '100%'
                    }}
                  >
                    Cancel
                  </button>
                )}

                <div className="message-time" style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconLock />
                  <span>Encrypted</span>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div className="attach-menu" style={{
          position: 'absolute',
          bottom: '70px',
          left: '16px',
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: 100,
          minWidth: '280px'
        }}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: '8px',
              width: '100%',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <div>
              <div style={{ fontWeight: 'bold' }}>Document</div>
              <div style={{ fontSize: '11px', color: '#888' }}>Send any file type</div>
            </div>
          </button>
          
          <button 
            onClick={() => imageInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: '8px',
              width: '100%',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <div>
              <div style={{ fontWeight: 'bold' }}>Photos & Videos</div>
              <div style={{ fontSize: '11px', color: '#888' }}>Share media files</div>
            </div>
          </button>
          
          <button 
            onClick={() => {
              setShowAttachMenu(false)
              setShowCamera(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: '8px',
              width: '100%',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <div>
              <div style={{ fontWeight: 'bold' }}>Camera</div>
              <div style={{ fontSize: '11px', color: '#888' }}>Take photo or video</div>
            </div>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Video Call Screen Overlay */}
      {callState && callState !== CallState.IDLE && callState !== CallState.ENDED && (
        <VideoCallScreen
          callState={callState}
          localStream={localStream}
          remoteStream={remoteStream}
          isVideo={isVideoCall}
          callerName={conversation.displayName}
          onEndCall={() => {
            callManager.endCall()
            setCallState(CallState.ENDED)
            setLocalStream(null)
            setRemoteStream(null)
          }}
        />
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(emoji) => setMessage(prev => prev + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <GifPicker
          onSelect={(gif) => {
            showToast('GIF selected! (Send functionality coming soon)', 'success')
            console.log('Selected GIF:', gif)
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Sticker Picker */}
      {showStickerPicker && (
        <StickerPicker
          onSelect={(sticker) => {
            // Send sticker as a message immediately
            const messageData = {
              content: sticker,
              disappearTimer: disappearTimer,
              timestamp: new Date().toISOString()
            }
            onSendMessage(conversation.userId, messageData)
            showToast('Sticker sent!', 'success')
          }}
          onClose={() => setShowStickerPicker(false)}
        />
      )}

      {/* Camera Capture */}
      {showCamera && (
        <CameraCapture
          onCapture={(blob, type) => {
            showToast('Photo captured! Sending...', 'success')
            // Convert blob to file and send
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
            fileTransferManager.sendFile(file, conversation.userId, conversation.publicKey)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Feature Tour Modal */}
      {showFeatureTour && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h2 style={{ color: '#00a8ff', marginBottom: '16px', textAlign: 'center' }}>
              🎉 New Features Available!
            </h2>
            <div style={{ color: '#fff', lineHeight: '1.8', marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>📁 File Sharing:</strong> Click + button to send any file (✅ Working!)
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>🎤 Voice Messages:</strong> Hold mic button to record
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>📞 Voice/Video Calls:</strong> Click phone/video icons
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>❤️ Reactions:</strong> Click any message to react
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>⌨️ Typing Indicators:</strong> Type to see it work
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>🔥 Disappearing Messages:</strong> Click settings icon
              </div>
            </div>
            <button
              onClick={() => {
                // Test socket directly
                console.log('🧪 Testing socket directly...')
                console.log('🧪 Socket:', socket)
                console.log('🧪 Socket connected:', socket?.connected)
                console.log('🧪 Socket ID:', socket?.id)
                
                // Direct emit test
                if (socket) {
                  console.log('🧪 Emitting test-typing event...')
                  socket.emit('typing-start', {
                    targetId: conversation.userId,
                    senderId: user.id
                  })
                  console.log('🧪 Event emitted!')
                  showToast('✅ Test event sent! Check backend logs', 'success')
                } else {
                  console.error('🧪 No socket available!')
                  showToast('❌ No socket!', 'error')
                }
                
                setShowFeatureTour(false)
              }}
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '8px'
              }}
            >
              🧪 Test Socket Direct
            </button>
            <button
              onClick={() => setShowFeatureTour(false)}
              style={{
                width: '100%',
                background: '#00a8ff',
                color: '#000',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {peerTyping && (
        <div style={{
          padding: '8px 16px',
          fontSize: '12px',
          color: '#00a8ff',
          fontStyle: 'italic'
        }}>
          {conversation.displayName} is typing...
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div style={{
          background: '#1a1a1a',
          padding: '12px 16px',
          borderTop: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#00a8ff', fontWeight: 'bold' }}>
              Replying to {replyTo.senderId === user.id ? 'yourself' : conversation.displayName}
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
              {replyTo.content.substring(0, 50)}{replyTo.content.length > 50 ? '...' : ''}
            </div>
          </div>
          <button 
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="message-input-container">
        <button 
          className="attach-button"
          onClick={() => {
            setShowAttachMenu(!showAttachMenu)
            setShowEmojiPicker(false)
            setShowGifPicker(false)
            setShowStickerPicker(false)
          }}
          style={{ background: showAttachMenu ? '#00a8ff' : 'transparent' }}
          title="Attach files"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={showAttachMenu ? '#000' : 'currentColor'} strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        <button 
          className="attach-button"
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker)
            setShowAttachMenu(false)
            setShowGifPicker(false)
            setShowStickerPicker(false)
          }}
          style={{ background: showEmojiPicker ? '#00a8ff' : 'transparent', marginLeft: '4px' }}
          title="Emoji"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={showEmojiPicker ? '#000' : 'currentColor'} strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        <button 
          className="attach-button"
          onClick={() => {
            setShowGifPicker(!showGifPicker)
            setShowAttachMenu(false)
            setShowEmojiPicker(false)
            setShowStickerPicker(false)
          }}
          style={{ background: showGifPicker ? '#00a8ff' : 'transparent', marginLeft: '4px' }}
          title="GIF"
        >
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: showGifPicker ? '#000' : 'currentColor' }}>GIF</span>
        </button>

        <button 
          className="attach-button"
          onClick={() => {
            setShowStickerPicker(!showStickerPicker)
            setShowAttachMenu(false)
            setShowEmojiPicker(false)
            setShowGifPicker(false)
          }}
          style={{ background: showStickerPicker ? '#00a8ff' : 'transparent', marginLeft: '4px' }}
          title="Stickers"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={showStickerPicker ? '#000' : 'currentColor'} strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 10 10v8a2 2 0 0 1-2 2h-8a10 10 0 0 1-10-10V4a2 2 0 0 1 2-2h8z"/>
            <circle cx="8" cy="9" r="1"/>
            <circle cx="16" cy="9" r="1"/>
            <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
          </svg>
        </button>
        
        {/* Voice Call Button */}
        <button 
          className="attach-button"
          onClick={() => {
            console.log('📞 Voice call button clicked')
            if (!featuresReady) {
              showToast('Features not ready yet. Please wait...', 'error')
              return
            }
            setIsVideoCall(false)
            showToast('📞 Starting voice call...', 'info')
            callManager.startCall(conversation.userId, false)
            
            // Add call to chat history
            const callData = {
              type: 'call',
              callerId: user.id,
              receiverId: conversation.userId,
              isVideo: false,
              status: 'outgoing',
              timestamp: new Date().toISOString()
            }
            onSendMessage(conversation.userId, callData)
          }}
          title="Voice call"
          style={{ marginLeft: '4px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        
        {/* Video Call Button */}
        <button 
          className="attach-button"
          onClick={() => {
            console.log('📹 Video call button clicked')
            if (!featuresReady) {
              showToast('Features not ready yet. Please wait...', 'error')
              return
            }
            setIsVideoCall(true)
            showToast('📹 Starting video call...', 'info')
            callManager.startCall(conversation.userId, true)
            
            // Add call to chat history
            const callData = {
              type: 'call',
              callerId: user.id,
              receiverId: conversation.userId,
              isVideo: true,
              status: 'outgoing',
              timestamp: new Date().toISOString()
            }
            onSendMessage(conversation.userId, callData)
          }}
          title="Video call"
          style={{ marginLeft: '4px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>
        
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={message}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          onFocus={() => setShowAttachMenu(false)}
        />
        
        {/* Voice Message Button */}
        {!message.trim() && (
          <button
            className="send-button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            style={{ background: isRecording ? '#ff4444' : '#00a8ff' }}
            title="Hold to record voice message"
          >
            {isRecording ? (
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                {recordingDuration}s
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            )}
          </button>
        )}
        
        {/* Send Button */}
        {message.trim() && (
          <button
            className="send-button"
            onClick={handleSend}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

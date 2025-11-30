/**
 * 📞 WebRTC Voice/Video Calls
 * 
 * P2P voice and video calling using WebRTC
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export const CallState = {
  IDLE: 'idle',
  CALLING: 'calling',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended'
}

export class CallManager {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.currentCall = null
    this.myId = null
    this.signaling = null
    this.state = CallState.IDLE
    this.eventHandlers = {
      onStateChange: [],
      onLocalStream: [],
      onRemoteStream: [],
      onIncomingCall: []
    }
  }

  initialize(userId, signaling) {
    this.myId = userId
    this.signaling = signaling

    // Set up signaling handlers
    this.signaling.on('call-offer', (data) => this.handleOffer(data))
    this.signaling.on('call-answer', (data) => this.handleAnswer(data))
    this.signaling.on('call-ice-candidate', (data) => this.handleIceCandidate(data))
    this.signaling.on('call-end', () => this.endCall())
    this.signaling.on('call-busy', () => this.handleBusy())

    console.log('📞 Call Manager initialized')
  }

  async startCall(targetId, isVideo = false) {
    try {
      console.log('📞 Starting call to:', targetId, 'isVideo:', isVideo)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      })
      console.log('📞 Got local media stream')
      this.emit('onLocalStream', this.localStream)

      this.peerConnection = new RTCPeerConnection(ICE_SERVERS)

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0]
        this.emit('onRemoteStream', this.remoteStream)
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.signaling.emit('call-ice-candidate', {
            targetId: targetId,
            senderId: this.myId,
            candidate: event.candidate
          })
        }
      }

      // Create and send offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      this.currentCall = { targetId, isVideo }
      this.setState(CallState.CALLING)

      this.signaling.emit('call-offer', {
        targetId: targetId,
        senderId: this.myId,
        offer: offer,
        isVideo: isVideo,
        callId: Date.now().toString()
      })

      console.log('📞 Call started to:', targetId)
    } catch (error) {
      console.error('📞 Failed to start call:', error)
      this.endCall()
    }
  }

  async answerCall(callId) {
    try {
      this.setState(CallState.CONNECTED)
      console.log('📞 Call answered:', callId)
    } catch (error) {
      console.error('📞 Failed to answer call:', error)
    }
  }

  async handleOffer(data) {
    try {
      this.currentCall = { targetId: data.senderId, isVideo: data.isVideo }
      this.setState(CallState.RINGING)
      this.emit('onIncomingCall', data)

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: data.isVideo
      })
      this.emit('onLocalStream', this.localStream)

      this.peerConnection = new RTCPeerConnection(ICE_SERVERS)

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0]
        this.emit('onRemoteStream', this.remoteStream)
      }

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.signaling.emit('call-ice-candidate', {
            targetId: data.senderId,
            senderId: this.myId,
            candidate: event.candidate
          })
        }
      }

      await this.peerConnection.setRemoteDescription(new RTCWhisperDescription(data.offer))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      this.signaling.emit('call-answer', {
        targetId: data.senderId,
        senderId: this.myId,
        answer: answer,
        callId: data.callId
      })

      this.setState(CallState.CONNECTED)
    } catch (error) {
      console.error('📞 Failed to handle offer:', error)
      this.endCall()
    }
  }

  async handleAnswer(data) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCWhisperDescription(data.answer))
      this.setState(CallState.CONNECTED)
    } catch (error) {
      console.error('📞 Failed to handle answer:', error)
    }
  }

  async handleIceCandidate(data) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    } catch (error) {
      console.error('📞 Failed to add ICE candidate:', error)
    }
  }

  rejectCall(callId) {
    if (this.currentCall) {
      this.signaling.emit('call-busy', {
        targetId: this.currentCall.targetId,
        senderId: this.myId,
        callId: callId
      })
    }
    this.setState(CallState.ENDED)
    console.log('📞 Call rejected')
  }

  endCall() {
    if (this.currentCall) {
      this.signaling.emit('call-end', {
        targetId: this.currentCall.targetId,
        senderId: this.myId,
        callId: this.currentCall.callId
      })
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    this.remoteStream = null
    this.currentCall = null
    this.setState(CallState.ENDED)
    console.log('📞 Call ended')
  }

  handleBusy() {
    console.log('📞 User is busy')
    this.endCall()
  }

  setState(state) {
    this.state = state
    this.emit('onStateChange', state)
  }

  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler)
    }
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler)
    }
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data))
    }
  }
}

export const callManager = new CallManager()

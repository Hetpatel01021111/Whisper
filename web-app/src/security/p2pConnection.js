/**
 * WebRTC P2P Direct Connections
 * Bypass server for direct peer-to-peer messaging
 */

import SimplePeer from 'simple-peer'

class P2PConnection {
  constructor() {
    this.peers = new Map()
    this.socket = null
    this.userId = null
    this.onMessageCallback = null
  }

  /**
   * Initialize P2P system
   */
  initialize(userId, socket) {
    this.userId = userId
    this.socket = socket

    // Listen for P2P signaling
    socket.on('p2p-signal', this.handleSignal.bind(this))
    socket.on('p2p-offer', this.handleOffer.bind(this))

    console.log('🌐 P2P connection system initialized')
  }

  /**
   * Create P2P connection with peer
   */
  async connectToPeer(peerId, initiator = true) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)
    }

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          // Free STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' }
        ]
      }
    })

    // Handle signaling
    peer.on('signal', (signal) => {
      this.socket.emit('p2p-signal', {
        targetId: peerId,
        senderId: this.userId,
        signal
      })
    })

    // Handle connection
    peer.on('connect', () => {
      console.log('🌐 P2P connected to:', peerId)
      this.peers.set(peerId, peer)
    })

    // Handle incoming data
    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString())
        if (this.onMessageCallback) {
          this.onMessageCallback(message)
        }
      } catch (error) {
        console.error('P2P data parse error:', error)
      }
    })

    // Handle errors
    peer.on('error', (error) => {
      console.error('P2P error:', error)
      this.peers.delete(peerId)
    })

    // Handle close
    peer.on('close', () => {
      console.log('🌐 P2P disconnected from:', peerId)
      this.peers.delete(peerId)
    })

    return peer
  }

  /**
   * Handle incoming P2P signal
   */
  async handleSignal(data) {
    const { senderId, signal } = data
    
    let peer = this.peers.get(senderId)
    
    if (!peer) {
      peer = await this.connectToPeer(senderId, false)
    }
    
    peer.signal(signal)
  }

  /**
   * Handle incoming P2P offer
   */
  async handleOffer(data) {
    const { senderId } = data
    await this.connectToPeer(senderId, false)
  }

  /**
   * Send message via P2P (bypasses server)
   */
  sendMessage(peerId, message) {
    const peer = this.peers.get(peerId)
    
    if (peer && peer.connected) {
      // Send directly via P2P
      peer.send(JSON.stringify(message))
      return true
    }
    
    // Fallback to server if P2P not available
    return false
  }

  /**
   * Set callback for incoming P2P messages
   */
  onMessage(callback) {
    this.onMessageCallback = callback
  }

  /**
   * Check if P2P connection exists
   */
  isConnected(peerId) {
    const peer = this.peers.get(peerId)
    return peer && peer.connected
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalPeers: this.peers.size,
      connectedPeers: Array.from(this.peers.values()).filter(p => p.connected).length
    }
  }

  /**
   * Disconnect from peer
   */
  disconnect(peerId) {
    const peer = this.peers.get(peerId)
    if (peer) {
      peer.destroy()
      this.peers.delete(peerId)
    }
  }

  /**
   * Disconnect all peers
   */
  disconnectAll() {
    this.peers.forEach(peer => peer.destroy())
    this.peers.clear()
  }
}

export const p2pConnection = new P2PConnection()

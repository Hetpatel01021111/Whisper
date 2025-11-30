/**
 * 🌐 Decentralized P2P Network Implementation
 * 
 * Peer-to-peer network without central server dependency.
 * Uses WebRTC for direct peer connections and a DHT for peer discovery.
 * 
 * Features:
 * - Distributed Hash Table (DHT) for peer discovery
 * - WebRTC for direct peer-to-peer connections
 * - Gossip protocol for message propagation
 * - Automatic peer discovery and connection management
 */

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

// P2P Network Configuration
const P2P_CONFIG = {
  MAX_PEERS: 50,              // Maximum peer connections
  MIN_PEERS: 5,               // Minimum peers to maintain
  PEER_TIMEOUT: 30000,        // Peer timeout in ms
  HEARTBEAT_INTERVAL: 10000,  // Heartbeat interval in ms
  DHT_K: 20,                  // DHT bucket size (Kademlia K)
  GOSSIP_TTL: 5,              // Message TTL for gossip
  BOOTSTRAP_NODES: [          // Initial bootstrap nodes
    // In production, these would be well-known bootstrap servers
  ]
}

/**
 * Represents a peer in the network
 */
export class Peer {
  constructor(id, publicKey, address = null) {
    this.id = id
    this.publicKey = publicKey
    this.address = address
    this.connection = null      // WebRTC connection
    this.dataChannel = null     // WebRTC data channel
    this.lastSeen = Date.now()
    this.latency = 0
    this.messagesSent = 0
    this.messagesReceived = 0
    this.status = 'disconnected' // disconnected, connecting, connected
  }

  isConnected() {
    return this.status === 'connected' && this.dataChannel?.readyState === 'open'
  }

  updateLastSeen() {
    this.lastSeen = Date.now()
  }
}

/**
 * Distributed Hash Table (DHT) for peer discovery
 * Based on Kademlia protocol
 */
export class DHT {
  constructor(nodeId) {
    this.nodeId = nodeId
    this.buckets = new Array(256).fill(null).map(() => [])
    this.data = new Map() // Stored key-value pairs
  }

  /**
   * Calculate XOR distance between two node IDs
   */
  distance(id1, id2) {
    const bytes1 = typeof id1 === 'string' ? this.idToBytes(id1) : id1
    const bytes2 = typeof id2 === 'string' ? this.idToBytes(id2) : id2
    
    let distance = 0n
    for (let i = 0; i < Math.min(bytes1.length, bytes2.length); i++) {
      distance = (distance << 8n) | BigInt(bytes1[i] ^ bytes2[i])
    }
    return distance
  }

  /**
   * Convert ID string to bytes
   */
  idToBytes(id) {
    try {
      return decodeBase64(id)
    } catch {
      return new TextEncoder().encode(id)
    }
  }

  /**
   * Get bucket index for a node ID
   */
  getBucketIndex(nodeId) {
    const dist = this.distance(this.nodeId, nodeId)
    if (dist === 0n) return 0
    return 255 - Math.floor(Math.log2(Number(dist)))
  }

  /**
   * Add a peer to the DHT
   */
  addPeer(peer) {
    const bucketIndex = this.getBucketIndex(peer.id)
    const bucket = this.buckets[bucketIndex]
    
    // Check if peer already exists
    const existingIndex = bucket.findIndex(p => p.id === peer.id)
    if (existingIndex !== -1) {
      // Move to end (most recently seen)
      bucket.splice(existingIndex, 1)
      bucket.push(peer)
      return true
    }

    // Add new peer if bucket not full
    if (bucket.length < P2P_CONFIG.DHT_K) {
      bucket.push(peer)
      return true
    }

    // Bucket full - check if oldest peer is still alive
    // In a real implementation, we'd ping the oldest peer
    return false
  }

  /**
   * Find the K closest peers to a target ID
   */
  findClosest(targetId, k = P2P_CONFIG.DHT_K) {
    const allPeers = this.buckets.flat()
    
    return allPeers
      .map(peer => ({
        peer,
        distance: this.distance(peer.id, targetId)
      }))
      .sort((a, b) => {
        if (a.distance < b.distance) return -1
        if (a.distance > b.distance) return 1
        return 0
      })
      .slice(0, k)
      .map(item => item.peer)
  }

  /**
   * Store a value in the DHT
   */
  store(key, value) {
    this.data.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  /**
   * Retrieve a value from the DHT
   */
  get(key) {
    const entry = this.data.get(key)
    return entry ? entry.value : null
  }

  /**
   * Get all known peers
   */
  getAllPeers() {
    return this.buckets.flat()
  }

  /**
   * Get DHT statistics
   */
  getStats() {
    const allPeers = this.buckets.flat()
    return {
      totalPeers: allPeers.length,
      storedKeys: this.data.size,
      bucketDistribution: this.buckets.map(b => b.length).filter(l => l > 0)
    }
  }
}

/**
 * P2P Network Manager
 */
export class P2PNetwork {
  constructor() {
    this.nodeId = null
    this.keyPair = null
    this.dht = null
    this.peers = new Map()
    this.messageHandlers = new Map()
    this.seenMessages = new Set()
    this.isRunning = false
    this.heartbeatInterval = null
  }

  /**
   * Convert key to Uint8Array (handles both base64 string and Uint8Array)
   */
  toUint8Array(key) {
    if (key instanceof Uint8Array) {
      return key
    }
    if (typeof key === 'string') {
      try {
        return decodeBase64(key)
      } catch (e) {
        console.warn('🌐 Key decode failed, generating new key')
        return nacl.randomBytes(32)
      }
    }
    return nacl.randomBytes(32)
  }

  /**
   * Initialize the P2P network
   */
  async initialize(keyPair) {
    if (!keyPair) {
      // Generate new keypair if none provided
      const newKeyPair = nacl.box.keyPair()
      this.keyPair = newKeyPair
    } else {
      this.keyPair = {
        publicKey: this.toUint8Array(keyPair.publicKey),
        secretKey: this.toUint8Array(keyPair.secretKey)
      }
    }
    
    // Generate node ID from public key
    const pubKeyBytes = this.keyPair.publicKey
    this.nodeId = encodeBase64(pubKeyBytes.slice(0, 16))
    
    // Initialize DHT
    this.dht = new DHT(this.nodeId)
    
    console.log('🌐 P2P Network initialized, Node ID:', this.nodeId)
    
    // Start network services
    this.isRunning = true
    this.startHeartbeat()
    
    // Connect to bootstrap nodes
    await this.bootstrap()
    
    return this.nodeId
  }

  /**
   * Connect to bootstrap nodes
   */
  async bootstrap() {
    console.log('🌐 Bootstrapping P2P network...')
    
    for (const node of P2P_CONFIG.BOOTSTRAP_NODES) {
      try {
        await this.connectToPeer(node.id, node.address)
      } catch (error) {
        console.warn(`🌐 Failed to connect to bootstrap node ${node.id}:`, error)
      }
    }
    
    // If no bootstrap nodes, we become a bootstrap node
    if (P2P_CONFIG.BOOTSTRAP_NODES.length === 0) {
      console.log('🌐 No bootstrap nodes configured, running as standalone')
    }
  }

  /**
   * Create a WebRTC connection to a peer
   */
  async connectToPeer(peerId, peerAddress = null) {
    if (this.peers.has(peerId)) {
      const existingPeer = this.peers.get(peerId)
      if (existingPeer.isConnected()) {
        return existingPeer
      }
    }

    console.log(`🌐 Connecting to peer ${peerId}...`)
    
    const peer = new Peer(peerId, null, peerAddress)
    peer.status = 'connecting'
    this.peers.set(peerId, peer)

    try {
      // Create WebRTC peer connection
      const config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }

      peer.connection = new RTCPeerConnection(config)
      
      // Create data channel
      peer.dataChannel = peer.connection.createDataChannel('session-p2p', {
        ordered: true
      })

      // Set up data channel handlers
      this.setupDataChannel(peer)

      // Create and set local description
      const offer = await peer.connection.createOffer()
      await peer.connection.setLocalDescription(offer)

      // In a real implementation, we'd send this offer through a signaling server
      // For now, we'll simulate the connection
      console.log(`🌐 Created offer for peer ${peerId}`)

      return peer
    } catch (error) {
      console.error(`🌐 Failed to connect to peer ${peerId}:`, error)
      peer.status = 'disconnected'
      throw error
    }
  }

  /**
   * Set up WebRTC data channel handlers
   */
  setupDataChannel(peer) {
    peer.dataChannel.onopen = () => {
      console.log(`🌐 Data channel opened with peer ${peer.id}`)
      peer.status = 'connected'
      peer.updateLastSeen()
      this.dht.addPeer(peer)
    }

    peer.dataChannel.onclose = () => {
      console.log(`🌐 Data channel closed with peer ${peer.id}`)
      peer.status = 'disconnected'
    }

    peer.dataChannel.onmessage = (event) => {
      this.handleMessage(peer, event.data)
    }

    peer.dataChannel.onerror = (error) => {
      console.error(`🌐 Data channel error with peer ${peer.id}:`, error)
    }
  }

  /**
   * Handle incoming message from a peer
   */
  handleMessage(peer, data) {
    try {
      const message = JSON.parse(data)
      peer.updateLastSeen()
      peer.messagesReceived++

      // Check for duplicate messages
      if (message.id && this.seenMessages.has(message.id)) {
        return
      }
      if (message.id) {
        this.seenMessages.add(message.id)
        // Clean up old message IDs
        if (this.seenMessages.size > 10000) {
          const arr = Array.from(this.seenMessages)
          this.seenMessages = new Set(arr.slice(-5000))
        }
      }

      // Handle different message types
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(peer, message)
          break
        case 'find_node':
          this.handleFindNode(peer, message)
          break
        case 'find_node_response':
          this.handleFindNodeResponse(peer, message)
          break
        case 'store':
          this.handleStore(peer, message)
          break
        case 'get':
          this.handleGet(peer, message)
          break
        case 'gossip':
          this.handleGossip(peer, message)
          break
        case 'direct':
          this.handleDirectMessage(peer, message)
          break
        default:
          // Pass to registered handlers
          const handler = this.messageHandlers.get(message.type)
          if (handler) {
            handler(peer, message)
          }
      }
    } catch (error) {
      console.error('🌐 Failed to handle message:', error)
    }
  }

  /**
   * Handle heartbeat message
   */
  handleHeartbeat(peer, message) {
    peer.latency = Date.now() - message.timestamp
    this.sendToPeer(peer.id, {
      type: 'heartbeat_ack',
      timestamp: message.timestamp
    })
  }

  /**
   * Handle find_node request (DHT lookup)
   */
  handleFindNode(peer, message) {
    const closest = this.dht.findClosest(message.targetId)
    this.sendToPeer(peer.id, {
      type: 'find_node_response',
      requestId: message.requestId,
      nodes: closest.map(p => ({
        id: p.id,
        publicKey: p.publicKey,
        address: p.address
      }))
    })
  }

  /**
   * Handle find_node response
   */
  handleFindNodeResponse(peer, message) {
    for (const node of message.nodes) {
      if (node.id !== this.nodeId && !this.peers.has(node.id)) {
        const newPeer = new Peer(node.id, node.publicKey, node.address)
        this.dht.addPeer(newPeer)
      }
    }
  }

  /**
   * Handle store request (DHT store)
   */
  handleStore(peer, message) {
    this.dht.store(message.key, message.value)
  }

  /**
   * Handle get request (DHT lookup)
   */
  handleGet(peer, message) {
    const value = this.dht.get(message.key)
    this.sendToPeer(peer.id, {
      type: 'get_response',
      requestId: message.requestId,
      key: message.key,
      value: value
    })
  }

  /**
   * Handle gossip message (broadcast)
   */
  handleGossip(peer, message) {
    if (message.ttl <= 0) return

    // Process the gossip content
    const handler = this.messageHandlers.get('gossip')
    if (handler) {
      handler(peer, message.content)
    }

    // Forward to other peers with decremented TTL
    this.gossip(message.content, message.ttl - 1, [peer.id, ...message.excludePeers])
  }

  /**
   * Handle direct message
   */
  handleDirectMessage(peer, message) {
    const handler = this.messageHandlers.get('direct')
    if (handler) {
      handler(peer, message.content)
    }
  }

  /**
   * Send a message to a specific peer
   */
  sendToPeer(peerId, message) {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.isConnected()) {
      console.warn(`🌐 Cannot send to peer ${peerId}: not connected`)
      return false
    }

    try {
      message.id = message.id || encodeBase64(nacl.randomBytes(16))
      message.from = this.nodeId
      message.timestamp = Date.now()
      
      peer.dataChannel.send(JSON.stringify(message))
      peer.messagesSent++
      return true
    } catch (error) {
      console.error(`🌐 Failed to send to peer ${peerId}:`, error)
      return false
    }
  }

  /**
   * Broadcast a message to all connected peers (gossip)
   */
  gossip(content, ttl = P2P_CONFIG.GOSSIP_TTL, excludePeers = []) {
    const message = {
      type: 'gossip',
      id: encodeBase64(nacl.randomBytes(16)),
      content: content,
      ttl: ttl,
      excludePeers: excludePeers
    }

    let sent = 0
    for (const [peerId, peer] of this.peers) {
      if (!excludePeers.includes(peerId) && peer.isConnected()) {
        if (this.sendToPeer(peerId, message)) {
          sent++
        }
      }
    }

    console.log(`🌐 Gossiped message to ${sent} peers`)
    return sent
  }

  /**
   * Find a node in the network (DHT lookup)
   */
  async findNode(targetId) {
    const closest = this.dht.findClosest(targetId)
    
    // Query closest nodes for even closer nodes
    for (const peer of closest) {
      if (peer.isConnected()) {
        this.sendToPeer(peer.id, {
          type: 'find_node',
          requestId: encodeBase64(nacl.randomBytes(8)),
          targetId: targetId
        })
      }
    }

    return closest
  }

  /**
   * Store a value in the DHT network
   */
  async storeValue(key, value) {
    // Store locally
    this.dht.store(key, value)
    
    // Store on closest nodes
    const closest = this.dht.findClosest(key)
    for (const peer of closest) {
      if (peer.isConnected()) {
        this.sendToPeer(peer.id, {
          type: 'store',
          key: key,
          value: value
        })
      }
    }
  }

  /**
   * Retrieve a value from the DHT network
   */
  async getValue(key) {
    // Check local storage first
    const localValue = this.dht.get(key)
    if (localValue) return localValue

    // Query closest nodes
    const closest = this.dht.findClosest(key)
    for (const peer of closest) {
      if (peer.isConnected()) {
        this.sendToPeer(peer.id, {
          type: 'get',
          requestId: encodeBase64(nacl.randomBytes(8)),
          key: key
        })
      }
    }

    return null // In real implementation, wait for response
  }

  /**
   * Register a message handler
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler)
  }

  /**
   * Start heartbeat to maintain connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      
      for (const [peerId, peer] of this.peers) {
        // Send heartbeat to connected peers
        if (peer.isConnected()) {
          this.sendToPeer(peerId, {
            type: 'heartbeat',
            timestamp: now
          })
        }
        
        // Remove stale peers
        if (now - peer.lastSeen > P2P_CONFIG.PEER_TIMEOUT) {
          console.log(`🌐 Removing stale peer ${peerId}`)
          this.peers.delete(peerId)
        }
      }

      // Try to maintain minimum peer count
      if (this.peers.size < P2P_CONFIG.MIN_PEERS) {
        this.discoverPeers()
      }
    }, P2P_CONFIG.HEARTBEAT_INTERVAL)
  }

  /**
   * Discover new peers
   */
  async discoverPeers() {
    // Query DHT for random nodes
    const randomId = encodeBase64(nacl.randomBytes(16))
    await this.findNode(randomId)
  }

  /**
   * Get network statistics
   */
  getStats() {
    const connectedPeers = Array.from(this.peers.values()).filter(p => p.isConnected())
    return {
      nodeId: this.nodeId,
      totalPeers: this.peers.size,
      connectedPeers: connectedPeers.length,
      dht: this.dht?.getStats(),
      isRunning: this.isRunning
    }
  }

  /**
   * Shutdown the network
   */
  shutdown() {
    console.log('🌐 Shutting down P2P network...')
    this.isRunning = false
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Close all peer connections
    for (const [peerId, peer] of this.peers) {
      if (peer.connection) {
        peer.connection.close()
      }
    }
    
    this.peers.clear()
  }
}

/**
 * Create a singleton P2P network instance
 */
export const p2pNetwork = new P2PNetwork()

export default p2pNetwork

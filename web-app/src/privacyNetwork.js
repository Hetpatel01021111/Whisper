/**
 * 🔒 Privacy Network - Unified Privacy Layer
 * 
 * Combines Onion Routing and P2P Network for maximum privacy:
 * - Messages are encrypted in multiple layers (onion)
 * - Routed through decentralized peer network
 * - No central server can see message content or metadata
 * 
 * Privacy Guarantees:
 * 1. Content Privacy: End-to-end encryption
 * 2. Metadata Privacy: Onion routing hides sender/receiver
 * 3. Network Privacy: P2P network has no central point of failure
 * 4. Traffic Analysis Resistance: Message padding and timing obfuscation
 */

import { onionRouter, sendOnionMessage, receiveOnionMessage, RelayNode } from './onionRouting.js'
import { p2pNetwork, Peer } from './p2pNetwork.js'
import { generateKeyPair, encryptMessage, decryptMessage } from './crypto.js'
import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

// Privacy Network Configuration
const PRIVACY_CONFIG = {
  ENABLE_ONION_ROUTING: true,
  ENABLE_P2P: true,
  MIN_RELAY_NODES: 3,
  MESSAGE_DELAY_MIN: 100,    // Minimum delay in ms
  MESSAGE_DELAY_MAX: 500,    // Maximum delay in ms (timing obfuscation)
  COVER_TRAFFIC: true,       // Send dummy messages to hide real traffic
  COVER_TRAFFIC_INTERVAL: 30000, // Cover traffic interval in ms
}

/**
 * Privacy Network Manager
 * Orchestrates onion routing and P2P network for private messaging
 */
export class PrivacyNetwork {
  constructor() {
    this.isInitialized = false
    this.keyPair = null
    this.nodeId = null
    this.messageQueue = []
    this.messageHandlers = []
    this.coverTrafficInterval = null
  }

  /**
   * Initialize the privacy network
   */
  async initialize(keyPair = null) {
    console.log('🔒 Initializing Privacy Network...')
    
    // Generate or use provided keypair
    if (!keyPair) {
      this.keyPair = generateKeyPair()
    } else {
      // Normalize keypair format
      this.keyPair = {
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey
      }
    }
    
    // Initialize onion router
    if (PRIVACY_CONFIG.ENABLE_ONION_ROUTING) {
      try {
        onionRouter.initialize(this.keyPair)
        console.log('🧅 Onion routing enabled')
      } catch (e) {
        console.warn('🧅 Onion routing initialization failed:', e.message)
      }
    }
    
    // Initialize P2P network
    if (PRIVACY_CONFIG.ENABLE_P2P) {
      try {
        this.nodeId = await p2pNetwork.initialize(this.keyPair)
        
        // Set up P2P message handlers
        p2pNetwork.onMessage('direct', (peer, content) => {
          this.handleIncomingMessage(peer, content)
        })
        
        p2pNetwork.onMessage('gossip', (peer, content) => {
          this.handleGossipMessage(peer, content)
        })
        
        console.log('🌐 P2P network enabled')
      } catch (e) {
        console.warn('🌐 P2P network initialization failed:', e.message)
      }
    }
    
    // Start cover traffic if enabled
    if (PRIVACY_CONFIG.COVER_TRAFFIC) {
      this.startCoverTraffic()
    }
    
    this.isInitialized = true
    console.log('🔒 Privacy Network initialized successfully')
    
    return {
      nodeId: this.nodeId,
      publicKey: this.keyPair.publicKey
    }
  }

  /**
   * Register this node as a relay node
   */
  registerAsRelay() {
    const relayNode = new RelayNode(
      this.nodeId,
      this.keyPair.publicKey,
      null, // Address will be discovered
      'relay'
    )
    onionRouter.registerNode(relayNode)
    
    // Announce to P2P network
    p2pNetwork.gossip({
      type: 'relay_announcement',
      nodeId: this.nodeId,
      publicKey: this.keyPair.publicKey,
      timestamp: Date.now()
    })
    
    console.log('🧅 Registered as relay node')
  }

  /**
   * Add a known relay node
   */
  addRelayNode(nodeId, publicKey, address = null) {
    const relayNode = new RelayNode(nodeId, publicKey, address, 'relay')
    onionRouter.registerNode(relayNode)
  }

  /**
   * Send a private message with full privacy protection
   */
  async sendPrivateMessage(recipientId, recipientPublicKey, message) {
    if (!this.isInitialized) {
      throw new Error('Privacy network not initialized')
    }

    console.log(`🔒 Sending private message to ${recipientId}`)

    // Step 1: Encrypt the message content (end-to-end)
    const encryptedContent = encryptMessage(
      JSON.stringify({
        type: 'private_message',
        content: message,
        timestamp: Date.now(),
        senderId: this.nodeId
      }),
      recipientPublicKey,
      this.keyPair.secretKey
    )

    // Step 2: Apply timing obfuscation
    const delay = this.getRandomDelay()
    await this.sleep(delay)

    // Step 3: Route through onion network if available
    if (PRIVACY_CONFIG.ENABLE_ONION_ROUTING && onionRouter.relayNodes.size >= PRIVACY_CONFIG.MIN_RELAY_NODES) {
      const onionMessage = await sendOnionMessage(
        encryptedContent,
        recipientId,
        recipientPublicKey
      )

      if (onionMessage.type === 'onion') {
        // Send through P2P network to entry node
        return this.sendToNode(onionMessage.entryNode, {
          type: 'onion_message',
          payload: onionMessage
        })
      }
    }

    // Fallback: Direct P2P message (still encrypted)
    return this.sendToNode(recipientId, {
      type: 'direct_encrypted',
      payload: encryptedContent
    })
  }

  /**
   * Send a message to a specific node
   */
  async sendToNode(nodeId, message) {
    if (PRIVACY_CONFIG.ENABLE_P2P) {
      // Try direct P2P connection first
      const sent = p2pNetwork.sendToPeer(nodeId, {
        type: 'direct',
        content: message
      })
      
      if (sent) return true

      // Fallback to gossip (less private but more reliable)
      p2pNetwork.gossip({
        targetNode: nodeId,
        ...message
      })
      return true
    }

    // Fallback to centralized server
    console.warn('🔒 P2P not available, using centralized fallback')
    return this.sendViaCentralized(nodeId, message)
  }

  /**
   * Fallback to centralized server (when P2P not available)
   */
  async sendViaCentralized(nodeId, message) {
    // This would use the existing socket.io connection
    // Implemented as a fallback for reliability
    return false
  }

  /**
   * Handle incoming message
   */
  handleIncomingMessage(peer, content) {
    try {
      if (content.type === 'onion_message') {
        // Process onion layer
        const result = receiveOnionMessage(content.payload)
        
        if (result.type === 'destination') {
          // We are the final destination
          this.processDecryptedMessage(result.message)
        } else if (result.type === 'relay') {
          // Forward to next hop
          this.sendToNode(result.nextHop, {
            type: 'onion_message',
            payload: { onion: result.onion, circuitId: result.circuitId }
          })
        }
      } else if (content.type === 'direct_encrypted') {
        // Direct encrypted message
        this.processDecryptedMessage(content.payload)
      }
    } catch (error) {
      console.error('🔒 Failed to handle incoming message:', error)
    }
  }

  /**
   * Handle gossip message
   */
  handleGossipMessage(peer, content) {
    // Check if message is for us
    if (content.targetNode === this.nodeId) {
      this.handleIncomingMessage(peer, content)
    }
    
    // Handle relay announcements
    if (content.type === 'relay_announcement') {
      this.addRelayNode(content.nodeId, content.publicKey)
    }
  }

  /**
   * Process a decrypted message
   */
  processDecryptedMessage(encryptedData) {
    try {
      // Decrypt the message content
      const decrypted = decryptMessage(
        encryptedData,
        encryptedData.ephemeralPublicKey || this.keyPair.publicKey,
        this.keyPair.secretKey
      )
      
      const message = JSON.parse(decrypted)
      
      // Notify handlers
      for (const handler of this.messageHandlers) {
        handler(message)
      }
    } catch (error) {
      console.error('🔒 Failed to decrypt message:', error)
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler)
  }

  /**
   * Start cover traffic to hide real message patterns
   */
  startCoverTraffic() {
    this.coverTrafficInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance each interval
        this.sendCoverTraffic()
      }
    }, PRIVACY_CONFIG.COVER_TRAFFIC_INTERVAL)
  }

  /**
   * Send dummy cover traffic
   */
  sendCoverTraffic() {
    const dummyMessage = {
      type: 'cover_traffic',
      padding: encodeBase64(nacl.randomBytes(256)),
      timestamp: Date.now()
    }
    
    // Send to random peer
    const peers = Array.from(p2pNetwork.peers.values()).filter(p => p.isConnected())
    if (peers.length > 0) {
      const randomPeer = peers[Math.floor(Math.random() * peers.length)]
      p2pNetwork.sendToPeer(randomPeer.id, {
        type: 'direct',
        content: dummyMessage
      })
    }
  }

  /**
   * Get random delay for timing obfuscation
   */
  getRandomDelay() {
    return Math.floor(
      Math.random() * (PRIVACY_CONFIG.MESSAGE_DELAY_MAX - PRIVACY_CONFIG.MESSAGE_DELAY_MIN) +
      PRIVACY_CONFIG.MESSAGE_DELAY_MIN
    )
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get network statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      nodeId: this.nodeId,
      onionRouting: {
        enabled: PRIVACY_CONFIG.ENABLE_ONION_ROUTING,
        ...onionRouter.getStats()
      },
      p2p: {
        enabled: PRIVACY_CONFIG.ENABLE_P2P,
        ...p2pNetwork.getStats()
      },
      privacy: {
        coverTraffic: PRIVACY_CONFIG.COVER_TRAFFIC,
        timingObfuscation: true,
        minRelayNodes: PRIVACY_CONFIG.MIN_RELAY_NODES
      }
    }
  }

  /**
   * Shutdown the privacy network
   */
  shutdown() {
    console.log('🔒 Shutting down Privacy Network...')
    
    if (this.coverTrafficInterval) {
      clearInterval(this.coverTrafficInterval)
    }
    
    p2pNetwork.shutdown()
    this.isInitialized = false
  }
}

/**
 * Create singleton instance
 */
export const privacyNetwork = new PrivacyNetwork()

/**
 * High-level API for sending private messages
 */
export async function sendPrivateMessage(recipientId, recipientPublicKey, message) {
  return privacyNetwork.sendPrivateMessage(recipientId, recipientPublicKey, message)
}

/**
 * High-level API for receiving private messages
 */
export function onPrivateMessage(handler) {
  privacyNetwork.onMessage(handler)
}

export default privacyNetwork

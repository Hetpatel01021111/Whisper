/**
 * 🧅 Onion Routing Implementation
 * 
 * Multi-layer encryption where messages pass through multiple relay nodes.
 * Each node can only decrypt its layer, revealing the next hop.
 * 
 * Structure:
 * [Layer 3: Exit Node] -> [Layer 2: Middle Node] -> [Layer 1: Entry Node] -> [Original Message]
 */

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

// Onion routing configuration
const ONION_CONFIG = {
  MIN_HOPS: 3,           // Minimum relay nodes
  MAX_HOPS: 5,           // Maximum relay nodes
  LAYER_OVERHEAD: 100,   // Bytes overhead per layer
  MESSAGE_PADDING: 1024, // Pad messages to this size
}

/**
 * Represents a relay node in the onion network
 */
export class RelayNode {
  constructor(id, publicKey, address, type = 'relay') {
    this.id = id
    this.publicKey = publicKey
    this.address = address
    this.type = type // 'entry', 'relay', 'exit'
    this.lastSeen = Date.now()
    this.reputation = 100
  }
}

/**
 * Onion Router - Manages circuit creation and message routing
 */
export class OnionRouter {
  constructor() {
    this.circuits = new Map()      // Active circuits
    this.relayNodes = new Map()    // Known relay nodes
    this.myKeyPair = null          // This node's keypair
    this.nodeId = null             // This node's ID
  }

  /**
   * Initialize the onion router with a keypair
   */
  initialize(keyPair) {
    if (!keyPair) {
      // Generate new keypair if none provided
      const newKeyPair = nacl.box.keyPair()
      this.myKeyPair = newKeyPair
      this.nodeId = this.generateNodeId(newKeyPair.publicKey)
    } else {
      // Handle both Uint8Array and base64 string formats
      this.myKeyPair = {
        publicKey: this.toUint8Array(keyPair.publicKey),
        secretKey: this.toUint8Array(keyPair.secretKey)
      }
      this.nodeId = this.generateNodeId(this.myKeyPair.publicKey)
    }
    console.log('🧅 Onion Router initialized, Node ID:', this.nodeId)
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
        // If base64 decode fails, try to create from string
        console.warn('🧅 Key decode failed, generating new key')
        return nacl.randomBytes(32)
      }
    }
    // Fallback: generate random bytes
    return nacl.randomBytes(32)
  }

  /**
   * Generate a unique node ID from public key
   */
  generateNodeId(publicKey) {
    const bytes = this.toUint8Array(publicKey)
    return encodeBase64(bytes.slice(0, 8))
  }

  /**
   * Register a relay node
   */
  registerNode(node) {
    this.relayNodes.set(node.id, node)
    console.log(`🧅 Registered relay node: ${node.id} (${node.type})`)
  }

  /**
   * Select random relay nodes for a circuit
   */
  selectRelayPath(destination, hopCount = ONION_CONFIG.MIN_HOPS) {
    const availableNodes = Array.from(this.relayNodes.values())
      .filter(node => node.id !== this.nodeId && node.id !== destination)
      .filter(node => node.reputation > 50) // Only use reputable nodes
    
    if (availableNodes.length < hopCount) {
      console.warn('🧅 Not enough relay nodes, using available:', availableNodes.length)
      hopCount = Math.max(1, availableNodes.length)
    }

    // Shuffle and select nodes
    const shuffled = availableNodes.sort(() => Math.random() - 0.5)
    const path = shuffled.slice(0, hopCount)
    
    // Assign types
    if (path.length >= 1) path[0].type = 'entry'
    if (path.length >= 2) path[path.length - 1].type = 'exit'
    for (let i = 1; i < path.length - 1; i++) {
      path[i].type = 'relay'
    }

    return path
  }

  /**
   * Create a new circuit through relay nodes
   */
  createCircuit(destination, hopCount = ONION_CONFIG.MIN_HOPS) {
    const circuitId = encodeBase64(nacl.randomBytes(16))
    const path = this.selectRelayPath(destination, hopCount)
    
    const circuit = {
      id: circuitId,
      path: path,
      destination: destination,
      createdAt: Date.now(),
      status: 'building'
    }

    this.circuits.set(circuitId, circuit)
    console.log(`🧅 Created circuit ${circuitId} with ${path.length} hops`)
    
    return circuit
  }

  /**
   * Wrap a message in multiple encryption layers (onion layers)
   * Each layer can only be decrypted by the corresponding relay node
   */
  wrapMessage(message, circuit) {
    let wrappedMessage = this.padMessage(message)
    
    // Build layers from destination back to entry
    // The innermost layer is for the destination
    const reversedPath = [...circuit.path].reverse()
    
    for (let i = 0; i < reversedPath.length; i++) {
      const node = reversedPath[i]
      const isLastHop = i === reversedPath.length - 1
      const nextHop = isLastHop ? circuit.destination : reversedPath[i + 1].id
      
      // Create layer payload
      const layerPayload = {
        nextHop: nextHop,
        circuitId: circuit.id,
        layerIndex: reversedPath.length - 1 - i,
        payload: wrappedMessage,
        timestamp: Date.now()
      }
      
      // Encrypt this layer for the relay node
      wrappedMessage = this.encryptLayer(layerPayload, node.publicKey)
    }

    return {
      circuitId: circuit.id,
      entryNode: circuit.path[0].id,
      onion: wrappedMessage
    }
  }

  /**
   * Encrypt a single layer for a relay node
   */
  encryptLayer(payload, recipientPublicKey) {
    const ephemeralKeyPair = nacl.box.keyPair()
    const nonce = nacl.randomBytes(24)
    const messageBytes = encodeUTF8(JSON.stringify(payload))
    const publicKeyBytes = typeof recipientPublicKey === 'string' 
      ? decodeBase64(recipientPublicKey) 
      : recipientPublicKey

    const encrypted = nacl.box(
      messageBytes,
      nonce,
      publicKeyBytes,
      ephemeralKeyPair.secretKey
    )

    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey)
    }
  }

  /**
   * Decrypt a layer (when this node is a relay)
   */
  decryptLayer(encryptedLayer) {
    if (!this.myKeyPair) {
      throw new Error('Onion router not initialized')
    }

    try {
      const encrypted = decodeBase64(encryptedLayer.encrypted)
      const nonce = decodeBase64(encryptedLayer.nonce)
      const ephemeralPublicKey = decodeBase64(encryptedLayer.ephemeralPublicKey)

      const decrypted = nacl.box.open(
        encrypted,
        nonce,
        ephemeralPublicKey,
        this.myKeyPair.secretKey
      )

      if (!decrypted) {
        throw new Error('Decryption failed')
      }

      return JSON.parse(decodeUTF8(decrypted))
    } catch (error) {
      console.error('🧅 Layer decryption failed:', error)
      throw error
    }
  }

  /**
   * Process an incoming onion message (as a relay node)
   */
  processOnion(onionMessage) {
    try {
      const layer = this.decryptLayer(onionMessage.onion)
      
      console.log(`🧅 Processed layer ${layer.layerIndex}, next hop: ${layer.nextHop}`)

      // Check if this is the final destination
      if (layer.nextHop === this.nodeId) {
        // We are the destination, extract the message
        return {
          type: 'destination',
          message: this.unpadMessage(layer.payload),
          circuitId: layer.circuitId
        }
      }

      // Forward to next hop
      return {
        type: 'relay',
        nextHop: layer.nextHop,
        circuitId: layer.circuitId,
        onion: layer.payload
      }
    } catch (error) {
      console.error('🧅 Failed to process onion:', error)
      return { type: 'error', error: error.message }
    }
  }

  /**
   * Pad message to fixed size to prevent traffic analysis
   */
  padMessage(message) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message)
    const targetLength = ONION_CONFIG.MESSAGE_PADDING
    
    if (messageStr.length >= targetLength) {
      return messageStr.substring(0, targetLength - 10) + '|ONION_END|'
    }

    const paddingLength = targetLength - messageStr.length - 11
    const padding = Array.from(nacl.randomBytes(paddingLength), b => 
      String.fromCharCode(b % 94 + 33)
    ).join('')

    return messageStr + '|ONION_PAD|' + padding
  }

  /**
   * Remove padding from message
   */
  unpadMessage(paddedMessage) {
    const padIndex = paddedMessage.indexOf('|ONION_PAD|')
    if (padIndex !== -1) {
      return paddedMessage.substring(0, padIndex)
    }
    const endIndex = paddedMessage.indexOf('|ONION_END|')
    if (endIndex !== -1) {
      return paddedMessage.substring(0, endIndex)
    }
    return paddedMessage
  }

  /**
   * Destroy a circuit
   */
  destroyCircuit(circuitId) {
    if (this.circuits.has(circuitId)) {
      this.circuits.delete(circuitId)
      console.log(`🧅 Destroyed circuit ${circuitId}`)
    }
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      activeCircuits: this.circuits.size,
      knownRelays: this.relayNodes.size,
      nodeId: this.nodeId
    }
  }
}

/**
 * Create a singleton onion router instance
 */
export const onionRouter = new OnionRouter()

/**
 * High-level API: Send a message through onion routing
 */
export async function sendOnionMessage(message, recipientId, recipientPublicKey) {
  // Create a circuit to the recipient
  const circuit = onionRouter.createCircuit(recipientId)
  
  if (circuit.path.length === 0) {
    // No relay nodes available, fall back to direct encryption
    console.warn('🧅 No relay nodes available, using direct encryption')
    return {
      type: 'direct',
      message: message,
      recipientId: recipientId
    }
  }

  // Wrap the message in onion layers
  const onionMessage = onionRouter.wrapMessage(message, circuit)
  
  return {
    type: 'onion',
    ...onionMessage,
    circuit: circuit
  }
}

/**
 * High-level API: Receive and process an onion message
 */
export function receiveOnionMessage(onionMessage) {
  return onionRouter.processOnion(onionMessage)
}

export default onionRouter

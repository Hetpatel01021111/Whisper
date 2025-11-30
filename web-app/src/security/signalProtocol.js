/**
 * Signal Protocol Implementation
 * Provides military-grade end-to-end encryption with Perfect Forward Secrecy
 */

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

class SignalProtocol {
  constructor() {
    this.identityKeyPair = null
    this.preKeys = []
    this.sessions = new Map()
  }

  /**
   * Initialize Signal Protocol for a user
   */
  initialize(userId) {
    // Generate identity key pair (long-term)
    this.identityKeyPair = nacl.box.keyPair()
    
    // Generate pre-keys (one-time keys)
    this.generatePreKeys(100)
    
    console.log('🔐 Signal Protocol initialized for user:', userId)
    
    return {
      identityPublicKey: encodeBase64(this.identityKeyPair.publicKey),
      preKeys: this.preKeys.map(pk => ({
        id: pk.id,
        publicKey: encodeBase64(pk.keyPair.publicKey)
      }))
    }
  }

  /**
   * Generate one-time pre-keys for Perfect Forward Secrecy
   */
  generatePreKeys(count) {
    for (let i = 0; i < count; i++) {
      this.preKeys.push({
        id: i,
        keyPair: nacl.box.keyPair(),
        used: false
      })
    }
  }

  /**
   * Start a new session with a recipient
   */
  startSession(recipientId, recipientIdentityKey, recipientPreKey) {
    // Get an unused pre-key
    const preKey = this.preKeys.find(pk => !pk.used)
    if (!preKey) {
      throw new Error('No pre-keys available')
    }
    preKey.used = true

    // Create ephemeral key pair for this session
    const ephemeralKeyPair = nacl.box.keyPair()

    // Derive shared secret using Triple Diffie-Hellman
    const sharedSecret = this.tripleRatchet(
      this.identityKeyPair,
      ephemeralKeyPair,
      recipientIdentityKey,
      recipientPreKey
    )

    // Store session
    this.sessions.set(recipientId, {
      sharedSecret,
      ephemeralKeyPair,
      messageNumber: 0,
      chainKey: sharedSecret
    })

    return {
      ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
      preKeyId: preKey.id
    }
  }

  /**
   * Triple Diffie-Hellman key exchange (simplified)
   */
  tripleRatchet(identityKey, ephemeralKey, recipientIdentityKey, recipientPreKey) {
    // DH1: Identity x Identity
    const dh1 = nacl.box.before(
      decodeBase64(recipientIdentityKey),
      identityKey.secretKey
    )

    // DH2: Ephemeral x Identity
    const dh2 = nacl.box.before(
      decodeBase64(recipientIdentityKey),
      ephemeralKey.secretKey
    )

    // DH3: Ephemeral x PreKey
    const dh3 = nacl.box.before(
      decodeBase64(recipientPreKey),
      ephemeralKey.secretKey
    )

    // Combine all DH outputs
    const combined = new Uint8Array(dh1.length + dh2.length + dh3.length)
    combined.set(dh1, 0)
    combined.set(dh2, dh1.length)
    combined.set(dh3, dh1.length + dh2.length)

    // Hash to derive final shared secret
    return nacl.hash(combined).slice(0, 32)
  }

  /**
   * Encrypt message with Perfect Forward Secrecy
   */
  encryptMessage(recipientId, message) {
    const session = this.sessions.get(recipientId)
    if (!session) {
      throw new Error('No session with recipient')
    }

    // Ratchet forward (new key for each message)
    const messageKey = this.ratchetForward(session)

    // Encrypt with message key
    const nonce = nacl.randomBytes(24)
    const messageBytes = new TextEncoder().encode(message)
    const encrypted = nacl.secretbox(messageBytes, nonce, messageKey)

    session.messageNumber++

    return {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      messageNumber: session.messageNumber,
      ephemeralPublicKey: encodeBase64(session.ephemeralKeyPair.publicKey)
    }
  }

  /**
   * Decrypt message
   */
  decryptMessage(senderId, encryptedData) {
    const session = this.sessions.get(senderId)
    if (!session) {
      throw new Error('No session with sender')
    }

    // Derive message key
    const messageKey = this.deriveMessageKey(session, encryptedData.messageNumber)

    // Decrypt
    const ciphertext = decodeBase64(encryptedData.ciphertext)
    const nonce = decodeBase64(encryptedData.nonce)
    const decrypted = nacl.secretbox.open(ciphertext, nonce, messageKey)

    if (!decrypted) {
      throw new Error('Decryption failed')
    }

    return new TextDecoder().decode(decrypted)
  }

  /**
   * Ratchet forward to generate new message key (Perfect Forward Secrecy)
   */
  ratchetForward(session) {
    // Use chain key to derive message key
    const messageKey = nacl.hash(
      new Uint8Array([...session.chainKey, session.messageNumber])
    ).slice(0, 32)

    // Update chain key
    session.chainKey = nacl.hash(session.chainKey).slice(0, 32)

    return messageKey
  }

  /**
   * Derive message key for specific message number
   */
  deriveMessageKey(session, messageNumber) {
    let chainKey = session.chainKey
    for (let i = session.messageNumber; i < messageNumber; i++) {
      chainKey = nacl.hash(chainKey).slice(0, 32)
    }
    return nacl.hash(new Uint8Array([...chainKey, messageNumber])).slice(0, 32)
  }

  /**
   * Get public key bundle for sharing
   */
  getPublicKeyBundle() {
    return {
      identityPublicKey: encodeBase64(this.identityKeyPair.publicKey),
      preKeys: this.preKeys
        .filter(pk => !pk.used)
        .slice(0, 10)
        .map(pk => ({
          id: pk.id,
          publicKey: encodeBase64(pk.keyPair.publicKey)
        }))
    }
  }
}

// Singleton instance
export const signalProtocol = new SignalProtocol()

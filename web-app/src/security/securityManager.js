/**
 * Security Manager
 * Centralized management of all security features
 */

import { signalProtocol } from './signalProtocol'
import { trafficPadding } from './trafficPadding'
import { p2pConnection } from './p2pConnection'
import { torProxy } from './torProxy'
import { decentralizedStorage } from './decentralizedStorage'

class SecurityManager {
  constructor() {
    this.features = {
      signalProtocol: false,
      trafficPadding: false,
      p2pConnection: false,
      torProxy: false,
      decentralizedStorage: false
    }
  }

  /**
   * Initialize all security features
   */
  async initializeAll(userId, socket) {
    console.log('🔒 Initializing advanced security features...')

    try {
      // 1. Signal Protocol (Military-grade encryption)
      signalProtocol.initialize(userId)
      this.features.signalProtocol = true
      console.log('✅ Signal Protocol enabled')

      // 2. Traffic Padding (Metadata protection)
      trafficPadding.start(userId, socket)
      this.features.trafficPadding = true
      console.log('✅ Traffic Padding enabled')

      // 3. P2P Connections (Bypass server)
      p2pConnection.initialize(userId, socket)
      this.features.p2pConnection = true
      console.log('✅ P2P Connections enabled')

      // 4. Tor Proxy (IP anonymity)
      const torAvailable = await torProxy.checkTorAvailability()
      if (torAvailable) {
        torProxy.enable()
        this.features.torProxy = true
        console.log('✅ Tor Proxy enabled')
      } else {
        console.log('⚠️ Tor not available (optional)')
      }

      // 5. Decentralized Storage (No central server)
      decentralizedStorage.initialize()
      this.features.decentralizedStorage = true
      console.log('✅ Decentralized Storage enabled')

      console.log('🎉 All security features initialized!')
      
      return this.getSecurityStatus()
    } catch (error) {
      console.error('❌ Security initialization error:', error)
      throw error
    }
  }

  /**
   * Send encrypted message with all security features
   */
  async sendSecureMessage(recipientId, message, socket) {
    try {
      // 1. Try P2P first (most secure, bypasses server)
      if (this.features.p2pConnection && p2pConnection.isConnected(recipientId)) {
        const encrypted = signalProtocol.encryptMessage(recipientId, message)
        const sent = p2pConnection.sendMessage(recipientId, encrypted)
        if (sent) {
          console.log('📨 Message sent via P2P')
          return { method: 'p2p', encrypted: true }
        }
      }

      // 2. Fallback to server with encryption
      const encrypted = signalProtocol.encryptMessage(recipientId, message)
      
      // 3. Add traffic padding
      const padded = trafficPadding.padMessage(encrypted)
      
      // 4. Send through server
      socket.emit('secure-message', {
        targetId: recipientId,
        data: padded
      })

      console.log('📨 Message sent via server (encrypted)')
      return { method: 'server', encrypted: true }
    } catch (error) {
      console.error('❌ Secure send error:', error)
      throw error
    }
  }

  /**
   * Receive and decrypt message
   */
  async receiveSecureMessage(senderId, encryptedData) {
    try {
      // 1. Remove padding
      const unpadded = trafficPadding.unpadMessage(encryptedData)
      
      // 2. Decrypt with Signal Protocol
      const decrypted = signalProtocol.decryptMessage(senderId, unpadded)
      
      console.log('📬 Message received and decrypted')
      return decrypted
    } catch (error) {
      console.error('❌ Secure receive error:', error)
      throw error
    }
  }

  /**
   * Get comprehensive security status
   */
  getSecurityStatus() {
    return {
      features: this.features,
      signalProtocol: {
        enabled: this.features.signalProtocol,
        description: 'Military-grade E2E encryption with Perfect Forward Secrecy'
      },
      trafficPadding: {
        enabled: this.features.trafficPadding,
        description: 'Hides message patterns and metadata'
      },
      p2pConnection: {
        enabled: this.features.p2pConnection,
        stats: p2pConnection.getStats(),
        description: 'Direct peer-to-peer connections (bypasses server)'
      },
      torProxy: {
        enabled: this.features.torProxy,
        circuit: torProxy.getCircuitInfo(),
        description: 'Routes traffic through Tor network (IP anonymity)'
      },
      decentralizedStorage: {
        enabled: this.features.decentralizedStorage,
        stats: decentralizedStorage.getStats(),
        description: 'Distributed storage across peer network'
      },
      overallSecurity: this.calculateSecurityScore()
    }
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore() {
    const enabledFeatures = Object.values(this.features).filter(f => f).length
    const totalFeatures = Object.keys(this.features).length
    const score = (enabledFeatures / totalFeatures) * 100

    let level = 'Basic'
    if (score >= 80) level = 'Maximum'
    else if (score >= 60) level = 'High'
    else if (score >= 40) level = 'Medium'

    return {
      score: Math.round(score),
      level,
      enabledFeatures,
      totalFeatures
    }
  }

  /**
   * Enable specific feature
   */
  async enableFeature(featureName, userId, socket) {
    switch (featureName) {
      case 'signalProtocol':
        signalProtocol.initialize(userId)
        this.features.signalProtocol = true
        break
      case 'trafficPadding':
        trafficPadding.start(userId, socket)
        this.features.trafficPadding = true
        break
      case 'p2pConnection':
        p2pConnection.initialize(userId, socket)
        this.features.p2pConnection = true
        break
      case 'torProxy':
        torProxy.enable()
        this.features.torProxy = true
        break
      case 'decentralizedStorage':
        decentralizedStorage.initialize()
        this.features.decentralizedStorage = true
        break
    }
  }

  /**
   * Disable specific feature
   */
  disableFeature(featureName) {
    switch (featureName) {
      case 'trafficPadding':
        trafficPadding.stop()
        this.features.trafficPadding = false
        break
      case 'p2pConnection':
        p2pConnection.disconnectAll()
        this.features.p2pConnection = false
        break
      case 'torProxy':
        torProxy.disable()
        this.features.torProxy = false
        break
      case 'decentralizedStorage':
        decentralizedStorage.logout()
        this.features.decentralizedStorage = false
        break
    }
  }

  /**
   * Cleanup on logout
   */
  cleanup() {
    trafficPadding.stop()
    p2pConnection.disconnectAll()
    decentralizedStorage.logout()
    console.log('🧹 Security features cleaned up')
  }
}

export const securityManager = new SecurityManager()

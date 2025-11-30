/**
 * Decentralized Storage using Gun.js
 * No central server, distributed across peers
 */

import Gun from 'gun'

class DecentralizedStorage {
  constructor() {
    this.gun = null
    this.user = null
    this.isInitialized = false
  }

  /**
   * Initialize Gun.js decentralized database
   */
  initialize() {
    // Connect to public Gun relay peers
    this.gun = Gun({
      peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gun-us.herokuapp.com/gun',
        'https://gun-eu.herokuapp.com/gun'
      ],
      localStorage: true,
      radisk: true
    })

    this.user = this.gun.user()
    this.isInitialized = true

    console.log('🌐 Decentralized storage initialized')
  }

  /**
   * Create decentralized user account
   */
  async createUser(username, password) {
    return new Promise((resolve, reject) => {
      this.user.create(username, password, (ack) => {
        if (ack.err) {
          reject(new Error(ack.err))
        } else {
          console.log('✅ Decentralized user created')
          resolve(ack)
        }
      })
    })
  }

  /**
   * Login to decentralized account
   */
  async login(username, password) {
    return new Promise((resolve, reject) => {
      this.user.auth(username, password, (ack) => {
        if (ack.err) {
          reject(new Error(ack.err))
        } else {
          console.log('✅ Logged into decentralized account')
          resolve(ack)
        }
      })
    })
  }

  /**
   * Store encrypted message in decentralized network
   */
  async storeMessage(conversationId, message) {
    if (!this.isInitialized) {
      throw new Error('Decentralized storage not initialized')
    }

    const messageId = `msg_${Date.now()}_${Math.random()}`
    
    await this.gun
      .get('conversations')
      .get(conversationId)
      .get('messages')
      .get(messageId)
      .put({
        ...message,
        timestamp: Date.now()
      })

    return messageId
  }

  /**
   * Retrieve messages from decentralized network
   */
  async getMessages(conversationId, callback) {
    if (!this.isInitialized) {
      throw new Error('Decentralized storage not initialized')
    }

    this.gun
      .get('conversations')
      .get(conversationId)
      .get('messages')
      .map()
      .on((message, id) => {
        if (message && callback) {
          callback({ id, ...message })
        }
      })
  }

  /**
   * Store user public key
   */
  async storePublicKey(userId, publicKey) {
    await this.gun
      .get('users')
      .get(userId)
      .get('publicKey')
      .put(publicKey)
  }

  /**
   * Get user public key
   */
  async getPublicKey(userId) {
    return new Promise((resolve) => {
      this.gun
        .get('users')
        .get(userId)
        .get('publicKey')
        .once((key) => resolve(key))
    })
  }

  /**
   * Get network stats
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      peers: this.gun ? Object.keys(this.gun._.opt.peers).length : 0,
      authenticated: !!this.user.is
    }
  }

  /**
   * Logout
   */
  logout() {
    if (this.user) {
      this.user.leave()
      console.log('👋 Logged out from decentralized network')
    }
  }
}

export const decentralizedStorage = new DecentralizedStorage()

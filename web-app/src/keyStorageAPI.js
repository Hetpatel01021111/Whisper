// Client-side API for secure key storage
const getAPIBaseURL = () => {
  // Check if we're in development or production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development mode
    return 'http://localhost:3000/api/keys'
  } else {
    // Production mode - Vercel deployment
    return 'https://session-messenger-hu656qz9u-het-patels-projects-70a38283.vercel.app/api/keys'
  }
}

const API_BASE_URL = getAPIBaseURL()

class KeyStorageAPI {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Store user's public key bundle on server
  async storePublicKeyBundle(userId, keyBundle) {
    try {
      const response = await fetch(`${this.baseURL}/store-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          keyBundle
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to store public key bundle:', error)
      throw error
    }
  }

  // Get user's public key bundle from server
  async getPublicKeyBundle(userId) {
    try {
      const response = await fetch(`${this.baseURL}/public/${userId}`)

      if (response.status === 404) {
        return null // User not found
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get public key bundle:', error)
      throw error
    }
  }

  // Store user's prekey bundle for X3DH key exchange
  async storePreKeyBundle(userId, preKeyBundle) {
    try {
      const response = await fetch(`${this.baseURL}/store-prekeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          preKeyBundle
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to store prekey bundle:', error)
      throw error
    }
  }

  // Get user's prekey bundle for X3DH key exchange
  async getPreKeyBundle(userId) {
    try {
      const response = await fetch(`${this.baseURL}/prekeys/${userId}`)

      if (response.status === 404) {
        return null // User not found
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get prekey bundle:', error)
      throw error
    }
  }

  // List all users with public keys (for discovery)
  async listUsers() {
    try {
      const response = await fetch(`${this.baseURL}/users`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.users
    } catch (error) {
      console.error('Failed to list users:', error)
      throw error
    }
  }

  // Upload user's keys when they first create account
  async uploadUserKeys(userId, publicKey, preKeyBundle) {
    try {
      // Store public key
      await this.storePublicKeyBundle(userId, { publicKey })
      
      // Store prekey bundle for key exchange
      await this.storePreKeyBundle(userId, preKeyBundle)
      
      return true
    } catch (error) {
      console.error('Failed to upload user keys:', error)
      return false
    }
  }

  // Get recipient's public key for encryption
  async getRecipientPublicKey(userId) {
    try {
      const keyBundle = await this.getPublicKeyBundle(userId)
      return keyBundle?.publicKey || null
    } catch (error) {
      console.error('Failed to get recipient public key:', error)
      return null
    }
  }
}

// Create singleton instance
const keyStorageAPI = new KeyStorageAPI()

export default keyStorageAPI
export { KeyStorageAPI }

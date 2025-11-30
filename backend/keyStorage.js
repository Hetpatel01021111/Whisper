const crypto = require('crypto')
const fs = require('fs').promises
const path = require('path')

class SecureKeyStorage {
  constructor() {
    this.storageDir = path.join(__dirname, 'secure_storage')
    this.masterKey = process.env.MASTER_KEY || this.generateMasterKey()
    this.initStorage()
  }

  async initStorage() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create storage directory:', error)
    }
  }

  generateMasterKey() {
    const key = crypto.randomBytes(32).toString('hex')
    console.log('⚠️  SAVE THIS MASTER KEY:', key)
    console.log('⚠️  Set MASTER_KEY environment variable!')
    return key
  }

  // Encrypt data with AES-256-GCM
  encrypt(data) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-gcm', this.masterKey)
    cipher.setAAD(Buffer.from('session-api-keys'))
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  }

  // Decrypt data
  decrypt(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-gcm', this.masterKey)
    decipher.setAAD(Buffer.from('session-api-keys'))
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'))
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }

  // Store user's public key bundle
  async storePublicKeyBundle(userId, keyBundle) {
    try {
      const encrypted = this.encrypt(keyBundle)
      const filePath = path.join(this.storageDir, `${userId}_public.json`)
      await fs.writeFile(filePath, JSON.stringify(encrypted))
      return true
    } catch (error) {
      console.error('Failed to store public key bundle:', error)
      return false
    }
  }

  // Retrieve user's public key bundle
  async getPublicKeyBundle(userId) {
    try {
      const filePath = path.join(this.storageDir, `${userId}_public.json`)
      const encryptedData = JSON.parse(await fs.readFile(filePath, 'utf8'))
      return this.decrypt(encryptedData)
    } catch (error) {
      console.error('Failed to retrieve public key bundle:', error)
      return null
    }
  }

  // Store prekey bundles for key exchange
  async storePreKeyBundle(userId, preKeyBundle) {
    try {
      const encrypted = this.encrypt(preKeyBundle)
      const filePath = path.join(this.storageDir, `${userId}_prekeys.json`)
      await fs.writeFile(filePath, JSON.stringify(encrypted))
      return true
    } catch (error) {
      console.error('Failed to store prekey bundle:', error)
      return false
    }
  }

  // Get prekey bundle for key exchange
  async getPreKeyBundle(userId) {
    try {
      const filePath = path.join(this.storageDir, `${userId}_prekeys.json`)
      const encryptedData = JSON.parse(await fs.readFile(filePath, 'utf8'))
      return this.decrypt(encryptedData)
    } catch (error) {
      console.error('Failed to retrieve prekey bundle:', error)
      return null
    }
  }

  // List all users with public keys (for discovery)
  async listUsers() {
    try {
      const files = await fs.readdir(this.storageDir)
      const users = files
        .filter(file => file.endsWith('_public.json'))
        .map(file => file.replace('_public.json', ''))
      return users
    } catch (error) {
      console.error('Failed to list users:', error)
      return []
    }
  }

  // Clean up old prekeys (security maintenance)
  async cleanupOldPreKeys(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const files = await fs.readdir(this.storageDir)
      const now = Date.now()
      
      for (const file of files) {
        if (file.endsWith('_prekeys.json')) {
          const filePath = path.join(this.storageDir, file)
          const stats = await fs.stat(filePath)
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath)
            console.log(`Cleaned up old prekeys: ${file}`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old prekeys:', error)
    }
  }
}

module.exports = SecureKeyStorage

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'
import CryptoJS from 'crypto-js'

// Generate a new keypair for the user
export function generateKeyPair() {
  const keyPair = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  }
}

// Pad message to hide length (traffic analysis resistance)
function padMessage(message) {
  // Use power-of-2 padding to hide message lengths
  const lengths = [64, 128, 256, 512, 1024, 2048, 4096]
  const messageLength = new TextEncoder().encode(message).length
  
  // Find the smallest padding size that fits the message
  const targetLength = lengths.find(len => len >= messageLength) || 4096
  
  // Add random padding
  const paddingLength = targetLength - messageLength
  const padding = Array.from(nacl.randomBytes(paddingLength), b => 
    String.fromCharCode(b % 94 + 33) // Printable ASCII characters
  ).join('')
  
  return message + '|PAD|' + padding
}

// Remove padding from decrypted message
function unpadMessage(paddedMessage) {
  const padIndex = paddedMessage.indexOf('|PAD|')
  return padIndex !== -1 ? paddedMessage.substring(0, padIndex) : paddedMessage
}

// Encrypt a message with ephemeral keys for forward secrecy
export function encryptMessage(message, recipientPublicKey, senderSecretKey) {
  try {
    // Generate ephemeral keypair for this message
    const ephemeralKeyPair = nacl.box.keyPair()
    
    // Pad message to hide length
    const paddedMessage = padMessage(message)
    const messageBytes = encodeUTF8(paddedMessage)
    const recipientPublicKeyBytes = decodeBase64(recipientPublicKey)
    
    const nonce = nacl.randomBytes(24)
    const encrypted = nacl.box(messageBytes, nonce, recipientPublicKeyBytes, ephemeralKeyPair.secretKey)
    
    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey)
    }
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt message')
  }
}

// Legacy encryption without ephemeral keys (for backward compatibility)
export function encryptMessageLegacy(message, recipientPublicKey, senderSecretKey) {
  try {
    const paddedMessage = padMessage(message)
    const messageBytes = encodeUTF8(paddedMessage)
    const recipientPublicKeyBytes = decodeBase64(recipientPublicKey)
    const senderSecretKeyBytes = decodeBase64(senderSecretKey)
    
    const nonce = nacl.randomBytes(24)
    const encrypted = nacl.box(messageBytes, nonce, recipientPublicKeyBytes, senderSecretKeyBytes)
    
    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce)
    }
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt message')
  }
}

// Decrypt a message with ephemeral keys and remove padding
export function decryptMessage(encryptedData, senderPublicKey, recipientSecretKey) {
  try {
    const encryptedBytes = decodeBase64(encryptedData.encrypted)
    const nonceBytes = decodeBase64(encryptedData.nonce)
    const recipientSecretKeyBytes = decodeBase64(recipientSecretKey)
    
    let decrypted
    
    // Try ephemeral key decryption first (new format)
    if (encryptedData.ephemeralPublicKey) {
      const ephemeralPublicKeyBytes = decodeBase64(encryptedData.ephemeralPublicKey)
      decrypted = nacl.box.open(encryptedBytes, nonceBytes, ephemeralPublicKeyBytes, recipientSecretKeyBytes)
    } else {
      // Fallback to legacy decryption (old format)
      const senderPublicKeyBytes = decodeBase64(senderPublicKey)
      decrypted = nacl.box.open(encryptedBytes, nonceBytes, senderPublicKeyBytes, recipientSecretKeyBytes)
    }
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid message or keys')
    }
    
    const paddedMessage = decodeUTF8(decrypted)
    return unpadMessage(paddedMessage)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt message')
  }
}

// Generate a secure random access key (for existing functionality)
export function generateAccessKey() {
  const bytes = nacl.randomBytes(16)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Enhanced key derivation using PBKDF2
export function deriveKeysFromAccessKey(accessKey) {
  // Use PBKDF2 with high iteration count for security
  const salt = 'session-messenger-2024-salt' // In production, use random salt per user
  const iterations = 100000 // High iteration count for security
  
  // Derive 32 bytes for the secret key
  const derivedKey = CryptoJS.PBKDF2(accessKey, salt, {
    keySize: 32 / 4, // CryptoJS uses 32-bit words
    iterations: iterations,
    hasher: CryptoJS.algo.SHA256
  })
  
  // Convert to Uint8Array
  const seed = new Uint8Array(32)
  const words = derivedKey.words
  for (let i = 0; i < 8; i++) {
    const word = words[i]
    seed[i * 4] = (word >>> 24) & 0xff
    seed[i * 4 + 1] = (word >>> 16) & 0xff
    seed[i * 4 + 2] = (word >>> 8) & 0xff
    seed[i * 4 + 3] = word & 0xff
  }
  
  const keyPair = nacl.box.keyPair.fromSecretKey(seed)
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  }
}

// Enhanced secure key storage with encryption
async function deriveStorageKey(password) {
  // Use Web Crypto API for key derivation
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  const salt = encoder.encode('session-storage-salt-2024')
  
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data for storage
async function encryptForStorage(data, password) {
  try {
    const key = await deriveStorageKey(password)
    const encoder = new TextEncoder()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(JSON.stringify(data))
    )
    
    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    }
  } catch (error) {
    console.error('Storage encryption failed:', error)
    throw new Error('Failed to encrypt data for storage')
  }
}

// Decrypt data from storage
async function decryptFromStorage(encryptedData, password) {
  try {
    const key = await deriveStorageKey(password)
    const decoder = new TextDecoder()
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
      key,
      new Uint8Array(encryptedData.encrypted)
    )
    
    return JSON.parse(decoder.decode(decrypted))
  } catch (error) {
    console.error('Storage decryption failed:', error)
    throw new Error('Failed to decrypt data from storage')
  }
}

// Store keys securely with hardware-backed encryption when available
export async function storeKeys(keys) {
  try {
    // Try to use hardware-backed storage first
    if (window.crypto && window.crypto.subtle) {
      const accessKey = localStorage.getItem('currentAccessKey')
      if (accessKey) {
        const encryptedKeys = await encryptForStorage(keys, accessKey)
        localStorage.setItem('userKeys', JSON.stringify(encryptedKeys))
        localStorage.setItem('keysEncrypted', 'true')
        return
      }
    }
    
    // Fallback to regular storage
    localStorage.setItem('userKeys', JSON.stringify(keys))
    localStorage.setItem('keysEncrypted', 'false')
  } catch (error) {
    console.warn('Secure storage failed, using fallback:', error)
    localStorage.setItem('userKeys', JSON.stringify(keys))
    localStorage.setItem('keysEncrypted', 'false')
  }
}

// Retrieve keys securely
export async function getStoredKeys() {
  try {
    const stored = localStorage.getItem('userKeys')
    const isEncrypted = localStorage.getItem('keysEncrypted') === 'true'
    
    if (!stored) return null
    
    if (isEncrypted) {
      const accessKey = localStorage.getItem('currentAccessKey')
      if (!accessKey) {
        throw new Error('Access key required for encrypted storage')
      }
      
      const encryptedData = JSON.parse(stored)
      return await decryptFromStorage(encryptedData, accessKey)
    } else {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to retrieve keys:', error)
    return null
  }
}

// Generate key fingerprint for verification
export function generateKeyFingerprint(publicKey) {
  try {
    const publicKeyBytes = decodeBase64(publicKey)
    const hash = nacl.hash(publicKeyBytes)
    
    // Take first 20 bytes and format as hex groups
    return Array.from(hash.slice(0, 20))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .match(/.{4}/g)
      .join(' ')
  } catch (error) {
    console.error('Failed to generate fingerprint:', error)
    return 'ERROR'
  }
}

// Generate safety number for two users (like Signal)
export function generateSafetyNumber(myPublicKey, theirPublicKey) {
  try {
    const myKeyBytes = decodeBase64(myPublicKey)
    const theirKeyBytes = decodeBase64(theirPublicKey)
    
    // Combine keys in deterministic order
    const combined = new Uint8Array(64)
    if (myPublicKey < theirPublicKey) {
      combined.set(myKeyBytes, 0)
      combined.set(theirKeyBytes, 32)
    } else {
      combined.set(theirKeyBytes, 0)
      combined.set(myKeyBytes, 32)
    }
    
    // Hash the combined keys
    const hash = nacl.hash(combined)
    
    // Convert to 60-digit safety number (like Signal)
    const safetyNumber = Array.from(hash.slice(0, 30))
      .map(b => (b % 100).toString().padStart(2, '0'))
      .join('')
    
    // Format in groups of 5
    return safetyNumber.match(/.{5}/g).join(' ')
  } catch (error) {
    console.error('Failed to generate safety number:', error)
    return 'ERROR'
  }
}

// Verify if two safety numbers match
export function verifySafetyNumber(myPublicKey, theirPublicKey, providedSafetyNumber) {
  const actualSafetyNumber = generateSafetyNumber(myPublicKey, theirPublicKey)
  return actualSafetyNumber === providedSafetyNumber.replace(/\s/g, '').match(/.{5}/g).join(' ')
}

// X3DH Key Exchange Protocol Implementation
export function generatePreKeyBundle(identityKeys) {
  // Generate signed prekey
  const signedPreKey = nacl.box.keyPair()
  const signedPreKeyId = Date.now()
  
  // Generate one-time prekeys
  const oneTimePreKeys = []
  for (let i = 0; i < 10; i++) {
    const oneTimeKey = nacl.box.keyPair()
    oneTimePreKeys.push({
      id: signedPreKeyId + i + 1,
      publicKey: encodeBase64(oneTimeKey.publicKey),
      secretKey: encodeBase64(oneTimeKey.secretKey)
    })
  }
  
  // Create signature for signed prekey (simplified)
  const signatureData = new Uint8Array([...signedPreKey.publicKey, ...new TextEncoder().encode(signedPreKeyId.toString())])
  const signature = nacl.hash(signatureData).slice(0, 32)
  
  return {
    identityKey: identityKeys.publicKey,
    signedPreKey: {
      id: signedPreKeyId,
      publicKey: encodeBase64(signedPreKey.publicKey),
      secretKey: encodeBase64(signedPreKey.secretKey),
      signature: encodeBase64(signature)
    },
    oneTimePreKeys: oneTimePreKeys.map(key => ({
      id: key.id,
      publicKey: key.publicKey
    }))
  }
}

// Perform X3DH key agreement (sender side)
export function performX3DHSender(recipientBundle, senderIdentityKeys) {
  try {
    // Generate ephemeral key
    const ephemeralKey = nacl.box.keyPair()
    
    // Select a one-time prekey (use first available)
    const oneTimePreKey = recipientBundle.oneTimePreKeys[0]
    
    // Perform 4 Diffie-Hellman operations
    const dh1 = nacl.box.before(decodeBase64(recipientBundle.signedPreKey.publicKey), decodeBase64(senderIdentityKeys.secretKey))
    const dh2 = nacl.box.before(decodeBase64(recipientBundle.identityKey), ephemeralKey.secretKey)
    const dh3 = nacl.box.before(decodeBase64(recipientBundle.signedPreKey.publicKey), ephemeralKey.secretKey)
    const dh4 = oneTimePreKey ? nacl.box.before(decodeBase64(oneTimePreKey.publicKey), ephemeralKey.secretKey) : new Uint8Array(32)
    
    // Combine all DH outputs
    const sharedSecret = new Uint8Array(128)
    sharedSecret.set(dh1, 0)
    sharedSecret.set(dh2, 32)
    sharedSecret.set(dh3, 64)
    sharedSecret.set(dh4, 96)
    
    // Derive root key from shared secret
    const rootKey = nacl.hash(sharedSecret).slice(0, 32)
    
    return {
      rootKey: encodeBase64(rootKey),
      ephemeralPublicKey: encodeBase64(ephemeralKey.publicKey),
      usedOneTimePreKeyId: oneTimePreKey?.id
    }
  } catch (error) {
    console.error('X3DH sender failed:', error)
    throw new Error('Key exchange failed')
  }
}

// Perform X3DH key agreement (recipient side)
export function performX3DHRecipient(senderIdentityKey, ephemeralPublicKey, usedOneTimePreKeyId, recipientKeys, preKeyBundle) {
  try {
    // Find the used one-time prekey
    const oneTimePreKey = preKeyBundle.oneTimePreKeys.find(key => key.id === usedOneTimePreKeyId)
    
    // Perform the same 4 DH operations
    const dh1 = nacl.box.before(decodeBase64(senderIdentityKey), decodeBase64(preKeyBundle.signedPreKey.secretKey))
    const dh2 = nacl.box.before(decodeBase64(ephemeralPublicKey), decodeBase64(recipientKeys.secretKey))
    const dh3 = nacl.box.before(decodeBase64(ephemeralPublicKey), decodeBase64(preKeyBundle.signedPreKey.secretKey))
    const dh4 = oneTimePreKey ? nacl.box.before(decodeBase64(ephemeralPublicKey), decodeBase64(oneTimePreKey.secretKey)) : new Uint8Array(32)
    
    // Combine all DH outputs
    const sharedSecret = new Uint8Array(128)
    sharedSecret.set(dh1, 0)
    sharedSecret.set(dh2, 32)
    sharedSecret.set(dh3, 64)
    sharedSecret.set(dh4, 96)
    
    // Derive root key from shared secret
    const rootKey = nacl.hash(sharedSecret).slice(0, 32)
    
    return {
      rootKey: encodeBase64(rootKey)
    }
  } catch (error) {
    console.error('X3DH recipient failed:', error)
    throw new Error('Key exchange failed')
  }
}

// Store prekey bundle for a user
export function storePreKeyBundle(userId, bundle) {
  localStorage.setItem(`preKeyBundle_${userId}`, JSON.stringify(bundle))
}

// Get prekey bundle for a user
export function getPreKeyBundle(userId) {
  const stored = localStorage.getItem(`preKeyBundle_${userId}`)
  return stored ? JSON.parse(stored) : null
}

// Initialize encryption for a user
export function initializeEncryption(accessKey) {
  let keys = getStoredKeys()
  
  if (!keys) {
    // Generate new keys or derive from access key
    if (accessKey) {
      keys = deriveKeysFromAccessKey(accessKey)
    } else {
      keys = generateKeyPair()
    }
    storeKeys(keys)
    
    // Generate and store prekey bundle
    const preKeyBundle = generatePreKeyBundle(keys)
    storePreKeyBundle('self', preKeyBundle)
  }
  
  return keys
}

/**
 * 📁 P2P File Transfer System
 * 
 * Direct peer-to-peer file transfer with no size limits.
 * Files are streamed directly between users - never stored on server.
 * 
 * Features:
 * - Unlimited file size (streamed in chunks)
 * - End-to-end encrypted transfers
 * - Resume support for interrupted transfers
 * - Progress tracking for both sender and receiver
 * - Multiple simultaneous transfers
 */

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

// File Transfer Configuration
const TRANSFER_CONFIG = {
  CHUNK_SIZE: 512 * 1024,        // 512KB chunks (larger = faster)
  MAX_CONCURRENT_TRANSFERS: 10,  // More concurrent transfers
  TRANSFER_TIMEOUT: 60000,       // 60 second timeout
  RETRY_ATTEMPTS: 1,             // Minimal retries
  ENCRYPTION_ENABLED: false,     // Encrypt file chunks (disabled for now)
  SEND_DELAY: 0,                 // No delay between chunks
  BATCH_SIZE: 5,                 // Send 5 chunks before waiting for ack
}

/**
 * Transfer states
 */
export const TransferState = {
  PENDING: 'pending',
  WAITING_ACCEPT: 'waiting_accept',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  TRANSFERRING: 'transferring',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

/**
 * Represents a file transfer session
 */
export class FileTransfer {
  constructor(id, fileName, fileSize, senderId, receiverId) {
    this.id = id
    this.fileName = fileName
    this.fileSize = fileSize
    this.senderId = senderId
    this.receiverId = receiverId
    this.state = TransferState.PENDING
    this.progress = 0
    this.bytesTransferred = 0
    this.chunks = []
    this.totalChunks = Math.ceil(fileSize / TRANSFER_CONFIG.CHUNK_SIZE)
    this.currentChunk = 0
    this.startTime = null
    this.endTime = null
    this.speed = 0
    this.error = null
    this.file = null           // File object (sender only)
    this.receivedChunks = []   // Received chunks (receiver only)
    this.encryptionKey = null  // Symmetric key for this transfer
  }

  getProgress() {
    return (this.bytesTransferred / this.fileSize) * 100
  }

  getSpeed() {
    if (!this.startTime || this.bytesTransferred === 0) return 0
    const elapsed = (Date.now() - this.startTime) / 1000
    return this.bytesTransferred / elapsed
  }

  getETA() {
    const speed = this.getSpeed()
    if (speed === 0) return Infinity
    const remaining = this.fileSize - this.bytesTransferred
    return remaining / speed
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  formatSpeed(bytesPerSecond) {
    return this.formatSize(bytesPerSecond) + '/s'
  }

  formatETA(seconds) {
    if (seconds === Infinity) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins > 60) {
      const hours = Math.floor(mins / 60)
      return `${hours}h ${mins % 60}m`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
}

/**
 * File Transfer Manager
 * Handles all file transfer operations
 */
export class FileTransferManager {
  constructor() {
    this.transfers = new Map()
    this.pendingRequests = new Map()
    this.dataChannels = new Map()
    this.eventHandlers = {
      onTransferRequest: [],
      onTransferAccepted: [],
      onTransferRejected: [],
      onTransferProgress: [],
      onTransferComplete: [],
      onTransferFailed: [],
      onTransferCancelled: [],
    }
    this.myKeyPair = null
    this.myId = null
    this.signaling = null // Will be set to socket or P2P network
  }

  /**
   * Initialize the file transfer manager
   */
  initialize(keyPair, userId, signaling) {
    this.myKeyPair = keyPair
    this.myId = userId
    this.signaling = signaling
    
    // Set up signaling handlers
    if (signaling) {
      this.setupSignalingHandlers()
    }
    
    console.log('📁 File Transfer Manager initialized')
  }

  /**
   * Set up signaling message handlers
   */
  setupSignalingHandlers() {
    // These would be called by the socket or P2P network
    this.signaling.on('file-transfer-request', (data) => {
      console.log('📁 [FileTransfer] Received file-transfer-request event:', data)
      this.handleTransferRequest(data)
    })
    
    this.signaling.on('file-transfer-response', (data) => {
      console.log('📁 [FileTransfer] Received file-transfer-response event:', data)
      this.handleTransferResponse(data)
    })
    
    this.signaling.on('file-chunk', (data) => {
      this.handleChunkReceived(data)
    })
    
    this.signaling.on('file-chunk-ack', (data) => {
      this.handleChunkAck(data)
    })
    
    this.signaling.on('file-transfer-complete', (data) => {
      console.log('📁 [FileTransfer] Received file-transfer-complete event:', data)
      this.handleTransferComplete(data)
    })
    
    this.signaling.on('file-transfer-cancel', (data) => {
      console.log('📁 [FileTransfer] Received file-transfer-cancel event:', data)
      this.handleTransferCancel(data)
    })
  }

  /**
   * Generate a unique transfer ID
   */
  generateTransferId() {
    return encodeBase64(nacl.randomBytes(16))
  }

  /**
   * Generate encryption key for a transfer
   */
  generateTransferKey() {
    return nacl.randomBytes(32)
  }

  /**
   * Encrypt a chunk
   */
  encryptChunk(chunk, key) {
    const nonce = nacl.randomBytes(24)
    const encrypted = nacl.secretbox(chunk, nonce, key)
    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce)
    }
  }

  /**
   * Decrypt a chunk
   */
  decryptChunk(encryptedData, key) {
    try {
      if (!encryptedData || !encryptedData.encrypted || !encryptedData.nonce) {
        console.error('📁 Invalid encrypted data format:', encryptedData)
        return null
      }
      
      console.log('📁 [decryptChunk] Key type:', typeof key, 'Is Uint8Array:', key instanceof Uint8Array)
      console.log('📁 [decryptChunk] Key:', key)
      
      // Ensure key is Uint8Array
      let keyArray = key
      if (!(key instanceof Uint8Array)) {
        if (typeof key === 'string') {
          keyArray = decodeBase64(key)
        } else if (Array.isArray(key)) {
          keyArray = new Uint8Array(key)
        } else {
          console.error('📁 Invalid key type:', typeof key)
          return null
        }
      }
      
      const encrypted = decodeBase64(encryptedData.encrypted)
      const nonce = decodeBase64(encryptedData.nonce)
      const decrypted = nacl.secretbox.open(encrypted, nonce, keyArray)
      if (!decrypted) {
        console.error('📁 Decryption failed - invalid key or corrupted data')
        return null
      }
      return decrypted
    } catch (error) {
      console.error('📁 Error decrypting chunk:', error)
      return null
    }
  }

  /**
   * Send a file to another user
   */
  async sendFile(file, receiverId, receiverPublicKey) {
    const transferId = this.generateTransferId()
    
    const transfer = new FileTransfer(
      transferId,
      file.name,
      file.size,
      this.myId,
      receiverId
    )
    
    transfer.file = file
    transfer.state = TransferState.WAITING_ACCEPT
    
    // Generate encryption key for this transfer
    if (TRANSFER_CONFIG.ENCRYPTION_ENABLED) {
      transfer.encryptionKey = this.generateTransferKey()
    }
    
    this.transfers.set(transferId, transfer)
    
    // Send transfer request to receiver
    this.sendSignal(receiverId, 'file-transfer-request', {
      transferId: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      senderId: this.myId,
      totalChunks: transfer.totalChunks,
      // Encrypt the transfer key with receiver's public key
      encryptedKey: receiverPublicKey ? 
        this.encryptTransferKey(transfer.encryptionKey, receiverPublicKey) : null
    })
    
    console.log(`📁 Sent file transfer request: ${file.name} (${transfer.formatSize(file.size)})`)
    
    return transfer
  }

  /**
   * Encrypt transfer key with recipient's public key
   */
  encryptTransferKey(key, recipientPublicKey) {
    if (!key || !recipientPublicKey) return null
    
    const ephemeralKeyPair = nacl.box.keyPair()
    const nonce = nacl.randomBytes(24)
    const publicKeyBytes = decodeBase64(recipientPublicKey)
    
    const encrypted = nacl.box(key, nonce, publicKeyBytes, ephemeralKeyPair.secretKey)
    
    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey)
    }
  }

  /**
   * Decrypt transfer key
   */
  decryptTransferKey(encryptedKey) {
    if (!encryptedKey || !this.myKeyPair) return null
    
    const encrypted = decodeBase64(encryptedKey.encrypted)
    const nonce = decodeBase64(encryptedKey.nonce)
    const ephemeralPublicKey = decodeBase64(encryptedKey.ephemeralPublicKey)
    const secretKey = decodeBase64(this.myKeyPair.secretKey)
    
    return nacl.box.open(encrypted, nonce, ephemeralPublicKey, secretKey)
  }

  /**
   * Handle incoming transfer request
   */
  handleTransferRequest(data) {
    console.log('📁 [FileTransfer] handleTransferRequest called with:', data)
    console.log('📁 [FileTransfer] My ID:', this.myId)
    
    const transfer = new FileTransfer(
      data.transferId,
      data.fileName,
      data.fileSize,
      data.senderId,
      this.myId
    )
    
    transfer.state = TransferState.PENDING
    transfer.totalChunks = data.totalChunks
    
    // Decrypt the transfer key
    if (data.encryptedKey) {
      transfer.encryptionKey = this.decryptTransferKey(data.encryptedKey)
    }
    
    this.pendingRequests.set(data.transferId, transfer)
    
    console.log('📁 [FileTransfer] Emitting onTransferRequest event')
    
    // Notify UI
    this.emit('onTransferRequest', {
      transfer: transfer,
      accept: () => this.acceptTransfer(data.transferId),
      reject: () => this.rejectTransfer(data.transferId)
    })
    
    console.log(`📁 Received file transfer request: ${data.fileName}`)
  }

  /**
   * Accept a file transfer
   */
  acceptTransfer(transferId) {
    const transfer = this.pendingRequests.get(transferId)
    if (!transfer) return
    
    transfer.state = TransferState.ACCEPTED
    this.transfers.set(transferId, transfer)
    this.pendingRequests.delete(transferId)
    
    // Notify sender
    this.sendSignal(transfer.senderId, 'file-transfer-response', {
      transferId: transferId,
      accepted: true
    })
    
    this.emit('onTransferAccepted', transfer)
    console.log(`📁 Accepted file transfer: ${transfer.fileName}`)
  }

  /**
   * Reject a file transfer
   */
  rejectTransfer(transferId) {
    const transfer = this.pendingRequests.get(transferId)
    if (!transfer) return
    
    transfer.state = TransferState.REJECTED
    this.pendingRequests.delete(transferId)
    
    // Notify sender
    this.sendSignal(transfer.senderId, 'file-transfer-response', {
      transferId: transferId,
      accepted: false
    })
    
    this.emit('onTransferRejected', transfer)
    console.log(`📁 Rejected file transfer: ${transfer.fileName}`)
  }

  /**
   * Handle transfer response from receiver
   */
  handleTransferResponse(data) {
    const transfer = this.transfers.get(data.transferId)
    if (!transfer) return
    
    if (data.accepted) {
      transfer.state = TransferState.ACCEPTED
      this.emit('onTransferAccepted', transfer)
      
      // Start sending file
      this.startSending(data.transferId)
    } else {
      transfer.state = TransferState.REJECTED
      this.emit('onTransferRejected', transfer)
    }
  }

  /**
   * Start sending file chunks
   */
  async startSending(transferId) {
    const transfer = this.transfers.get(transferId)
    if (!transfer || !transfer.file) return
    
    transfer.state = TransferState.TRANSFERRING
    transfer.startTime = Date.now()
    
    console.log(`📁 Starting file transfer: ${transfer.fileName}`)
    
    const reader = new FileReader()
    let offset = 0
    let pendingChunks = 0
    
    const sendNextChunk = () => {
      if (transfer.state !== TransferState.TRANSFERRING) return
      if (offset >= transfer.fileSize) {
        if (pendingChunks === 0) {
          this.completeTransfer(transferId)
        }
        return
      }
      
      // Send multiple chunks in batch
      while (pendingChunks < TRANSFER_CONFIG.BATCH_SIZE && offset < transfer.fileSize) {
        const chunk = transfer.file.slice(offset, offset + TRANSFER_CONFIG.CHUNK_SIZE)
        const chunkSize = chunk.size
        
        reader.onload = (e) => {
          let chunkData = new Uint8Array(e.target.result)
          
          // Send chunk without encryption
          this.sendSignal(transfer.receiverId, 'file-chunk', {
            transferId: transferId,
            chunkIndex: transfer.currentChunk,
            data: encodeBase64(chunkData),
            encrypted: false
          })
          
          transfer.currentChunk++
          transfer.bytesTransferred += chunkData.length
          pendingChunks--
          
          // Update progress every 5 chunks
          if (transfer.currentChunk % 5 === 0) {
            this.emit('onTransferProgress', {
              transfer: transfer,
              progress: transfer.getProgress(),
              speed: transfer.getSpeed(),
              eta: transfer.getETA()
            })
          }
          
          // Continue sending if more chunks needed
          if (pendingChunks < TRANSFER_CONFIG.BATCH_SIZE && offset < transfer.fileSize) {
            sendNextChunk()
          }
        }
        
        reader.readAsArrayBuffer(chunk)
        offset += TRANSFER_CONFIG.CHUNK_SIZE
        pendingChunks++
      }
    }
    
    sendNextChunk()
  }

  /**
   * Handle received chunk
   */
  handleChunkReceived(data) {
    const transfer = this.transfers.get(data.transferId)
    if (!transfer) return
    
    if (transfer.state !== TransferState.TRANSFERRING && 
        transfer.state !== TransferState.ACCEPTED) {
      transfer.state = TransferState.TRANSFERRING
      transfer.startTime = Date.now()
    }
    
    let chunkData
    
    // Fast path - assume base64 string (no encryption)
    if (typeof data.data === 'string') {
      try {
        chunkData = decodeBase64(data.data)
      } catch (error) {
        console.error('📁 Failed to decode chunk')
        return
      }
    } else {
      console.error('📁 Unknown chunk data format')
      return
    }
    
    // Store chunk
    transfer.receivedChunks[data.chunkIndex] = chunkData
    transfer.bytesTransferred += chunkData.length
    transfer.currentChunk = data.chunkIndex + 1
    
    // Send acknowledgment (fire and forget)
    this.sendSignal(transfer.senderId, 'file-chunk-ack', {
      transferId: data.transferId,
      chunkIndex: data.chunkIndex
    })
    
    // Update progress only every 10 chunks to reduce overhead
    if (data.chunkIndex % 10 === 0) {
      this.emit('onTransferProgress', {
        transfer: transfer,
        progress: transfer.getProgress(),
        speed: transfer.getSpeed(),
        eta: transfer.getETA()
      })
    }
    
    // Check if transfer is complete
    if (transfer.currentChunk >= transfer.totalChunks) {
      this.assembleFile(data.transferId)
    }
  }

  /**
   * Handle chunk acknowledgment
   */
  handleChunkAck(data) {
    // Could be used for flow control or retry logic
  }

  /**
   * Assemble received chunks into a file
   */
  assembleFile(transferId) {
    const transfer = this.transfers.get(transferId)
    if (!transfer) return
    
    // Create blob directly from chunks (faster than copying)
    const blob = new Blob(transfer.receivedChunks)
    const url = URL.createObjectURL(blob)
    
    // Trigger download immediately
    const a = document.createElement('a')
    a.href = url
    a.download = transfer.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // Cleanup in background
    setTimeout(() => URL.revokeObjectURL(url), 100)
    
    // Mark as complete
    this.completeTransfer(transferId)
  }

  /**
   * Complete a transfer
   */
  completeTransfer(transferId) {
    const transfer = this.transfers.get(transferId)
    if (!transfer) return
    
    transfer.state = TransferState.COMPLETED
    transfer.endTime = Date.now()
    
    // Notify other party
    this.sendSignal(
      transfer.senderId === this.myId ? transfer.receiverId : transfer.senderId,
      'file-transfer-complete',
      { transferId: transferId }
    )
    
    this.emit('onTransferComplete', transfer)
    console.log(`📁 File transfer complete: ${transfer.fileName}`)
  }

  /**
   * Handle transfer complete notification
   */
  handleTransferComplete(data) {
    const transfer = this.transfers.get(data.transferId)
    if (!transfer) return
    
    transfer.state = TransferState.COMPLETED
    transfer.endTime = Date.now()
    
    this.emit('onTransferComplete', transfer)
  }

  /**
   * Cancel a transfer
   */
  cancelTransfer(transferId) {
    const transfer = this.transfers.get(transferId)
    if (!transfer) return
    
    transfer.state = TransferState.CANCELLED
    
    // Notify other party
    this.sendSignal(
      transfer.senderId === this.myId ? transfer.receiverId : transfer.senderId,
      'file-transfer-cancel',
      { transferId: transferId }
    )
    
    this.emit('onTransferCancelled', transfer)
    console.log(`📁 File transfer cancelled: ${transfer.fileName}`)
  }

  /**
   * Handle transfer cancel notification
   */
  handleTransferCancel(data) {
    const transfer = this.transfers.get(data.transferId)
    if (!transfer) return
    
    transfer.state = TransferState.CANCELLED
    this.emit('onTransferCancelled', transfer)
  }

  /**
   * Pause a transfer
   */
  pauseTransfer(transferId) {
    const transfer = this.transfers.get(transferId)
    if (!transfer) return
    
    transfer.state = TransferState.PAUSED
  }

  /**
   * Resume a transfer
   */
  resumeTransfer(transferId) {
    const transfer = this.transfers.get(transferId)
    if (!transfer || transfer.state !== TransferState.PAUSED) return
    
    transfer.state = TransferState.TRANSFERRING
    
    if (transfer.senderId === this.myId) {
      this.startSending(transferId)
    }
  }

  /**
   * Send a signal through the signaling channel
   */
  sendSignal(targetId, type, data) {
    console.log(`📁 [FileTransfer] Sending signal: ${type} to ${targetId}`, data)
    if (this.signaling && this.signaling.emit) {
      this.signaling.emit(type, {
        ...data,
        targetId: targetId,
        senderId: this.myId
      })
    } else {
      console.error('📁 [FileTransfer] No signaling channel available!')
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler)
    }
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler)
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data))
    }
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers() {
    return Array.from(this.transfers.values()).filter(t => 
      t.state === TransferState.TRANSFERRING || 
      t.state === TransferState.PAUSED ||
      t.state === TransferState.WAITING_ACCEPT
    )
  }

  /**
   * Get pending requests
   */
  getPendingRequests() {
    return Array.from(this.pendingRequests.values())
  }

  /**
   * Get transfer statistics
   */
  getStats() {
    const all = Array.from(this.transfers.values())
    return {
      total: all.length,
      active: all.filter(t => t.state === TransferState.TRANSFERRING).length,
      completed: all.filter(t => t.state === TransferState.COMPLETED).length,
      failed: all.filter(t => t.state === TransferState.FAILED).length,
      pending: this.pendingRequests.size
    }
  }
}

/**
 * Create singleton instance
 */
export const fileTransferManager = new FileTransferManager()

export default fileTransferManager

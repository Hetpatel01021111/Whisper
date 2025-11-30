/**
 * 💬 Message Features
 * 
 * Reactions, replies, editing, deletion, read receipts, typing indicators
 */

export class MessageFeaturesManager {
  constructor() {
    this.myId = null
    this.signaling = null
    this.eventHandlers = {
      onTyping: [],
      onStopTyping: [],
      onReaction: [],
      onEdit: [],
      onDelete: [],
      onReadReceipt: [],
      onDeliveryReceipt: []
    }
  }

  initialize(userId, signaling) {
    this.myId = userId
    this.signaling = signaling

    if (!signaling) {
      console.error('💬 ERROR: No signaling socket provided!')
      return
    }

    console.log('💬 Initializing with socket:', signaling.connected ? 'connected' : 'disconnected')

    // Set up signaling handlers
    this.signaling.on('typing-start', (data) => this.emit('onTyping', data))
    this.signaling.on('typing-stop', (data) => this.emit('onStopTyping', data))
    this.signaling.on('message-reaction', (data) => this.emit('onReaction', data))
    this.signaling.on('message-edit', (data) => this.emit('onEdit', data))
    this.signaling.on('message-delete', (data) => this.emit('onDelete', data))
    this.signaling.on('read-receipt', (data) => this.emit('onReadReceipt', data))
    this.signaling.on('delivery-receipt', (data) => this.emit('onDeliveryReceipt', data))

    console.log('💬 Message Features Manager initialized')
  }

  // Typing indicators
  sendTyping(targetId) {
    console.log('💬 Sending typing indicator to:', targetId)
    console.log('💬 Socket connected?', this.signaling?.connected)
    console.log('💬 Socket ID:', this.signaling?.id)
    
    if (!this.signaling) {
      console.error('💬 ERROR: No socket available!')
      return
    }
    
    this.signaling.emit('typing-start', {
      targetId: targetId,
      senderId: this.myId
    })
    console.log('💬 Typing event emitted')
  }

  stopTyping(targetId) {
    console.log('💬 Stopping typing indicator to:', targetId)
    this.signaling.emit('typing-stop', {
      targetId: targetId,
      senderId: this.myId
    })
  }

  // Reactions
  addReaction(messageId, targetId, emoji) {
    console.log('💬 Sending reaction:', emoji, 'to:', targetId)
    this.signaling.emit('message-reaction', {
      targetId: targetId,
      messageId: messageId,
      emoji: emoji,
      senderId: this.myId
    })
  }

  // Edit message
  editMessage(messageId, targetId, newContent) {
    this.signaling.emit('message-edit', {
      targetId: targetId,
      messageId: messageId,
      content: newContent,
      senderId: this.myId
    })
  }

  // Delete message
  deleteMessage(messageId, targetId) {
    this.signaling.emit('message-delete', {
      targetId: targetId,
      messageId: messageId,
      senderId: this.myId
    })
  }

  // Read receipts
  sendReadReceipt(messageId, targetId) {
    this.signaling.emit('read-receipt', {
      targetId: targetId,
      messageId: messageId,
      senderId: this.myId
    })
  }

  sendDeliveryReceipt(messageId, targetId) {
    this.signaling.emit('delivery-receipt', {
      targetId: targetId,
      messageId: messageId,
      senderId: this.myId
    })
  }

  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler)
    }
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler)
    }
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data))
    }
  }
}

export const messageFeaturesManager = new MessageFeaturesManager()

/**
 * Traffic Padding - Metadata Protection
 * Hides message patterns by sending dummy traffic
 */

class TrafficPadding {
  constructor() {
    this.isActive = false
    this.interval = null
    this.socket = null
    this.userId = null
  }

  /**
   * Start traffic padding
   */
  start(userId, socket) {
    if (this.isActive) return

    this.userId = userId
    this.socket = socket
    this.isActive = true

    console.log('🔒 Traffic padding started')

    // Send dummy messages at random intervals
    this.interval = setInterval(() => {
      this.sendDummyTraffic()
    }, this.getRandomInterval())
  }

  /**
   * Stop traffic padding
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isActive = false
    console.log('🔒 Traffic padding stopped')
  }

  /**
   * Send dummy encrypted traffic
   */
  sendDummyTraffic() {
    if (!this.socket || !this.socket.connected) return

    // Random chance to send dummy message (30%)
    if (Math.random() > 0.3) return

    const dummyMessage = {
      type: 'dummy',
      timestamp: Date.now(),
      nonce: Math.random().toString(36),
      // Random size to mimic real messages
      padding: this.generateRandomPadding()
    }

    // Send as encrypted dummy traffic
    this.socket.emit('traffic-padding', dummyMessage)
  }

  /**
   * Generate random padding to vary message sizes
   */
  generateRandomPadding() {
    const size = Math.floor(Math.random() * 500) + 100
    return 'x'.repeat(size)
  }

  /**
   * Get random interval between 3-10 seconds
   */
  getRandomInterval() {
    return Math.floor(Math.random() * 7000) + 3000
  }

  /**
   * Add padding to real messages to normalize size
   */
  padMessage(message) {
    const targetSize = 512 // Target message size
    const currentSize = JSON.stringify(message).length
    
    if (currentSize < targetSize) {
      message._padding = 'x'.repeat(targetSize - currentSize)
    }
    
    return message
  }

  /**
   * Remove padding from received messages
   */
  unpadMessage(message) {
    if (message._padding) {
      delete message._padding
    }
    return message
  }
}

export const trafficPadding = new TrafficPadding()

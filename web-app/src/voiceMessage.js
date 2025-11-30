/**
 * 🎤 Voice Message Recording
 * 
 * Record and send voice messages using MediaRecorder API
 */

export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null
    this.audioChunks = []
    this.stream = null
    this.startTime = null
    this.isRecording = false
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(this.stream)
      this.audioChunks = []
      this.startTime = Date.now()
      this.isRecording = true

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data)
      }

      this.mediaRecorder.start()
      console.log('🎤 Recording started')
      return true
    } catch (error) {
      console.error('🎤 Failed to start recording:', error)
      return false
    }
  }

  async stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null)
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        this.stream.getTracks().forEach(track => track.stop())
        this.isRecording = false
        console.log('🎤 Recording stopped')
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  getDuration() {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.stream.getTracks().forEach(track => track.stop())
      this.audioChunks = []
      this.isRecording = false
    }
  }
}

export const voiceRecorder = new VoiceRecorder()

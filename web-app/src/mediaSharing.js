/**
 * 📷 Media Sharing System
 * Photos, videos, GIFs, location, contacts
 */

import { encodeBase64 } from 'tweetnacl-util'

// Max file sizes
const MAX_IMAGE_SIZE = 16 * 1024 * 1024  // 16MB
const MAX_VIDEO_SIZE = 64 * 1024 * 1024  // 64MB
const MAX_GIF_SIZE = 5 * 1024 * 1024     // 5MB

/**
 * Compress image before sending
 */
export async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        resolve({
          blob,
          width,
          height,
          thumbnail: createThumbnail(canvas)
        })
      }, 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Create thumbnail for preview
 */
function createThumbnail(canvas, size = 100) {
  const thumbCanvas = document.createElement('canvas')
  const scale = size / Math.max(canvas.width, canvas.height)
  thumbCanvas.width = canvas.width * scale
  thumbCanvas.height = canvas.height * scale
  
  const ctx = thumbCanvas.getContext('2d')
  ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height)
  
  return thumbCanvas.toDataURL('image/jpeg', 0.5)
}

/**
 * Get video thumbnail
 */
export async function getVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      video.currentTime = 1 // Seek to 1 second
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      resolve({
        thumbnail: canvas.toDataURL('image/jpeg', 0.5),
        duration: Math.floor(video.duration),
        width: video.videoWidth,
        height: video.videoHeight
      })
      URL.revokeObjectURL(video.src)
    }
    video.src = URL.createObjectURL(file)
  })
}

/**
 * Convert file to base64
 */
export async function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}

/**
 * Get current location
 */
export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

/**
 * Format location for display
 */
export function formatLocation(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

/**
 * Get Google Maps URL
 */
export function getMapUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/**
 * Get static map image URL
 */
export function getStaticMapUrl(lat, lng, zoom = 15, size = '300x200') {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${lat},${lng}`
}

/**
 * Parse contact vCard
 */
export function parseVCard(vcard) {
  const lines = vcard.split('\n')
  const contact = {}
  
  for (const line of lines) {
    if (line.startsWith('FN:')) contact.name = line.substring(3)
    if (line.startsWith('TEL:')) contact.phone = line.substring(4)
    if (line.startsWith('EMAIL:')) contact.email = line.substring(6)
  }
  
  return contact
}

/**
 * Create vCard from contact
 */
export function createVCard(contact) {
  return `BEGIN:VCARD
VERSION:3.0
FN:${contact.name || ''}
TEL:${contact.phone || ''}
EMAIL:${contact.email || ''}
END:VCARD`
}

/**
 * Fetch GIF from Giphy (requires API key)
 */
export async function searchGifs(query, apiKey, limit = 20) {
  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}`
    )
    const data = await response.json()
    return data.data.map(gif => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      preview: gif.images.fixed_height_small.url,
      width: gif.images.fixed_height.width,
      height: gif.images.fixed_height.height
    }))
  } catch (error) {
    console.error('Failed to fetch GIFs:', error)
    return []
  }
}

/**
 * Validate file size
 */
export function validateFileSize(file, type) {
  const maxSizes = {
    image: MAX_IMAGE_SIZE,
    video: MAX_VIDEO_SIZE,
    gif: MAX_GIF_SIZE
  }
  
  const maxSize = maxSizes[type] || MAX_IMAGE_SIZE
  return file.size <= maxSize
}

/**
 * Get file type from mime
 */
export function getFileType(mimeType) {
  if (mimeType.startsWith('image/gif')) return 'gif'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

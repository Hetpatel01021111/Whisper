import React, { useState } from 'react'

// Sample GIF URLs (in production, you'd use Giphy API)
const TRENDING_GIFS = [
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif',
  'https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/giphy.gif',
  'https://media.giphy.com/media/3o7absbD7PbTFQa0c8/giphy.gif',
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
]

export default function GifPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')

  return (
    <div style={{
      position: 'absolute',
      bottom: '70px',
      left: '16px',
      right: '16px',
      maxWidth: '400px',
      background: '#1a1a1a',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 100,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ color: '#fff', fontWeight: 'bold' }}>GIFs</div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0'
          }}
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <input
          type="text"
          placeholder="Search GIFs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#333',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#fff',
            fontSize: '14px'
          }}
        />
      </div>

      {/* GIF Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        padding: '0 12px 12px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {TRENDING_GIFS.map((gif, index) => (
          <div
            key={index}
            onClick={() => {
              onSelect(gif)
              onClose()
            }}
            style={{
              aspectRatio: '1',
              background: '#333',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '12px'
            }}
          >
            GIF {index + 1}
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #333',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
        Powered by GIPHY
      </div>
    </div>
  )
}

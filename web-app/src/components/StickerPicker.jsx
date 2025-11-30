import React from 'react'

// Sample sticker packs
const STICKER_PACKS = {
  'Reactions': ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '💯', '✨', '⭐'],
  'Animals': ['🐶', '🐱', '🐼', '🦊', '🐻', '🐨', '🦁', '🐯', '🐸', '🐵', '🦄', '🐙'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍪', '🍩', '🍦', '🍫'],
  'Celebration': ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🎆', '🎇', '✨', '🎯', '🏆', '🥇']
}

export default function StickerPicker({ onSelect, onClose }) {
  const [activePack, setActivePack] = React.useState('Reactions')

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
        <div style={{ color: '#fff', fontWeight: 'bold' }}>Stickers</div>
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

      {/* Pack Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid #333',
        overflowX: 'auto'
      }}>
        {Object.keys(STICKER_PACKS).map(pack => (
          <button
            key={pack}
            onClick={() => setActivePack(pack)}
            style={{
              background: activePack === pack ? '#00a8ff' : '#333',
              color: activePack === pack ? '#000' : '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {pack}
          </button>
        ))}
      </div>

      {/* Sticker Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        padding: '16px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {STICKER_PACKS[activePack].map((sticker, index) => (
          <button
            key={index}
            onClick={() => {
              onSelect(sticker)
              onClose()
            }}
            style={{
              background: '#333',
              border: 'none',
              fontSize: '48px',
              cursor: 'pointer',
              padding: '16px',
              borderRadius: '12px',
              transition: 'transform 0.2s, background 0.2s',
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#444'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#333'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {sticker}
          </button>
        ))}
      </div>
    </div>
  )
}

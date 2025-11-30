import React, { useState } from 'react'

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩']
}

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Smileys')

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
        <div style={{ color: '#fff', fontWeight: 'bold' }}>Emojis</div>
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

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid #333',
        overflowX: 'auto'
      }}>
        {Object.keys(EMOJI_CATEGORIES).map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            style={{
              background: activeCategory === category ? '#00a8ff' : '#333',
              color: activeCategory === category ? '#000' : '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '8px',
        padding: '12px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

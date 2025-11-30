import React from 'react'

export default function ConversationList({ conversations, onSelectConversation, onNewChat }) {
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now - time
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="conversation-item"
          onClick={() => onSelectConversation(conv)}
        >
          <div className="conversation-avatar">
            {getInitials(conv.displayName)}
          </div>
          <div className="conversation-content">
            <div className="conversation-header">
              <span className="conversation-name">{conv.displayName}</span>
              {conv.lastMessage && (
                <span className="conversation-time">
                  {getTimeAgo(conv.lastMessage.timestamp)}
                </span>
              )}
            </div>
            {conv.lastMessage && (
              <div className="conversation-preview">
                {conv.lastMessage.content}
              </div>
            )}
          </div>
          {conv.unreadCount > 0 && (
            <div className="conversation-badge">{conv.unreadCount}</div>
          )}
        </div>
      ))}
    </div>
  )
}

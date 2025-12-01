---
inclusion: always
---

# Eclipse Project Context

## Project Overview
Eclipse is an anonymous, end-to-end encrypted messaging application built with privacy as the core principle. It uses Signal Protocol for encryption, WebSocket for real-time communication, and implements onion routing for metadata protection.

## Technology Stack

### Frontend (web-app/)
- **Framework**: React with Vite
- **Styling**: Custom CSS with modern design
- **Encryption**: Signal Protocol implementation
- **Real-time**: Socket.io client
- **Storage**: Browser IndexedDB for keys

### Backend (backend/)
- **Runtime**: Node.js with Express
- **WebSocket**: Socket.io server
- **Storage**: JSON file-based (no database for privacy)
- **Architecture**: Modular design with separate concerns

### API Layer (api/)
- **Serverless**: Vercel serverless functions
- **Authentication**: Cryptographic key-based
- **Endpoints**: RESTful design

## Project Structure
```
Eclipse/
├── web-app/          # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── crypto.js     # Encryption implementation
│   │   ├── socket.js     # WebSocket client
│   │   └── privacyNetwork.js  # Onion routing
├── backend/          # Node.js backend server
│   ├── modules/      # Feature modules
│   ├── config/       # Configuration
│   └── server.js     # Main server file
├── api/              # Serverless API functions
└── .kiro/            # Kiro AI development files
```

## Key Features
1. **Anonymous Authentication**: No email/phone required, cryptographic keys only
2. **E2E Encryption**: Signal Protocol with forward secrecy
3. **Self-Destructing Messages**: Timer-based automatic deletion
4. **Privacy Network**: Onion routing + P2P connections
5. **File Transfer**: Encrypted file sharing
6. **Zero-Knowledge**: Server cannot read messages

## Development Workflow
- Frontend runs on Vite dev server (port 5173)
- Backend runs on Express server (port 3001)
- Use `npm run dev` in respective directories
- Deploy frontend to Vercel, backend to Railway/Render

## Important Files
- `web-app/src/crypto.js` - Core encryption logic
- `backend/modules/messages/` - Message routing
- `web-app/src/privacyNetwork.js` - Privacy features
- `api/auth/` - Authentication endpoints

## Security Considerations
- All encryption happens client-side
- Private keys never leave the device
- Server only sees encrypted payloads
- No logging of sensitive information
- Constant-time comparisons for crypto operations

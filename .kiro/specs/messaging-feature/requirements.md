# Eclipse Messaging Feature Requirements

## Overview
End-to-end encrypted messaging system with privacy-first architecture.

## Acceptance Criteria

### AC1: End-to-End Encryption
- All messages must be encrypted using Signal Protocol
- Keys must be generated locally and never transmitted to server
- Each conversation must have unique encryption keys

### AC2: Anonymous Identity
- Users identified by cryptographic keys, not personal information
- No email, phone number, or personal data required
- Access keys are 32-character cryptographic identifiers

### AC3: Real-time Messaging
- Messages delivered in real-time via WebSocket
- Support for text messages and file transfers
- Message status indicators (sent, delivered)

### AC4: Privacy Network
- Onion routing for metadata protection
- P2P connections when possible
- No message content stored on server

### AC5: Self-Destructing Messages
- Optional message timers (30s, 5min, 1hr, 24hr, 7days)
- Messages automatically deleted after timer expires
- Timer visible to both sender and receiver

## Non-Functional Requirements
- Messages encrypted/decrypted in <100ms
- Support 1000+ concurrent connections
- Zero-knowledge architecture (server cannot read messages)

---
inclusion: always
---

# Privacy Guidelines for Eclipse

## Core Privacy Principles

### Zero-Knowledge Architecture
- Server must never have access to message content
- All encryption/decryption happens client-side
- Server only routes encrypted payloads

### Minimal Data Collection
- No email, phone, or personal information required
- No analytics or tracking
- No message content stored on server
- Temporary message queue only (deleted after delivery)

### User Control
- Users control their own keys
- Self-destructing messages available
- No forced data retention
- Easy account deletion

## Implementation Guidelines

### When Adding New Features
1. Ask: "Does this feature require collecting user data?"
2. If yes, can it work without that data?
3. If data is needed, is it encrypted end-to-end?
4. Is the data deleted as soon as possible?

### Data Storage Rules
- **Client-side**: Encryption keys, user preferences, message history
- **Server-side**: Encrypted message queue (temporary), connection metadata (minimal)
- **Never store**: Message content, private keys, user personal information

### Network Privacy
- Use onion routing for metadata protection
- Prefer P2P connections when possible
- Minimize server-side logging
- No IP address correlation with user identity

## Code Review Checklist
- [ ] No plaintext messages sent over network
- [ ] No sensitive data in console.log statements
- [ ] Keys generated with cryptographically secure random
- [ ] Private keys never leave client device
- [ ] User data encrypted at rest
- [ ] Minimal metadata exposed to server

## Privacy-First UI/UX
- Make privacy features visible and understandable
- Default to most private settings
- Explain privacy implications clearly
- No dark patterns that compromise privacy

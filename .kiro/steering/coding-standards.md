# Eclipse Coding Standards

## General Principles
- Privacy and security are top priorities
- Code must be auditable and transparent
- Performance matters for encryption operations
- User experience should be seamless

## JavaScript/React Standards

### Code Style
- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names
- Keep functions small and focused

### Security Guidelines
- Never log sensitive data (keys, messages)
- Validate all user inputs
- Use constant-time comparisons for crypto
- Clear sensitive data from memory when done

### React Best Practices
- Use `useState` for local state
- Use `useEffect` for side effects
- Memoize expensive computations
- Keep components focused on single responsibility

## Encryption Standards

### Key Management
- Generate keys client-side only
- Store keys in browser's IndexedDB
- Never transmit private keys
- Use secure random number generation

### Message Encryption
- Always encrypt before sending
- Use authenticated encryption (AEAD)
- Include version info in encrypted payload
- Handle decryption failures gracefully

## API Design

### Backend Endpoints
- RESTful design for CRUD operations
- WebSocket for real-time messaging
- No sensitive data in URLs or logs
- Rate limiting on all endpoints

### Error Handling
- Don't leak information in error messages
- Log errors server-side (without sensitive data)
- Provide user-friendly error messages
- Fail securely (deny by default)

## Testing Requirements
- Unit tests for all crypto functions
- Integration tests for message flow
- Security tests for authentication
- Performance tests for encryption speed

## Documentation
- Document all public APIs
- Explain security decisions
- Include usage examples
- Keep README up to date

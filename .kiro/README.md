# Eclipse .kiro Directory

This directory contains Kiro AI development artifacts including specs, hooks, and steering rules used during the development of Eclipse messenger.

## Directory Structure

### 📋 specs/
Contains feature specifications with requirements, design, and implementation tasks.

- **messaging-feature/** - Core messaging functionality
  - `requirements.md` - Acceptance criteria and functional requirements
  - `design.md` - Architecture, data flow, and security properties
  - `tasks.md` - Implementation tasks and status tracking

### 🪝 hooks/
Contains automated hooks that trigger during development workflow.

- `pre-commit-security-check.json` - Manual security review checklist
- `test-encryption.json` - Auto-runs tests when crypto files are modified

### 🎯 steering/
Contains coding standards and guidelines that steer AI development.

- `coding-standards.md` - JavaScript/React standards and security guidelines
- `privacy-guidelines.md` - Privacy-first development principles
- `project-context.md` - Project overview and technology stack

## How These Were Used

### Specs
The specs directory guided the development of Eclipse's core messaging features:
- Requirements defined what needed to be built (E2E encryption, anonymous auth, etc.)
- Design documented the architecture and security properties
- Tasks tracked implementation progress

### Hooks
Hooks automated quality checks during development:
- Security checks before commits to catch potential vulnerabilities
- Automatic test runs when encryption code was modified

### Steering
Steering rules ensured consistent, secure development:
- Coding standards maintained code quality and security practices
- Privacy guidelines enforced zero-knowledge architecture
- Project context provided AI with necessary background information

## Usage with Kiro AI

These files work with Kiro AI to:
1. **Guide Development**: Specs provide clear requirements and design
2. **Automate Checks**: Hooks trigger at appropriate times
3. **Maintain Standards**: Steering rules are automatically included in AI context

## License
This project is licensed under the MIT License - see the LICENSE file in the root directory.

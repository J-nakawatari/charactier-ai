# Charactier AI

AI-powered character chat service with token-based conversations and affinity system.

## Overview

Charactier AI is a web application that allows users to chat with AI-powered characters. Users purchase tokens to have conversations, and build affinity levels with characters to unlock exclusive content.

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript + MongoDB
- **AI**: OpenAI API (GPT-4o-mini)
- **Payment**: Stripe
- **Cache**: Redis
- **Deployment**: VPS (Xserver) + Nginx + PM2

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Stripe account (for payments)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development servers
npm run dev
```

## Development

- Frontend runs on http://localhost:3000
- Backend runs on http://localhost:5000
- See `CLAUDE.md` for development guidelines

## Testing

### E2E Test Coverage

```bash
# Generate test specs from checklist
npm run gen:specs

# Run E2E tests
npm run test:e2e

# View coverage report
npm run coverage:report
```

See `coverage/summary.json` for test coverage metrics.

## Documentation

- [Testing Checklist](docs/testing-checklist.md) - Comprehensive manual testing guide
- [99% Profit System](docs/99-percent-profit-system.md) - Token pricing architecture
- [Security Headers](docs/security-headers.md) - Security configuration
- [Rate Limiting](docs/rate-limiting.md) - API rate limit settings

## License

Proprietary - All rights reserved
### CI note — PROJECT env で単一ブラウザ指定可

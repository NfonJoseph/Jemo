# Jemo Platform

Online Marketplace with Hybrid Logistics for Cameroon.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL

## Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/jemo?schema=public

# Run database migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

## Development

**Start both services in separate terminals:**

```bash
# Terminal 1: Start API (NestJS) - http://localhost:3001
pnpm dev:api

# Terminal 2: Start web app (Next.js) - http://localhost:3000
pnpm dev:web
```

**Quick health check:**
```bash
curl http://localhost:3001/health        # Should return {"status":"ok"}
curl http://localhost:3001/health/db     # Check DB connection
```

## Database Commands

```bash
pnpm db:migrate   # Run migrations
pnpm db:generate  # Generate Prisma client
pnpm db:studio    # Open Prisma Studio
```

## Health Endpoints

- `GET /health` - API health check
- `GET /health/db` - Database connectivity check

## Project Structure

```
jemo-platform/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared types
├── prisma/
│   └── schema.prisma
└── README.md
```

## Documentation

See `JEMO_PROJECT_SPEC.md` for full project specification.

# LayerCake MVP - Setup Guide

This guide will help you set up and run the LayerCake web application locally.

## Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/products/docker-desktop/))
- **PostgreSQL** 16+ (via Docker or local install)
- **Redis** 7+ (via Docker or local install)
- **Git**

## Project Structure

```
LayerCake/
├── backend/              # NestJS API
│   ├── src/             # Source code
│   ├── prisma/          # Database schema & migrations
│   └── package.json
├── frontend/            # React + Vite
│   ├── src/            # Source code
│   └── package.json
├── docker/             # Docker configurations
│   └── nginx/          # Nginx config
├── docker-compose.yml  # Production stack
├── docker-compose.dev.yml  # Development overrides
└── .env.example        # Environment template
```

---

## Quick Start (Docker Compose)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repo-url>
cd LayerCake

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

### 2. Required Environment Variables

At minimum, set these in `.env`:

```bash
# Database
DATABASE_URL=postgresql://layercake:your_password_here@postgres:5432/layercake
POSTGRES_PASSWORD=your_password_here

# JWT
JWT_SECRET=your-secret-key-here-change-in-production

# AI APIs (at least one required)
CLAUDE_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
```

### 3. Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

This will start:
- **Frontend**: http://localhost (via Nginx)
- **Backend API**: http://localhost/api
- **API Docs**: http://localhost/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend npm run prisma:migrate

# Seed database (creates test user)
docker-compose exec backend npm run prisma:seed
```

### 5. Test Login

- Email: `test@layercake.dev`
- Password: `password123`

---

## Development Setup (Without Docker)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start PostgreSQL and Redis

**Option A: Using Docker**
```bash
docker run -d \
  --name layercake-postgres \
  -e POSTGRES_DB=layercake \
  -e POSTGRES_USER=layercake \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d \
  --name layercake-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option B: Local Install**
```bash
# macOS (with Homebrew)
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Ubuntu/Debian
sudo apt install postgresql-16 redis-server
sudo systemctl start postgresql
sudo systemctl start redis
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Update database URL for local setup
DATABASE_URL=postgresql://layercake:password@localhost:5432/layercake
REDIS_URL=redis://localhost:6379
```

### 4. Initialize Database

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend API
cd backend
npm run start:dev

# Terminal 2: WebSocket Server
cd backend
npm run start:websocket

# Terminal 3: Worker
cd backend
node dist/jobs/worker.js

# Terminal 4: Frontend
cd frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- API Docs: http://localhost:3000/api/docs

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key-here` |
| `CLAUDE_API_KEY` | Anthropic API key | `sk-ant-your-key` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-your-key` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend API port | `3000` |
| `WS_PORT` | WebSocket port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | - |
| `STRIPE_SECRET_KEY` | Stripe secret key | - |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | - |
| `R2_ACCESS_KEY` | Cloudflare R2 access key | - |
| `R2_SECRET_KEY` | Cloudflare R2 secret key | - |

---

## Common Commands

### Docker Compose

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose up --build backend

# Run command in container
docker-compose exec backend npm run prisma:studio
```

### Backend

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio (GUI)
npm run prisma:seed        # Seed database

# Testing
npm run test               # Run tests
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests

# Linting
npm run lint               # Lint code
npm run format             # Format code
```

### Frontend

```bash
# Development
npm run dev

# Production
npm run build
npm run preview

# Testing
npm run test              # Run tests
npm run test:ui           # Vitest UI

# Linting
npm run lint
```

---

## Database Management

### Access Prisma Studio (GUI)

```bash
cd backend
npm run prisma:studio

# Opens at http://localhost:5555
```

### Create New Migration

```bash
cd backend

# After modifying schema.prisma
npm run prisma:migrate dev --name your_migration_name
```

### Reset Database (Development Only)

```bash
cd backend
npx prisma migrate reset
npm run prisma:seed
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://layercake:password@localhost:5432/layercake

# View logs
docker logs layercake-postgres
```

### Prisma Client Not Generated

```bash
cd backend
npm run prisma:generate
```

### Docker Build Fails

```bash
# Clean Docker cache
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose up --build
```

### Frontend Can't Connect to Backend

Check CORS configuration in `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

---

## Next Steps

1. **Set up AI API keys** in `.env`
2. **Configure GitHub OAuth** (optional, for GitHub login)
3. **Set up Stripe** (optional, for billing)
4. **Configure Cloudflare R2** (optional, for artifact storage)
5. **Deploy to Railway** (see deployment guide)

---

## Useful Links

- **Implementation Plan**: [.claude/plans/tingly-roaming-truffle.md](.claude/plans/tingly-roaming-truffle.md)
- **Build Status**: [MVP_BUILD_STATUS.md](MVP_BUILD_STATUS.md)
- **API Documentation**: http://localhost:3000/api/docs (when running)
- **Prisma Studio**: http://localhost:5555 (when running)

---

## Support

For issues or questions:
1. Check [MVP_BUILD_STATUS.md](MVP_BUILD_STATUS.md) for current progress
2. Review [Implementation Plan](.claude/plans/tingly-roaming-truffle.md)
3. Check Docker logs: `docker-compose logs -f`
4. Open an issue on GitHub

---

**Ready to build AI-powered applications! 🚀**

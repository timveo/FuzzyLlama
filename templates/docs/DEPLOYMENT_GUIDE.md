# Deployment Guide

> **Project:** {PROJECT_NAME}
> **Created:** {DATE}
> **Last Updated:** {DATE}

---

## Quick Reference

| Environment | URL | Branch | Deploy Command |
|-------------|-----|--------|----------------|
| Production | {PROD_URL} | `main` | `{DEPLOY_COMMAND}` |
| Staging | {STAGING_URL} | `develop` | `{STAGING_COMMAND}` |
| Local | http://localhost:3000 | Any | `docker-compose up` |

---

## Prerequisites

### Required Tools

```bash
# Check all required tools are installed
docker --version        # Docker 20.10+
docker-compose --version # Docker Compose 2.0+
git --version           # Git 2.30+
```

### Required Access

| Resource | Access Level | How to Get |
|----------|--------------|------------|
| Git repository | Write | Request from repo admin |
| Docker registry | Push | {REGISTRY_ACCESS_INSTRUCTIONS} |
| Production server | SSH | {SERVER_ACCESS_INSTRUCTIONS} |
| CI/CD pipeline | Trigger | Automatic on push |

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | No | Redis connection (if caching) | `redis://localhost:6379` |
| `API_KEY` | Yes | External API key | `sk-...` |
| `NODE_ENV` | Yes | Environment mode | `production` |

---

## Local Development

### First Time Setup

```bash
# 1. Clone repository
git clone {REPO_URL}
cd {PROJECT_NAME}

# 2. Copy environment file
cp .env.example .env
# Edit .env with local values

# 3. Start services
docker-compose up -d

# 4. Run database migrations (if applicable)
docker-compose exec app npx prisma migrate deploy

# 5. Verify
curl http://localhost:3000/health
```

### Daily Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Restart after code changes
docker-compose restart app

# Stop all services
docker-compose down
```

### Database Management

```bash
# Access database CLI
docker-compose exec db psql -U postgres -d app

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
docker-compose exec app npx prisma migrate reset

# Access database UI (if dev-tools profile enabled)
docker-compose --profile dev-tools up -d
# Then open http://localhost:8080
```

---

## Docker Compose Services

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| `app` | 3000 | Main application | `/health` |
| `db` | 5432 | PostgreSQL database | `pg_isready` |
| `redis` | 6379 | Cache/sessions | `redis-cli ping` |
| `adminer` | 8080 | Database UI (dev only) | N/A |

### Service Commands

```bash
# Start specific service
docker-compose up -d app

# Rebuild after Dockerfile changes
docker-compose build app
docker-compose up -d app

# View service status
docker-compose ps

# Check service logs
docker-compose logs -f [service-name]

# Execute command in running container
docker-compose exec app sh
```

---

## Staging Deployment

### Automatic (CI/CD)

Staging deploys automatically when:
- Push to `develop` branch
- CI/CD pipeline passes all checks

### Manual Deployment

```bash
# 1. Ensure on develop branch with latest changes
git checkout develop
git pull origin develop

# 2. Run pre-deployment checks
npm run build
npm run test
npm audit

# 3. Deploy to staging
{STAGING_DEPLOY_COMMAND}

# 4. Verify deployment
curl -s {STAGING_URL}/health
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing on `main` branch
- [ ] Security scan clean (`npm audit`)
- [ ] Build succeeds locally
- [ ] Database migrations reviewed (if any)
- [ ] Environment variables updated (if needed)
- [ ] Rollback plan confirmed
- [ ] Team notified of deployment window

### Deployment Steps

```bash
# 1. Create release tag
git checkout main
git pull origin main
git tag -a v{VERSION} -m "Release v{VERSION}"
git push origin v{VERSION}

# 2. Deploy to production
{PROD_DEPLOY_COMMAND}

# 3. Run database migrations (if needed)
{MIGRATION_COMMAND}

# 4. Verify deployment
curl -s {PROD_URL}/health

# 5. Run smoke tests
npm run test:smoke:prod
```

### Deployment Output

After successful deployment, capture:
- Deployment timestamp
- Version deployed
- Health check response
- Any warnings/notices

---

## Rollback Procedure

### Quick Rollback (< 5 minutes)

If issues detected immediately after deployment:

```bash
# 1. Revert to previous version
{ROLLBACK_COMMAND}

# 2. Verify rollback
curl -s {PROD_URL}/health

# 3. Notify team
# "Production rolled back to v{PREVIOUS_VERSION} due to {REASON}"
```

### Database Rollback

If database migrations need reverting:

```bash
# 1. Check migration status
npx prisma migrate status

# 2. Rollback last migration (if supported)
# WARNING: May cause data loss
npx prisma migrate resolve --rolled-back {MIGRATION_NAME}

# 3. Or restore from backup
# See OPERATIONS.md for backup restoration
```

### Rollback Decision Tree

```
Issue Detected
    │
    ├── Critical (site down)?
    │   └── Immediate rollback, then investigate
    │
    ├── High (feature broken)?
    │   └── Assess impact, rollback if > 5% users affected
    │
    └── Low (cosmetic)?
        └── Hotfix forward preferred
```

---

## Troubleshooting

### Deployment Fails

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `Build failed` | Code issue | Check build logs, fix locally |
| `Docker pull failed` | Registry auth | Re-authenticate with registry |
| `Health check timeout` | App not starting | Check app logs, env vars |
| `Migration failed` | DB schema conflict | Review migration, check DB state |

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs app

# Check if port is in use
lsof -i :3000

# Rebuild image
docker-compose build --no-cache app
```

**Database connection refused:**
```bash
# Check DB is running
docker-compose ps db

# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
docker-compose exec db pg_isready
```

**Memory issues:**
```bash
# Check container memory usage
docker stats

# Increase limits in docker-compose.yml
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

---

## Environment-Specific Configuration

### Development

```yaml
# docker-compose.override.yml (local only, gitignored)
services:
  app:
    volumes:
      - ./src:/app/src:ro  # Hot reload
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
```

### Staging

- Uses staging database
- Reduced resources
- Debug logging enabled
- Accessible to internal team only

### Production

- Uses production database with backups
- Full resource allocation
- Error-only logging
- Public accessible
- Monitoring enabled

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [OPERATIONS.md](./OPERATIONS.md) | Day-to-day operations, monitoring, troubleshooting |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and infrastructure |
| [POST_LAUNCH.md](./POST_LAUNCH.md) | Maintenance and evolution guide |

---

**Last reviewed:** {DATE}
**Next review:** {DATE + 3 months}

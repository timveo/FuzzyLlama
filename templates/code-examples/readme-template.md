# README Template

Standard README structure for generated projects. Agents should adapt this to the specific project.

---

## Template

```markdown
# {PROJECT_NAME}

{One-line description from VISION.md}

## Quick Start

### Prerequisites

- Node.js >= 20
- {Database if applicable}
- {Other requirements}

### Installation

```bash
git clone {repo-url}
cd {project-name}
npm install
cp .env.example .env  # Edit with your values
```

### Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `PORT` | Server port (default: 3000) | No |

### Running

```bash
# Development
npm run dev

# Production
npm run build && npm start

# Tests
npm test
```

## API Documentation

{Link to API docs or brief endpoint summary}

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| ... | ... | ... |

## Project Structure

```
src/
├── config/       # Configuration
├── middleware/   # Express middleware
├── routes/       # API routes
├── services/     # Business logic
├── repositories/ # Data access
├── types/        # TypeScript types
└── utils/        # Utilities
```

## Development

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### Database Migrations

```bash
npx prisma migrate dev    # Create/apply migrations
npx prisma generate       # Regenerate client
npx prisma studio         # Visual database browser
```

## Deployment

### Docker

```bash
docker-compose up -d
docker-compose exec api npx prisma migrate deploy
```

### Manual

1. Build: `npm run build`
2. Set production environment variables
3. Run migrations: `npx prisma migrate deploy`
4. Start: `npm start`

## License

{License type}
```

---

## Usage Notes

1. **Replace placeholders** in `{braces}` with project-specific values
2. **Add/remove sections** based on project type (frontend vs backend vs fullstack)
3. **Include actual endpoints** from PRD.md
4. **Match project structure** to actual directory layout

## Variations by Project Type

### Frontend Only
- Remove database/migration sections
- Add build output info
- Include deployment to Vercel/Netlify

### Backend API
- Full template as shown
- Add authentication details
- Include rate limiting info

### Fullstack
- Combine both
- Separate frontend/backend sections
- Include both deployment targets

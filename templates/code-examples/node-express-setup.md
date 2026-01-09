# Node.js/Express/TypeScript Setup

Reference implementation for backend projects using Node.js stack.

## Directory Structure

```
src/
├── config/
│   ├── database.ts        # DB connection
│   ├── env.ts             # Environment validation
│   └── constants.ts       # App constants
├── controllers/           # HTTP request handlers (thin)
├── middleware/
│   ├── auth.ts            # JWT verification
│   ├── validate.ts        # Request validation
│   ├── errorHandler.ts    # Global error handler
│   └── rateLimiter.ts     # Rate limiting
├── routes/                # URL → Controller mapping
├── services/              # Business logic (thick)
├── types/                 # TypeScript types
├── utils/
│   ├── logger.ts
│   └── errors.ts          # Custom error classes
├── validations/           # Zod schemas
├── app.ts                 # Express app setup
└── server.ts              # Entry point
```

## Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push"
  }
}
```

## Core Dependencies

```bash
# Core
npm install express cors helmet compression morgan dotenv
npm install @prisma/client jsonwebtoken bcryptjs zod
npm install express-rate-limit

# Dev
npm install -D typescript ts-node-dev @types/node @types/express
npm install -D prisma vitest supertest @types/supertest
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

## Environment Validation

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

## Express App Setup

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', routes);
app.use(errorHandler);

export default app;
```

## Custom Error Classes

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

## Global Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
```

## Test Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

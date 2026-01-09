# Express.js/Node.js Patterns

Reference implementations for backend projects using Express.js/Node.js.

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # App entry point
│   ├── app.ts                # Express app setup
│   ├── routes/               # Route handlers
│   │   ├── index.ts          # Route aggregator
│   │   ├── auth.routes.ts    # Auth routes
│   │   └── users.routes.ts   # User routes
│   ├── controllers/          # Request handlers
│   │   ├── auth.controller.ts
│   │   └── users.controller.ts
│   ├── services/             # Business logic
│   │   ├── auth.service.ts
│   │   └── users.service.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # JWT verification
│   │   ├── validate.ts       # Request validation
│   │   └── error.ts          # Error handler
│   ├── utils/                # Utilities
│   │   ├── logger.ts
│   │   └── response.ts
│   └── types/                # TypeScript types
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── tests/
└── package.json
```

## App Setup

```typescript
// src/app.ts
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './middleware/error';
import { routes } from './routes';
import { logger } from './utils/logger';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));

  // Request parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(pinoHttp({ logger }));

  // Health check
  app.get('/health', (_, res) => res.json({ status: 'ok' }));

  // API routes
  app.use('/api/v1', routes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
```

```typescript
// src/index.ts
import { createApp } from './app';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

const PORT = process.env.PORT || 3001;

async function main() {
  const app = createApp();

  // Verify database connection
  await prisma.$connect();
  logger.info('Database connected');

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
```

## Route Pattern

```typescript
// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, refreshSchema } from '../schemas/auth.schema';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', controller.logout);

export const authRoutes = router;
```

## Controller Pattern

```typescript
// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { LoginDTO, RegisterDTO } from '../schemas/auth.schema';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: RegisterDTO = req.body;
      const result = await this.authService.register(data);
      sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: LoginDTO = req.body;
      const result = await this.authService.login(data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      await this.authService.logout(refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
```

## Service Pattern

```typescript
// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { LoginDTO, RegisterDTO } from '../schemas/auth.schema';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days

  async register(data: RegisterDTO) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const tokens = await this.generateTokens(user.id);

    return { user, ...tokens };
  }

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(stored.userId);
  }

  async logout(token: string) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(userId: string) {
    const accessToken = jwt.sign({ sub: userId }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = crypto.randomUUID();
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + this.REFRESH_EXPIRES_IN),
      },
    });

    return { accessToken, refreshToken };
  }
}
```

## Middleware Patterns

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No token provided');
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'UNAUTHORIZED', 'Invalid token'));
    } else {
      next(error);
    }
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
};
```

### Validation Middleware

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', details);
      }
      next(error);
    }
  };
};
```

### Error Handler

```typescript
// src/middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(err, 'Request error');

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Don't leak internal errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```

## Utilities

### Response Helpers

```typescript
// src/utils/response.ts
import { Response } from 'express';

export const sendSuccess = <T>(res: Response, data: T, meta?: object) => {
  res.json({ success: true, data, ...(meta && { meta }) });
};

export const sendCreated = <T>(res: Response, data: T) => {
  res.status(201).json({ success: true, data });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
) => {
  res.json({
    success: true,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
};
```

### Custom Error Class

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### Logger

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
```

## Testing Patterns

```typescript
// tests/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';

const app = createApp();

describe('Auth API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong',
        });

      expect(res.status).toBe(401);
    });
  });
});
```

## Environment Configuration

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

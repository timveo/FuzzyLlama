# Authentication Service (Node.js/TypeScript)

Reference implementation for JWT-based authentication with refresh tokens.

## Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  firstName     String?   @map("first_name")
  lastName      String?   @map("last_name")
  role          Role      @default(USER)
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  refreshTokens RefreshToken[]
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("refresh_tokens")
}

enum Role {
  USER
  ADMIN
}
```

## Auth Service

```typescript
// src/services/authService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { UnauthorizedError, ConflictError } from '../utils/errors';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    return prisma.user.create({
      data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName },
    });
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(stored.user);
  }

  async logout(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async generateTokens(user: { id: string; email: string; role: string }) {
    const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  }
}

export const authService = new AuthService();
```

## Auth Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { UnauthorizedError } from '../utils/errors';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  try {
    const token = header.slice(7);
    req.user = authService.verifyToken(token);
    next();
  } catch {
    next(new UnauthorizedError('Invalid token'));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }
    next();
  };
};
```

## Auth Controller

```typescript
// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: { id: user.id, email: user.email, firstName: user.firstName },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await authService.login(req.body);
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, role: user.role },
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.userId);
      res.clearCookie('refreshToken');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
```

## Auth Routes

```typescript
// src/routes/authRoutes.ts
import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validations/authValidation';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, (req, res) => res.json({ success: true, data: req.user }));

export default router;
```

## Validation Schemas

```typescript
// src/validations/authValidation.ts
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});
```

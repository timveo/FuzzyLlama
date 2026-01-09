# Testing Patterns

Reference implementations for testing Node.js/TypeScript applications with Vitest.

---

## Setup

### Dependencies

```bash
npm install -D vitest supertest @types/supertest vitest-mock-extended
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts'],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

---

## Prisma Mocking

### Option 1: Mock Deep (Recommended for Unit Tests)

```typescript
// src/__tests__/setup.ts
import { beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import { prismaMock } from './prisma-mock';

beforeEach(() => {
  mockReset(prismaMock);
});
```

```typescript
// src/__tests__/prisma-mock.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export const prismaMock = mockDeep<PrismaClient>();

// Export for dependency injection
export default prismaMock;
```

```typescript
// src/lib/prisma.ts - Singleton pattern for DI
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

```typescript
// src/__tests__/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './prisma-mock';
import { userService } from '../services/user.service';

// Mock the prisma module
vi.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a user', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      passwordHash: 'hashed',
      role: 'member',
      createdAt: new Date(),
    };

    prismaMock.user.create.mockResolvedValue(mockUser);

    const result = await userService.create('test@example.com', 'password');

    expect(result.email).toBe('test@example.com');
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
  });

  it('should find user by email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await userService.findByEmail('notfound@example.com');

    expect(result).toBeNull();
  });
});
```

### Option 2: Test Database (Recommended for Integration Tests)

```typescript
// src/__tests__/integration/setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Use a test database URL
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}

export async function cleanupTestDatabase() {
  // Clean all tables
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
}

export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}
```

---

## API Testing with Supertest

### Basic Route Tests

```typescript
// src/__tests__/routes/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'new@example.com',
          password: 'securepassword123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'securepassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
    });
  });
});
```

### Authenticated Route Tests

```typescript
// src/__tests__/routes/projects.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { generateAccessToken } from '../../utils/jwt';

describe('Project Routes', () => {
  let authToken: string;

  beforeAll(() => {
    // Generate a test token
    authToken = generateAccessToken({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'member',
    });
  });

  describe('GET /projects', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/projects');

      expect(response.status).toBe(401);
    });

    it('should return projects for authenticated user', async () => {
      const response = await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /projects', () => {
    it('should create a project', async () => {
      const response = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'A test project',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Test Project');
    });
  });
});
```

---

## Test Utilities

### Factory Functions

```typescript
// src/__tests__/factories/user.factory.ts
import { User, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    passwordHash: faker.string.alphanumeric(60),
    role: 'member' as Role,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockUsers(count: number): User[] {
  return Array.from({ length: count }, () => createMockUser());
}
```

### Test Helpers

```typescript
// src/__tests__/helpers/auth.helper.ts
import { generateAccessToken } from '../../utils/jwt';
import { Role } from '@prisma/client';

export function getTestToken(role: Role = 'member'): string {
  return generateAccessToken({
    userId: 'test-user-id',
    email: 'test@example.com',
    role,
  });
}

export function getAdminToken(): string {
  return getTestToken('admin');
}

export function getViewerToken(): string {
  return getTestToken('viewer');
}
```

---

## Coverage Requirements

Per VERIFICATION_PROTOCOL.md:

| Project Type | Minimum Coverage |
|--------------|------------------|
| MVP | 60% |
| Production | 80% |
| Enterprise | 90% |

### Running Coverage

```bash
npm run test -- --coverage
```

### Coverage Report

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.23 |    78.45 |   90.12 |   84.56 |
 services/          |   92.34 |    85.67 |   95.00 |   91.23 |
 routes/            |   88.12 |    80.23 |   92.45 |   87.34 |
 middleware/        |   75.45 |    68.90 |   80.00 |   74.56 |
--------------------|---------|----------|---------|---------|
```

---

## E2E Test Count Requirements

Per VERIFICATION_PROTOCOL.md:

| Project Type | Minimum E2E Tests |
|--------------|-------------------|
| MVP | 3 |
| Production | 5 |
| Enterprise | 10+ |

E2E tests should cover:
1. Health check endpoint
2. User registration flow
3. User login flow
4. Main CRUD operations
5. Error handling scenarios

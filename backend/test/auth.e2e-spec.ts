import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean database before tests
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toMatchObject({
            email: 'test@example.com',
            name: 'Test User',
            planTier: 'FREE',
          });
          expect(res.body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject registration with existing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Duplicate User',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should reject registration with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: '123', // Too short
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject registration with missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          // Missing password and name
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('test@example.com');
        });
    });

    it('should reject login with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('should reject login with invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      refreshToken = response.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.refreshToken).not.toBe(refreshToken); // New token should be different
        });
    });

    it('should reject refresh with invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });

    it('should reject refresh with access token', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const accessToken = response.body.accessToken;

      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      accessToken = response.body.accessToken;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            email: 'test@example.com',
            name: 'Test User',
            planTier: 'FREE',
          });
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should logout successfully', async () => {
      // Decode JWT to get tokenId (in production, client would extract this)
      const payload = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString());

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tokenId: payload.jti })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Successfully logged out');
        });

      // Verify token is invalidated by trying to refresh
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should reject logout without token', () => {
      return request(app.getHttpServer()).post('/api/auth/logout').expect(401);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      accessToken = response.body.accessToken;
    });

    it('should logout all sessions successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Successfully logged out all sessions');
        });
    });

    it('should reject logout-all without token', () => {
      return request(app.getHttpServer()).post('/api/auth/logout-all').expect(401);
    });
  });

  describe('Token Rotation Security', () => {
    it('should invalidate old refresh token after rotation', async () => {
      // Login to get initial tokens
      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const oldRefreshToken = loginResponse.body.refreshToken;

      // Refresh to get new tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshResponse.status).toBe(200);

      // Try to use old refresh token again (should fail)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('revoked');
        });
    });
  });
});

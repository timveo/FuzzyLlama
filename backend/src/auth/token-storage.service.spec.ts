import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;
  let redis: jest.Mocked<Redis>;

  const mockRedis = {
    setex: jest.fn(),
    exists: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
    pipeline: jest.fn(() => ({
      setex: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenStorageService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6379',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenStorageService>(TokenStorageService);
    redis = mockRedis as any;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token with correct TTL', async () => {
      const userId = 'user-123';
      const tokenId = 'token-abc';
      const refreshToken = 'refresh.token.here';

      await service.storeRefreshToken(userId, tokenId, refreshToken);

      expect(redis.setex).toHaveBeenCalledWith(
        'refresh_token:user-123:token-abc',
        30 * 24 * 60 * 60, // 30 days in seconds
        refreshToken,
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true for valid non-blacklisted token', async () => {
      const userId = 'user-123';
      const tokenId = 'token-abc';

      redis.exists.mockResolvedValueOnce(1); // Token exists
      redis.exists.mockResolvedValueOnce(0); // Not blacklisted

      const result = await service.validateRefreshToken(userId, tokenId);

      expect(result).toBe(true);
      expect(redis.exists).toHaveBeenCalledTimes(2);
      expect(redis.exists).toHaveBeenCalledWith('refresh_token:user-123:token-abc');
      expect(redis.exists).toHaveBeenCalledWith('blacklist:token-abc');
    });

    it('should return false if token does not exist', async () => {
      const userId = 'user-123';
      const tokenId = 'token-abc';

      redis.exists.mockResolvedValueOnce(0); // Token does not exist

      const result = await service.validateRefreshToken(userId, tokenId);

      expect(result).toBe(false);
      expect(redis.exists).toHaveBeenCalledTimes(1);
    });

    it('should return false if token is blacklisted', async () => {
      const userId = 'user-123';
      const tokenId = 'token-abc';

      redis.exists.mockResolvedValueOnce(1); // Token exists
      redis.exists.mockResolvedValueOnce(1); // Is blacklisted

      const result = await service.validateRefreshToken(userId, tokenId);

      expect(result).toBe(false);
      expect(redis.exists).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateRefreshToken', () => {
    it('should delete token and add to blacklist', async () => {
      const userId = 'user-123';
      const tokenId = 'token-abc';

      await service.invalidateRefreshToken(userId, tokenId);

      expect(redis.del).toHaveBeenCalledWith('refresh_token:user-123:token-abc');
      expect(redis.setex).toHaveBeenCalledWith(
        'blacklist:token-abc',
        30 * 24 * 60 * 60,
        '1',
      );
    });
  });

  describe('invalidateAllUserTokens', () => {
    it('should invalidate all tokens for a user', async () => {
      const userId = 'user-123';
      const tokenKeys = [
        'refresh_token:user-123:token-1',
        'refresh_token:user-123:token-2',
        'refresh_token:user-123:token-3',
      ];

      redis.keys.mockResolvedValue(tokenKeys as any);

      const pipeline = {
        setex: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      redis.pipeline.mockReturnValue(pipeline as any);

      await service.invalidateAllUserTokens(userId);

      expect(redis.keys).toHaveBeenCalledWith('refresh_token:user-123:*');
      expect(pipeline.setex).toHaveBeenCalledTimes(3);
      expect(pipeline.del).toHaveBeenCalledTimes(3);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should do nothing if user has no tokens', async () => {
      const userId = 'user-123';

      redis.keys.mockResolvedValue([] as any);

      await service.invalidateAllUserTokens(userId);

      expect(redis.keys).toHaveBeenCalledWith('refresh_token:user-123:*');
      expect(redis.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('getUserTokens', () => {
    it('should return list of user tokens with metadata', async () => {
      const userId = 'user-123';
      const tokenKeys = [
        'refresh_token:user-123:token-1',
        'refresh_token:user-123:token-2',
      ];

      redis.keys.mockResolvedValue(tokenKeys as any);
      redis.ttl.mockResolvedValueOnce(2592000); // 30 days
      redis.ttl.mockResolvedValueOnce(1296000); // 15 days

      const result = await service.getUserTokens(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('tokenId', 'token-1');
      expect(result[0]).toHaveProperty('ttl', 2592000);
      expect(result[1]).toHaveProperty('tokenId', 'token-2');
      expect(result[1]).toHaveProperty('ttl', 1296000);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired blacklist entries', async () => {
      const blacklistKeys = [
        'blacklist:token-1',
        'blacklist:token-2',
        'blacklist:token-3',
      ];

      redis.keys.mockResolvedValue(blacklistKeys as any);
      redis.ttl.mockResolvedValueOnce(-1); // Expired
      redis.ttl.mockResolvedValueOnce(1000); // Still valid
      redis.ttl.mockResolvedValueOnce(-2); // Does not exist

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(2);
      expect(redis.del).toHaveBeenCalledTimes(2);
      expect(redis.del).toHaveBeenCalledWith('blacklist:token-1');
      expect(redis.del).toHaveBeenCalledWith('blacklist:token-3');
    });

    it('should return 0 if no expired tokens', async () => {
      const blacklistKeys = ['blacklist:token-1'];

      redis.keys.mockResolvedValue(blacklistKeys as any);
      redis.ttl.mockResolvedValueOnce(1000); // Still valid

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(0);
      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});

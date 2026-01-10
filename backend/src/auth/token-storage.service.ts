import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Service for managing refresh token storage and invalidation in Redis
 * Implements secure token rotation and blacklisting
 */
@Injectable()
export class TokenStorageService {
  private readonly redis: Redis;
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private readonly BLACKLIST_PREFIX = 'blacklist:';
  private readonly TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  constructor(
    @Inject('REDIS_CLIENT') redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.redis = redis;
  }

  /**
   * Store refresh token in Redis with user ID mapping
   * @param userId - User ID
   * @param tokenId - Unique token identifier (jti)
   * @param refreshToken - The actual refresh token
   */
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    refreshToken: string,
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`;
    await this.redis.setex(key, this.TOKEN_TTL, refreshToken);
  }

  /**
   * Validate that refresh token exists and is not blacklisted
   * @param userId - User ID
   * @param tokenId - Token identifier
   * @returns true if token is valid
   */
  async validateRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    // Check if token exists
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`;
    const exists = await this.redis.exists(key);

    if (!exists) {
      return false;
    }

    // Check if token is blacklisted
    const blacklistKey = `${this.BLACKLIST_PREFIX}${tokenId}`;
    const isBlacklisted = await this.redis.exists(blacklistKey);

    return !isBlacklisted;
  }

  /**
   * Invalidate a specific refresh token (on logout)
   * @param userId - User ID
   * @param tokenId - Token identifier
   */
  async invalidateRefreshToken(userId: string, tokenId: string): Promise<void> {
    // Remove from storage
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`;
    await this.redis.del(key);

    // Add to blacklist (in case token is cached elsewhere)
    const blacklistKey = `${this.BLACKLIST_PREFIX}${tokenId}`;
    await this.redis.setex(blacklistKey, this.TOKEN_TTL, '1');
  }

  /**
   * Invalidate all refresh tokens for a user (on password change, security breach)
   * @param userId - User ID
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      // Extract token IDs and blacklist them
      const pipeline = this.redis.pipeline();

      for (const key of keys) {
        const tokenId = key.split(':').pop();
        if (tokenId) {
          const blacklistKey = `${this.BLACKLIST_PREFIX}${tokenId}`;
          pipeline.setex(blacklistKey, this.TOKEN_TTL, '1');
        }
        pipeline.del(key);
      }

      await pipeline.exec();
    }
  }

  /**
   * Get all active refresh tokens for a user (for session management UI)
   * @param userId - User ID
   * @returns List of token IDs with metadata
   */
  async getUserTokens(userId: string): Promise<
    Array<{
      tokenId: string;
      createdAt: number;
      ttl: number;
    }>
  > {
    const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
    const keys = await this.redis.keys(pattern);

    const tokens = await Promise.all(
      keys.map(async (key) => {
        const tokenId = key.split(':').pop()!;
        const ttl = await this.redis.ttl(key);
        const createdAt = Date.now() - (this.TOKEN_TTL - ttl) * 1000;

        return { tokenId, createdAt, ttl };
      }),
    );

    return tokens;
  }

  /**
   * Cleanup expired tokens (called by cron job)
   * Redis handles expiration automatically, but this ensures blacklist cleanup
   */
  async cleanupExpiredTokens(): Promise<number> {
    const blacklistPattern = `${this.BLACKLIST_PREFIX}*`;
    const keys = await this.redis.keys(blacklistPattern);

    let deletedCount = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        await this.redis.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

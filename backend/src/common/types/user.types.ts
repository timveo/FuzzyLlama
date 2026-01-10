import { User, PlanTier } from '@prisma/client';

/**
 * User object returned in JWT payload
 */
export interface JwtUser {
  id: string;
  email: string;
  sub?: string; // JWT subject (user ID)
}

/**
 * User object with safe fields (no password)
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * User profile response
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  planTier: PlanTier;
  emailVerified: boolean;
  monthlyAgentExecutions: number;
  lastExecutionReset: Date | null;
  createdAt: Date;
}

/**
 * Request user (attached by auth guard)
 */
export interface RequestUser {
  id: string;
  email: string;
  planTier?: PlanTier;
}

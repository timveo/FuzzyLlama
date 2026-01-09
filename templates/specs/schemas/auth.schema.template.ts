/**
 * Authentication Schemas
 *
 * PURPOSE: Define all authentication-related request/response schemas.
 * Used by: Backend (validation), Frontend (forms, API calls)
 *
 * CONSISTENCY RULE: Must match OpenAPI auth schemas exactly.
 */

import { z } from 'zod';
import { EmailSchema, createSuccessSchema } from './common.schema';
import { UserSchema } from './user.schema';

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

/**
 * Password requirements:
 * - Minimum 8 characters
 * - Maximum 72 characters (bcrypt limit)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * Matches: OpenAPI RegisterRequest.password
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * User registration request.
 * Matches: OpenAPI RegisterRequest
 */
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().max(100).optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * User login request.
 * Matches: OpenAPI LoginRequest
 */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Token refresh request.
 * Matches: OpenAPI RefreshRequest
 */
export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Auth token pair.
 */
export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type TokenPair = z.infer<typeof TokenPairSchema>;

/**
 * Auth response with user and tokens.
 * Matches: OpenAPI AuthResponse
 */
export const AuthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Token refresh response.
 * Matches: OpenAPI TokenResponse
 */
export const TokenResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
  }),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// =============================================================================
// JWT PAYLOAD (Internal use - not in OpenAPI)
// =============================================================================

/**
 * JWT access token payload.
 * This is encoded in the JWT, not sent as a response body.
 */
export const JWTPayloadSchema = z.object({
  sub: z.string().uuid(), // User ID
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN']),
  iat: z.number(), // Issued at (Unix timestamp)
  exp: z.number(), // Expires at (Unix timestamp)
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// =============================================================================
// FORM SCHEMAS (Frontend-specific extensions)
// =============================================================================

/**
 * Registration form with password confirmation.
 * Extends RegisterRequest for frontend form validation.
 */
export const RegisterFormSchema = RegisterRequestSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterForm = z.infer<typeof RegisterFormSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates a registration request.
 * Use in backend route handler.
 */
export function validateRegisterRequest(data: unknown): RegisterRequest {
  return RegisterRequestSchema.parse(data);
}

/**
 * Validates a login request.
 * Use in backend route handler.
 */
export function validateLoginRequest(data: unknown): LoginRequest {
  return LoginRequestSchema.parse(data);
}

/**
 * Validates a refresh request.
 * Use in backend route handler.
 */
export function validateRefreshRequest(data: unknown): RefreshRequest {
  return RefreshRequestSchema.parse(data);
}

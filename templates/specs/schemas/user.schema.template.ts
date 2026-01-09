/**
 * User Domain Schemas
 *
 * PURPOSE: Define all user-related request/response schemas.
 * Used by: Backend (validation), Frontend (forms, API calls)
 *
 * CONSISTENCY RULE: Must match OpenAPI User schemas exactly.
 * CONSISTENCY RULE: UserRole enum must match Prisma enum exactly.
 */

import { z } from 'zod';
import {
  UUIDSchema,
  EmailSchema,
  DateTimeSchema,
  PaginationParamsSchema,
  createSuccessSchema,
  createListSchema,
} from './common.schema';

// =============================================================================
// ENUMS (Must match Prisma and OpenAPI exactly)
// =============================================================================

/**
 * User role enum.
 * Matches: Prisma UserRole, OpenAPI UserRole
 */
export const UserRoleSchema = z.enum(['USER', 'ADMIN']);

export type UserRole = z.infer<typeof UserRoleSchema>;

// =============================================================================
// BASE USER SCHEMA
// =============================================================================

/**
 * Core user object.
 * Matches: OpenAPI User schema
 */
export const UserSchema = z.object({
  id: UUIDSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  role: UserRoleSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema.optional(),
});

export type User = z.infer<typeof UserSchema>;

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Create user request (used internally, not exposed via API).
 * Registration uses AuthSchema.RegisterRequest instead.
 */
export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8),
  name: z.string().max(100).optional(),
  role: UserRoleSchema.optional().default('USER'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Update user request.
 * Matches: OpenAPI UpdateUserRequest
 */
export const UpdateUserSchema = z.object({
  name: z.string().max(100).optional(),
  email: EmailSchema.optional(),
  role: UserRoleSchema.optional(), // Admin only
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

/**
 * List users query parameters.
 * Extends standard pagination with user-specific filters.
 */
export const ListUsersParamsSchema = PaginationParamsSchema.extend({
  role: UserRoleSchema.optional(),
  search: z.string().optional(), // Search by name/email
});

export type ListUsersParams = z.infer<typeof ListUsersParamsSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Single user response.
 * Matches: OpenAPI UserResponse
 */
export const UserResponseSchema = createSuccessSchema(UserSchema);

export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * User list response with pagination.
 * Matches: OpenAPI UserListResponse
 */
export const UserListResponseSchema = createListSchema(UserSchema);

export type UserListResponse = z.infer<typeof UserListResponseSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates an update user request.
 * Use in backend route handler.
 *
 * @example
 * app.patch('/users/:id', (req, res) => {
 *   const input = validateUpdateUser(req.body);
 *   // input is typed as UpdateUserInput
 * });
 */
export function validateUpdateUser(data: unknown): UpdateUserInput {
  return UpdateUserSchema.parse(data);
}

/**
 * Validates list users query parameters.
 * Use in backend route handler.
 *
 * @example
 * app.get('/users', (req, res) => {
 *   const params = validateListUsersParams(req.query);
 *   // params is typed with defaults applied
 * });
 */
export function validateListUsersParams(data: unknown): ListUsersParams {
  return ListUsersParamsSchema.parse(data);
}

/**
 * Formats a user object for API response.
 * Ensures the response matches the schema exactly.
 *
 * @example
 * const user = await prisma.user.findUnique({ where: { id } });
 * const response = formatUserResponse(user);
 * // response is validated and typed
 */
export function formatUserResponse(user: unknown): UserResponse {
  return UserResponseSchema.parse({
    success: true,
    data: user,
  });
}

/**
 * Formats a user list for API response.
 *
 * @example
 * const users = await prisma.user.findMany({ ... });
 * const total = await prisma.user.count({ ... });
 * const response = formatUserListResponse(users, { page, limit, total });
 */
export function formatUserListResponse(
  users: unknown[],
  meta: { page: number; limit: number; total: number }
): UserListResponse {
  return UserListResponseSchema.parse({
    success: true,
    data: users,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  });
}

// =============================================================================
// PRISMA SELECT HELPERS (Backend only)
// =============================================================================

/**
 * Prisma select object for safe user fields.
 * Excludes passwordHash and other sensitive fields.
 *
 * @example
 * const user = await prisma.user.findUnique({
 *   where: { id },
 *   select: USER_SELECT,
 * });
 */
export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  // passwordHash: false (excluded by omission)
  // isActive: false (excluded by omission)
} as const;

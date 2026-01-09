/**
 * Common Schemas
 *
 * PURPOSE: Shared types used across all domains.
 * These schemas define the standard response formats, pagination, and errors.
 *
 * CONSISTENCY RULE: These schemas MUST match OpenAPI components exactly.
 */

import { z } from 'zod';

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Pagination parameters for list endpoints.
 * Matches: OpenAPI PageParam and LimitParam
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Pagination metadata in list responses.
 * Matches: OpenAPI PaginationMeta
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// =============================================================================
// ERROR RESPONSE
// =============================================================================

/**
 * Standard error codes.
 * Matches: OpenAPI ErrorResponse.error.code enum
 */
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Field-level validation error detail.
 */
export const ValidationDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ValidationDetail = z.infer<typeof ValidationDetailSchema>;

/**
 * Standard error response body.
 * Matches: OpenAPI ErrorResponse
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.array(ValidationDetailSchema).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// =============================================================================
// SUCCESS RESPONSE HELPERS
// =============================================================================

/**
 * Creates a success response schema for a single item.
 * Use for GET /resource/:id, POST /resource, PATCH /resource/:id
 *
 * @example
 * const UserResponseSchema = createSuccessSchema(UserSchema);
 * // { success: true, data: User }
 */
export function createSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

/**
 * Creates a success response schema for a list with pagination.
 * Use for GET /resources
 *
 * @example
 * const UserListResponseSchema = createListSchema(UserSchema);
 * // { success: true, data: User[], meta: PaginationMeta }
 */
export function createListSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * UUID field schema.
 * Use for all ID fields.
 */
export const UUIDSchema = z.string().uuid();

/**
 * Email field schema with normalization.
 * Trims whitespace and converts to lowercase.
 */
export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255)
  .transform((email) => email.trim().toLowerCase());

/**
 * Datetime string schema.
 * Accepts ISO 8601 format (what Prisma returns as JSON).
 */
export const DateTimeSchema = z.string().datetime();

/**
 * URL schema with basic validation.
 */
export const URLSchema = z.string().url();

/**
 * Non-empty string schema.
 * Use for required string fields that shouldn't be empty.
 */
export const NonEmptyStringSchema = z.string().min(1, 'This field is required');

// =============================================================================
// TYPE UTILITIES
// =============================================================================

/**
 * Extracts the success response type from a schema.
 */
export type SuccessResponse<T extends z.ZodTypeAny> = z.infer<
  ReturnType<typeof createSuccessSchema<T>>
>;

/**
 * Extracts the list response type from a schema.
 */
export type ListResponse<T extends z.ZodTypeAny> = z.infer<
  ReturnType<typeof createListSchema<T>>
>;

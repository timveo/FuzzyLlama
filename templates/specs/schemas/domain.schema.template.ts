/**
 * [DOMAIN_NAME] Domain Schemas
 *
 * PURPOSE: Define all [domain]-related request/response schemas.
 * Used by: Backend (validation), Frontend (forms, API calls)
 *
 * NOTE: This file contains [PLACEHOLDERS] that must be replaced.
 * It will NOT compile until you replace them with actual values.
 *
 * INSTRUCTIONS:
 * 1. Copy this file and rename to [domain].schema.ts
 * 2. Replace all placeholders:
 *    - [DOMAIN_NAME] → e.g., "Product", "Order", "Project"
 *    - [Domain] → e.g., "Product", "Order", "Project" (PascalCase)
 *    - [domain] → e.g., "product", "order", "project" (lowercase)
 *    - [RESOURCE] → e.g., "Product", "Order", "Project" (PascalCase)
 *    - [resource] → e.g., "product", "order", "project" (lowercase)
 * 3. Define your enums, base schema, request/response schemas
 * 4. Add export to index.ts: `export * from './[domain].schema';`
 * 5. Run `tsc --noEmit` to validate
 *
 * EXAMPLE: To create Product domain:
 *   - Copy to product.schema.ts
 *   - Replace [RESOURCE] with Product
 *   - Replace [resource] with product
 *
 * CONSISTENCY RULES:
 * - Enums MUST match Prisma enums exactly
 * - Field names MUST match OpenAPI schema exactly
 * - Types MUST match OpenAPI types exactly
 */

import { z } from 'zod';
import {
  UUIDSchema,
  DateTimeSchema,
  PaginationParamsSchema,
  createSuccessSchema,
  createListSchema,
} from './common.schema';

// =============================================================================
// ENUMS (Must match Prisma and OpenAPI exactly)
// =============================================================================

/**
 * [Resource] status enum.
 * Matches: Prisma [Resource]Status, OpenAPI [Resource]Status
 */
export const [RESOURCE]StatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']);

export type [RESOURCE]Status = z.infer<typeof [RESOURCE]StatusSchema>;

// [ADD MORE ENUMS AS NEEDED]

// =============================================================================
// BASE [RESOURCE] SCHEMA
// =============================================================================

/**
 * Core [resource] object.
 * Matches: OpenAPI [Resource] schema
 */
export const [RESOURCE]Schema = z.object({
  id: UUIDSchema,
  name: z.string(),
  description: z.string().nullable(),
  status: [RESOURCE]StatusSchema,
  // [ADD FOREIGN KEYS]
  // ownerId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema.optional(),
});

export type [RESOURCE] = z.infer<typeof [RESOURCE]Schema>;

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Create [resource] request.
 * Matches: OpenAPI Create[Resource]Request
 */
export const Create[RESOURCE]Schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  // [ADD REQUIRED FIELDS]
});

export type Create[RESOURCE]Input = z.infer<typeof Create[RESOURCE]Schema>;

/**
 * Update [resource] request.
 * Matches: OpenAPI Update[Resource]Request
 */
export const Update[RESOURCE]Schema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: [RESOURCE]StatusSchema.optional(),
  // [ADD UPDATABLE FIELDS]
});

export type Update[RESOURCE]Input = z.infer<typeof Update[RESOURCE]Schema>;

/**
 * List [resources] query parameters.
 * Extends standard pagination with [resource]-specific filters.
 */
export const List[RESOURCE]sParamsSchema = PaginationParamsSchema.extend({
  status: [RESOURCE]StatusSchema.optional(),
  search: z.string().optional(),
  // [ADD FILTER FIELDS]
  // ownerId: UUIDSchema.optional(),
});

export type List[RESOURCE]sParams = z.infer<typeof List[RESOURCE]sParamsSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Single [resource] response.
 * Matches: OpenAPI [Resource]Response
 */
export const [RESOURCE]ResponseSchema = createSuccessSchema([RESOURCE]Schema);

export type [RESOURCE]Response = z.infer<typeof [RESOURCE]ResponseSchema>;

/**
 * [Resource] list response with pagination.
 * Matches: OpenAPI [Resource]ListResponse
 */
export const [RESOURCE]ListResponseSchema = createListSchema([RESOURCE]Schema);

export type [RESOURCE]ListResponse = z.infer<typeof [RESOURCE]ListResponseSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates a create [resource] request.
 */
export function validateCreate[RESOURCE](data: unknown): Create[RESOURCE]Input {
  return Create[RESOURCE]Schema.parse(data);
}

/**
 * Validates an update [resource] request.
 */
export function validateUpdate[RESOURCE](data: unknown): Update[RESOURCE]Input {
  return Update[RESOURCE]Schema.parse(data);
}

/**
 * Validates list [resource]s query parameters.
 */
export function validateList[RESOURCE]sParams(data: unknown): List[RESOURCE]sParams {
  return List[RESOURCE]sParamsSchema.parse(data);
}

/**
 * Formats a [resource] object for API response.
 */
export function format[RESOURCE]Response(resource: unknown): [RESOURCE]Response {
  return [RESOURCE]ResponseSchema.parse({
    success: true,
    data: resource,
  });
}

/**
 * Formats a [resource] list for API response.
 */
export function format[RESOURCE]ListResponse(
  resources: unknown[],
  meta: { page: number; limit: number; total: number }
): [RESOURCE]ListResponse {
  return [RESOURCE]ListResponseSchema.parse({
    success: true,
    data: resources,
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
 * Prisma select object for [resource] fields.
 */
export const [RESOURCE]_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  // [ADD FIELDS TO INCLUDE]
} as const;

// =============================================================================
// RELATIONS (if needed)
// =============================================================================

/**
 * [Resource] with related entities.
 * Use when you need to include relations in response.
 */
// export const [RESOURCE]WithRelationsSchema = [RESOURCE]Schema.extend({
//   owner: UserSchema.optional(),
//   items: z.array(ItemSchema).optional(),
// });
//
// export type [RESOURCE]WithRelations = z.infer<typeof [RESOURCE]WithRelationsSchema>;

/**
 * Domain Schema Index
 *
 * PURPOSE: Re-export all Zod schemas for easy importing.
 * Both Frontend and Backend import from this single entry point.
 *
 * ARCHITECT: Add exports for each domain schema file.
 * VALIDATION: Run `tsc --noEmit` to verify all exports compile.
 *
 * USAGE:
 * ```typescript
 * import {
 *   CreateUserSchema,
 *   UserResponseSchema,
 *   type CreateUserInput,
 *   type UserResponse
 * } from '@/specs/schemas';
 * ```
 */

// =============================================================================
// COMMON SCHEMAS
// =============================================================================
export * from './common.schema';

// =============================================================================
// AUTH SCHEMAS
// =============================================================================
export * from './auth.schema';

// =============================================================================
// USER SCHEMAS
// =============================================================================
export * from './user.schema';

// =============================================================================
// [DOMAIN] SCHEMAS - Add export for each domain
// =============================================================================
// export * from './workspace.schema';
// export * from './project.schema';
// export * from './[domain].schema';

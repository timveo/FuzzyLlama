/**
 * TypeScript Types Template
 *
 * PURPOSE: Shared type definitions for frontend/backend
 * ARCHITECT: Fill in based on domain model from PRD
 * VALIDATION: Run `tsc --noEmit` before handoff
 *
 * NAMING CONVENTIONS:
 * - Interfaces: PascalCase with 'I' prefix optional
 * - Types: PascalCase
 * - Enums: PascalCase with SCREAMING_SNAKE_CASE values
 * - Properties: camelCase
 */

// =============================================================================
// ENUMS - Must match Prisma schema and OpenAPI exactly
// =============================================================================

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// [ADD MORE ENUMS - Must match Prisma schema exactly]
// export enum [EnumName] {
//   VALUE_ONE = 'VALUE_ONE',
//   VALUE_TWO = 'VALUE_TWO',
// }

// =============================================================================
// USER & AUTH TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  success: true;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface TokenResponse {
  success: true;
  data: {
    accessToken: string;
  };
}

// =============================================================================
// USER MANAGEMENT TYPES
// =============================================================================

export interface UserResponse {
  success: true;
  data: User;
}

export interface UserListResponse {
  success: true;
  data: User[];
  meta: PaginationMeta;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole; // Admin only
}

// =============================================================================
// [DOMAIN] TYPES - Add for each domain
// =============================================================================

// Example: Workspace domain for multi-tenant apps
//
// export interface Workspace {
//   id: string;
//   name: string;
//   slug: string;
//   ownerId: string;
//   createdAt: string;
//   updatedAt: string;
// }
//
// export interface CreateWorkspaceRequest {
//   name: string;
//   slug?: string;
// }
//
// export interface WorkspaceResponse {
//   success: true;
//   data: Workspace;
// }

// =============================================================================
// COMMON TYPES
// =============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationError[];
  };
}

// =============================================================================
// API RESPONSE TYPES - Union types for type narrowing
// =============================================================================

export type ApiResponse<T> =
  | { success: true; data: T; meta?: PaginationMeta }
  | ErrorResponse;

// Type guard for checking API responses
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is { success: true; data: T; meta?: PaginationMeta } {
  return response.success === true;
}

export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ErrorResponse {
  return response.success === false;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract the data type from a response type
 */
export type ExtractData<T> = T extends { success: true; data: infer D } ? D : never;

/**
 * Create a create/update DTO from an entity type
 */
export type CreateDTO<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDTO<T> = Partial<CreateDTO<T>>;

// =============================================================================
// TYPE CHECKLIST (Architect must verify before handoff)
// =============================================================================
//
// [ ] All enums match Prisma schema exactly
// [ ] All enums match OpenAPI schema exactly
// [ ] All entity types have id, createdAt, updatedAt
// [ ] All nullable fields use `| null` (not optional)
// [ ] All optional fields use `?` modifier
// [ ] All dates are string type (ISO 8601 format from API)
// [ ] Request types match OpenAPI request bodies
// [ ] Response types match OpenAPI response schemas
// [ ] Error types match OpenAPI error responses
// [ ] tsc --noEmit passes

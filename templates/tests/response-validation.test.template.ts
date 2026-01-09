/**
 * Response Shape Validation Tests
 *
 * PURPOSE: Validates that API responses match Zod schemas exactly.
 * USAGE: Copy to your project's test directory and customize.
 *
 * These tests ensure:
 * 1. Valid responses pass validation
 * 2. Invalid responses are rejected
 * 3. Missing required fields are caught
 * 4. Invalid enum values are rejected
 * 5. Type inference works correctly
 *
 * INSTRUCTIONS:
 * 1. Copy this file to your project: tests/response-validation.test.ts
 * 2. Update imports to match your schema paths
 * 3. Add tests for your domain-specific schemas
 * 4. Run with: npx jest tests/response-validation.test.ts
 */

import { describe, it, expect } from '@jest/globals';
// Update these imports to match your project structure
import {
  UserSchema,
  UserResponseSchema,
  UserListResponseSchema,
} from '../specs/schemas/user.schema';
import { AuthResponseSchema } from '../specs/schemas/auth.schema';

describe('Response Shape Validation', () => {
  // ==========================================================================
  // User Response Tests
  // ==========================================================================

  describe('UserResponse', () => {
    const validUserResponse = {
      success: true,
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    };

    it('accepts valid user response', () => {
      const result = UserResponseSchema.safeParse(validUserResponse);
      expect(result.success).toBe(true);
    });

    it('rejects response missing required email', () => {
      const invalid = {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          // email missing
          name: 'Test User',
          role: 'USER',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      };
      const result = UserResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const invalid = {
        ...validUserResponse,
        data: {
          ...validUserResponse.data,
          email: 'not-an-email',
        },
      };
      const result = UserResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid role enum value', () => {
      const invalid = {
        ...validUserResponse,
        data: {
          ...validUserResponse.data,
          role: 'SUPERADMIN', // Invalid role
        },
      };
      const result = UserResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts null name (nullable field)', () => {
      const withNullName = {
        ...validUserResponse,
        data: {
          ...validUserResponse.data,
          name: null,
        },
      };
      const result = UserResponseSchema.safeParse(withNullName);
      expect(result.success).toBe(true);
    });

    it('accepts missing updatedAt (optional field)', () => {
      const withoutUpdatedAt = {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          createdAt: '2024-01-15T10:30:00.000Z',
          // updatedAt is optional
        },
      };
      const result = UserResponseSchema.safeParse(withoutUpdatedAt);
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // User List Response Tests
  // ==========================================================================

  describe('UserListResponse', () => {
    const validListResponse = {
      success: true,
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'USER',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    };

    it('accepts valid list response', () => {
      const result = UserListResponseSchema.safeParse(validListResponse);
      expect(result.success).toBe(true);
    });

    it('accepts empty data array', () => {
      const emptyList = {
        success: true,
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
      const result = UserListResponseSchema.safeParse(emptyList);
      expect(result.success).toBe(true);
    });

    it('rejects missing pagination meta', () => {
      const noMeta = {
        success: true,
        data: validListResponse.data,
        // meta missing
      };
      const result = UserListResponseSchema.safeParse(noMeta);
      expect(result.success).toBe(false);
    });

    it('rejects if any user in array is invalid', () => {
      const withInvalidUser = {
        ...validListResponse,
        data: [
          ...validListResponse.data,
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            // email missing
            role: 'USER',
            createdAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };
      const result = UserListResponseSchema.safeParse(withInvalidUser);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Auth Response Tests
  // ==========================================================================

  describe('AuthResponse', () => {
    const validAuthResponse = {
      success: true,
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_here',
        expiresIn: 3600,
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      },
    };

    it('accepts valid auth response', () => {
      const result = AuthResponseSchema.safeParse(validAuthResponse);
      expect(result.success).toBe(true);
    });

    it('rejects missing access token', () => {
      const noToken = {
        success: true,
        data: {
          // accessToken missing
          refreshToken: 'refresh_token_here',
          expiresIn: 3600,
          user: validAuthResponse.data.user,
        },
      };
      const result = AuthResponseSchema.safeParse(noToken);
      expect(result.success).toBe(false);
    });

    it('rejects invalid user in auth response', () => {
      const invalidUser = {
        ...validAuthResponse,
        data: {
          ...validAuthResponse.data,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            // email missing
            role: 'USER',
            createdAt: '2024-01-15T10:30:00.000Z',
          },
        },
      };
      const result = AuthResponseSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Type Inference Tests
  // ==========================================================================

  describe('Type Inference', () => {
    it('infers correct types from UserSchema', () => {
      const userData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const,
        createdAt: '2024-01-15T10:30:00.000Z',
      };

      const user = UserSchema.parse(userData);

      // TypeScript should infer these types correctly
      const email: string = user.email;
      const role: 'USER' | 'ADMIN' = user.role;

      expect(email).toBe('test@example.com');
      expect(role).toBe('USER');
    });
  });
});

// =============================================================================
// [ADD YOUR DOMAIN-SPECIFIC TESTS BELOW]
// =============================================================================

// Example: Product domain tests
// describe('ProductResponse', () => {
//   it('accepts valid product response', () => {
//     // Add your tests
//   });
// });

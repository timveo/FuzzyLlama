/**
 * Form Validation Tests
 *
 * PURPOSE: Tests Zod schemas for frontend form validation.
 * USAGE: Copy to your project's test directory and customize.
 *
 * These tests ensure:
 * 1. Valid form data passes validation
 * 2. Invalid data is rejected with proper error messages
 * 3. Optional fields work correctly
 * 4. Enum validation works
 * 5. Error messages are user-friendly
 *
 * INSTRUCTIONS:
 * 1. Copy this file to your project: tests/form-validation.test.ts
 * 2. Update imports to match your schema paths
 * 3. Add tests for your domain-specific forms
 * 4. Run with: npx jest tests/form-validation.test.ts
 */

import { describe, it, expect } from '@jest/globals';
// Update these imports to match your project structure
import {
  RegisterRequestSchema,
  LoginRequestSchema,
} from '../specs/schemas/auth.schema';
import { UpdateUserSchema } from '../specs/schemas/user.schema';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates data with a schema and returns structured result.
 * Mimics zodResolver behavior for react-hook-form.
 */
function validateForm<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } },
  data: unknown
): { valid: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  // Convert Zod errors to field-level errors (like react-hook-form)
  const errors: Record<string, string> = {};
  result.error?.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return { valid: false, errors };
}

// =============================================================================
// Registration Form Tests
// =============================================================================

describe('Registration Form Validation', () => {
  describe('Valid Submissions', () => {
    it('accepts valid registration with all fields', () => {
      const formData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(formData);
    });

    it('accepts registration without optional name', () => {
      const formData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('rejects empty email', () => {
      const formData = {
        email: '',
        password: 'SecurePass123!',
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(false);
      expect(result.errors?.email).toBeDefined();
    });

    it('rejects invalid email format', () => {
      const formData = {
        email: 'not-an-email',
        password: 'SecurePass123!',
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(false);
      expect(result.errors?.email).toContain('email');
    });

    it('rejects email without domain', () => {
      const formData = {
        email: 'user@',
        password: 'SecurePass123!',
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('rejects password shorter than 8 characters', () => {
      const formData = {
        email: 'user@example.com',
        password: '1234567', // 7 characters
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(false);
      expect(result.errors?.password).toBeDefined();
    });

    it('accepts password with exactly 8 characters', () => {
      const formData = {
        email: 'user@example.com',
        password: '12345678', // 8 characters
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(true);
    });

    it('rejects empty password', () => {
      const formData = {
        email: 'user@example.com',
        password: '',
      };
      const result = validateForm(RegisterRequestSchema, formData);
      expect(result.valid).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('provides user-friendly error messages', () => {
      const formData = {
        email: 'bad',
        password: '12',
      };
      const result = validateForm(RegisterRequestSchema, formData);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();

      // Error messages should be non-empty strings
      Object.values(result.errors!).forEach((message) => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });
});

// =============================================================================
// Login Form Tests
// =============================================================================

describe('Login Form Validation', () => {
  it('accepts valid login credentials', () => {
    const formData = {
      email: 'user@example.com',
      password: 'MyPassword123',
    };
    const result = validateForm(LoginRequestSchema, formData);
    expect(result.valid).toBe(true);
  });

  it('rejects missing email', () => {
    const formData = {
      password: 'MyPassword123',
    };
    const result = validateForm(LoginRequestSchema, formData);
    expect(result.valid).toBe(false);
  });

  it('rejects missing password', () => {
    const formData = {
      email: 'user@example.com',
    };
    const result = validateForm(LoginRequestSchema, formData);
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// Update User Form Tests
// =============================================================================

describe('Update User Form Validation', () => {
  describe('Partial Updates', () => {
    it('accepts partial update with only name', () => {
      const formData = {
        name: 'Updated Name',
      };
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(true);
    });

    it('accepts partial update with only email', () => {
      const formData = {
        email: 'newemail@example.com',
      };
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(true);
    });

    it('accepts empty update (all fields optional)', () => {
      const formData = {};
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(true);
    });
  });

  describe('Role Validation', () => {
    it('accepts valid role update', () => {
      const formData = {
        role: 'ADMIN',
      };
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid role value', () => {
      const formData = {
        role: 'SUPERADMIN', // Invalid
      };
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(false);
      expect(result.errors?.role).toBeDefined();
    });
  });

  describe('Field Validation', () => {
    it('rejects name exceeding max length', () => {
      const formData = {
        name: 'A'.repeat(101), // Max is 100
      };
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(false);
    });

    it('validates email format when provided', () => {
      const formData = {
        email: 'invalid-email',
      };
      const result = validateForm(UpdateUserSchema, formData);
      expect(result.valid).toBe(false);
    });
  });
});

// =============================================================================
// [ADD YOUR DOMAIN-SPECIFIC FORM TESTS BELOW]
// =============================================================================

// Example: Product form tests
// describe('Create Product Form Validation', () => {
//   it('accepts valid product data', () => {
//     const formData = {
//       name: 'New Product',
//       price: 99.99,
//       description: 'A great product',
//     };
//     const result = validateForm(CreateProductSchema, formData);
//     expect(result.valid).toBe(true);
//   });
// });

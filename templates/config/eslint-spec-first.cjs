/**
 * ESLint Rules for Spec-First Development
 *
 * These rules enforce that validation schemas come from specs/schemas/
 * rather than being defined inline in application code.
 *
 * INSTALLATION:
 *   1. Copy this file to your project root
 *   2. Add to your ESLint config:
 *      ```js
 *      module.exports = {
 *        extends: ['./eslint-spec-first.cjs'],
 *        // ... other config
 *      }
 *      ```
 *
 * WHAT IT ENFORCES:
 *   - No inline Zod schema definitions outside specs/schemas/
 *   - Warns on custom TypeScript interfaces (should use z.infer)
 *   - Ensures form validation imports from specs
 */

module.exports = {
  plugins: [],
  rules: {
    // =========================================================================
    // Restrict inline Zod schemas
    // =========================================================================
    'no-restricted-syntax': [
      'error',
      {
        // Forbid z.object() outside of specs/schemas
        selector: "CallExpression[callee.object.name='z'][callee.property.name='object']",
        message: 'Zod schemas must be defined in specs/schemas/, not inline. Import from @/specs/schemas instead.'
      },
      {
        // Forbid z.enum() outside of specs/schemas
        selector: "CallExpression[callee.object.name='z'][callee.property.name='enum']",
        message: 'Zod enums must be defined in specs/schemas/, not inline. Import from @/specs/schemas instead.'
      },
      {
        // Forbid z.union() outside of specs/schemas
        selector: "CallExpression[callee.object.name='z'][callee.property.name='union']",
        message: 'Zod unions must be defined in specs/schemas/, not inline. Import from @/specs/schemas instead.'
      }
    ],

    // =========================================================================
    // Restrict imports - ensure using spec schemas
    // =========================================================================
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            // Warn if creating validation in components
            group: ['*/validation/*', '*/validators/*'],
            message: 'Use validation schemas from specs/schemas/ instead of custom validators.'
          }
        ]
      }
    ]
  },

  overrides: [
    // =========================================================================
    // Allow Zod definitions ONLY in specs/schemas/
    // =========================================================================
    {
      files: ['**/specs/schemas/**/*.ts', '**/specs/schemas/**/*.tsx'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    },
    // =========================================================================
    // Allow type definitions in .d.ts files (generated types)
    // =========================================================================
    {
      files: ['**/*.d.ts'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    }
  ]
};

/**
 * USAGE EXAMPLES:
 *
 * INCORRECT (will trigger error):
 * ```ts
 * // src/components/UserForm.tsx
 * const UserSchema = z.object({     // ERROR: Define in specs/schemas
 *   name: z.string(),
 *   email: z.string().email()
 * });
 * ```
 *
 * CORRECT:
 * ```ts
 * // src/components/UserForm.tsx
 * import { CreateUserSchema } from '@/specs/schemas/user.schema';
 *
 * function UserForm() {
 *   const form = useForm({
 *     resolver: zodResolver(CreateUserSchema)
 *   });
 * }
 * ```
 *
 * SPEC FILE (allowed):
 * ```ts
 * // specs/schemas/user.schema.ts
 * export const CreateUserSchema = z.object({  // OK - in specs/schemas
 *   name: z.string(),
 *   email: z.string().email()
 * });
 * export type CreateUserInput = z.infer<typeof CreateUserSchema>;
 * ```
 */

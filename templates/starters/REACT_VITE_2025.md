# React + Vite + TypeScript Starter (2025 Edition)

> **Version:** 2025.1
> **Last Updated:** 2024-12-11
> **Tailwind:** v4.x compatible
> **TypeScript:** Strict mode with verbatimModuleSyntax

---

## Quick Start Commands

```bash
# Initialize with Vite
npm create vite@latest my-app -- --template react-ts
cd my-app

# Install dependencies (2025 versions)
npm install react react-dom
npm install recharts                   # If charts needed
npm install zustand                    # If state management needed

# Tailwind CSS v4 setup
npm install tailwindcss @tailwindcss/postcss autoprefixer

# Dev dependencies with testing
npm install -D vite @vitejs/plugin-react typescript
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# First build to verify
npm run build
```

---

## Critical Configuration Files

### postcss.config.js (Tailwind v4)

```javascript
// ⚠️ IMPORTANT: Tailwind v4 uses @tailwindcss/postcss, NOT tailwindcss
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### src/index.css (Tailwind v4)

```css
/* ⚠️ IMPORTANT: Tailwind v4 uses @import, NOT @tailwind directives */
@import "tailwindcss";

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### vite.config.ts (with Vitest)

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Uncomment for GitHub Pages deployment:
  // base: '/your-repo-name/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### src/test/setup.ts

```typescript
import '@testing-library/jest-dom';
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run build && npm test && npm run lint",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist",
    "prepare": "test -d .git && cp -n templates/infrastructure/hooks/pre-commit .git/hooks/pre-commit 2>/dev/null && chmod +x .git/hooks/pre-commit || true"
  }
}
```

---

## TypeScript Patterns (Strict Mode)

### Type Imports (REQUIRED)

```typescript
// ✅ CORRECT - Use 'import type' for type-only imports
import type { User, Product, ApiResponse } from '../types';
import type { ReactNode, FC } from 'react';

// ❌ WRONG - Will fail with verbatimModuleSyntax
import { User, Product, ApiResponse } from '../types';
```

### Interface vs Type Pattern

```typescript
// Use interface for object shapes (extendable)
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions, intersections, primitives
type Status = 'pending' | 'active' | 'completed';
type ID = string | number;

// Extend interfaces
interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
}
```

### Component Props Pattern

```typescript
import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}: ButtonProps) {
  // implementation
}
```

---

## Directory Structure

```
src/
├── components/           # UI components
│   ├── ComponentName.tsx
│   └── index.ts         # Barrel exports
├── contexts/            # React contexts
│   └── NameContext.tsx
├── hooks/               # Custom hooks
│   └── useName.ts
├── services/            # API/data services
│   ├── api.ts
│   └── name.ts
├── types/               # TypeScript types
│   └── index.ts
├── utils/               # Helper functions
│   └── formatters.ts
├── test/                # Test setup
│   └── setup.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## Common Patterns

### Service with Mock Data

```typescript
// src/services/mockData.ts
import type { MarketData } from '../types';

const MOCK_DATA: Record<string, MarketData> = {
  // mock data here
};

export async function fetchData(id: string): Promise<MarketData | null> {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
  return MOCK_DATA[id] ?? null;
}
```

### Context Provider Pattern

```typescript
// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer } from 'react';
import type { AppState, AppAction } from '../types';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

### Test File Pattern

```typescript
// src/services/calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTotal, validateInput } from './calculations';

describe('calculations', () => {
  describe('calculateTotal', () => {
    it('should calculate sum correctly', () => {
      expect(calculateTotal([10, 20, 30])).toBe(60);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });
  });

  describe('validateInput', () => {
    it('should accept valid input', () => {
      expect(validateInput('ABC')).toBe(true);
    });

    it('should reject invalid input', () => {
      expect(validateInput('')).toBe(false);
    });
  });
});
```

---

## Deployment (GitHub Pages)

### 1. Update vite.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/',  // Add this line
  // ...
})
```

### 2. Install gh-pages

```bash
npm install -D gh-pages
```

### 3. Add deploy script

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

### 4. Deploy

```bash
npm run deploy
```

Site will be live at: `https://username.github.io/your-repo-name/`

---

## Verification Checklist

Before handoff, run:

```bash
# Single verification command
npm run verify

# Or individually:
npm run build     # ✅ Must pass with 0 errors
npm test          # ✅ All tests must pass
npm run lint      # ✅ Should pass (minor warnings OK)
```

### Expected Output

```
✓ TypeScript compilation: 0 errors
✓ Vite build: success
✓ Tests: X passed
✓ Bundle size: < 500KB (warn if larger)
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `TS1484: is a type and must be imported using type-only import` | Missing `type` keyword | Change `import { X }` to `import type { X }` |
| `postcss: tailwindcss not found` | Tailwind v4 config | Use `@tailwindcss/postcss` instead of `tailwindcss` |
| `@tailwind directive not supported` | Tailwind v4 CSS | Use `@import "tailwindcss"` instead |
| `test: property does not exist` | Vitest types missing | Add `/// <reference types="vitest/config" />` |
| ESLint react-refresh warning | Context exports hook | Split files or add eslint-disable |

---

**This template is maintained based on E2E testing results.**

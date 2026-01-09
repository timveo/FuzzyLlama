# Project Memory: Todo App

Lessons learned and patterns discovered during development.

---

## Decisions That Worked Well

### 1. Parallel Frontend/Backend Development
**What:** Started frontend and backend development simultaneously after architecture approval.
**Why it worked:** Clear API contracts meant no blocking. Frontend used mock data while backend was built.
**Reuse:** Always define API contracts before parallel development.

### 2. Zustand over Redux
**What:** Chose Zustand for state management instead of Redux.
**Why it worked:** 80% less boilerplate. Simple API made auth and task stores trivial to implement.
**Reuse:** Use Zustand for apps with <5 stores.

### 3. Prisma for Database
**What:** Used Prisma ORM with typed queries.
**Why it worked:** Zero SQL injection risk. TypeScript types generated from schema. Migrations were painless.
**Reuse:** Default to Prisma for Node.js + PostgreSQL projects.

### 4. Tailwind CSS
**What:** Used utility classes for all styling.
**Why it worked:** No context switching between files. Responsive design was trivial. Dark mode would be easy to add.
**Reuse:** Use Tailwind for rapid prototyping and small teams.

---

## Decisions That Caused Problems

### 1. JWT in localStorage (Minor Issue)
**What:** Stored JWT tokens in localStorage.
**Problem:** Had to manually handle token in every API request. Refresh token flow added complexity.
**Lesson:** For future projects, consider httpOnly cookies with proper CSRF protection for simpler auth flow.

### 2. No Loading States Initially (Fixed)
**What:** Initially forgot to add loading states on API calls.
**Problem:** UI felt broken when network was slow. Had to retrofit loading states everywhere.
**Lesson:** Design loading/error states as part of initial component development, not as an afterthought.

---

## Patterns Discovered

### Optimistic UI Pattern
```typescript
// Update UI immediately, rollback on error
const toggleTask = async (id: string) => {
  const previous = tasks;
  setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t));
  try {
    await api.patch(`/tasks/${id}`, { completed: !task.completed });
  } catch {
    setTasks(previous); // Rollback
    toast.error('Failed to update');
  }
};
```
**Use when:** Any toggle or quick action where instant feedback matters.

### API Service Pattern
```typescript
// services/api.ts
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);
```
**Use when:** Any React app with API calls.

### Zod Validation Pattern
```typescript
// Validate at API boundary
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional()
});

router.post('/tasks', validate(CreateTaskSchema), taskController.create);
```
**Use when:** Always. Validate all input at API boundaries.

---

## Gotchas

### 1. Vercel + Railway CORS
**Problem:** Vercel frontend couldn't call Railway backend - CORS error.
**Solution:** Add explicit CORS configuration in Express:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```
**Remember:** Always configure CORS when frontend and backend are on different domains.

### 2. Railway Cold Starts
**Problem:** Free tier Railway instances sleep after inactivity. First API call takes 10+ seconds.
**Solution:** Either upgrade to paid tier ($5/mo) or accept cold starts for personal projects.
**Remember:** Factor hosting tier into performance requirements early.

### 3. Prisma Client Generation
**Problem:** TypeScript types not updating after schema changes.
**Solution:** Always run `npx prisma generate` after schema changes. Added to npm scripts:
```json
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev"
```
**Remember:** Prisma types come from generation, not the schema file directly.

### 4. Vite Environment Variables
**Problem:** `process.env.X` doesn't work in Vite.
**Solution:** Use `import.meta.env.VITE_X` instead. Prefix all client env vars with `VITE_`.
**Remember:** Vite has different env var handling than Create React App.

---

## Performance Insights

### What Made It Fast
1. **Vite build** - 145KB gzipped bundle (vs ~300KB with CRA)
2. **Prisma queries** - Automatic select of only needed fields
3. **Vercel Edge** - Static assets served from edge locations
4. **Optimistic UI** - No waiting for API responses

### What Would Make It Faster
1. Add React Query for data caching
2. Implement service worker for offline support
3. Use ISR if we had public pages

---

## Security Insights

### What Worked
- bcrypt with cost 12 for passwords
- JWT with 24h expiry
- Input validation with Zod
- Prisma preventing SQL injection

### Future Improvements
- Add rate limiting (express-rate-limit)
- Implement refresh token rotation
- Add CSP headers
- Consider httpOnly cookies for tokens

---

## For Future Projects

### Always Do
1. Define API contracts before parallel development
2. Add loading/error states from the start
3. Configure CORS early in development
4. Use TypeScript strict mode
5. Set up Prisma with typed queries

### Consider Carefully
1. localStorage vs cookies for auth tokens
2. Free tier hosting limitations
3. State management library choice
4. CSS approach (Tailwind vs CSS-in-JS)

### Avoid
1. Skipping loading states "for now"
2. Hardcoding API URLs
3. Ignoring mobile responsiveness until the end
4. Leaving TypeScript `any` types

---

## Useful Resources Found

- [Zustand Best Practices](https://docs.pmnd.rs/zustand)
- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Railway Deployment Guide](https://docs.railway.app)

# Post-Launch Guide

> **Project:** {PROJECT_NAME}
> **Launched:** {LAUNCH_DATE}
> **Location:** {PROJECT_PATH}

---

## Your App is Live!

Congratulations on launching! This guide helps you maintain and evolve your application.

---

## Quick Reference

### Making Changes

| Want To... | Say This |
|------------|----------|
| Add a feature | "Add [feature] to {PROJECT_NAME}" |
| Fix a bug | "Fix [bug description] in {PROJECT_NAME}" |
| Update design | "Update the [component] design in {PROJECT_NAME}" |
| Improve performance | "Optimize [area] in {PROJECT_NAME}" |

### Checking Status

| Want To... | Say This |
|------------|----------|
| See current state | "What's the status of {PROJECT_NAME}?" |
| View recent changes | "Show recent changes to {PROJECT_NAME}" |
| Check for issues | "Are there any issues with {PROJECT_NAME}?" |

---

## Common Maintenance Tasks

### 1. Adding New Features

```
"Add [feature] to {PROJECT_NAME}"
```

The system will:
1. Analyze impact on existing code
2. Create a mini-PRD for the feature
3. Ask for your approval
4. Build and test the feature
5. Deploy when ready

### 2. Fixing Bugs

```
"I found a bug: [describe what's wrong]"
```

The system will:
1. Investigate the issue
2. Identify the cause
3. Propose a fix
4. Implement after your approval
5. Verify the fix works

### 3. Updating Dependencies

```
"Update dependencies for {PROJECT_NAME}"
```

The system will:
1. Check for outdated packages
2. Identify security vulnerabilities
3. Test updates for compatibility
4. Apply safe updates

### 4. Performance Improvements

```
"Make {PROJECT_NAME} faster"
```

The system will:
1. Profile the application
2. Identify bottlenecks
3. Suggest optimizations
4. Implement approved changes

---

## Monitoring Your App

### What to Watch

| Metric | Good | Warning | Action Needed |
|--------|------|---------|---------------|
| Uptime | 99%+ | 95-99% | <95% |
| Response time | <500ms | 500ms-2s | >2s |
| Error rate | <1% | 1-5% | >5% |
| User satisfaction | Happy | Some complaints | Many complaints |

### Getting Alerts

If you set up monitoring, you'll receive alerts for:
- Downtime (site unreachable)
- High error rates
- Performance degradation
- Security issues

---

## Backup & Recovery

### Your Code

Your code is stored in Git at:
```
{PROJECT_PATH}/.git
```

To backup:
```bash
cd {PROJECT_PATH}
git push origin main
```

### Your Data

Database backups depend on your setup:
- **Supabase:** Automatic daily backups
- **Railway:** Automatic backups included
- **Self-hosted:** Set up regular backups

### Recovery

If something goes wrong:
1. **Code issues:** `git revert` to previous version
2. **Data issues:** Restore from backup
3. **Complete disaster:** Redeploy from Git

---

## Scaling Your App

### Signs You Need to Scale

- Response times increasing
- Users complaining about slowness
- Database queries timing out
- Running out of memory

### How to Scale

```
"Help me scale {PROJECT_NAME}"
```

The system will:
1. Analyze current usage
2. Identify bottlenecks
3. Recommend scaling strategy
4. Implement changes

---

## Security Maintenance

### Regular Security Tasks

| Task | Frequency | How |
|------|-----------|-----|
| Update dependencies | Weekly | "Update dependencies" |
| Security scan | Monthly | "Run security scan" |
| Review access | Quarterly | "Review user permissions" |
| Rotate secrets | Annually | "Rotate API keys and secrets" |

### If You Suspect a Breach

1. **Don't panic**
2. Say: "I think there's a security issue with {PROJECT_NAME}"
3. The system will investigate and guide you

---

## Cost Management

### Typical Ongoing Costs

| Service | Expected Range |
|---------|---------------|
| Hosting (Vercel/Railway) | $0-20/month |
| Database (Supabase/Railway) | $0-25/month |
| AI features (if any) | $5-50/month |
| Domain name | $10-15/year |

### Reducing Costs

```
"Help me reduce costs for {PROJECT_NAME}"
```

The system will analyze usage and suggest optimizations.

---

## Getting Help

### From the AI

```
"I need help with {PROJECT_NAME}"
```

Be specific about what's wrong or what you want.

### From Humans

If you need human help:
1. **Community:** Post in relevant forums/Discord
2. **Paid support:** Hire a developer from Upwork/Toptal
3. **Emergency:** Use your hosting provider's support

### Creating a Help Summary

```
"Create a support summary for {PROJECT_NAME}"
```

This generates a document you can share with human helpers.

---

## Shutting Down (If Needed)

If you need to shut down the app:

```
"Help me shut down {PROJECT_NAME}"
```

The system will:
1. Guide you through user notification
2. Export your data
3. Cancel hosting services
4. Archive the codebase

---

## Project Archives

### Your Project Files

| File | Contains |
|------|----------|
| `docs/PRD.md` | Original requirements |
| `docs/ARCHITECTURE.md` | Technical design |
| `docs/DECISIONS.md` | Why we made choices |
| `docs/MEMORY.md` | Lessons learned |

### Useful Commands

```bash
# View your project
cd {PROJECT_PATH}

# Start locally
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Remember

- **You own your code** - It's in your Git repo forever
- **Changes are safe** - We test before deploying
- **Help is available** - Just ask
- **Backups matter** - Keep your data safe

---

**Questions?** Just ask: "Help me with {PROJECT_NAME}"

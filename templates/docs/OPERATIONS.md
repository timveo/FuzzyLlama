# Operations Runbook

> **Project:** {PROJECT_NAME}
> **Created:** {DATE}
> **Last Updated:** {DATE}

---

## Quick Reference

| Task | Command/Location | Frequency |
|------|------------------|-----------|
| View logs | `railway logs` or Vercel dashboard | As needed |
| Check metrics | {MONITORING_URL} | Daily |
| Update knowledge base | See Section 3 | As needed |
| Update prompts | See Section 4 | As needed |
| Deploy changes | Push to main branch | As needed |

---

## 1. Daily Operations

### Health Check
```bash
# Check API health
curl https://{API_URL}/health

# Expected response:
# { "status": "healthy", "models": "connected", "database": "connected" }
```

### Key Metrics to Monitor

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Response latency | <2s | 2-5s | >5s |
| Error rate | <1% | 1-5% | >5% |
| AI API cost/day | <${DAILY_BUDGET} | 80-100% | >100% |
| Database connections | <80% | 80-90% | >90% |

### Dashboard Access

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Vercel | https://vercel.com/{team}/{project} | Frontend logs, deployments |
| Railway | https://railway.app/project/{id} | Backend logs, database |
| {MONITORING_TOOL} | {URL} | AI metrics, costs |

---

## 2. Common Tasks

### Restart Services

**Backend (Railway):**
```bash
# Via Railway CLI
railway service restart

# Or via dashboard: Railway > Service > Restart
```

**Frontend (Vercel):**
```bash
# Trigger redeploy
git commit --allow-empty -m "Redeploy"
git push
```

### View Logs

**Real-time logs:**
```bash
# Railway
railway logs -f

# Vercel (via CLI)
vercel logs {deployment-url}
```

**Search historical logs:**
- Railway: Dashboard > Observability > Logs
- Vercel: Dashboard > Deployments > Functions > Logs

### Scale Resources

**Increase backend resources:**
```bash
# Railway - update service settings
# Dashboard > Service > Settings > Resources
# Recommended: Start with 512MB RAM, scale to 1GB if needed
```

---

## 3. Knowledge Base Management

### Adding New Content

**Step 1: Prepare content**
```
Supported formats: .md, .txt, .pdf, .html
Location: /data/knowledge-base/
```

**Step 2: Add to knowledge base**
```bash
# Via API
curl -X POST https://{API_URL}/api/knowledge/ingest \
  -H "Authorization: Bearer {ADMIN_API_KEY}" \
  -F "file=@new-document.md"

# Or via Admin Dashboard
# Navigate to: Admin > Knowledge Base > Upload
```

**Step 3: Verify ingestion**
```bash
curl https://{API_URL}/api/knowledge/status
# Check: chunks_count increased, last_updated is recent
```

### Removing Content

```bash
# Remove by document ID
curl -X DELETE https://{API_URL}/api/knowledge/{document_id} \
  -H "Authorization: Bearer {ADMIN_API_KEY}"
```

### Re-index Knowledge Base

```bash
# Full re-index (use sparingly - costs embedding tokens)
curl -X POST https://{API_URL}/api/knowledge/reindex \
  -H "Authorization: Bearer {ADMIN_API_KEY}"
```

**Estimated cost:** ~$0.10 per 100 documents

---

## 4. Prompt Management

### Prompt File Locations

```
/src/prompts/
├── system/
│   ├── customer-support.txt    # Main system prompt
│   ├── faq-mode.txt           # FAQ-specific variant
│   └── complaint-handler.txt   # Complaint-specific variant
├── templates/
│   ├── greeting.txt           # Greeting template
│   └── fallback.txt           # When AI can't answer
└── config.json                # Prompt routing config
```

### Editing Prompts

**Step 1: Edit locally**
```bash
# Edit the prompt file
vim src/prompts/system/customer-support.txt
```

**Step 2: Test locally**
```bash
npm run dev
# Test in local chat interface
```

**Step 3: Deploy**
```bash
git add src/prompts/
git commit -m "Update customer support prompt"
git push
```

### Prompt Versioning

Prompts are version-controlled via Git. To rollback:
```bash
git log --oneline src/prompts/
git checkout {commit-hash} -- src/prompts/system/customer-support.txt
```

### A/B Testing Prompts

```javascript
// In config.json, set up A/B test:
{
  "abTest": {
    "enabled": true,
    "variants": {
      "A": "customer-support.txt",      // 50%
      "B": "customer-support-v2.txt"    // 50%
    }
  }
}
```

Monitor results in analytics dashboard.

---

## 5. Model Configuration

### Current Model Settings

```json
// src/config/models.json
{
  "router": {
    "simple": {
      "model": "claude-3-haiku-20240307",
      "maxTokens": 500,
      "temperature": 0.3
    },
    "complex": {
      "model": "gpt-4-turbo-preview",
      "maxTokens": 1000,
      "temperature": 0.7
    }
  },
  "thresholds": {
    "simpleComplexity": 0.4,
    "ragSimilarity": 0.7
  }
}
```

### Adjusting Thresholds

**Increase simple query routing (save costs):**
```json
"simpleComplexity": 0.5  // More queries go to cheap model
```

**Improve RAG precision:**
```json
"ragSimilarity": 0.75  // Only highly relevant chunks
```

### Changing Models

```json
// Switch from GPT-4 to Claude Opus for complex
"complex": {
  "model": "claude-3-opus-20240229",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

---

## 6. Cost Management

### Current Cost Structure

| Component | Cost Basis | Estimated |
|-----------|------------|-----------|
| Claude Haiku | $0.25/1M input, $1.25/1M output | $10-20/mo |
| Claude Sonnet | $3/1M input, $15/1M output | $20-40/mo |
| GPT-4 | $10/1M input, $30/1M output | $30-50/mo |
| Embeddings | $0.10/1M tokens | $5-10/mo |
| **Total AI** | | **$65-120/mo** |

### Cost Alerts

Alerts are configured in {MONITORING_TOOL}:
- Daily spend > ${DAILY_LIMIT}: Email alert
- Monthly spend > ${MONTHLY_LIMIT}: Slack + Email

### Reducing Costs

**Option 1: Adjust routing**
```json
// Route more to cheaper models
"simpleComplexity": 0.6
```

**Option 2: Reduce max tokens**
```json
"maxTokens": 400  // From 500
```

**Option 3: Cache common responses**
```javascript
// Enable response caching
CACHE_ENABLED=true
CACHE_TTL=3600  // 1 hour
```

---

## 7. Troubleshooting

### AI Not Responding

**Check 1: API keys valid**
```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

**Check 2: Rate limits**
- OpenAI: https://platform.openai.com/usage
- Anthropic: https://console.anthropic.com/

**Check 3: Service status**
- OpenAI: https://status.openai.com/
- Anthropic: https://status.anthropic.com/

### RAG Not Finding Relevant Content

**Check 1: Content is indexed**
```bash
curl https://{API_URL}/api/knowledge/stats
# Verify document_count > 0
```

**Check 2: Test similarity search**
```bash
curl -X POST https://{API_URL}/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "your test query", "limit": 5}'
```

**Check 3: Lower similarity threshold**
```json
"ragSimilarity": 0.6  // From 0.7
```

### High Latency

**Check 1: Which component is slow?**
- Look at logs for timing breakdown
- RAG retrieval should be <500ms
- Model inference varies by model

**Check 2: Database performance**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
```

**Check 3: Consider caching**
```javascript
CACHE_ENABLED=true
```

### High Error Rate

**Check 1: Error types in logs**
```bash
railway logs | grep ERROR
```

**Common errors:**
- `429`: Rate limited → Wait or upgrade API tier
- `500`: Server error → Check backend logs
- `timeout`: Model too slow → Adjust timeout or use faster model

---

## 8. Backup & Recovery

### Database Backups

**Railway PostgreSQL:**
- Automatic daily backups (7-day retention)
- Manual backup: Dashboard > Database > Backups > Create

**Restore from backup:**
```bash
# Railway dashboard > Database > Backups > Restore
```

### Code Backups

All code is in Git. To restore:
```bash
git log --oneline
git checkout {commit-hash}
```

### Knowledge Base Backup

```bash
# Export all knowledge
curl https://{API_URL}/api/knowledge/export \
  -H "Authorization: Bearer {ADMIN_API_KEY}" \
  > knowledge-backup.json

# Import backup
curl -X POST https://{API_URL}/api/knowledge/import \
  -H "Authorization: Bearer {ADMIN_API_KEY}" \
  -d @knowledge-backup.json
```

---

## 9. Security Operations

### Rotate API Keys

**Step 1: Generate new key**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

**Step 2: Update environment**
```bash
# Railway
railway variables set OPENAI_API_KEY=new-key-here
railway variables set ANTHROPIC_API_KEY=new-key-here
```

**Step 3: Verify**
```bash
curl https://{API_URL}/health
```

**Step 4: Revoke old key**
- Delete from respective dashboards

### Review Access Logs

```bash
# Check for suspicious activity
railway logs | grep "401\|403\|suspicious"
```

### Update Dependencies

```bash
# Check for vulnerabilities
npm audit

# Update packages
npm update

# Deploy
git add package*.json
git commit -m "Security: Update dependencies"
git push
```

---

## 10. Contacts & Escalation

### Internal

| Role | Contact | When |
|------|---------|------|
| On-call engineer | {ONCALL_CONTACT} | Production issues |
| Product owner | {PO_CONTACT} | Feature questions |
| Security | {SECURITY_CONTACT} | Security incidents |

### External

| Service | Support | SLA |
|---------|---------|-----|
| Vercel | support@vercel.com | Business hours |
| Railway | support@railway.app | Business hours |
| OpenAI | help.openai.com | Varies by tier |
| Anthropic | support@anthropic.com | Business hours |

---

## Appendix: Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
CACHE_ENABLED=true
CACHE_TTL=3600
LOG_LEVEL=info
ADMIN_API_KEY=admin-...

# Monitoring
SENTRY_DSN=https://...
```

---

**Last reviewed:** {DATE}
**Next review:** {DATE + 3 months}

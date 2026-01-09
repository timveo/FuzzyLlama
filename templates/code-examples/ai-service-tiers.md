# AI Service Infrastructure by Scale Tier

Reference implementations for AI-powered applications at different scales.

## Tier 1: MVP / Small Scale (< 10K requests/day)

**Cost:** $20-50/month

**Infrastructure:**
- Single API service (Railway/Render free tier)
- In-memory or Redis caching
- Basic monitoring

```typescript
// services/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory cache
const cache = new Map<string, { value: string; expiry: number }>();

export async function generateWithCache(
  prompt: string,
  options: { cacheKey?: string; cacheTTL?: number; maxTokens?: number } = {}
): Promise<string> {
  const { cacheKey, cacheTTL = 3600, maxTokens = 1024 } = options;

  // Check cache
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
  }

  // Generate
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const result = response.content[0].type === 'text' ? response.content[0].text : '';

  // Cache result
  if (cacheKey) {
    cache.set(cacheKey, { value: result, expiry: Date.now() + cacheTTL * 1000 });
  }

  return result;
}
```

## Tier 2: Production / Medium Scale (10K-1M requests/day)

**Cost:** $200-500/month

**Infrastructure:**
- Load-balanced API services (2+ replicas)
- Dedicated Redis cache cluster
- Model router for cost optimization
- Prometheus + Grafana monitoring

```typescript
// services/ai/router.ts
interface ModelConfig {
  name: string;
  costPerMToken: { input: number; output: number };
  latencyP95: number;
}

const models: Record<string, ModelConfig> = {
  'claude-sonnet-4-20250514': {
    name: 'claude-sonnet-4-20250514',
    costPerMToken: { input: 3.0, output: 15.0 },
    latencyP95: 580,
  },
  'claude-haiku-3-20240307': {
    name: 'claude-haiku-3-20240307',
    costPerMToken: { input: 0.25, output: 1.25 },
    latencyP95: 320,
  },
};

export function routeModel(context: {
  priority?: 'low' | 'medium' | 'high';
  budget?: 'strict' | 'flexible';
  complexity?: number; // 0-1
}): string {
  if (context.priority === 'high') return 'claude-sonnet-4-20250514';
  if (context.budget === 'strict') return 'claude-haiku-3-20240307';
  if ((context.complexity ?? 0.5) > 0.7) return 'claude-sonnet-4-20250514';
  return 'claude-haiku-3-20240307';
}
```

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const userRateLimit = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:user:' }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    if (req.user?.plan === 'enterprise') return 10000;
    if (req.user?.plan === 'pro') return 1000;
    return 100; // Free tier
  },
  message: 'Rate limit exceeded. Upgrade for higher limits.',
});
```

## Tier 3: Enterprise / High Scale (1M+ requests/day)

**Cost:** $2K-10K+/month

**Infrastructure:**
- Kubernetes cluster with auto-scaling
- Multi-region deployment
- Circuit breaker pattern for failover
- Advanced observability (traces, logs, metrics)

### Kubernetes Deployment

```yaml
# k8s/ai-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ai-service
  template:
    spec:
      containers:
        - name: ai-service
          image: your-registry/ai-service:latest
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-secrets
                  key: anthropic-api-key
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring Metrics

```typescript
// services/monitoring/metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';

export const aiRequestsTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total AI requests',
  labelNames: ['model', 'status'],
});

export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI request duration',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const aiCostTotal = new Counter({
  name: 'ai_cost_total_usd',
  help: 'Total AI cost in USD',
  labelNames: ['model'],
});
```

## Alert Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: ai_service
    rules:
      - alert: HighAIErrorRate
        expr: (rate(ai_errors_total[5m]) / rate(ai_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical

      - alert: HighAILatency
        expr: histogram_quantile(0.95, ai_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning

      - alert: AIBudgetExceeded
        expr: increase(ai_cost_total_usd[1h]) > 50
        labels:
          severity: critical
```

## Cost Optimization Checklist

| Strategy | Impact | Savings |
|----------|--------|---------|
| Redis caching for repeated queries | High | 30-50% |
| Model routing (cheap for simple tasks) | High | 40-60% |
| Prompt optimization (concise prompts) | Medium | 10-20% |
| Batching async requests | Medium | 15-25% |
| Output length control (max_tokens) | Low | 5-10% |

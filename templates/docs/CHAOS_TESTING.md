# Chaos Engineering Runbook

> **Project:** {PROJECT_NAME}
> **Created:** {DATE}
> **Last Tested:** {DATE}
> **Next Scheduled:** {DATE}

---

## Overview

Chaos engineering validates system resilience by intentionally injecting failures. This runbook documents failure scenarios, injection methods, and expected behaviors.

---

## Quick Reference

| Test Type | Frequency | Last Run | Status |
|-----------|-----------|----------|--------|
| Pod failure | Weekly | {DATE} | {PASS/FAIL} |
| Network partition | Monthly | {DATE} | {PASS/FAIL} |
| AI API failure | Weekly | {DATE} | {PASS/FAIL} |
| Database failover | Monthly | {DATE} | {PASS/FAIL} |
| High latency | Weekly | {DATE} | {PASS/FAIL} |

---

## 1. Prerequisites

### Environment Requirements

```bash
# Required tools
kubectl                    # Kubernetes CLI
chaos-mesh                 # Or LitmusChaos, Gremlin
k6                         # Load testing
jq                         # JSON processing

# Environment variables
export CHAOS_NAMESPACE=chaos-testing
export TARGET_NAMESPACE=production  # Or staging
export SLACK_WEBHOOK=https://hooks.slack.com/...
```

### Safety Checklist

Before running chaos tests:

- [ ] **Not in production** (unless explicitly approved)
- [ ] **Monitoring active** - Can observe failure and recovery
- [ ] **Rollback ready** - Can stop chaos injection immediately
- [ ] **Team notified** - Relevant stakeholders aware
- [ ] **Time-boxed** - Clear start and end time
- [ ] **Business hours** - Not during peak traffic

---

## 2. Pod Failure Tests

### Scenario: Single Pod Termination

**Purpose:** Verify application handles pod restarts gracefully

**Injection Method:**
```yaml
# chaos-mesh/pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-test
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: query-service
  scheduler:
    cron: "@every 5m"  # Or run once manually
```

**Expected Behavior:**
- [ ] Pod terminates and restarts within 30s
- [ ] Other pods handle traffic during restart
- [ ] No 5xx errors returned to users
- [ ] No data loss
- [ ] Health checks pass after restart

**Metrics to Monitor:**
- Request error rate (should stay <1%)
- Request latency (may spike briefly)
- Pod restart count
- Active connections

**Run Command:**
```bash
kubectl apply -f chaos-mesh/pod-kill.yaml
# Monitor for 10 minutes
kubectl delete -f chaos-mesh/pod-kill.yaml
```

---

### Scenario: All Pods in Service

**Purpose:** Verify service-level failure handling

**Injection Method:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: service-failure-test
spec:
  action: pod-kill
  mode: all
  selector:
    labelSelectors:
      app: query-service
```

**Expected Behavior:**
- [ ] Upstream services return graceful errors
- [ ] Circuit breaker opens
- [ ] Alert fires within 1 minute
- [ ] Auto-recovery within 2 minutes

---

## 3. Network Chaos Tests

### Scenario: Network Partition

**Purpose:** Verify behavior when services can't communicate

**Injection Method:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition
spec:
  action: partition
  mode: all
  selector:
    labelSelectors:
      app: query-service
  direction: both
  target:
    selector:
      labelSelectors:
        app: database
  duration: "60s"
```

**Expected Behavior:**
- [ ] Database queries timeout (not hang)
- [ ] Cached responses served where applicable
- [ ] Error messages indicate temporary issue
- [ ] Recovery automatic when partition heals

---

### Scenario: High Latency

**Purpose:** Verify timeout handling and user experience

**Injection Method:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: latency-injection
spec:
  action: delay
  mode: all
  selector:
    labelSelectors:
      app: query-service
  delay:
    latency: "3000ms"
    jitter: "1000ms"
  duration: "5m"
```

**Expected Behavior:**
- [ ] Requests timeout after configured threshold
- [ ] Users see "taking longer than expected" message
- [ ] No request queue buildup
- [ ] Metrics show latency increase

---

### Scenario: Packet Loss

**Purpose:** Verify retry logic and resilience to unreliable networks

**Injection Method:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: packet-loss
spec:
  action: loss
  mode: all
  selector:
    labelSelectors:
      app: query-service
  loss:
    loss: "25"  # 25% packet loss
  duration: "5m"
```

**Expected Behavior:**
- [ ] Retries succeed for idempotent operations
- [ ] Non-idempotent operations fail safely
- [ ] Error rate stays below 10%

---

## 4. AI/ML Failure Tests

### Scenario: AI API Timeout

**Purpose:** Verify fallback behavior when AI providers are slow

**Injection Method (Application Level):**
```typescript
// Enable via header or config
// X-Chaos-Type: timeout

const chaosMiddleware = (req, res, next) => {
  if (req.headers['x-chaos-type'] === 'ai-timeout') {
    return new Promise(() => {}); // Never resolves
  }
  next();
};
```

**Test Script:**
```bash
# Inject AI timeout
curl -X POST https://api.example.com/query \
  -H "X-Chaos-Type: ai-timeout" \
  -d '{"query": "test question"}'

# Expected: Fallback response within 10s
```

**Expected Behavior:**
- [ ] Circuit breaker opens after 3 failures
- [ ] Fallback model used (if configured)
- [ ] User sees degraded response, not error
- [ ] Metric: `ai_fallback_count` increases

---

### Scenario: AI API Error

**Purpose:** Verify error handling for AI provider failures

**Injection Method:**
```typescript
if (req.headers['x-chaos-type'] === 'ai-error') {
  throw new Error('Chaos: AI provider unavailable');
}
```

**Expected Behavior:**
- [ ] Circuit breaker opens
- [ ] Fallback response provided
- [ ] Error logged with context
- [ ] Alert fires if error rate >5%

---

### Scenario: AI Rate Limiting

**Purpose:** Verify behavior when hitting API rate limits

**Test Script:**
```bash
# Rapid-fire requests to trigger rate limiting
for i in {1..100}; do
  curl -X POST https://api.example.com/query \
    -d '{"query": "test '$i'"}' &
done
wait
```

**Expected Behavior:**
- [ ] Rate limit errors handled gracefully
- [ ] Exponential backoff applied
- [ ] Queue doesn't overflow
- [ ] Users see "try again shortly" message

---

## 5. Database Chaos Tests

### Scenario: Database Connection Pool Exhaustion

**Purpose:** Verify behavior when database connections are saturated

**Injection Method:**
```bash
# Consume all connections
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pg_sleep(300)
" &  # Repeat until pool exhausted
```

**Expected Behavior:**
- [ ] New requests wait in queue (with timeout)
- [ ] Error message indicates capacity issue
- [ ] No deadlocks
- [ ] Recovery when connections freed

---

### Scenario: Database Failover

**Purpose:** Verify application handles primary/replica switchover

**Injection Method:**
```bash
# Depends on database provider
# AWS RDS:
aws rds failover-db-cluster --db-cluster-identifier $CLUSTER_ID

# Manual PostgreSQL:
pg_ctl promote -D /var/lib/postgresql/data
```

**Expected Behavior:**
- [ ] Application reconnects automatically
- [ ] Brief error window (<30s)
- [ ] No data corruption
- [ ] Writes resume on new primary

---

## 6. Resource Exhaustion Tests

### Scenario: CPU Stress

**Purpose:** Verify behavior under CPU pressure

**Injection Method:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress
spec:
  mode: one
  selector:
    labelSelectors:
      app: query-service
  stressors:
    cpu:
      workers: 4
      load: 80  # 80% CPU usage
  duration: "5m"
```

**Expected Behavior:**
- [ ] Response times degrade gracefully
- [ ] HPA triggers scaling
- [ ] No OOM kills
- [ ] Recovery when stress ends

---

### Scenario: Memory Pressure

**Purpose:** Verify behavior under memory pressure

**Injection Method:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress
spec:
  mode: one
  selector:
    labelSelectors:
      app: query-service
  stressors:
    memory:
      workers: 2
      size: "512MB"
  duration: "5m"
```

**Expected Behavior:**
- [ ] GC activity increases
- [ ] No OOM kill (if sized correctly)
- [ ] Alert fires on high memory
- [ ] Recovery when stress ends

---

## 7. Multi-Tenant Isolation Tests

### Scenario: Noisy Neighbor

**Purpose:** Verify one tenant can't impact others

**Test Script:**
```bash
# Tenant A: Heavy load
for i in {1..1000}; do
  curl -X POST https://api.example.com/query \
    -H "X-Tenant-ID: tenant-a" \
    -d '{"query": "complex query '$i'"}' &
done

# Tenant B: Normal load (should be unaffected)
for i in {1..10}; do
  time curl -X POST https://api.example.com/query \
    -H "X-Tenant-ID: tenant-b" \
    -d '{"query": "simple query '$i'"}'
done
```

**Expected Behavior:**
- [ ] Tenant B latency unaffected (<2s)
- [ ] Tenant A rate limited
- [ ] No cross-tenant data leakage
- [ ] Per-tenant metrics accurate

---

## 8. Recovery Procedures

### Emergency Stop

```bash
# Stop all chaos experiments
kubectl delete podchaos,networkchaos,stresschaos --all -n chaos-testing

# Verify recovery
kubectl get pods -n production
kubectl top pods -n production
```

### Post-Chaos Checklist

After each chaos test:

- [ ] All experiments stopped
- [ ] Services healthy (check dashboards)
- [ ] No lingering errors
- [ ] Metrics returned to baseline
- [ ] Test results documented

---

## 9. Results Template

### Test Run: {DATE}

**Environment:** {staging/production}
**Duration:** {START} - {END}
**Conducted By:** {NAME}

| Test | Result | Notes |
|------|--------|-------|
| Pod failure | {PASS/FAIL} | {NOTES} |
| Network partition | {PASS/FAIL} | {NOTES} |
| AI timeout | {PASS/FAIL} | {NOTES} |
| Database failover | {PASS/FAIL} | {NOTES} |

**Issues Discovered:**
1. {ISSUE_1}
2. {ISSUE_2}

**Action Items:**
- [ ] {ACTION_1} - Owner: {NAME}
- [ ] {ACTION_2} - Owner: {NAME}

---

## 10. Automation

### Scheduled Chaos (Game Days)

```yaml
# chaos-schedule.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: weekly-chaos
spec:
  schedule: "0 10 * * 3"  # Every Wednesday at 10 AM
  type: PodChaos
  podChaos:
    action: pod-kill
    mode: one
    selector:
      labelSelectors:
        chaos-testing: enabled
```

### CI/CD Integration

```yaml
# .github/workflows/chaos-tests.yml
name: Chaos Tests
on:
  schedule:
    - cron: '0 10 * * 3'  # Weekly
  workflow_dispatch:

jobs:
  chaos:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Setup chaos-mesh
        run: |
          kubectl apply -f chaos-mesh/
      - name: Run chaos tests
        run: |
          ./scripts/run-chaos-tests.sh
      - name: Collect results
        run: |
          ./scripts/collect-chaos-results.sh
      - name: Notify
        if: failure()
        run: |
          curl -X POST $SLACK_WEBHOOK -d '{"text":"Chaos test failed!"}'
```

---

**Chaos Testing Owner:** {OWNER}
**Last Full Review:** {DATE}
**Next Game Day:** {DATE}

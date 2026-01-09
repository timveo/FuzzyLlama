# OWASP Top 10 Security Risks

Reference for the Security & Privacy Engineer agent. Check against this list during security reviews.

---

## 2021 OWASP Top 10

| # | Risk | Description | Prevention |
|---|------|-------------|------------|
| A01 | **Broken Access Control** | Users accessing unauthorized data/functions | Role-based access, deny by default, audit logging |
| A02 | **Cryptographic Failures** | Sensitive data exposure via weak/missing crypto | TLS everywhere, strong algorithms, secure key management |
| A03 | **Injection** | SQL, NoSQL, OS, LDAP injection attacks | Parameterized queries, input validation, ORMs |
| A04 | **Insecure Design** | Flaws in design patterns/architecture | Threat modeling, secure design patterns, defense in depth |
| A05 | **Security Misconfiguration** | Default configs, open cloud storage, verbose errors | Hardened defaults, minimal footprint, automated config checks |
| A06 | **Vulnerable Components** | Outdated libraries with known CVEs | Dependency scanning, automated updates, SBOMs |
| A07 | **Auth Failures** | Broken authentication/session management | MFA, secure session handling, rate limiting, credential stuffing protection |
| A08 | **Software/Data Integrity** | Insecure CI/CD, unverified updates | Signed commits, integrity checks, secure pipelines |
| A09 | **Logging/Monitoring Failures** | Missing or inadequate security logging | Comprehensive audit logs, alerting, log integrity |
| A10 | **Server-Side Request Forgery** | Server makes requests to attacker-controlled URLs | URL allowlists, network segmentation, disable redirects |

---

## Security Review Checklist

### A01: Access Control
- [ ] All endpoints enforce authentication
- [ ] Role-based access control (RBAC) implemented
- [ ] Resource ownership verified before access
- [ ] CORS configured restrictively
- [ ] Directory listing disabled
- [ ] Rate limiting on sensitive endpoints

### A02: Cryptographic Failures
- [ ] TLS 1.2+ for all connections
- [ ] Sensitive data encrypted at rest
- [ ] Passwords hashed with bcrypt/argon2
- [ ] No hardcoded secrets in code
- [ ] Proper key rotation procedures

### A03: Injection
- [ ] Parameterized queries for all DB access
- [ ] Input validation on all user inputs
- [ ] Output encoding for HTML/JS contexts
- [ ] Content-Type headers set correctly
- [ ] No dynamic command execution with user input

### A04: Insecure Design
- [ ] Threat model documented
- [ ] Security requirements in user stories
- [ ] Fail-secure defaults
- [ ] Defense in depth applied
- [ ] Trust boundaries defined

### A05: Security Misconfiguration
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Error messages don't leak info
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Cloud permissions minimal

### A06: Vulnerable Components
- [ ] `npm audit` / `pip audit` passes
- [ ] Dependencies up to date
- [ ] Known CVEs addressed
- [ ] SCA tool integrated in CI
- [ ] SBOM generated

### A07: Authentication Failures
- [ ] Strong password policy enforced
- [ ] Account lockout implemented
- [ ] Session timeout configured
- [ ] Secure session storage (HttpOnly, Secure, SameSite)
- [ ] MFA available for sensitive operations

### A08: Integrity Failures
- [ ] CI/CD pipeline secured
- [ ] Dependencies verified (checksums/signatures)
- [ ] Code signing enabled
- [ ] Deployment artifacts immutable
- [ ] Third-party integrations validated

### A09: Logging Failures
- [ ] Authentication events logged
- [ ] Access control failures logged
- [ ] Input validation failures logged
- [ ] Logs don't contain sensitive data
- [ ] Log integrity protected
- [ ] Alerting configured for anomalies

### A10: SSRF
- [ ] URL allowlists for external requests
- [ ] Internal network not accessible
- [ ] Response validation
- [ ] Redirects disabled or validated

---

## Severity Levels

| Level | Examples | Response |
|-------|----------|----------|
| **CRITICAL** | RCE, SQL injection, auth bypass | Block deployment, immediate fix |
| **HIGH** | XSS, CSRF, privilege escalation | Fix before production |
| **MEDIUM** | Info disclosure, missing headers | Fix within sprint |
| **LOW** | Minor misconfigs, best practice deviations | Track in tech debt |

---

## Integration Points

### CI/CD Security Checks
```yaml
# Recommended GitHub Actions security checks
- uses: snyk/actions/node@master  # SCA
- uses: github/codeql-action/analyze@v2  # SAST
- uses: aquasecurity/trivy-action@master  # Container scanning
```

### Security Headers Template
```typescript
// Express.js security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
}));
```

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)

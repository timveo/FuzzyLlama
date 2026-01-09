# Data Privacy & Compliance Guide

> **Project:** {PROJECT_NAME}
> **Created:** {DATE}
> **Last Updated:** {DATE}
> **Compliance Frameworks:** {GDPR, CCPA, SOC2, HIPAA - select applicable}

---

## Quick Reference

| Requirement | Status | Owner | Last Reviewed |
|-------------|--------|-------|---------------|
| Privacy Policy | {DRAFT/PUBLISHED} | {OWNER} | {DATE} |
| Cookie Consent | {NOT_STARTED/IMPLEMENTED} | {OWNER} | {DATE} |
| Data Inventory | {NOT_STARTED/COMPLETE} | {OWNER} | {DATE} |
| DSAR Process | {NOT_STARTED/IMPLEMENTED} | {OWNER} | {DATE} |
| DPA with AI Providers | {PENDING/SIGNED} | {OWNER} | {DATE} |

---

## 1. Data Inventory

### Personal Data Collected

| Data Category | Examples | Purpose | Legal Basis | Retention |
|---------------|----------|---------|-------------|-----------|
| **Identity** | Name, email | Account creation | Contract | Account lifetime + 30 days |
| **Contact** | Phone, address | Support, shipping | Contract | Account lifetime |
| **Usage** | Page views, clicks | Analytics | Legitimate interest | 26 months |
| **Technical** | IP, device info | Security, debugging | Legitimate interest | 90 days |
| **AI Interactions** | Chat history, queries | Service delivery | Contract | {RETENTION_PERIOD} |
| **Payment** | Card last 4, billing address | Billing | Contract | 7 years (legal) |

### AI-Specific Data

| Data Type | Storage Location | Retention | User Control |
|-----------|------------------|-----------|--------------|
| Chat messages | {DATABASE} | {PERIOD} | Export, Delete |
| AI responses | {DATABASE} | {PERIOD} | Export, Delete |
| Embeddings | {VECTOR_DB} | {PERIOD} | Delete only |
| Usage metrics | {ANALYTICS} | {PERIOD} | Anonymized |
| Feedback/ratings | {DATABASE} | {PERIOD} | Export, Delete |

### Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  Your App   │────▶│  Database   │
│  Browser    │     │  (Backend)  │     │ (PostgreSQL)│
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          │ API Calls
                          ▼
              ┌───────────────────────┐
              │   AI Providers        │
              │ ┌───────┐ ┌─────────┐ │
              │ │OpenAI │ │Anthropic│ │
              │ └───────┘ └─────────┘ │
              └───────────────────────┘
                          │
                          │ May retain for
                          │ abuse monitoring
                          ▼
              ┌───────────────────────┐
              │  Provider Logs        │
              │  (30 days typical)    │
              └───────────────────────┘
```

---

## 2. User Consent

### Consent Collection Points

| Touchpoint | Consent Type | Required Actions |
|------------|--------------|------------------|
| Sign-up | Terms & Privacy Policy | Checkbox (required) |
| First AI chat | AI data processing | Banner/Modal |
| Cookie banner | Analytics, Marketing | Granular choices |
| Email marketing | Marketing consent | Opt-in checkbox |
| Data export | Verification | Email confirmation |

### Cookie Categories

```javascript
// Cookie consent configuration
const cookieConfig = {
  necessary: {
    enabled: true,  // Always on
    cookies: ['session_id', 'csrf_token', 'auth_token']
  },
  functional: {
    enabled: false, // User choice
    cookies: ['language', 'theme', 'preferences']
  },
  analytics: {
    enabled: false, // User choice
    cookies: ['_ga', '_gid', 'plausible']
  },
  marketing: {
    enabled: false, // User choice
    cookies: ['_fbp', 'ads_id']
  }
};
```

### Consent Storage

```sql
-- Consent records table
CREATE TABLE user_consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP
);

-- Audit log for consent changes
CREATE TABLE consent_audit (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(20) NOT NULL, -- 'grant', 'withdraw', 'update'
  consent_type VARCHAR(50) NOT NULL,
  previous_value BOOLEAN,
  new_value BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Data Subject Rights (DSAR)

### Supported Rights

| Right | GDPR Article | Implementation | SLA |
|-------|--------------|----------------|-----|
| **Access** | Art. 15 | Export API | 30 days |
| **Rectification** | Art. 16 | Profile edit | Immediate |
| **Erasure** | Art. 17 | Delete API | 30 days |
| **Portability** | Art. 20 | Export API | 30 days |
| **Restriction** | Art. 18 | Account freeze | 72 hours |
| **Objection** | Art. 21 | Opt-out flags | 72 hours |

### Data Export API

```typescript
// GET /api/user/export
// Returns: JSON file with all user data

interface DataExportResponse {
  exportDate: string;
  user: {
    profile: UserProfile;
    consents: ConsentRecord[];
    loginHistory: LoginEvent[];
  };
  aiInteractions: {
    conversations: Conversation[];
    feedbackGiven: Feedback[];
  };
  billing: {
    invoices: Invoice[];
    subscriptionHistory: Subscription[];
  };
  // Note: Embeddings excluded (not human-readable)
}
```

### Data Deletion API

```typescript
// DELETE /api/user/data
// Triggers cascading deletion

interface DeletionProcess {
  // Immediate
  step1: 'Anonymize active sessions';
  step2: 'Queue async deletion job';

  // Within 24 hours
  step3: 'Delete from primary database';
  step4: 'Delete from vector database';
  step5: 'Request deletion from AI providers';

  // Within 30 days
  step6: 'Purge from backups';
  step7: 'Send confirmation email';
}
```

### DSAR Request Workflow

```
User Request → Verify Identity → Log Request → Process → Notify User
     │              │                │            │           │
     │              │                │            │           │
     ▼              ▼                ▼            ▼           ▼
  Via email    2FA or ID       Create ticket   Execute    Email +
  or in-app    verification    in system       action     audit log
```

---

## 4. AI Provider Compliance

### Provider Data Processing Agreements (DPAs)

| Provider | DPA Status | Data Location | Retention | Opt-out Available |
|----------|------------|---------------|-----------|-------------------|
| OpenAI | {SIGNED/PENDING} | US | 30 days | Yes (API) |
| Anthropic | {SIGNED/PENDING} | US | 30 days | Yes (API) |
| {OTHER} | {STATUS} | {LOCATION} | {PERIOD} | {YES/NO} |

### AI Data Handling Configuration

```typescript
// OpenAI - Disable training on your data
const openaiConfig = {
  // For API users, data is NOT used for training by default
  // But explicitly set for clarity
  headers: {
    'OpenAI-Organization': process.env.OPENAI_ORG_ID
  }
};

// Anthropic - Data handling
const anthropicConfig = {
  // API data not used for training
  // 30-day retention for abuse monitoring
};
```

### Data Sent to AI Providers

| Data Type | Sent to Provider | Mitigation |
|-----------|------------------|------------|
| User message | Yes (required) | None - core functionality |
| User name | Configurable | Strip PII before sending |
| User email | No | Never include |
| Conversation history | Configurable | Limit context window |
| System prompt | Yes | No user data in prompts |

### PII Stripping Before AI Calls

```typescript
// Middleware to strip PII before sending to AI
function stripPII(message: string): string {
  // Email addresses
  message = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

  // Phone numbers
  message = message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

  // Credit card numbers
  message = message.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');

  // SSN
  message = message.replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[SSN]');

  return message;
}
```

---

## 5. Data Retention

### Retention Schedule

| Data Category | Active Retention | Archive Period | Deletion Method |
|---------------|------------------|----------------|-----------------|
| User accounts | Account lifetime | +30 days | Hard delete |
| Chat history | {CONFIGURABLE} | +90 days | Hard delete |
| AI embeddings | With source data | Immediate | Hard delete |
| Analytics | 26 months | None | Auto-expire |
| Audit logs | 7 years | None | Archive only |
| Backups | 30 days | None | Auto-rotate |

### Automated Retention Enforcement

```typescript
// Scheduled job: daily at 2 AM
async function enforceRetention() {
  const retentionPolicies = [
    { table: 'chat_messages', days: 365 },
    { table: 'analytics_events', days: 730 },
    { table: 'session_logs', days: 90 },
  ];

  for (const policy of retentionPolicies) {
    await db.query(`
      DELETE FROM ${policy.table}
      WHERE created_at < NOW() - INTERVAL '${policy.days} days'
    `);
  }

  // Also clean vector store
  await vectorDb.deleteOlderThan(365);
}
```

---

## 6. Security Measures

### Data Protection Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Encryption at rest | AES-256 (database) | {IMPLEMENTED/PENDING} |
| Encryption in transit | TLS 1.3 | {IMPLEMENTED/PENDING} |
| Access logging | Audit table | {IMPLEMENTED/PENDING} |
| Key rotation | 90-day cycle | {IMPLEMENTED/PENDING} |
| Backup encryption | Same as primary | {IMPLEMENTED/PENDING} |

### Access Controls

```typescript
// Role-based access to personal data
const dataAccessRoles = {
  user: ['own_data:read', 'own_data:write', 'own_data:delete'],
  support: ['user_data:read'], // Read-only, logged
  admin: ['user_data:read', 'user_data:write'], // Logged
  system: ['all_data:read', 'all_data:write'], // Automated only
};

// All PII access is logged
async function logDataAccess(
  accessor: string,
  dataType: string,
  action: string,
  targetUserId: string
) {
  await db.insert('data_access_log', {
    accessor,
    data_type: dataType,
    action,
    target_user_id: targetUserId,
    timestamp: new Date(),
    ip_address: getClientIP(),
  });
}
```

---

## 7. Breach Response Plan

### Severity Classification

| Severity | Definition | Example | Response Time |
|----------|------------|---------|---------------|
| **Critical** | Mass PII exposure | Database breach | Immediate |
| **High** | Limited PII exposure | Single account breach | 4 hours |
| **Medium** | Metadata exposure | Analytics leak | 24 hours |
| **Low** | Non-sensitive exposure | Public data indexed | 72 hours |

### Response Checklist

```markdown
## Breach Response Steps

### Immediate (0-4 hours)
- [ ] Identify scope and affected data
- [ ] Contain the breach (revoke access, patch vulnerability)
- [ ] Preserve evidence for investigation
- [ ] Notify security team lead

### Short-term (4-24 hours)
- [ ] Document incident details
- [ ] Assess notification requirements
- [ ] Prepare user communication

### Notification (24-72 hours)
- [ ] Notify supervisory authority (if required)
- [ ] Notify affected users
- [ ] Update status page

### Post-incident (1-2 weeks)
- [ ] Complete root cause analysis
- [ ] Implement preventive measures
- [ ] Update security procedures
- [ ] File final incident report
```

### Notification Templates

**To Users:**
```
Subject: Important Security Notice - {COMPANY_NAME}

We are writing to inform you of a security incident that may have
affected your personal data.

What happened: {DESCRIPTION}
When: {DATE}
What data was affected: {DATA_TYPES}
What we're doing: {ACTIONS}
What you should do: {RECOMMENDATIONS}

We sincerely apologize for any concern this may cause.
```

**To Supervisory Authority (GDPR Article 33):**
```
1. Nature of breach: {DESCRIPTION}
2. Categories and approximate number of data subjects: {COUNT}
3. Categories and approximate number of records: {COUNT}
4. Name and contact details of DPO: {DPO_CONTACT}
5. Likely consequences: {ASSESSMENT}
6. Measures taken or proposed: {ACTIONS}
```

---

## 8. Third-Party Data Sharing

### Sub-Processors

| Sub-Processor | Purpose | Data Shared | DPA |
|---------------|---------|-------------|-----|
| {HOSTING_PROVIDER} | Infrastructure | All | {YES/NO} |
| {ANALYTICS_TOOL} | Analytics | Usage data | {YES/NO} |
| {EMAIL_PROVIDER} | Transactional email | Email, name | {YES/NO} |
| {PAYMENT_PROVIDER} | Billing | Payment info | {YES/NO} |
| OpenAI | AI processing | Chat content | {YES/NO} |
| Anthropic | AI processing | Chat content | {YES/NO} |

### Data Sharing Agreements

All sub-processors must:
- Sign Data Processing Agreement (DPA)
- Maintain SOC2 or equivalent certification
- Agree to data deletion on request
- Notify of any sub-sub-processors
- Allow audit rights

---

## 9. International Transfers

### Transfer Mechanisms

| Destination | Mechanism | Documentation |
|-------------|-----------|---------------|
| US (AI providers) | SCCs + DPA | {LINK} |
| US (hosting) | SCCs + supplementary measures | {LINK} |
| {OTHER} | {MECHANISM} | {LINK} |

### Supplementary Measures

For US transfers post-Schrems II:
- Encryption in transit and at rest
- Access controls limiting US access
- Contractual restrictions on government access
- Regular transfer impact assessments

---

## 10. Privacy by Design Checklist

### New Feature Privacy Review

```markdown
## Feature: {FEATURE_NAME}
## Date: {DATE}
## Reviewer: {NAME}

### Data Assessment
- [ ] What personal data does this feature collect?
- [ ] Is all collected data necessary (data minimization)?
- [ ] What is the legal basis for processing?
- [ ] How long will data be retained?

### User Control
- [ ] Can users access this data?
- [ ] Can users delete this data?
- [ ] Can users export this data?
- [ ] Is consent required? If so, how is it collected?

### Security
- [ ] Is data encrypted at rest?
- [ ] Is data encrypted in transit?
- [ ] Are access controls in place?
- [ ] Is access logged?

### Third Parties
- [ ] Is data shared with third parties?
- [ ] Are DPAs in place?
- [ ] Is data transferred internationally?

### Documentation
- [ ] Is privacy policy updated?
- [ ] Is data inventory updated?
- [ ] Is DPIA required?
```

---

## 11. Compliance Monitoring

### Regular Audits

| Audit Type | Frequency | Owner | Last Completed |
|------------|-----------|-------|----------------|
| Data inventory review | Quarterly | {OWNER} | {DATE} |
| Consent mechanism check | Monthly | {OWNER} | {DATE} |
| Retention enforcement | Weekly (automated) | System | {DATE} |
| Access log review | Monthly | {OWNER} | {DATE} |
| Sub-processor review | Annually | {OWNER} | {DATE} |

### Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| DSAR response time | <30 days | {CURRENT} |
| Consent rate | >80% | {CURRENT} |
| Data deletion success | 100% | {CURRENT} |
| Privacy training completion | 100% | {CURRENT} |

---

## Appendix: Legal Documents

### Required Documents Checklist

- [ ] Privacy Policy (public)
- [ ] Cookie Policy (public)
- [ ] Terms of Service (public)
- [ ] Data Processing Agreement template (for B2B)
- [ ] Sub-processor list (public)
- [ ] Data Subject Request form (public)
- [ ] Breach notification template (internal)
- [ ] DPIA template (internal)

### Document Locations

| Document | Location | Last Updated |
|----------|----------|--------------|
| Privacy Policy | {URL} | {DATE} |
| Cookie Policy | {URL} | {DATE} |
| Terms of Service | {URL} | {DATE} |
| DPA Template | {INTERNAL_LOCATION} | {DATE} |

---

**Data Protection Officer:** {DPO_NAME} - {DPO_EMAIL}
**Last Full Review:** {DATE}
**Next Scheduled Review:** {DATE}

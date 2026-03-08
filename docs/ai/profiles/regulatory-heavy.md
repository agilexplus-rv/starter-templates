# Regulatory-Heavy Profile

This profile activates when a project has compliance, legal, or regulatory
constraints that affect architecture, data handling, deployment, or auditability.

Activate this profile by initialising with:
```
claude-init regulatory-heavy [--ui] [--ecs]
```

Or manually, by including this document in your Claude session:
```
Use docs/ai/profiles/regulatory-heavy.md alongside requirements.md.
```

---

## When to Use This Profile

Use this profile when your system handles any of the following:

- Financial data (payments, investment records, tax data, account numbers)
- Health or medical data (PHI, HIPAA-scoped systems)
- Personal data subject to GDPR, CCPA, or equivalent
- Government or public sector data
- Data with mandatory retention or deletion requirements
- Systems requiring an immutable audit trail
- Systems with multi-jurisdiction data residency rules
- Payment Card Industry (PCI-DSS) scoped systems

When in doubt: if your legal team needs to review the architecture, use
this profile.

---

## Additional Architecture Requirements

When this profile is active, Claude must include all of the following
in `docs/ai/system-architecture.md`:

### Audit Logging

Every data mutation and access event must be logged immutably. The audit log
architecture must specify:
- Log storage location (separate table, S3 bucket, or log service)
- Log retention period (match your regulatory requirement)
- Log fields: user_id, action, resource_type, resource_id, timestamp, ip_address,
  outcome (success/failure), before_state (where applicable), after_state (where applicable)
- Audit logs must be append-only — no delete or update operations permitted
- Audit log access must itself be logged

### Encryption

The architecture must specify:
- Encryption at rest: algorithm and key management (AWS KMS recommended)
- Encryption in transit: TLS version (minimum 1.2, recommend 1.3)
- Which specific fields contain PII or sensitive data and how they are
  encrypted at the column level (if required by your regulatory framework)
- Key rotation policy

### Data Residency

The architecture must specify:
- The AWS region(s) where data is stored and processed
- Whether any data crosses regional or national boundaries (and if so, the
  legal basis for the transfer)
- S3 bucket region lock configuration
- RDS region constraint

### Access Control

The architecture must specify:
- Role-based access control (RBAC) model: list roles and what each may access
- Principle of least privilege: no role has more access than its function requires
- Admin access logging: all admin actions are logged
- Service account separation: each service has its own IAM role

### Data Retention and Deletion

The architecture must specify:
- Retention periods for each data type
- Deletion procedure for right-to-erasure requests (GDPR Article 17, CCPA, etc.)
- How deletion cascades through the data model
- How deletion is verified and logged
- Whether any data must be retained despite deletion requests (e.g. financial
  records for tax purposes)

### Incident Response

The architecture must specify:
- How a data breach is detected
- Who is notified and within what timeframe (GDPR requires 72 hours to supervisory authority)
- How affected users are notified
- How the breach scope is assessed

---

## Additional Preflight Checks (Mandatory)

When this profile is active, `preflight.sh` must also run:

### Dependency CVE scan
```bash
npm audit --audit-level=high || exit 1
```
No high or critical CVEs may be present in production dependencies.

### Secrets scan (extended)
All common secret patterns must be scanned, including:
- API keys, tokens, and credentials
- Private keys
- Database connection strings with credentials embedded
- Any value matching known secret patterns (use `truffleHog` or `gitleaks` in CI)

### OWASP dependency check
Run `npx better-npm-audit` or equivalent for OWASP Top-10 relevant dependency issues.

### Audit log table verification
Before deployment, verify that the audit_log table exists and is append-only:
```bash
node scripts/check-audit-log.js || exit 1
```

### Data residency verification
Verify all S3 buckets and RDS instances are in the approved region:
```bash
node scripts/check-data-residency.js || exit 1
```

---

## Additional Human Approval Requirements

When this profile is active, the following require explicit human sign-off
before Antigravity executes them:

| Action | Approval required from |
|---|---|
| Any schema migration | Tech lead + Compliance officer |
| Changes to audit logging logic | Tech lead |
| Changes to encryption configuration | Tech lead + Security |
| Changes to access control / RBAC logic | Tech lead |
| Any new external data integration | Tech lead + Compliance officer |
| Deletion or anonymisation procedures | Compliance officer |
| Deployment to production | Tech lead |

Document each approval in `docs/ai/decisions/` with the date, approver name,
and rationale.

---

## Compliance Artefacts Claude Must Generate

When this profile is active, Claude generates the following artefacts alongside
the standard architecture documents:

### docs/ai/compliance/data-map.md
A complete map of:
- Every data entity and field
- Classification (PII | Sensitive | Internal | Public)
- Where it is stored
- Who can access it
- Retention period
- Deletion procedure

### docs/ai/compliance/access-control-matrix.md
A matrix mapping every user role to every resource and the operations
(read / write / delete / admin) each role is permitted.

### docs/ai/compliance/encryption-spec.md
Specifies:
- What is encrypted at rest and at the column level
- Key management approach
- Key rotation schedule
- TLS configuration

### docs/ai/compliance/audit-log-spec.md
Specifies:
- Every auditable event
- Log fields and format
- Storage and retention
- Access controls on the log itself

### docs/ai/compliance/data-retention-policy.md
Specifies:
- Retention periods per data type
- Deletion procedure
- Legal holds (when deletion is suspended)
- Deletion verification

---

## Prohibited Patterns in Regulatory-Heavy Systems

When this profile is active, Antigravity missions must explicitly prohibit:

- Logging of PII fields (names, emails, NINs, account numbers) in application logs
- Storing credentials or secrets in environment variables committed to the repo
- Soft deletes as the only deletion mechanism (unless the compliance requirement
  permits it — some require hard delete)
- Wildcard IAM policies (`"Action": "*"` or `"Resource": "*"`)
- Public S3 buckets
- Unencrypted database connections
- Admin endpoints without multi-factor authentication
- Synchronous deletion without audit log entry

---

## Profile-Specific Mission Types

This profile adds two additional mission types to the standard set:

**compliance-artefact** — Generates a compliance document (data map, access
matrix, etc.) without touching production code. Executed by Claude, not Antigravity.

**security-hardening** — A specific type of backend mission focused on
implementing a security control (encryption, rate limiting, IP allowlisting,
audit logging infrastructure). Follows all standard mission rules plus mandatory
human review before execution.

---

## Related Documents

- `docs/ai/claude-role-constraints.md`
- `docs/ai/templates/mission-template.md`
- `docs/ai/agent-concurrency-protocol.md`
- `ai/checks/preflight.sh` (enhanced version required for this profile)
- `scripts/check-migrations.js`
- `scripts/check-audit-log.js` (create before deploying any regulatory system)
- `scripts/check-data-residency.js` (create before deploying any regulatory system)

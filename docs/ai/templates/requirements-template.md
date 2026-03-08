# Requirements Template

Copy this file to docs/ai/requirements.md and fill in every section.
The orchestrator will not begin architecture generation until all
[REQUIRED] sections are complete.

Guidance is provided inline. Remove guidance text before saving.

---

# Project Requirements

## 1. System Purpose [REQUIRED]

What does this system do? Who is it for? What problem does it solve?
Write 2–5 sentences. Be specific — avoid marketing language.

```
Example:
A multi-tenant SaaS platform for independent financial advisors to manage
client portfolios, generate regulatory-compliant reports, and track investment
performance. Advisors log in, manage their client list, and produce PDF
reports for submission to their compliance team.
```

---

## 2. Primary Users [REQUIRED]

List each type of user and their key actions. One row per user type.

| User Type | Description | Key Actions |
|---|---|---|
| Example: Admin | Platform owner, manages tenants | Create/suspend tenants, view all activity |
| Example: Advisor | Primary user | Manage clients, generate reports, view dashboards |
| Example: Client | Read-only | View their own portfolio summary |

---

## 3. Core Features [REQUIRED]

Number every feature. Be specific. Avoid vague terms like "dashboard" or
"management" without explaining what they contain.

```
1. User authentication — email/password login, JWT-based sessions, password reset via email
2. Client management — CRUD for client profiles, including contact info, risk profile, and portfolio allocation
3. Portfolio tracking — manual entry of holdings, automatic P&L calculation, historical performance chart
4. Report generation — PDF reports with client summary, holdings table, and performance graph; branded with advisor logo
5. Admin panel — tenant management, usage statistics, subscription status
```

---

## 4. Non-Functional Requirements [REQUIRED]

### Performance
```
Example:
- Page load < 2s on 4G connection
- API response < 300ms at p95 under 100 concurrent users
- Report generation < 5s
```

### Security
```
Example:
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Multi-tenant isolation: no tenant may access another's data
- Session tokens expire after 15 minutes of inactivity
- No PII in server logs
```

### Scale
```
Example:
- Initial: 50 advisors, 500 clients
- 12-month target: 500 advisors, 10,000 clients
- Stateless app tier (horizontal scaling via ECS)
```

### Availability
```
Example:
- 99.9% uptime SLA
- Maintenance windows Sunday 02:00–04:00 UTC
```

---

## 5. Integration Dependencies [REQUIRED if any]

List every external system, API, or service this system must integrate with.

| Service | Purpose | Auth method | Notes |
|---|---|---|---|
| Example: Stripe | Subscription billing | API key | Webhook for payment events |
| Example: SendGrid | Transactional email | API key | Password reset, notifications |
| Example: Auth0 | Identity provider | OAuth 2.0 | SSO for enterprise tenants |
| Example: AWS S3 | PDF report storage | IAM role | Reports stored per-tenant |

If no integrations: write "None at this time."

---

## 6. Data Model Overview [REQUIRED]

List the core entities and their key fields. This is not the full schema —
Claude will produce that in system-architecture.md. This is enough to
understand the domain.

```
Example:
- Tenant: id, name, subscription_status, logo_url, created_at
- User: id, tenant_id, email, password_hash, role (admin|advisor), last_login
- Client: id, user_id, name, email, risk_profile, created_at
- Holding: id, client_id, asset_name, quantity, purchase_price, purchase_date
- Report: id, client_id, generated_at, file_url, status
```

---

## 7. Deployment Target [REQUIRED]

```
Example:
- Cloud: AWS (ap-southeast-2)
- App tier: ECS Fargate (Next.js or Express)
- Database: RDS PostgreSQL 15
- File storage: S3
- CDN: CloudFront (for static assets and PDFs)
- Container registry: ECR
- Secrets: AWS Secrets Manager
```

---

## 8. Compliance Requirements [REQUIRED if applicable]

List any regulatory or compliance constraints that affect the architecture.
If none, write "None."

```
Example:
- Financial data must remain in Australia (data residency: ap-southeast-2 only)
- Audit log required for all data access and mutations (immutable, retained 7 years)
- Reports must conform to ASIC regulatory reporting format v3.2
- GDPR: right to erasure must be implementable within 30 days
```

---

## 9. UI & Design Preferences [OPTIONAL]

```
Example:
- Design system: Tailwind CSS + shadcn/ui components
- Tone: Professional, minimal, no decorative illustrations
- Colour palette: Defined in docs/ai/ui-preferences.md
- Motion: Use docs/ai/ui-motion-guidelines.md
- Responsive: Mobile-first, must work on tablet and desktop
- Dark mode: Not required in v1
```

If UI screenshots are available, reference them here:
```
docs/ui-references/dashboard.png — dashboard layout
docs/ui-references/report-page.png — report generation page
```

---

## 10. Out of Scope (v1) [OPTIONAL but recommended]

Explicitly list what this version does NOT include, to prevent scope creep
and to help Claude avoid over-engineering the architecture.

```
Example:
- Mobile native app (web only in v1)
- Two-factor authentication
- Automated data import from brokers
- Multi-currency support
- White-labelling for enterprise clients
```

---

## 11. Open Questions [OPTIONAL]

List anything that still needs a decision before architecture can be finalised.
Claude will flag these during the requirements quality gate if left unresolved.

```
Example:
- Decision needed: Will reports be generated synchronously or via a background job queue?
- Decision needed: Is the advisor-to-client relationship always 1:many, or can clients have multiple advisors?
- Decision needed: Are there hard limits on portfolio holdings per client?
```

---

## Checklist Before Handing to Orchestrator

Before running `Use docs/ai/requirements.md and run the wizard`, confirm:

- [ ] Section 1 (System Purpose) — complete, specific
- [ ] Section 2 (Primary Users) — all user types listed
- [ ] Section 3 (Core Features) — numbered, specific features (not vague areas)
- [ ] Section 4 (NFRs) — performance, security, and scale targets defined
- [ ] Section 5 (Integrations) — all external services listed, or "None"
- [ ] Section 6 (Data Model) — key entities named
- [ ] Section 7 (Deployment) — AWS region and services confirmed
- [ ] Section 8 (Compliance) — regulatory constraints listed, or "None"
- [ ] No open questions that block architecture decisions

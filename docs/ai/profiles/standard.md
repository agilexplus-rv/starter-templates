# Standard Profile

This is the default profile for the Rudie Orchestrator Platform. Use it for
mainstream web applications that do not have special compliance, scale, or
architectural constraints.

If you are unsure which profile to use, use this one.

---

## When to Use This Profile

Use Standard when your project:
- Is a typical web application (SaaS, internal tool, customer portal, e-commerce)
- Has no regulatory or compliance constraints (HIPAA, GDPR-critical, PCI-DSS, etc.)
- Is built by a small-to-medium team (1–10 developers)
- Targets a standard AWS deployment (ECS Fargate, RDS, S3, CloudFront)
- Has a reasonable feature scope (up to ~30 features, 1–3 user types)

---

## Activation

This profile is active by default. No explicit activation is needed.

For a new project, start the wizard with:

```
Use docs/ai/requirements.md and run the wizard.
Load docs/ai/claude-role-constraints.md.
```

---

## Architecture Requirements

Claude must include the following in `docs/ai/system-architecture.md`:

**Authentication and authorisation**
- Authentication method (JWT, sessions, OAuth)
- Role definitions and access control model
- Session expiry and refresh strategy

**Data model**
- All entities with key fields and relationships
- Primary keys and index strategy
- Soft delete vs. hard delete approach

**API design**
- REST or GraphQL decision and rationale
- Versioning strategy
- Error response format (consistent shape across all endpoints)
- Pagination approach for list endpoints

**Infrastructure**
- AWS services used and their purpose
- Environment separation (dev / staging / production)
- Secrets management approach (AWS Secrets Manager recommended)
- Deployment method (ECS task definition, image tagging strategy)

**Observability**
- Logging approach (structured JSON logs recommended)
- Error tracking service (e.g. Sentry)
- Key metrics to monitor post-deployment

---

## Preflight Requirements

Standard preflight checks apply:
1. TypeScript type check
2. Lint (zero warnings)
3. Build
4. Tests
5. Prisma schema validation
6. Migration safety check
7. Secrets scan
8. Environment variable completeness
9. Docker build

Run: `./ai/checks/preflight.sh`

---

## Approval Gates

| Gate | Requirement |
|---|---|
| Requirements quality gate | All 8 required sections complete |
| Mission approval | Human review before any mission moves to IN PROGRESS |
| Schema migration | Human approval for destructive operations only |
| Staging promotion | Smoke test pass + tech lead sign-off |
| Production deploy | Tech lead sign-off |

---

## Mission Concurrency

Standard concurrency rules apply. Refer to `docs/ai/agent-concurrency-protocol.md`.
Typical Standard projects can run 2–4 missions in parallel safely if file
ownership is clean.

---

## What This Profile Does Not Cover

If your project requires any of the following, switch to the appropriate profile:

- Regulatory compliance (HIPAA, GDPR, PCI-DSS) → `regulatory-heavy`
- No frontend / API service only → `api-only`
- 50+ UI components / design-system-heavy → `ui-heavy`
- MVP needing fast iteration with minimal process → `startup-mvp`

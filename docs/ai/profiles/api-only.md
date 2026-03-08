# API-Only Profile

Use this profile for backend services, microservices, data pipelines, or any
project that produces an API but has no frontend. There is no UI layer, no
Gemini ideation, and no screenshot-to-component pipeline.

---

## When to Use This Profile

Use API-Only when your project:
- Is a REST or GraphQL API service with no user-facing UI
- Is a microservice within a larger system
- Is a data ingestion or processing service
- Is a webhook handler, job processor, or background worker
- Exposes endpoints consumed by other services or a separate frontend team
- Has no `docs/ui-references/` screenshots and no `ui-pages.md`

---

## Activation

```
Use docs/ai/requirements.md and run the wizard.
Load docs/ai/claude-role-constraints.md.
Load docs/ai/profiles/api-only.md — this is an API-only project with no frontend.
```

---

## Architecture Requirements

Claude must include the following in `docs/ai/system-architecture.md`:

**API contract**
- Every endpoint: method, path, request shape, response shape, auth requirement
- Error response format (consistent across all endpoints)
- Pagination strategy for collection endpoints
- Rate limiting approach
- Versioning strategy (URL prefix `/v1/`, header, or none with justification)

**Authentication and authorisation**
- How callers authenticate (API key, JWT, mTLS, service-to-service token)
- Scope or permission model if multiple caller types exist
- Token expiry and rotation strategy

**Data model**
- All entities, fields, types, and relationships
- Which entities are exposed via the API vs. internal-only
- Soft delete vs. hard delete per entity type

**Queue and async processing** (if applicable)
- Job queue technology (SQS, BullMQ, etc.)
- Job retry strategy and dead-letter handling
- Idempotency approach for webhook consumers

**Observability (mandatory for API-Only)**
- Structured request logging (method, path, status, latency, caller ID)
- Distributed tracing approach (if called by other services)
- Health check endpoint (`GET /health` returning `{ status: "ok" }`)
- Readiness vs. liveness checks for ECS

**Contract documentation**
- OpenAPI / Swagger spec location and generation approach
- How consumers of this API will be notified of breaking changes

---

## Gemini and UI Pipeline

Gemini is not used in this profile. There is no UI ideation step.

Do not create `docs/ai/ui-pages.md` or `docs/ui-references/`.

If the API will eventually have an admin UI or dashboard, start a separate
project using the Standard or UI-Heavy profile for that frontend.

---

## Mission Types Used

| Type | Used? | Notes |
|---|---|---|
| backend | ✅ Yes | Primary mission type |
| database | ✅ Yes | Schema and migrations |
| infrastructure | ✅ Yes | ECS, SQS, IAM, etc. |
| test | ✅ Yes | Integration and unit tests |
| frontend | ❌ No | No frontend in this profile |
| refactor | ✅ Yes | Code quality improvements |

---

## API Contract as Acceptance Criteria

Every backend mission in an API-Only project must include API contract
verification in ACCEPTANCE CRITERIA:

```
- [ ] GET /users returns 200 with array of user objects matching the schema in system-architecture.md
- [ ] GET /users?page=2&limit=20 returns correct paginated result
- [ ] GET /users/:id returns 404 with standard error shape if user not found
- [ ] All endpoints return Content-Type: application/json
- [ ] Health check GET /health returns { status: "ok" } with 200
```

---

## Preflight Additions

In addition to standard preflight, API-Only projects should add:

**OpenAPI spec validation** (if generated):
```bash
npx swagger-cli validate docs/openapi.yaml || exit 1
```

**Health endpoint smoke test** (post-build):
```bash
# Add to preflight or a separate smoke-test.sh
curl -sf http://localhost:3000/health || exit 1
```

---

## Deployment Notes

API-Only services on ECS Fargate should configure:
- **Health check:** `GET /health` — must return 200 within 5 seconds
- **Desired count:** At least 2 tasks for production (no single point of failure)
- **Graceful shutdown:** Handle `SIGTERM` — finish in-flight requests before exit
- **Environment variables:** All config via environment, no files
- **No public ALB required** if service is internal — use AWS Service Connect
  or internal ALB with VPC-only access

These requirements must be specified in the infrastructure mission.

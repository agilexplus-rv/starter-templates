# Mission Template

Copy this file to docs/ai/missions/MISSION-[ID]-[slug].md
Fill in all fields. Fields marked [REQUIRED] must not be left blank.
Fields marked [OPTIONAL] may be omitted if not applicable.

---

```
MISSION ID:        [REQUIRED] MISSION-001
TITLE:             [REQUIRED] Short human-readable description (e.g. "Implement auth service")
TYPE:              [REQUIRED] One of: backend | frontend | database | infrastructure | test | refactor
STATUS:            [REQUIRED] PENDING
PRIORITY:          [REQUIRED] One of: critical | high | normal | low
CREATED BY:        Claude Orchestrator
CREATED AT:        [REQUIRED] YYYY-MM-DD
APPROVED BY:       [Populated by human reviewer before execution]
APPROVED AT:       [Populated by human reviewer before execution]

---

AGENT:             [REQUIRED] Antigravity
DEPENDS ON:        [OPTIONAL] Comma-separated list of MISSION IDs that must be COMPLETE first
                   Example: MISSION-001, MISSION-002
                   Leave blank if no dependencies.

---

FILES OWNED:       [REQUIRED] Explicit list of every file this mission may create or modify.
                   Antigravity must not touch any file not listed here.
                   One file per line.

  Example:
    src/services/auth.ts                (create)
    src/services/auth.test.ts           (create)
    src/middleware/requireAuth.ts       (create)
    src/routes/auth.ts                  (modify)
    prisma/schema.prisma                (modify — only if TYPE is database)

---

INPUTS:            [REQUIRED] Architecture docs, schemas, API contracts, or other documents
                   this mission reads to complete its work.

  Example:
    docs/ai/system-architecture.md     (auth service section)
    docs/ai/process-flows.md           (login and token refresh flows)
    prisma/schema.prisma               (User model)

---

CONTEXT:           [REQUIRED] Full description of what this mission implements.
                   Be specific. Antigravity will implement exactly what is written here.
                   Do not leave decisions to the agent — resolve all architecture questions
                   before creating this mission.

  Example:
    Implement a JWT-based authentication service. The service must:
    - Accept email and password, validate against bcrypt hash in the User table
    - Issue a short-lived access token (15 min) and a long-lived refresh token (7 days)
    - Store refresh tokens in a RefreshToken table (see schema)
    - Expose POST /auth/login, POST /auth/refresh, POST /auth/logout
    - Use the existing Express router pattern from src/routes/
    - Return standardised error shapes as defined in docs/ai/system-architecture.md

---

ACCEPTANCE CRITERIA: [REQUIRED] Testable, binary conditions. Each item must be verifiable.

  - [ ] POST /auth/login returns 200 with accessToken and refreshToken on valid credentials
  - [ ] POST /auth/login returns 401 on invalid credentials
  - [ ] POST /auth/refresh returns a new accessToken given a valid refreshToken
  - [ ] POST /auth/refresh returns 403 if refreshToken is expired or revoked
  - [ ] POST /auth/logout invalidates the refresh token in the database
  - [ ] requireAuth middleware rejects requests without a valid accessToken
  - [ ] All endpoints have corresponding unit tests with >80% branch coverage
  - [ ] No secrets or hardcoded credentials in source files
  - [ ] TypeScript strict mode — no implicit any

---

TECHNICAL CONSTRAINTS: [OPTIONAL] Specific implementation requirements or prohibitions.

  Example:
    - Use jsonwebtoken library (already installed)
    - Do not use passport.js — custom implementation only
    - Refresh tokens must be stored hashed, not plaintext
    - Error messages must not expose whether the email exists or not

---

DEPENDENCIES TO INSTALL: [OPTIONAL] npm packages to install if not already present.

  Example:
    jsonwebtoken
    @types/jsonwebtoken

---

MIGRATION INSTRUCTIONS: [OPTIONAL — Required if TYPE is database]
                         Provide the exact migration intent. Do not write the SQL here —
                         Antigravity generates the migration from the Prisma schema change.
                         All migrations require human approval before running.

  Example:
    Add RefreshToken model to prisma/schema.prisma:
      - id: String @id @default(cuid())
      - token: String @unique
      - userId: String (FK to User)
      - expiresAt: DateTime
      - revokedAt: DateTime?
      - createdAt: DateTime @default(now())

    After modifying schema.prisma, generate migration with:
      npx prisma migrate dev --name add-refresh-tokens

    Migration must be reviewed for destructiveness before running on staging.

---

UI SPECIFICATIONS: [OPTIONAL — Required if TYPE is frontend]
                   Reference the relevant ui-pages.md entry and any ui-references screenshots.

  Example:
    See docs/ai/ui-pages.md — Login Page section
    Visual reference: docs/ui-references/login-screen.png
    Motion: Use docs/ai/ui-motion-guidelines.md — modal entrance (180ms)
    Component must be added to docs/ai/ui-component-registry.md on completion.

---

ROLLBACK:          [OPTIONAL] How to undo this mission if it causes a production issue.

  Example:
    - Delete src/services/auth.ts, src/services/auth.test.ts, src/middleware/requireAuth.ts
    - Revert src/routes/auth.ts to previous version via git
    - Run: npx prisma migrate resolve --rolled-back [migration-name]

---

FAILURE NOTES:     [Populated by agent if STATUS becomes FAILED or BLOCKED]

---

SCOPE FLAGS:       [Populated by agent if implementation requires out-of-scope file changes]

---

COMPLETION NOTES:  [Populated by agent when STATUS becomes COMPLETE]
                   Brief summary of what was implemented and any notable decisions made.

---

STATUS HISTORY:
  PENDING    → [timestamp]
  APPROVED   → [timestamp] by [name]
  IN PROGRESS → [timestamp]
  COMPLETE   → [timestamp]
```

---

## Mission Type Quick Reference

| TYPE | Use for | May touch schema? | Requires UI spec? |
|---|---|---|---|
| backend | Services, APIs, middleware, utilities | No | No |
| frontend | Components, pages, client logic | No | Yes |
| database | Schema changes, migrations, seeds | Yes | No |
| infrastructure | Dockerfile, env config, AWS, CI/CD | No | No |
| test | Test suites only, no production code | No | No |
| refactor | Restructuring without behaviour change | No | No |

## Notes for Claude When Generating Missions

- One mission per cohesive unit of work — do not bundle unrelated concerns
- `FILES OWNED` must be complete and explicit before the mission is approved
- All architectural decisions must be resolved in `CONTEXT` — do not leave
  decisions for Antigravity to make
- If a mission depends on a model or API not yet implemented, set `DEPENDS ON`
  accordingly
- Database missions with destructive potential (DROP, NOT NULL without default,
  type changes) must include a warning in `TECHNICAL CONSTRAINTS` and must be
  flagged for mandatory human review before migration runs

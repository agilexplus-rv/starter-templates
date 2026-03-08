# Rudie Orchestrator Architecture — v5

## Primary Flow

```
User / Product Owner
        │
        ▼
  docs/ai/requirements.md
  (use docs/ai/templates/requirements-template.md)
        │
        ▼
  ┌─────────────────────────────┐
  │   Requirements Quality Gate │
  │   (Claude validates that    │
  │   all required sections     │
  │   are present and specific  │
  │   before proceeding)        │
  └─────────────────────────────┘
        │
        ▼
  Claude Orchestrator
  ┌──────────────────────────────────────────────────┐
  │  Role: planning + architecture ONLY              │
  │  Claude never writes production code             │
  │  See: docs/ai/claude-role-constraints.md         │
  └──────────────────────────────────────────────────┘
        │
        ├─ generates ──► docs/ai/system-architecture.md
        │                docs/ai/process-flows.md
        │                docs/ai/ui-pages.md
        │                docs/ai/decisions/*
        │                AI_MEMORY_SNAPSHOT.md
        │
        ├─ [if UI work required] ──────────────────────────────────┐
        │                                                          │
        │         Gemini                                           │
        │    ┌────────────────────────────┐                        │
        │    │  Role: UI ideation ONLY    │                        │
        │    │  Input: screenshot from    │                        │
        │    │  docs/ui-references/*.png  │                        │
        │    │  Output: layout concept,   │                        │
        │    │  component suggestions,    │                        │
        │    │  animation ideas           │                        │
        │    └────────────────────────────┘                        │
        │                  │                                       │
        │                  ▼                                       │
        │    Claude validates Gemini UI concept                    │
        │    against system-architecture.md                        │
        │    (confirms feasibility, flags conflicts)               │
        │                  │                                       │
        │                  ▼                                       │
        │    UI missions added to mission list ◄────────────────────┘
        │
        ▼
  Implementation Missions
  docs/ai/missions/MISSION-*.md
  (use docs/ai/templates/mission-template.md)
        │
        ▼
  ┌──────────────────────────────┐
  │   Human Approval Gate        │
  │   Review all missions before │
  │   any Antigravity agent runs │
  │   Approve in mission STATUS  │
  └──────────────────────────────┘
        │
        ▼
  Antigravity Agents
  ┌───────────────────────────────────────────────────┐
  │  Role: code generation and implementation ONLY    │
  │  Consult: docs/ai/agent-concurrency-protocol.md   │
  │  No two agents may own the same file              │
  │  Only one database mission active at a time       │
  └───────────────────────────────────────────────────┘
        │
        ▼
  Application Code
        │
        ▼
  ┌──────────────────────────────┐
  │   Architecture Drift Check   │
  │   Verify generated code      │
  │   matches system-            │
  │   architecture.md            │
  └──────────────────────────────┘
        │
        ▼
  Build + Preflight
  ./ai/checks/preflight.sh
  ┌──────────────────────────────────────────┐
  │  TypeScript check    ✓                   │
  │  Lint                ✓                   │
  │  Build               ✓                   │
  │  Tests               ✓                   │
  │  Prisma validate     ✓                   │
  │  Migration safety    ✓                   │
  │  Secrets scan        ✓                   │
  │  Env vars            ✓                   │
  │  Docker build        ✓                   │
  │                                          │
  │  All checks must pass. No exceptions.    │
  └──────────────────────────────────────────┘
        │
        ▼
  Staging Deploy + Smoke Test
        │
        ▼
  ┌──────────────────────────────┐
  │   Promotion Approval         │
  │   Human sign-off required    │
  │   before production deploy   │
  └──────────────────────────────┘
        │
        ▼
  AWS Production Deployment
  ECS Fargate (app) / RDS PostgreSQL (db) / S3 + CloudFront (assets)
        │
        ├─ [success] ──► Health Check + Monitoring Verified
        │                Audit Trail Updated
        │
        └─ [failure] ──► Rollback Protocol
                         Revert to last known-good ECS task definition
                         Roll back migration if applicable
                         Notify team
```

---

## Role Summary

| Agent | Responsibility | May write code? |
|---|---|---|
| Claude | Orchestration, architecture, missions | No |
| Gemini | UI ideation, layout concepts | No |
| Antigravity | Implementation, code generation | Yes — exclusively |
| Human | Requirements, approvals, deployments | Yes |

---

## Feedback Loops

**Antigravity → Claude (mission failure)**
When a mission reaches `STATUS: FAILED`, the agent populates `FAILURE NOTES`
and Claude re-evaluates the affected architecture section, then generates a
corrective mission.

**Antigravity → Claude (scope flag)**
When a mission requires touching a file outside `FILES OWNED`, the agent raises
a `SCOPE FLAG` and sets `STATUS: BLOCKED`. Claude resolves the scope question
and either expands the mission or creates a new dependent mission.

**Post-deployment → Claude (drift detection)**
After each implementation batch, compare the codebase structure against
`docs/ai/system-architecture.md`. If drift is found, Claude generates corrective
missions or updates the architecture document to reflect intentional changes.

---

## Document Map

```
docs/ai/
├── requirements.md                    ← YOU write this (use template)
├── system-architecture.md             ← Claude generates
├── process-flows.md                   ← Claude generates
├── ui-pages.md                        ← Claude generates
├── ui-component-registry.md           ← Claude maintains
├── AI_MEMORY_SNAPSHOT.md              ← Claude maintains
├── claude-role-constraints.md         ← Framework rule (do not edit)
├── antigravity-agent-guide.md         ← Framework rule (do not edit)
├── agent-concurrency-protocol.md      ← Framework rule (do not edit)
├── decisions/                         ← Claude generates, one file per decision
├── missions/                          ← Claude generates (MISSION-*.md)
├── profiles/
│   └── regulatory-heavy.md            ← Activate for compliance projects
├── templates/
│   ├── requirements-template.md       ← Start here for every project
│   └── mission-template.md            ← Claude uses this to generate missions
├── ui-motion-guidelines.md            ← Design system (edit as needed)
└── ui-skills/
    └── hero-section.md                ← Component-level UI guidance

docs/ui-references/                    ← YOU place screenshots here
ai/checks/
└── preflight.sh                       ← Run before every deployment
scripts/
├── check-migrations.js                ← Called by preflight.sh
└── check-env.js                       ← Called by preflight.sh
```

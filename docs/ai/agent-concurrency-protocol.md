# Agent Concurrency Protocol

This document defines the rules for running multiple Antigravity agents in
parallel. Follow this protocol every time more than one mission is executing
simultaneously.

Breaking this protocol causes file conflicts, schema corruption, and
unrecoverable merge states. Do not skip it.

---

## The Golden Rule

**No two active missions may own the same file.**

File ownership is declared in the `FILES OWNED` field of each mission. Before
starting any mission, verify that none of its owned files appear in the
`FILES OWNED` list of any currently `IN PROGRESS` mission.

---

## Pre-Execution Conflict Check

Before marking any mission `IN PROGRESS`, perform this check:

1. List all missions currently in `STATUS: IN PROGRESS`
2. Collect all files from their `FILES OWNED` fields
3. Compare against the `FILES OWNED` of the mission you are about to start
4. If any file appears in both lists: **do not start the new mission**
5. If no overlap: the mission is safe to start in parallel

### Quick conflict check (manual)

Open `docs/ai/missions/` and scan `FILES OWNED` across all `IN PROGRESS`
missions. If any file path appears in more than one active mission, you have
a conflict.

### Example: safe parallel execution

```
MISSION-003 (IN PROGRESS) owns:
  src/services/auth.ts
  src/services/auth.test.ts
  src/middleware/requireAuth.ts

MISSION-004 (about to start) owns:
  src/components/LoginForm.tsx
  src/components/LoginForm.test.tsx
  src/styles/auth.css

→ No overlap. Safe to run in parallel.
```

### Example: conflict — do not run in parallel

```
MISSION-003 (IN PROGRESS) owns:
  src/services/auth.ts
  src/middleware/requireAuth.ts

MISSION-005 (about to start) owns:
  src/middleware/requireAuth.ts     ← CONFLICT
  src/middleware/rateLimiter.ts

→ CONFLICT on src/middleware/requireAuth.ts
→ MISSION-005 must wait until MISSION-003 is COMPLETE
```

---

## Special Rules for High-Risk Files

Some files require exclusive ownership regardless of apparent overlap risk:

### Prisma Schema (prisma/schema.prisma)

Only **one** database mission may be `IN PROGRESS` at any time. No exceptions.

Simultaneous schema edits produce merge conflicts that Prisma cannot
automatically resolve and that may corrupt the migration history.

Rule: Before starting any `TYPE: database` mission, all other `TYPE: database`
missions must be `COMPLETE`.

### Shared Utility Modules

Files in `src/lib/`, `src/utils/`, `src/hooks/`, or similar shared utility
directories are high-conflict risk. If two missions both need to modify the
same utility file:

- The orchestrator must split the changes into a dependency chain (one mission
  modifies the utility, the second mission depends on it)
- Or the orchestrator must bundle both changes into a single mission

Do not allow two agents to independently modify a shared utility file.

### Configuration Files

`package.json`, `tsconfig.json`, `.eslintrc`, `next.config.js`, and similar
root configuration files may only be owned by one active mission at a time.

---

## Mission Dependency Ordering

The `DEPENDS ON` field in each mission file enforces sequential ordering where
required. The orchestrator is responsible for setting this field correctly.

```
MISSION-001: Implement User model (database)
MISSION-002: Implement auth service — DEPENDS ON: MISSION-001
MISSION-003: Implement auth routes — DEPENDS ON: MISSION-002
MISSION-004: Implement dashboard UI — DEPENDS ON: MISSION-001
```

In this example, MISSION-002 and MISSION-004 can run in parallel after
MISSION-001 completes (they have no file ownership conflicts).
MISSION-003 must wait for MISSION-002.

---

## What To Do When a Conflict Is Discovered Mid-Execution

If a conflict is discovered after a mission has already started (because the
pre-execution check was not performed, or a scope flag introduced an overlap):

1. Immediately pause the newer mission (set `STATUS: BLOCKED`)
2. Add a `SCOPE FLAG` explaining the conflict
3. Do not attempt to manually merge
4. Wait for the conflicting mission to reach `COMPLETE`
5. Then resume the blocked mission from where it left off, or restart it if
   the completed mission changed the context significantly

---

## Agent Execution Log

Maintain a simple log in `docs/ai/missions/EXECUTION-LOG.md` tracking:

```
| Mission ID | Started At | Completed At | Agent | Status |
|---|---|---|---|---|
| MISSION-001 | 2026-03-08 09:00 | 2026-03-08 09:45 | Antigravity | COMPLETE |
| MISSION-002 | 2026-03-08 09:46 | — | Antigravity | IN PROGRESS |
| MISSION-003 | — | — | — | PENDING |
```

This log is the source of truth for what is currently running. Update it
before starting any agent.

---

## Summary Rules

| Rule | Enforcement |
|---|---|
| No two active missions own the same file | Pre-execution conflict check |
| Only one database mission active at a time | Schema exclusive lock |
| Dependencies must be COMPLETE before dependents start | DEPENDS ON field |
| Shared utilities touched by one agent at a time | Orchestrator bundles or sequences |
| Config files owned by one active mission at a time | Pre-execution conflict check |
| All concurrency decisions logged | EXECUTION-LOG.md |

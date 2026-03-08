# Brownfield Mode — Working with Existing Codebases

This document defines how to use the Rudie Orchestrator Platform when adding
features to an existing codebase rather than starting from scratch.

The framework is designed for greenfield (new) projects by default. Brownfield
use requires several adjustments to prevent the orchestrator from treating the
existing codebase as if it doesn't exist.

---

## When to Use Brownfield Mode

Use this mode when:
- The repository already has production code, a schema, or existing infrastructure
- You are adding a new feature to a live system
- You are migrating from one architecture to another
- You are onboarding an existing project into the orchestrator framework

Do NOT use this mode for new projects. Use the standard greenfield workflow.

---

## Step 1 — Audit the Existing Codebase First

Before writing requirements.md or running the wizard, Claude must understand
what already exists. Load the following context into the Claude session:

```
I am using brownfield mode. This is an existing codebase.
Please read the following before starting the wizard:
- The current directory structure (I will paste it below)
- [Any existing architecture documents if they exist]
- [The Prisma schema if one exists]
- [The package.json to understand dependencies and stack]
```

Ask Claude to produce a **Brownfield Architecture Summary**:

```
Produce a brownfield-architecture-summary.md for this project.
Include:
- Current technology stack
- Existing entities and data model
- Existing API routes (if any)
- Current deployment method
- Technical debt or known issues
- What exists vs. what needs to be built
```

Save this to `docs/ai/brownfield-architecture-summary.md`. This file will be
loaded alongside `requirements.md` in all future sessions.

---

## Step 2 — Write Requirements for the NEW Work Only

`docs/ai/requirements.md` describes only the feature or change you are adding,
NOT the entire existing system.

In the System Purpose section, make this explicit:

```
This project adds [new feature] to an existing [system type].
The existing system already handles [what currently exists].
This document covers only the new work.
```

Reference the brownfield summary:

```
See docs/ai/brownfield-architecture-summary.md for the existing codebase context.
```

---

## Step 3 — Architecture Generates Against the Existing System

When running the wizard, load both documents:

```
Use docs/ai/requirements.md and run the wizard.
Also load docs/ai/brownfield-architecture-summary.md — this is an existing codebase.
Load docs/ai/claude-role-constraints.md.

Important: The architecture must integrate with and extend the existing codebase,
not replace it. Identify what already exists and build on top of it.
```

Claude will:
1. Validate requirements against the existing architecture
2. Identify integration points with existing code
3. Generate missions that modify existing files (not just create new ones)
4. Flag any conflicts between new requirements and existing patterns

---

## Step 4 — Mission FILES OWNED Must Include Existing Files

In brownfield mode, missions commonly modify existing files. This is expected and
correct — it does not differ from the standard mission rules.

The critical rule remains: every file a mission will touch must be explicitly
listed in FILES OWNED, whether the file is new or pre-existing.

For pre-existing files, mark them clearly in the mission:

```
FILES OWNED:
  src/services/auth.ts          (modify — existing file)
  src/services/auth.test.ts     (modify — existing file)
  src/routes/users.ts           (modify — existing file)
  src/services/mfa.ts           (create — new file)
```

---

## Step 5 — Handle Pre-Existing Tests

If the codebase has existing tests, missions that modify existing files must
explicitly state whether those tests should be updated or extended. Add to
ACCEPTANCE CRITERIA:

```
- [ ] All pre-existing tests for the modified files continue to pass
- [ ] New test cases added for new behaviour introduced by this mission
```

---

## Step 6 — Schema Migrations on Live Data

Brownfield database migrations carry extra risk because the schema has live data.
Every database mission on a brownfield project must:

1. State approximate row counts for affected tables (if known) in CONTEXT
2. Use a safe migration pattern (never add NOT NULL without DEFAULT on populated tables)
3. Be approved in `docs/ai/decisions/migration-approvals.md` before running
4. Be tested against a production-data-sized staging database before deploying

---

## Step 7 — Preserving Existing Patterns

Claude must detect and follow the existing codebase's patterns, not impose new
ones. If the existing codebase uses a particular error-handling approach,
dependency injection style, or naming convention, new missions must follow the
same patterns.

Include in your Claude session prompt for brownfield work:

```
Match the existing code style and patterns exactly.
Do not introduce new patterns or conventions unless the requirements explicitly
require architectural change.
```

---

## Brownfield Session Initialisation Template

Copy this for every brownfield Claude session:

```
I am using brownfield mode on an existing codebase.

Load these files:
- docs/ai/requirements.md           (new work only)
- docs/ai/brownfield-architecture-summary.md  (existing system context)
- docs/ai/claude-role-constraints.md
- AI_MEMORY_SNAPSHOT.md             (if it exists, for session continuity)

Rules:
- Generate architecture and missions that integrate with the existing codebase
- Do not replace or ignore existing patterns — extend them
- Any file in FILES OWNED may be pre-existing; this is expected
- All other orchestrator rules apply as normal
```

---

## Common Brownfield Failure Modes

**Orchestrator generates greenfield architecture** — Happens when brownfield context
is not loaded. Always include `brownfield-architecture-summary.md` in session context.

**Missions overwrite existing logic** — Happens when FILES OWNED lists a file for
modification but CONTEXT doesn't describe what to preserve. Always include in
CONTEXT: "Preserve all existing behaviour except [specific change]."

**Circular mission dependencies due to existing code** — Happens when existing files
are depended on by both old and new missions. Resolve by treating existing code as
a read-only input, not a FILES OWNED target, unless the mission is specifically
updating it.

**Schema migration on unknown data volume** — Happens when row counts are unknown.
Always run `SELECT COUNT(*) FROM affected_table` before generating a database mission
and include the count in CONTEXT.

# Session Protocol

This document defines rules for Claude orchestration sessions to prevent
conflicts from multiple simultaneous sessions and ensure session continuity.

---

## One Session Rule

**Only one Claude orchestration session may be active on a project at a time.**

Two simultaneous Claude sessions will:
- Generate duplicate or conflicting mission files
- Both update `AI_MEMORY_SNAPSHOT.md` with different versions
- Produce architecture decisions that contradict each other
- Neither session will be aware of what the other generated

This is not detectable by tooling — it is a human process responsibility.

---

## Starting a Session

Before starting any Claude session on a project:

1. Confirm no other team member has an active orchestration session open
2. Check `AI_MEMORY_SNAPSHOT.md` to understand the current state
3. Check `docs/ai/missions/EXECUTION-LOG.md` to see what is currently IN PROGRESS
4. Check `docs/ai/missions/` for any PENDING or BLOCKED missions not yet addressed

If you see missions in IN PROGRESS state from a previous session that are not
actually running, update their status before starting a new session.

---

## Session Initialisation (Standard Template)

Copy this block at the start of every orchestration session:

```
Load AI_MEMORY_SNAPSHOT.md to restore session context.
Load docs/ai/claude-role-constraints.md — these are your role constraints.
[Brownfield only] Load docs/ai/brownfield-architecture-summary.md.

Your role: Claude orchestrator. You generate architecture and missions only.
You do not write implementation code under any circumstances.
```

---

## Session Handoff

When ending a session and handing off to another person (or resuming later):

Claude must update `AI_MEMORY_SNAPSHOT.md` with:

```markdown
# AI Memory Snapshot
Last updated: [date and time]
Last session summary: [1-2 sentences on what was accomplished]

## Architecture state
[Current summary of system-architecture.md — key patterns and decisions]

## Mission status
[Full list of all missions with current STATUS]

## Open questions
[Any unresolved architecture questions from this session]

## Decisions made this session
[Key decisions and their rationale — link to decisions/ files]

## Next steps
[What should happen in the next session]
```

---

## Multiple Team Members

For teams with more than one person using the orchestrator:

- Treat orchestration sessions like database migrations: one at a time, in sequence
- Use a shared document, Slack channel, or GitHub issue to signal "session open" / "session closed"
- Never merge two sets of generated missions without reviewing for conflicts
- If two sessions generated competing missions, resolve using the architecture document as the source of truth

---

## Recovery: Duplicate or Conflicting Missions

If two sessions have produced conflicting missions (e.g. two missions both own
the same file with different implementations):

1. Do not execute either mission
2. Start a new Claude session with both missions loaded as context
3. Ask Claude to reconcile the conflict: "These two missions conflict on [file].
   Which approach is correct per the architecture, and how should they be merged?"
4. Claude generates a single resolved mission and marks the originals as CANCELLED
5. Execute the resolved mission

---

## Recovery: Deleted AI_MEMORY_SNAPSHOT.md

If `AI_MEMORY_SNAPSHOT.md` is missing:

1. Start a new Claude session with:
   ```
   AI_MEMORY_SNAPSHOT.md is missing. Please reconstruct session context from:
   - docs/ai/system-architecture.md
   - docs/ai/process-flows.md
   - docs/ai/missions/ (all mission files)
   - docs/ai/decisions/ (all decision files)
   ```
2. Claude will reconstruct a new snapshot from the architecture documents
3. Save the reconstructed snapshot as `AI_MEMORY_SNAPSHOT.md`

Session state is recoverable because all decisions and architecture are preserved
in their own files. The snapshot is an index, not the primary record.

# Startup MVP Profile

Use this profile when speed of iteration is the primary constraint. It reduces
approval gates and documentation overhead while keeping the core safety rules
intact — Claude still orchestrates, Antigravity still implements, production
code still goes through preflight.

This profile trades process rigour for velocity. Use it consciously and
migrate to Standard when the product stabilises.

---

## When to Use This Profile

Use Startup MVP when:
- You are building a pre-revenue or early-stage product
- The team is 1–3 people, often the founder writing requirements directly
- Speed to first user is more important than comprehensive documentation
- The system has no compliance constraints and no sensitive data
- You expect the architecture to change significantly in the next 3 months
- You are validating a hypothesis, not building a production system

Do NOT use this profile for:
- Systems handling payments, health data, or personal data at scale
- Systems with more than one team working concurrently
- Products past product-market fit where stability matters

---

## Activation

```
Use docs/ai/requirements.md and run the wizard.
Load docs/ai/claude-role-constraints.md.
Load docs/ai/profiles/startup-mvp.md — this is an MVP project. Optimise for speed.
```

---

## Reduced Requirements

The requirements document may be shorter under this profile.

**Minimum required sections:**
- System purpose (2+ sentences)
- Core features (at least 5 numbered items)
- Deployment target (cloud + region)

**Sections that may be deferred:**
- Non-functional requirements (define before v1 launch)
- Detailed data model (can emerge during architecture)
- Compliance requirements (confirm "None" explicitly)

You must still run `node scripts/check-requirements.js` — it will pass with
the reduced minimum.

---

## Streamlined Architecture

Claude generates a leaner architecture document under this profile:

- **Skip for now:** detailed observability spec, multi-region design, DR plan
- **Required:** data model, auth approach, core API routes, deployment method
- **Encouraged:** explicit list of what is intentionally deferred to v2

Claude should flag technical debt decisions explicitly:

```
⚠ MVP Decision: Using in-memory session storage for speed. Must be replaced
  with Redis or DB-backed sessions before scaling beyond 1 server.
```

All MVP decisions must be logged in `docs/ai/decisions/` with a `MVP-DEBT:`
prefix so they are easy to find later.

---

## Reduced Approval Gates

| Gate | Standard requirement | MVP requirement |
|---|---|---|
| Requirements quality gate | All 8 sections | 3 core sections |
| Mission approval | Human review of all missions | Review critical and database missions only |
| Schema migration | Approval for destructive ops | Approval for DROP only |
| Staging | Smoke test + sign-off | Self-sign-off permitted |
| Production deploy | Tech lead sign-off | Founder sign-off (same person) |

The human approval gate for missions is **not eliminated** — it is streamlined.
At minimum, read every mission before running it.

---

## Mission Scope

MVP missions may be broader than Standard missions. A single mission can
cover more ground if the work is cohesive and the founder is watching closely.

Still required:
- FILES OWNED must be explicit (no wildcards)
- ACCEPTANCE CRITERIA must be testable
- Database missions require approval

Relaxed:
- CONTEXT word minimum reduced (20 words minimum instead of 50)
- ROLLBACK field is optional (but recommended for database missions)

---

## Preflight

All preflight checks still run. No exceptions.

The only difference: if `npm run test` doesn't exist yet (no tests written),
preflight will warn rather than fail — but add a note to write tests before
v1 launch.

Run: `./ai/checks/preflight.sh`

---

## Graduating from MVP Profile

When any of these conditions are met, migrate to the Standard profile:

- First paying customer
- More than 3 people on the team
- Storing PII for more than 100 users
- System has been live for more than 3 months
- You stop feeling comfortable skipping any approval gate

To migrate: load `docs/ai/profiles/standard.md` into a Claude session and ask:

```
We are graduating from the startup-mvp profile to standard.
Review docs/ai/system-architecture.md and list every MVP-DEBT decision
that must be resolved before we can consider this a production system.
Generate missions for each item.
```

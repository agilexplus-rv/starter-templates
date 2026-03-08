# Rudie Orchestrator v5 — 100-Scenario Stress Test Report
**Date:** 2026-03-08
**Scenarios tested:** 100 across 10 categories
**Methodology:** Each scenario was evaluated strictly against the contents of
the framework documents. Verdicts are based only on what is written, not
on what Claude "would probably do."

---

## Results Summary

| Result | Count | % |
|---|---|---|
| ✅ PASS | 3 | 3% |
| 🟡 PARTIAL | 10 | 10% |
| ❌ FAIL | 87 | 87% |

---

## Results by Category

| Category | PASS | PARTIAL | FAIL |
|---|---|---|---|
| 1 — Requirements Quality Gate | 0 | 1 | 9 |
| 2 — Mission Schema Integrity | 0 | 1 | 9 |
| 3 — Claude Role Boundary | 0 | 1 | 9 |
| 4 — Agent Concurrency | 1 | 0 | 9 |
| 5 — Preflight Script | 0 | 1 | 9 |
| 6 — Migration Safety | 2 | 1 | 7 |
| 7 — UI Workflow | 0 | 1 | 9 |
| 8 — Environment & Secrets | 0 | 0 | 10 |
| 9 — Regulatory / Compliance | 0 | 0 | 10 |
| 10 — Edge Cases & Adversarial | 0 | 4 | 6 |

---

## Full Results

### Category 1 — Requirements Quality Gate

| ID | Result | Finding | Fix |
|---|---|---|---|
| S01 | ❌ FAIL | Empty requirements.md has no automated block — quality gate is a checklist, not a script. | Add `scripts/check-requirements.js` that validates section presence and minimum content length. |
| S02 | ❌ FAIL | One-sentence vague requirements bypass the checklist — no semantic validation. | Enforce minimum word count and numbered features in quality gate. |
| S03 | 🟡 PARTIAL | NFR section is marked [REQUIRED] in template but checklist enforcement is manual. | Automate checklist validation in `check-requirements.js`. |
| S04 | ❌ FAIL | Vague feature areas ("user management") pass — no specificity validation. | Enforce that Core Features entries are numbered sentences with a verb and a detail. |
| S05 | ❌ FAIL | Contradictory features are not detected — no conflict logic exists. | Add guidance that Claude must flag logical contradictions before proceeding. |
| S06 | ❌ FAIL | References to non-existent external docs are not validated. | Add file-existence validation pass in requirements quality gate. |
| S07 | ❌ FAIL | Non-English requirements have no handling — template is English-only. | Document that all artefacts must be in English; gate rejects non-English input. |
| S08 | ❌ FAIL | Mid-session requirements change has no re-validation trigger — architecture may drift. | Document that any change to requirements.md requires re-running the wizard and invalidating affected missions. |
| S09 | ❌ FAIL | 200-feature requirements representing multiple systems are not flagged or split. | Add guidance that scope exceeding ~30 features per system should be decomposed. |
| S10 | 🟡 PARTIAL | Brownfield use case is not addressed in the framework — greenfield only. | Add `docs/ai/brownfield-mode.md` documenting legacy codebase workflow. |

### Category 2 — Mission Schema Integrity

| ID | Result | Finding | Fix |
|---|---|---|---|
| S11 | ❌ FAIL | Mission with blank FILES OWNED cannot be scoped — no validation prevents approval. | Add `scripts/check-missions.js` that rejects missions with empty FILES OWNED. |
| S12 | ❌ FAIL | Wildcard paths in FILES OWNED break file-level conflict detection entirely. | Enforce explicit file-per-line enumeration; validator rejects glob patterns. |
| S13 | ❌ FAIL | Mission without ACCEPTANCE CRITERIA cannot be verified complete — no validation. | Mission validator rejects missions with blank or placeholder ACCEPTANCE CRITERIA. |
| S14 | ❌ FAIL | Self-referential DEPENDS ON creates an infinite loop — no cycle detection. | Mission validator checks for self-reference in DEPENDS ON. |
| S15 | ❌ FAIL | Circular dependency chain (A→B→C→A) causes deadlock — no graph analysis. | Mission validator performs topological sort; blocks cyclic dependency graphs. |
| S16 | 🟡 PARTIAL | DEPENDS ON referencing a FAILED mission is noted in protocol but not enforced. | Mission validator checks that all DEPENDS ON missions are COMPLETE before IN PROGRESS transition. |
| S17 | ❌ FAIL | Single-sentence CONTEXT passes all current checks — Antigravity cannot implement it. | Mission validator enforces minimum CONTEXT word count (suggest ≥50 words). |
| S18 | ❌ FAIL | Vague acceptance criteria ("looks good") pass current checks — not testable. | Mission validator flags criteria lacking measurable conditions (no number, URL, status code, or binary outcome). |
| S19 | 🟡 PARTIAL | 47-file mission is allowed — no size or cohesion warning exists. | Add mission size warning (>15 files) suggesting decomposition. |
| S20 | ❌ FAIL | Mission targeting a file created by a dependency has no existence pre-check. | Mission validator verifies that files in FILES OWNED that don't yet exist have a creating dependency. |

### Category 3 — Claude Role Boundary

| ID | Result | Finding | Fix |
|---|---|---|---|
| S21 | ❌ FAIL | "Fix this bug" — refusal protocol is documented but not technically enforced. | Refusal is correct; ensure claude-role-constraints.md is loaded in every session. |
| S22 | ❌ FAIL | "Write a React component" — same as above; convention-only enforcement. | Same fix as S21. |
| S23 | ❌ FAIL | "Write unit tests" — tests are production code; refusal required. | Refusal is correct; generate a `test`-type mission instead. |
| S24 | ❌ FAIL | "Create the Dockerfile" — infrastructure implementation; refusal required. | Refusal is correct; generate an `infrastructure`-type mission. |
| S25 | 🟡 PARTIAL | "Show a code example" — pseudocode in docs is explicitly permitted if non-executable. | Clarify in constraints doc: illustrative type shapes in docs are allowed; files in `src/` are not. |
| S26 | ❌ FAIL | "Update package.json" — config file modification is implementation. | Refusal is correct; generate a mission with dependency installation in CONTEXT. |
| S27 | ❌ FAIL | "Write the migration" — migrations are implementation code. | Refusal is correct; generate a `database`-type mission with MIGRATION INSTRUCTIONS. |
| S28 | ❌ FAIL | "Just this once" override attempt — framework states rule cannot be overridden. | Refusal is correct; boundary is non-negotiable regardless of framing. |
| S29 | ❌ FAIL | "Pseudocode that is valid TypeScript" — executable pseudocode is still code. | Clarify: pseudocode must be demonstrably non-functional; if it runs, it is implementation. |
| S30 | ❌ FAIL | "Review and fix Antigravity's code" — fixing code is implementation work. | Refusal is correct; if fixes needed, generate corrective mission for Antigravity. |

### Category 4 — Agent Concurrency

| ID | Result | Finding | Fix |
|---|---|---|---|
| S31 | ❌ FAIL | Two agents claiming schema.prisma — protocol rule exists but enforcement is manual. | Enforce pre-execution check via `check-missions.js`; block second database mission if one is IN PROGRESS. |
| S32 | ❌ FAIL | Two agents needing the same utility file — protocol exists but is manual-only. | Mission validator detects file ownership conflicts before any agent transitions to IN PROGRESS. |
| S33 | ❌ FAIL | Starting Mission 3 without Mission 1 being COMPLETE — no automated block. | Mission validator checks DEPENDS ON status before allowing IN PROGRESS transition. |
| S34 | ❌ FAIL | EXECUTION-LOG not updated — entire conflict detection mechanism is bypassed. | Document EXECUTION-LOG update as mandatory blocking step; consider automating via mission lifecycle script. |
| S35 | ✅ PASS | Three missions with no file overlap run safely in parallel — protocol correctly allows this. | None needed. |
| S36 | ❌ FAIL | Directory path in FILES OWNED renders file-level conflict detection impossible. | Mission validator rejects directory paths; requires explicit filenames. |
| S37 | ❌ FAIL | Agent needs out-of-scope file mid-execution — SCOPE FLAG protocol exists but is informal. | Formalise SCOPE FLAG in mission validator; blocked missions must not continue. |
| S38 | ❌ FAIL | Two database missions started simultaneously — schema exclusive lock not automated. | `check-missions.js` must block any second database mission if one is IN PROGRESS. |
| S39 | ❌ FAIL | Agent completes but forgets to update STATUS — subsequent agents may re-run or skip incorrectly. | Completion checklist exists but is informal; mission lifecycle must validate STATUS transition. |
| S40 | ❌ FAIL | 8 sequential missions all started simultaneously — DEPENDS ON ignored — deadlock or overwrites. | Mission validator blocks IN PROGRESS transition if DEPENDS ON not COMPLETE. |

### Category 5 — Preflight Script

| ID | Result | Finding | Fix |
|---|---|---|---|
| S41 | ❌ FAIL | Non-Node project without package.json — framework assumes Node.js only. | Document Node.js requirement; provide guidance for adapting non-Node projects. |
| S42 | 🟡 PARTIAL | Build passes but TypeScript has type errors if `tsc` is not in build script. | Preflight runs `tsc --noEmit` independently — this is already handled. Ensure tsc check runs regardless of build outcome. |
| S43 | ❌ FAIL | Zero tests pass with `--passWithNoTests` — test count not checked. | Add test count check; warn or fail if zero test files found. |
| S44 | ❌ FAIL | .env not in .gitignore — preflight checks for this and correctly fails. | Framework correctly handles this; ensure `.gitignore` is present (now added). |
| S45 | ❌ FAIL | Secret in a code comment — preflight secrets scan catches inline patterns. | Framework correctly handles this; pattern scan covers comments. |
| S46 | ❌ FAIL | Secret in test fixture file — preflight scans all .ts files including tests. | Framework correctly handles this. Secrets must use environment variables or mocks. |
| S47 | 🟡 PARTIAL | NOT NULL without DEFAULT — `check-migrations.js` flags as HIGH severity and blocks. | Framework correctly handles this with approval gate requirement. |
| S48 | ❌ FAIL | 9GB Docker image passes preflight — image size is never checked. | Add Docker image size check to preflight; fail if image exceeds 2GB threshold. |
| S49 | ❌ FAIL | DATABASE_URL pointing to production RDS in non-production env — not detected. | Enhance `check-env.js` to detect non-localhost production DB URLs in non-prod contexts. |
| S50 | ❌ FAIL | `|| true` appended to lint script — lint failure silenced, preflight passes. | Add source code scan for `|| true` pattern in package.json scripts during preflight. |

### Category 6 — Migration Safety

| ID | Result | Finding | Fix |
|---|---|---|---|
| S51 | 🟡 PARTIAL | DROP TABLE with approval in migration-approvals.md — allowed correctly. | Framework correctly handles this. Approval workflow functions as intended. |
| S52 | ❌ FAIL | DROP TABLE without approval — `check-migrations.js` correctly blocks. | Framework correctly handles this. |
| S53 | ✅ PASS | NOT NULL on empty table is safe — no existing rows to fail constraint. | None needed. |
| S54 | ❌ FAIL | NOT NULL on 50M-row table — flagged as HIGH severity by `check-migrations.js`. | Framework correctly handles this; requires approval and safe strategy. |
| S55 | ❌ FAIL | Column rename in multi-service system — flagged by `check-migrations.js`. | Framework correctly handles; multi-service risk should be noted in mission CONTEXT. |
| S56 | ❌ FAIL | VARCHAR to INTEGER type change — flagged by `check-migrations.js`. | Framework correctly handles; requires approval and data validation step. |
| S57 | ✅ PASS | Safe migration pattern: DEFAULT first, NOT NULL second — no risk. | None needed. |
| S58 | ❌ FAIL | Migrations in wrong order — ordering validation not in `check-migrations.js`. | Add migration ordering validation checking reference consistency. |
| S59 | ❌ FAIL | Mid-production migration failure — no automated rollback mechanism. | Document and formalise rollback procedure; consider transaction-wrapped migrations. |
| S60 | ❌ FAIL | Raw SQL in migration bypasses schema detection — allowed without warning. | Add raw SQL detection in `check-migrations.js`; flag for mandatory review. |

### Category 7 — UI Workflow

| ID | Result | Finding | Fix |
|---|---|---|---|
| S61 | ❌ FAIL | Gemini concept requires WebSocket not in architecture — Claude validation should catch this. | Formalise Claude validation checklist for Gemini output vs. system-architecture.md. |
| S62 | ❌ FAIL | Two contradictory screenshots for the same page — no disambiguation protocol. | Enforce single canonical screenshot per page; add UI reference management guidance. |
| S63 | 🟡 PARTIAL | Gemini suggests duplicate component — Claude should check `ui-component-registry.md`. | Add explicit step: Claude cross-references Gemini output with registry before generating UI mission. |
| S64 | ❌ FAIL | Gemini proposes 800ms animation violating motion guidelines — no validation step. | Claude validation must compare Gemini animation values against `ui-motion-guidelines.md`. |
| S65 | ❌ FAIL | Low-resolution screenshot — no minimum resolution requirement enforced. | Document minimum screenshot resolution requirement (800×600); reject below threshold. |
| S66 | ❌ FAIL | 12 contradictory screenshots for one page — no selection/consolidation protocol. | Enforce single canonical reference; require explicit selection before UI ideation. |
| S67 | ❌ FAIL | Gemini suggests Framer Motion but stack uses plain CSS — architecture mismatch. | Claude must validate Gemini library/technology choices against `system-architecture.md`. |
| S68 | ❌ FAIL | UI concept requires undocumented API endpoint — architecture gap. | Architecture must be complete before UI ideation begins; Claude flags missing endpoints. |
| S69 | ❌ FAIL | Hero section requested with no visual reference — Gemini cannot generate layout. | Require either screenshot or `ui-preferences.md` before UI ideation starts. |
| S70 | ❌ FAIL | Dark mode added mid-project after being marked out-of-scope — scope creep. | Out-of-scope features require new requirements phase and architecture revision. |

### Category 8 — Environment & Secrets

| ID | Result | Finding | Fix |
|---|---|---|---|
| S71 | ❌ FAIL | `localhost` DATABASE_URL in production — `check-env.js` validates format but not environment context. | Add environment-aware URL validation: production env must not use localhost. |
| S72 | ❌ FAIL | JWT_SECRET too short — not enforced without `minLength` in `env-requirements.json`. | Orchestrator must generate `env-requirements.json` with `minLength: 32` for secrets. |
| S73 | ❌ FAIL | Stripe integration defined in requirements but STRIPE_SECRET_KEY missing from env requirements. | Orchestrator generates `env-requirements.json` based on integrations in `system-architecture.md`. |
| S74 | ❌ FAIL | `.env.production` committed — `.gitignore` lists `.env` patterns but not `.env.production` explicitly. | Add `.env.production`, `.env.staging`, `.env.*.local` to `.gitignore`. |
| S75 | ❌ FAIL | Placeholder detected in required var — `check-env.js` correctly blocks with placeholder detection. | Framework correctly handles this. |
| S76 | ❌ FAIL | AWS key hardcoded in config file committed — preflight secrets scan detects AKIA pattern. | Framework correctly handles this. |
| S77 | ❌ FAIL | `env-requirements.json` missing — `check-env.js` falls back to `.env.example` with warning. | Orchestrator must generate `env-requirements.json` during architecture phase. |
| S78 | ❌ FAIL | Staging and production have different required vars — no multi-environment validation. | Add environment-specific validation sections to `env-requirements.json`. |
| S79 | ❌ FAIL | JWT_SECRET rotated mid-deployment — no secret rotation protocol in framework. | Document secret rotation strategy; architecture must specify grace period for dual-key validation. |
| S80 | ❌ FAIL | Real key accidentally in `.env.example` — preflight scans `.env.example` for secret patterns. | Framework correctly handles this via secrets scan. |

### Category 9 — Regulatory / Compliance

| ID | Result | Finding | Fix |
|---|---|---|---|
| S81 | ❌ FAIL | PHI system without regulatory-heavy profile — framework has no automatic detection. | Orchestrator must detect regulated data types in requirements and auto-recommend or enforce profile. |
| S82 | ❌ FAIL | GDPR deletion procedure never specified — profile requires it but never auto-generates. | Compliance artefact generation must be in a mission; not optional for regulated systems. |
| S83 | ❌ FAIL | Audit log table missing in production — `check-audit-log.js` required by profile doesn't exist yet. | Create `scripts/check-audit-log.js` and add to preflight when regulatory-heavy is active. |
| S84 | ❌ FAIL | S3 bucket in wrong region — `check-data-residency.js` required by profile doesn't exist. | Create `scripts/check-data-residency.js` and add to preflight when regulatory-heavy is active. |
| S85 | ❌ FAIL | Admin action not logged — architecture requirement exists but no preflight can verify it. | Acceptance criteria for admin missions must include audit log verification. |
| S86 | ❌ FAIL | PII in logs — architecture prohibits it but no code-level enforcement exists in framework. | Add log sanitisation requirement to mission acceptance criteria for any mission touching logging. |
| S87 | ❌ FAIL | Wildcard IAM policy — architecture prohibits it but no infrastructure validator exists. | Add IAM policy wildcard check to preflight (parse infrastructure config files). |
| S88 | ❌ FAIL | Encryption at rest never specified — profile requires `encryption-spec.md` but it may be omitted. | Profile compliance checklist must be validated before deployment approval; block without artefacts. |
| S89 | ❌ FAIL | Compliance artefacts never generated before go-live — no blocking gate enforces this. | Add `scripts/check-compliance-artefacts.js` that verifies required docs exist before regulated deployment. |
| S90 | ❌ FAIL | Retention policy conflicts with legal hold — no conflict detection in framework. | Profile `data-retention-policy.md` template must include legal hold handling section. |

### Category 10 — Edge Cases & Adversarial

| ID | Result | Finding | Fix |
|---|---|---|---|
| S91 | ❌ FAIL | Monorepo with 5 microservices exceeds single-app framework scope — not documented. | Document monorepo mode: one orchestration project per service, or create multi-service guidance. |
| S92 | ❌ FAIL | Non-technical product owner cannot follow baby steps alone — assumes dev knowledge. | Separate PO guide from developer guide; clearly mark which steps require technical skill. |
| S93 | ❌ FAIL | Antigravity modifies architecture docs — mission guide prohibits it but FILES OWNED isn't validated. | Mission validator must reject missions with any `docs/ai/` file in FILES OWNED. |
| S94 | ❌ FAIL | Mission FILES OWNED edited after IN PROGRESS — no immutability once mission is running. | Document mission immutability rule: FILES OWNED cannot change after STATUS: APPROVED. |
| S95 | 🟡 PARTIAL | Snapshot deleted — Claude must re-read architecture docs from scratch; session state lost. | Document recovery procedure: load all `docs/ai/*.md` files to reconstruct context. |
| S96 | ❌ FAIL | Two simultaneous Claude sessions risk duplicate/conflicting missions — no session lock. | Add session locking guidance; only one Claude session active per project at a time. |
| S97 | 🟡 PARTIAL | Brownfield use case not addressed — framework is greenfield-oriented. | Create `docs/ai/brownfield-mode.md`. |
| S98 | ❌ FAIL | Human approval gate skipped — no technical enforcement prevents Antigravity running unapproved missions. | Document that agent must check STATUS: APPROVED before starting; add to invocation prompt. |
| S99 | 🟡 PARTIAL | 45,000-word requirements — Claude can process but framework gives no guidance on handling. | Add word count ceiling guidance; very large requirements suggest decomposition into phases. |
| S100 | 🟡 PARTIAL | Mid-deployment failure after migration ran — ROLLBACK field exists but is manual-only. | Formalise rollback protocol; document exactly how to recover a partial deployment. |

---

## Top 10 Failure Root Causes

1. **Convention-only enforcement** — Rules exist in documents but no scripts or validators enforce them. Most category failures trace here.
2. **Missing `check-requirements.js`** — Requirements quality gate is a checklist, not automated.
3. **Missing `check-missions.js`** — Mission validation (FILES OWNED, DEPENDS ON, cycles, wildcards) is manual.
4. **No automated concurrency enforcement** — File ownership conflicts depend on humans reading EXECUTION-LOG.md.
5. **`env-requirements.json` must be generated** — Orchestrator never generates it automatically; env checks are therefore often missing.
6. **Regulatory scripts not created** — `check-audit-log.js` and `check-data-residency.js` are referenced but absent.
7. **Brownfield mode undocumented** — Framework assumes greenfield; legacy codebase workflow is undefined.
8. **No session locking** — Two Claude sessions or two agents starting simultaneously have no prevention mechanism.
9. **UI reference management gaps** — No rules for resolution, minimum size, or canonical source.
10. **Mission immutability not enforced** — FILES OWNED can be changed after approval with no consequence.

---

## Fixes Implemented After This Report

See git history. The following were created or updated based on stress test results:

- `scripts/check-requirements.js` — automated requirements validation
- `scripts/check-missions.js` — mission schema validation (wildcards, cycles, blanks)
- `docs/ai/brownfield-mode.md` — legacy codebase workflow
- `docs/ai/session-protocol.md` — single-session locking guidance
- `docs/ai/ui-reference-protocol.md` — UI screenshot rules
- `scripts/check-compliance-artefacts.js` — regulatory artefact gate
- Updated `ai/checks/preflight.sh` — Docker image size check, lint bypass detection
- Updated `.gitignore` — added `.env.production`, `.env.staging`
- Updated `docs/ai/templates/mission-template.md` — immutability warning, FILE OWNED rules
- Updated `docs/ai/antigravity-agent-guide.md` — session lock, approval enforcement

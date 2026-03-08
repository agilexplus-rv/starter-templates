# Baby Steps — Getting Started with Rudie Orchestrator v5

This guide walks you through your first project from zero to first deployment.
Follow every step in order.

---

## Step 0 — Get the framework files

Clone the starter template from GitHub into a new folder for your project:

```bash
git clone https://github.com/agilexplus-rv/starter-templates.git my-project
cd my-project
```

Then disconnect it from the template remote so your project has its own git history:

```bash
rm -rf .git
git init
git add .
git commit -m "Initial commit from Rudie Orchestrator template"
```

Then point it at your own new GitHub repo (create one at github.com first):

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

You now have a clean copy of the framework in your own repository, ready to build on.

---

## Step 1 — (Already done)

---

## Step 2 — Copy the framework files

Copy the full contents of this repository into your project folder.
The minimum structure you need:

```
ai/checks/preflight.sh
docs/ai/templates/requirements-template.md
docs/ai/templates/mission-template.md
docs/ai/claude-role-constraints.md
docs/ai/antigravity-agent-guide.md
docs/ai/agent-concurrency-protocol.md
docs/ai/profiles/regulatory-heavy.md   ← only if you need it
scripts/check-migrations.js
scripts/check-env.js
README.md
```

Make the preflight script executable:

```bash
chmod +x ai/checks/preflight.sh
```

---

## Step 3 — Write your requirements

Copy the template:

```bash
cp docs/ai/templates/requirements-template.md docs/ai/requirements.md
```

Open `docs/ai/requirements.md` and fill in every required section:
- System purpose
- Primary users
- Core features (numbered, specific)
- Non-functional requirements
- Integrations
- Data model overview
- Deployment target
- Compliance requirements (or "None")

**Do not start the orchestrator until all required sections are complete.**
The more specific your requirements, the better the architecture Claude generates.

---

## Step 4 — Add UI references (optional)

If you have visual references for your UI:

```bash
mkdir -p docs/ui-references
# Copy your Figma/Stitch screenshots here
cp ~/Downloads/homepage-design.png docs/ui-references/homepage.png
```

---

## Step 5 — Start a Claude session and run the wizard

Open Claude and load these files as context (paste or attach them):
- `docs/ai/requirements.md`
- `docs/ai/claude-role-constraints.md`

Then say:

```
Use docs/ai/requirements.md and run the wizard.
Load docs/ai/claude-role-constraints.md — these are your role constraints.
```

Claude will:
1. Validate your requirements for completeness
2. Ask clarifying questions for anything ambiguous
3. Generate `docs/ai/system-architecture.md`
4. Generate `docs/ai/process-flows.md`
5. Generate `docs/ai/ui-pages.md` (if applicable)
6. Generate mission files in `docs/ai/missions/`
7. Create `AI_MEMORY_SNAPSHOT.md` for session continuity

If you have UI references, also say:

```
Use docs/ui-references/homepage.png as UI reference for the homepage.
```

Claude will route this through Gemini for UI ideation before generating UI missions.

---

## Step 6 — Review the generated architecture

Before anything gets built, read what Claude produced:

- `docs/ai/system-architecture.md` — does this match your intent?
- `docs/ai/process-flows.md` — do the flows make sense?
- `docs/ai/missions/` — read every mission; they describe exactly what will be built

If anything is wrong, tell Claude. Ask for revisions before proceeding.
It is much cheaper to fix an architecture document than to fix code.

---

## Step 7 — Approve missions

Open each mission file in `docs/ai/missions/`.

For each mission:
1. Read the `CONTEXT` section — confirm it describes the right thing
2. Read `FILES OWNED` — confirm no unexpected files are listed
3. Read `ACCEPTANCE CRITERIA` — confirm they are testable and correct
4. Change `STATUS: PENDING` to `STATUS: APPROVED` and add your name/date

Do not let Antigravity execute any mission you haven't approved.

---

## Step 8 — Execute missions in Antigravity

For each approved mission, open your AI coding agent (Cursor, Claude Code, etc.)
and give it this prompt:

```
You are an Antigravity implementation agent.
Use docs/ai/missions/MISSION-001-[name].md as your task specification.
Follow the mission exactly. Only modify files listed in FILES OWNED.
Do not modify docs/ai/ architecture documents.
When complete, set STATUS: COMPLETE in the mission file.
```

**Check concurrency rules before running multiple agents in parallel:**
`docs/ai/agent-concurrency-protocol.md`

The golden rule: **no two active missions may own the same file.**

---

## Step 9 — Run preflight

After all missions in a batch are complete:

```bash
./ai/checks/preflight.sh
```

All 9 checks must pass. If any fail, fix the issue before proceeding.

Do not move to the next step until preflight passes cleanly.

---

## Step 10 — Deploy to staging

Deploy your application to your staging environment using your normal deployment
process (ECS task update, `docker push`, or equivalent).

Run a smoke test against staging:
- Can a user sign in?
- Do the core flows work end to end?
- Are there any console errors?

---

## Step 11 — Promote to production

Only after staging passes:
1. Get sign-off from your tech lead (or yourself, for solo projects)
2. Deploy to production
3. Run a production health check
4. Monitor logs for the first 15 minutes

If anything goes wrong, follow the rollback procedure defined in the affected
mission's `ROLLBACK` field.

---

## Returning to a Project

When you start a new Claude session on an existing project:

```
Load AI_MEMORY_SNAPSHOT.md to restore context.
Load docs/ai/claude-role-constraints.md — these are your role constraints.
```

Claude will read the snapshot and resume with full awareness of the project state.

---

## Compliance Projects

If your project handles regulated data (financial, health, personal data):

At Step 5, also load the regulatory profile:

```
Use docs/ai/requirements.md and run the wizard.
Load docs/ai/claude-role-constraints.md.
Load docs/ai/profiles/regulatory-heavy.md — this project requires compliance mode.
```

Claude will generate additional compliance artefacts and apply stricter
architecture constraints throughout.

---

## Quick Reference

| Task | Command / File |
|---|---|
| Write requirements | `docs/ai/requirements.md` (copy from template) |
| Start orchestrator | Load `requirements.md` + `claude-role-constraints.md` into Claude |
| Review architecture | `docs/ai/system-architecture.md` |
| Find missions | `docs/ai/missions/` |
| Run an agent | See `docs/ai/antigravity-agent-guide.md` |
| Check concurrency | `docs/ai/agent-concurrency-protocol.md` |
| Run preflight | `./ai/checks/preflight.sh` |
| Compliance mode | Load `docs/ai/profiles/regulatory-heavy.md` |
| Restore session | Load `AI_MEMORY_SNAPSHOT.md` |

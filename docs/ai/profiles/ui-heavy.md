# UI-Heavy Profile

Use this profile for frontend-intensive applications: marketing sites, design
systems, component libraries, and products where the UI is the primary
deliverable. The Gemini ideation pipeline is elevated to a first-class step,
and component consistency enforcement is mandatory.

---

## When to Use This Profile

Use UI-Heavy when your project:
- Has 20+ distinct UI components
- Is building or extending a design system
- Is a marketing site, landing page system, or content-driven product
- Has a dedicated designer producing Figma / Stitch references
- Requires strict visual and motion consistency across the product
- Has a non-technical stakeholder (designer, product owner) who reviews UI before implementation

---

## Activation

```
Use docs/ai/requirements.md and run the wizard.
Load docs/ai/claude-role-constraints.md.
Load docs/ai/profiles/ui-heavy.md — this is a UI-heavy project.
Load docs/ai/ui-reference-protocol.md.
```

Also ensure `docs/ai/ui-preferences.md` and `docs/ai/ui-motion-guidelines.md`
are complete before starting UI ideation.

---

## Mandatory Documents (beyond Standard)

These documents are required in UI-Heavy projects and must be created or
updated before any UI missions are generated:

| Document | Purpose |
|---|---|
| `docs/ai/ui-preferences.md` | Colour palette, typography, tone, spacing system |
| `docs/ai/ui-motion-guidelines.md` | Animation timings, easing curves, motion budget |
| `docs/ai/ui-component-registry.md` | Inventory of all implemented components |
| `docs/ui-references/` | Canonical screenshots for every page/component |

**`ui-component-registry.md` is not optional in this profile.** Every
implemented component must be registered. Claude maintains it after every
UI mission completes.

---

## Extended Architecture Requirements

Claude must include the following additional sections in `system-architecture.md`:

**Design system foundation**
- Design token structure (colours, spacing, typography as tokens, not hardcoded values)
- CSS approach (Tailwind utility classes, CSS Modules, styled-components — pick one)
- Component library decision (shadcn/ui, Radix, Headless UI, or custom)
- Breakpoint definitions (mobile / tablet / desktop pixel values)
- Dark mode support: yes/no, and implementation approach if yes

**Component architecture**
- Atomic design hierarchy (atoms → molecules → organisms → templates → pages)
- Where shared components live (`src/components/ui/` vs. `src/components/[feature]/`)
- Props convention (explicit types, no `any`, no implicit children)
- State colocation rules (local state vs. global state criteria)

**Accessibility**
- Target WCAG level (2.1 AA minimum)
- Focus management strategy for modals, drawers, and navigation
- Screen reader testing approach
- Colour contrast requirements (minimum 4.5:1 for normal text)

---

## Gemini Pipeline (Elevated)

In UI-Heavy projects, the Gemini UI ideation step is mandatory for every
new page and every new organism-level component. It is not optional.

The pipeline for every UI item:

```
1. Screenshot added to docs/ui-references/
2. Claude loads ui-reference-protocol.md
3. Gemini generates UI concept
4. Claude validates concept against:
   - system-architecture.md (design system and component arch)
   - ui-motion-guidelines.md (animation compliance)
   - ui-component-registry.md (no duplicates)
   - ui-preferences.md (colour, typography, tone)
5. Claude generates a frontend mission
6. Mission ACCEPTANCE CRITERIA includes visual regression note
7. Antigravity implements
8. Claude updates ui-component-registry.md
```

Do not skip step 4. Gemini concepts that violate the design system
must be revised before a mission is generated.

---

## Component Registry Protocol

After every UI mission reaches STATUS: COMPLETE, Claude must update
`docs/ai/ui-component-registry.md` with:

```markdown
## ComponentName

**Path:** src/components/ui/ComponentName.tsx
**Type:** atom | molecule | organism | template | page
**Added:** YYYY-MM-DD (MISSION-ID)
**Props:**
  - propName: type — description
**Variants:** default | hover | disabled | loading (list all)
**Motion:** fade-in 200ms ease-out (or "none")
**Responsive:** mobile-first, collapses to single column on < 768px
**Accessibility:** ARIA role, keyboard navigation notes
**Dark mode:** supported | not supported
**Screenshot:** docs/ui-references/component-name.png
```

This registry prevents duplicate components and gives Antigravity a
reference when a new mission needs to reuse an existing component.

---

## Mission Requirements for UI-Heavy

Every `frontend` mission must include:

**UI SPECIFICATIONS section** (required — not optional as in Standard):
```
UI SPECIFICATIONS:
  Reference: docs/ui-references/[component].png
  Component registry: docs/ai/ui-component-registry.md
  Design tokens: see docs/ai/ui-preferences.md
  Motion: see docs/ai/ui-motion-guidelines.md — [specific animation name]
  Breakpoints: mobile (<768px), tablet (768–1024px), desktop (>1024px)
  Accessibility: [ARIA role, keyboard interaction, focus management]
  Dark mode: [supported in this component / not required]
```

**ACCEPTANCE CRITERIA must include:**
```
- [ ] Component matches reference screenshot at desktop breakpoint
- [ ] Component is responsive and correct at mobile breakpoint
- [ ] All animations comply with ui-motion-guidelines.md timings
- [ ] prefers-reduced-motion: animations are disabled when set
- [ ] Colour contrast passes WCAG 2.1 AA (min 4.5:1)
- [ ] Component is keyboard navigable (Tab, Enter, Escape where applicable)
- [ ] Component registered in docs/ai/ui-component-registry.md
- [ ] No duplicate component in the registry
```

---

## Design Token Enforcement

All colour, spacing, and typography values must use design tokens — never
hardcoded hex values, pixel values, or font sizes.

Claude must generate a design token file as an early mission:

```
MISSION-001-design-tokens
TYPE: frontend
FILES OWNED: src/styles/tokens.css (or tokens.ts for JS-in-CSS)
```

All subsequent UI missions depend on MISSION-001.

---

## Visual Regression Testing (Recommended)

For UI-Heavy projects with 20+ components, consider adding visual regression
testing (e.g. Chromatic, Percy, or Playwright screenshots) to preflight.

If visual regression is in scope, Claude must specify the tooling in
`system-architecture.md` and Antigravity must configure it as an
infrastructure mission before UI missions begin.

---

## Preflight Additions

In addition to standard preflight, UI-Heavy projects should add:

**Accessibility lint:**
```bash
npx axe-cli http://localhost:3000 || exit 1
```

**Component registry completeness:**
```bash
node scripts/check-ui-registry.js || exit 1
```
(Create this script to verify every component in `src/components/ui/`
has a corresponding entry in `ui-component-registry.md`.)

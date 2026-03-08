# UI Reference Protocol

This document defines rules for visual reference assets used in the
screenshot-to-component pipeline.

---

## Screenshot Requirements

All screenshots placed in `docs/ui-references/` must meet these standards:

**Minimum resolution:** 800 × 600 pixels
**Accepted formats:** PNG (preferred), JPG, WebP
**Maximum file size:** 5MB per screenshot
**Naming convention:** `[page-or-component]-[variant].png`

Examples:
```
docs/ui-references/homepage.png
docs/ui-references/dashboard-empty-state.png
docs/ui-references/modal-confirm.png
docs/ui-references/hero-section-dark.png
```

**Do not commit:** Low-resolution exports, screenshots taken from mobile
devices at scale, or blurry/compressed images. Gemini cannot generate
coherent layout concepts from unreadable references.

---

## One Canonical Reference Per Page

Each page or component may have exactly one canonical reference screenshot
per design iteration.

If multiple design options exist:
1. Choose one as canonical and name it `[page].png`
2. Archive alternatives as `[page]-option-b.png`, `[page]-option-c.png`
3. Tell the orchestrator explicitly which variant is canonical:
   ```
   Use docs/ui-references/homepage.png as the canonical homepage reference.
   Ignore homepage-option-b.png — it was rejected.
   ```

Do not provide multiple conflicting layouts for the same page without
explicit selection. Gemini cannot resolve ambiguity between designs.

---

## Updating a Reference

When a design changes after implementation has already started:

1. Rename the old screenshot: `[page]-v1.png`
2. Add the new screenshot: `[page].png`
3. Tell the orchestrator: "The homepage design has been updated. Use
   docs/ui-references/homepage.png (new version). The previous version
   was homepage-v1.png. Generate corrective missions if needed."

Do not silently replace a screenshot that has already been used to
generate a mission. The orchestrator must be aware of the change.

---

## Gemini UI Concept Validation Checklist

Before Claude accepts a Gemini concept and generates a UI mission, Claude
must verify all of the following:

**Architecture compatibility**
- [ ] No new backend endpoints required that are not in `process-flows.md`
- [ ] No WebSocket or real-time requirements that are not in `system-architecture.md`
- [ ] No state management approach that contradicts the architecture

**Technology stack compatibility**
- [ ] All component libraries referenced are in the project's dependency stack
- [ ] All animation approaches use the project's chosen animation method
- [ ] No external fonts, icons, or CDN resources not already approved

**Motion guidelines compliance**
- [ ] All animation durations comply with `ui-motion-guidelines.md`
- [ ] `prefers-reduced-motion` support is accounted for
- [ ] No layout-shifting animations

**Component registry check**
- [ ] No component proposed by Gemini already exists in `ui-component-registry.md`
- [ ] If a similar component exists, reuse it rather than creating a duplicate

**Responsive behaviour**
- [ ] Concept specifies behaviour at mobile, tablet, and desktop breakpoints
- [ ] Or concept explicitly states it is desktop-only (and requirements permit this)

If any item fails: reject the Gemini concept and request a revision with
specific feedback before generating a UI mission.

---

## Dark Mode and Theme Variants

If dark mode or theme variants are in scope (defined in requirements.md):
- Provide screenshots for each variant when available
- Name them: `[page]-light.png` and `[page]-dark.png`
- Gemini will be asked to concept both variants

If dark mode is explicitly out of scope (as in requirements.md):
- Do not generate dark mode components
- If a user requests dark mode mid-project, it must go through a new
  requirements phase before any architecture or missions are updated

---

## What To Do With No Screenshot

If a UI component is needed but no screenshot is available:

1. Check if `docs/ai/ui-preferences.md` contains sufficient style guidance
2. Check if `docs/ai/ui-skills/` contains a matching skill file
3. If neither exists, ask the user to either:
   - Provide a screenshot reference, or
   - Write a detailed description in `ui-preferences.md`
4. Do not ask Gemini to generate a concept from zero context

The minimum required before UI ideation:
- Either a screenshot (≥800×600), or
- `ui-preferences.md` with colour palette, typography, tone, and component examples

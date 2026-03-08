#!/usr/bin/env node
/**
 * check-requirements.js
 * Rudie Orchestrator Platform — Requirements Quality Gate
 *
 * Validates that docs/ai/requirements.md contains all mandatory sections
 * with sufficient content before Claude begins architecture generation.
 *
 * Run manually:
 *   node scripts/check-requirements.js
 *
 * Or instruct Claude to run it at the start of every wizard session.
 */

const fs = require('fs');
const path = require('path');

const REQUIREMENTS_FILE = path.join(process.cwd(), 'docs', 'ai', 'requirements.md');

// ─── Required sections and their validation rules ─────────────────────────

const REQUIRED_SECTIONS = [
  {
    heading: /^#{1,3}\s+.*system purpose/i,
    label: 'Section 1 — System Purpose',
    minWords: 20,
    hint: 'Write 2–5 sentences describing what the system does, who it is for, and what problem it solves.',
  },
  {
    heading: /^#{1,3}\s+.*primary users/i,
    label: 'Section 2 — Primary Users',
    minWords: 10,
    hint: 'List each user type with their key actions. At least one user type required.',
  },
  {
    heading: /^#{1,3}\s+.*core features/i,
    label: 'Section 3 — Core Features',
    minWords: 30,
    minNumberedItems: 3,
    hint: 'List numbered features with specific implementation details (not vague area names).',
  },
  {
    heading: /^#{1,3}\s+.*non.functional/i,
    label: 'Section 4 — Non-Functional Requirements',
    minWords: 20,
    hint: 'Define performance, security, and scale targets.',
  },
  {
    heading: /^#{1,3}\s+.*integration/i,
    label: 'Section 5 — Integration Dependencies',
    minWords: 5,
    hint: 'List external services or write "None at this time."',
  },
  {
    heading: /^#{1,3}\s+.*data model/i,
    label: 'Section 6 — Data Model Overview',
    minWords: 10,
    hint: 'List core entities with key fields.',
  },
  {
    heading: /^#{1,3}\s+.*deployment/i,
    label: 'Section 7 — Deployment Target',
    minWords: 10,
    hint: 'Specify cloud provider, region, and services.',
  },
  {
    heading: /^#{1,3}\s+.*compliance/i,
    label: 'Section 8 — Compliance Requirements',
    minWords: 3,
    hint: 'List compliance constraints or write "None."',
  },
];

// ─── Vague feature patterns (warn, don't fail) ────────────────────────────

const VAGUE_FEATURE_PATTERNS = [
  /^\d+\.\s+(user management|reporting|admin|dashboard|settings|profile|notifications?)\.?\s*$/i,
  /^\d+\.\s+\w{1,15}\.?\s*$/,  // Numbered item that's just one short word
];

// ─── Contradiction patterns ───────────────────────────────────────────────

const CONTRADICTION_PAIRS = [
  [/fully\s+offline/i, /real.?time\s+(sync|update|push)/i],
  [/no\s+database/i, /store.+data/i],
  [/single.?tenant/i, /multi.?tenant/i],
  [/no\s+authentication/i, /user\s+(login|auth|account)/i],
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractSectionContent(lines, headingIndex) {
  const content = [];
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (/^#{1,3}\s+/.test(lines[i])) break;
    content.push(lines[i]);
  }
  return content.join('\n');
}

function findHeadingIndex(lines, pattern) {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i;
  }
  return -1;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(REQUIREMENTS_FILE)) {
    console.error(
      `\n  ✗ requirements.md not found at: ${REQUIREMENTS_FILE}\n` +
      `  Create it using: docs/ai/templates/requirements-template.md\n`
    );
    process.exit(1);
  }

  const content = fs.readFileSync(REQUIREMENTS_FILE, 'utf8');
  const lines = content.split('\n');
  const totalWords = countWords(content);
  let errors = 0;
  let warnings = 0;

  console.log('\n  Requirements Quality Gate\n');

  // ── Check for template boilerplate (not filled in) ──────────────────────
  if (content.includes('[REQUIRED]') || content.includes('Example:')) {
    console.error(
      '  ✗ requirements.md still contains template placeholder text.\n' +
      '    Remove all [REQUIRED] markers and Example: blocks before proceeding.\n'
    );
    errors++;
  }

  // ── Check overall word count ─────────────────────────────────────────────
  if (totalWords < 100) {
    console.error(`  ✗ Requirements too brief: ${totalWords} words total. Minimum is 100 words.`);
    errors++;
  } else if (totalWords > 30000) {
    console.warn(
      `  ⚠  Requirements are very long (${totalWords} words). Consider splitting into multiple project phases.`
    );
    warnings++;
  }

  // ── Validate each required section ──────────────────────────────────────
  for (const section of REQUIRED_SECTIONS) {
    const idx = findHeadingIndex(lines, section.heading);

    if (idx === -1) {
      console.error(`  ✗ Missing: ${section.label}`);
      console.error(`    → ${section.hint}`);
      errors++;
      continue;
    }

    const sectionContent = extractSectionContent(lines, idx);
    const wordCount = countWords(sectionContent);

    if (wordCount < section.minWords) {
      console.error(
        `  ✗ ${section.label} — too brief (${wordCount} words, minimum ${section.minWords})`
      );
      console.error(`    → ${section.hint}`);
      errors++;
      continue;
    }

    // Check for numbered items in Core Features
    if (section.minNumberedItems) {
      const numberedItems = (sectionContent.match(/^\d+\./gm) || []).length;
      if (numberedItems < section.minNumberedItems) {
        console.error(
          `  ✗ ${section.label} — fewer than ${section.minNumberedItems} numbered features found`
        );
        console.error(`    → List at least ${section.minNumberedItems} specific, numbered features.`);
        errors++;
        continue;
      }

      // Warn on vague features
      const featureLines = sectionContent.split('\n').filter(l => /^\d+\./.test(l.trim()));
      for (const line of featureLines) {
        for (const pattern of VAGUE_FEATURE_PATTERNS) {
          if (pattern.test(line.trim())) {
            console.warn(`  ⚠  Potentially vague feature: "${line.trim()}"`);
            console.warn(`    → Add specific implementation detail (e.g. "User authentication — email/password, JWT, 15-min expiry")`);
            warnings++;
            break;
          }
        }
      }
    }

    console.log(`  ✓ ${section.label}`);
  }

  // ── Contradiction detection ──────────────────────────────────────────────
  for (const [patternA, patternB] of CONTRADICTION_PAIRS) {
    if (patternA.test(content) && patternB.test(content)) {
      const matchA = content.match(patternA)?.[0];
      const matchB = content.match(patternB)?.[0];
      console.error(`\n  ✗ Potential contradiction detected:`);
      console.error(`    "${matchA}" conflicts with "${matchB}"`);
      console.error(`    → Resolve this conflict before proceeding to architecture generation.`);
      errors++;
    }
  }

  // ── Check for open unresolved questions ─────────────────────────────────
  const openQuestions = (content.match(/Decision needed:/gi) || []).length;
  if (openQuestions > 0) {
    console.warn(
      `\n  ⚠  ${openQuestions} unresolved decision(s) found in requirements.`
    );
    console.warn(`    → Resolve all "Decision needed:" items before architecture generation.`);
    warnings++;
  }

  // ── External reference validation ───────────────────────────────────────
  const refPattern = /docs\/[^\s\)\"\']+\.(md|pdf|json|yaml|yml)/g;
  const refs = content.match(refPattern) || [];
  for (const ref of refs) {
    const refPath = path.join(process.cwd(), ref);
    if (!fs.existsSync(refPath)) {
      console.warn(`  ⚠  Referenced file not found: ${ref}`);
      warnings++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('');
  if (errors > 0) {
    console.error(
      `  Requirements quality gate FAILED: ${errors} error(s), ${warnings} warning(s).\n` +
      `  Fix all errors before starting the orchestrator wizard.\n`
    );
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(
      `  Requirements quality gate PASSED with ${warnings} warning(s).\n` +
      `  Review warnings above before proceeding.\n`
    );
  } else {
    console.log(`  Requirements quality gate PASSED. Ready for architecture generation.\n`);
  }

  process.exit(0);
}

main();

#!/usr/bin/env node
/**
 * check-compliance-artefacts.js
 * Rudie Orchestrator Platform — Regulatory Compliance Gate
 *
 * Verifies that all mandatory compliance artefacts have been generated
 * before a regulatory-heavy system is deployed.
 *
 * This script is called by preflight.sh when the regulatory-heavy profile
 * is active (detected by presence of docs/ai/profiles/regulatory-heavy.md
 * AND a "compliance: true" marker in docs/ai/system-architecture.md).
 *
 * Run:
 *   node scripts/check-compliance-artefacts.js
 */

const fs = require('fs');
const path = require('path');

const PROFILE_FILE = path.join(process.cwd(), 'docs', 'ai', 'profiles', 'regulatory-heavy.md');
const ARCHITECTURE_FILE = path.join(process.cwd(), 'docs', 'ai', 'system-architecture.md');
const COMPLIANCE_DIR = path.join(process.cwd(), 'docs', 'ai', 'compliance');

// ─── Required compliance artefacts ────────────────────────────────────────

const REQUIRED_ARTEFACTS = [
  {
    file: 'docs/ai/compliance/data-map.md',
    label: 'Data Map',
    description: 'Complete map of every data entity, classification, storage location, and retention period.',
    minWords: 100,
  },
  {
    file: 'docs/ai/compliance/access-control-matrix.md',
    label: 'Access Control Matrix',
    description: 'Matrix of user roles vs. resources and permitted operations.',
    minWords: 50,
  },
  {
    file: 'docs/ai/compliance/encryption-spec.md',
    label: 'Encryption Specification',
    description: 'Encryption at rest and in transit, key management, rotation schedule.',
    minWords: 50,
  },
  {
    file: 'docs/ai/compliance/audit-log-spec.md',
    label: 'Audit Log Specification',
    description: 'All auditable events, log format, storage, retention, and access controls.',
    minWords: 50,
  },
  {
    file: 'docs/ai/compliance/data-retention-policy.md',
    label: 'Data Retention Policy',
    description: 'Retention periods, deletion procedure, legal hold handling.',
    minWords: 50,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function isRegulatoryProject() {
  // Active if: regulatory-heavy profile exists AND architecture references compliance
  if (!fs.existsSync(PROFILE_FILE)) return false;
  if (!fs.existsSync(ARCHITECTURE_FILE)) return true; // Profile exists, check artefacts
  const arch = fs.readFileSync(ARCHITECTURE_FILE, 'utf8');
  // Auto-detect: presence of compliance keywords or explicit marker
  return /compliance|regulatory|hipaa|gdpr|pci.dss|audit.log|data.retention/i.test(arch);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  if (!isRegulatoryProject()) {
    console.log('  ℹ  Non-regulatory project. Compliance artefact check skipped.');
    process.exit(0);
  }

  console.log('\n  Compliance Artefact Gate (regulatory-heavy profile active)\n');

  let errors = 0;
  let warnings = 0;

  for (const artefact of REQUIRED_ARTEFACTS) {
    const fullPath = path.join(process.cwd(), artefact.file);

    if (!fs.existsSync(fullPath)) {
      console.error(`  ✗ MISSING: ${artefact.label}`);
      console.error(`    File: ${artefact.file}`);
      console.error(`    → ${artefact.description}`);
      console.error(`    → Generate this artefact using Claude before deployment.\n`);
      errors++;
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const wordCount = countWords(content);

    if (wordCount < artefact.minWords) {
      console.error(
        `  ✗ INSUFFICIENT: ${artefact.label} (${wordCount} words, minimum ${artefact.minWords})`
      );
      console.error(`    → Document is present but appears to be a placeholder.\n`);
      errors++;
      continue;
    }

    // Check for placeholder/template markers
    if (/\[REQUIRED\]|\[INSERT\]|TODO|PLACEHOLDER/i.test(content)) {
      console.error(`  ✗ INCOMPLETE: ${artefact.label} contains placeholder text.`);
      errors++;
      continue;
    }

    console.log(`  ✓ ${artefact.label}`);
  }

  // ── Check for legal hold section in data-retention-policy ────────────────
  const retentionFile = path.join(process.cwd(), 'docs/ai/compliance/data-retention-policy.md');
  if (fs.existsSync(retentionFile)) {
    const retentionContent = fs.readFileSync(retentionFile, 'utf8');
    if (!/legal.?hold/i.test(retentionContent)) {
      console.warn(
        `  ⚠  data-retention-policy.md does not mention legal holds.\n` +
        `     Add a legal hold section specifying how deletion is suspended when required.`
      );
      warnings++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('');
  if (errors > 0) {
    console.error(
      `  Compliance artefact gate FAILED: ${errors} required document(s) missing or incomplete.\n` +
      `  Generate all compliance artefacts using Claude before deploying a regulated system.\n`
    );
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(`  Compliance gate PASSED with ${warnings} warning(s). Review above.\n`);
  } else {
    console.log(`  All compliance artefacts present and valid.\n`);
  }

  process.exit(0);
}

main();

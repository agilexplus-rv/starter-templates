#!/usr/bin/env node
/**
 * check-migrations.js
 * Rudie Orchestrator Platform — Preflight Migration Safety Check
 *
 * Scans pending Prisma migrations for destructive operations that could
 * corrupt or destroy production data. Exits with code 1 if any are found,
 * blocking deployment until a human explicitly reviews and approves.
 *
 * Checks for:
 *   - DROP TABLE / DROP COLUMN
 *   - ALTER COLUMN type changes on existing columns
 *   - NOT NULL constraints added without a DEFAULT value
 *   - Column renames (data loss risk if done naively)
 *   - Truncate statements
 *   - DELETE without WHERE clause
 *   - Index drops on large tables
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');
const APPROVAL_FILE = path.join(process.cwd(), 'docs', 'ai', 'decisions', 'migration-approvals.md');

// ─── Destructive patterns ──────────────────────────────────────────────────

const DESTRUCTIVE_PATTERNS = [
  {
    pattern: /DROP\s+TABLE/i,
    label: 'DROP TABLE',
    severity: 'CRITICAL',
    description: 'Permanently deletes a table and all its data.',
  },
  {
    pattern: /DROP\s+COLUMN/i,
    label: 'DROP COLUMN',
    severity: 'CRITICAL',
    description: 'Permanently deletes a column and all its data.',
  },
  {
    pattern: /ALTER\s+COLUMN.+TYPE/i,
    label: 'ALTER COLUMN TYPE',
    severity: 'HIGH',
    description: 'Changing a column type may truncate or corrupt existing data.',
  },
  {
    pattern: /ALTER\s+TABLE.+RENAME\s+COLUMN/i,
    label: 'RENAME COLUMN',
    severity: 'HIGH',
    description: 'Renaming a column breaks any code still referencing the old name.',
  },
  {
    pattern: /ALTER\s+TABLE.+RENAME\s+TO/i,
    label: 'RENAME TABLE',
    severity: 'HIGH',
    description: 'Renaming a table breaks any code still referencing the old name.',
  },
  {
    // NOT NULL added without DEFAULT — Postgres locks the table for a full rewrite
    pattern: /SET\s+NOT\s+NULL/i,
    label: 'SET NOT NULL (no DEFAULT)',
    severity: 'HIGH',
    description:
      'Adding NOT NULL to a column without a DEFAULT will fail if existing rows have NULL values. ' +
      'On large tables, even a safe migration causes a full table lock.',
  },
  {
    pattern: /TRUNCATE\s+TABLE/i,
    label: 'TRUNCATE TABLE',
    severity: 'CRITICAL',
    description: 'Deletes all rows in a table. This is almost never intentional in a migration.',
  },
  {
    pattern: /DELETE\s+FROM\s+\w+\s*;/i,
    label: 'DELETE without WHERE',
    severity: 'CRITICAL',
    description: 'Deletes all rows. Likely a mistake.',
  },
  {
    pattern: /DROP\s+INDEX/i,
    label: 'DROP INDEX',
    severity: 'MEDIUM',
    description: 'Dropping an index may severely degrade query performance in production.',
  },
  {
    pattern: /DROP\s+SCHEMA/i,
    label: 'DROP SCHEMA',
    severity: 'CRITICAL',
    description: 'Drops an entire schema and all its objects.',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function findMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  const sqlFiles = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const migrationDir = path.join(MIGRATIONS_DIR, entry.name);
      const subFiles = fs.readdirSync(migrationDir);
      for (const file of subFiles) {
        if (file.endsWith('.sql')) {
          sqlFiles.push({
            name: entry.name,
            file: path.join(migrationDir, file),
          });
        }
      }
    }
  }
  return sqlFiles;
}

function isApproved(migrationName) {
  if (!fs.existsSync(APPROVAL_FILE)) return false;
  const content = fs.readFileSync(APPROVAL_FILE, 'utf8');
  return content.includes(`APPROVED: ${migrationName}`);
}

function checkMigration(migrationName, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  for (const check of DESTRUCTIVE_PATTERNS) {
    if (check.pattern.test(sql)) {
      findings.push(check);
    }
  }

  return findings;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const migrations = findMigrationFiles();

  if (migrations.length === 0) {
    console.log('  ✓ No migrations found. Skipping migration safety check.');
    process.exit(0);
  }

  let totalIssues = 0;
  let blockers = 0;

  for (const migration of migrations) {
    const findings = checkMigration(migration.name, migration.file);

    if (findings.length === 0) continue;

    // Check if this migration has been explicitly approved
    if (isApproved(migration.name)) {
      console.log(
        `  ⚠  ${migration.name} — destructive patterns found but APPROVED in migration-approvals.md`
      );
      continue;
    }

    // Unapproved destructive migration
    console.error(`\n  ✗ DESTRUCTIVE MIGRATION DETECTED: ${migration.name}`);
    console.error(`    File: ${migration.file}\n`);

    for (const finding of findings) {
      console.error(`    [${finding.severity}] ${finding.label}`);
      console.error(`    → ${finding.description}\n`);
      totalIssues++;
      if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
        blockers++;
      }
    }

    console.error(
      `    To approve this migration after review, add the following line to\n` +
      `    docs/ai/decisions/migration-approvals.md:\n\n` +
      `    APPROVED: ${migration.name}\n` +
      `    Approved by: [your name]\n` +
      `    Date: ${new Date().toISOString().split('T')[0]}\n` +
      `    Rationale: [why this destructive operation is safe]\n`
    );
  }

  if (blockers > 0) {
    console.error(
      `\n  Migration safety check FAILED: ${blockers} unapproved destructive operation(s).\n` +
      `  Review each migration, confirm it is safe, and add approval entries to:\n` +
      `  docs/ai/decisions/migration-approvals.md\n`
    );
    process.exit(1);
  }

  if (totalIssues > 0) {
    console.log(
      `  ⚠  ${totalIssues} medium-severity migration pattern(s) found. Review recommended.`
    );
  } else {
    console.log('  ✓ No destructive migration patterns detected.');
  }

  process.exit(0);
}

main();

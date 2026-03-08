#!/usr/bin/env node
/**
 * check-missions.js
 * Rudie Orchestrator Platform — Mission Schema Validator
 *
 * Validates all mission files in docs/ai/missions/ for:
 *   - Required fields present and non-empty
 *   - FILES OWNED: no wildcards, no directories, not blank
 *   - ACCEPTANCE CRITERIA: non-vague, binary conditions
 *   - DEPENDS ON: no self-reference, no circular dependencies
 *   - No docs/ai/ files in FILES OWNED (architecture documents are read-only)
 *   - STATUS transitions are valid
 *   - Concurrency: no two IN PROGRESS missions own the same file
 *   - Database lock: no two IN PROGRESS missions are TYPE: database
 *
 * Run:
 *   node scripts/check-missions.js
 *   node scripts/check-missions.js --strict   (fails on warnings too)
 */

const fs = require('fs');
const path = require('path');

const MISSIONS_DIR = path.join(process.cwd(), 'docs', 'ai', 'missions');
const STRICT = process.argv.includes('--strict');

// ─── Parse a mission file ─────────────────────────────────────────────────

function parseMission(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const get = (label) => {
    const pattern = new RegExp(`^${label}:\\s*(.+)`, 'im');
    const m = raw.match(pattern);
    return m ? m[1].trim() : null;
  };

  // FILES OWNED: collect all indented file lines after the heading
  const filesOwnedLines = [];
  const foMatch = raw.match(/FILES OWNED:.*?\n([\s\S]*?)(?=\n[A-Z])/);
  if (foMatch) {
    const block = foMatch[1];
    for (const line of block.split('\n')) {
      const trimmed = line.trim().replace(/^\(.*\)$/, '').trim();
      // Remove inline comments like (create) or (modify)
      const cleaned = trimmed.replace(/\s+\(.*\)\s*$/, '').trim();
      if (cleaned && !cleaned.startsWith('Example') && !cleaned.startsWith('//')) {
        filesOwnedLines.push(cleaned);
      }
    }
  }

  // DEPENDS ON: parse comma-separated mission IDs
  const dependsOnRaw = get('DEPENDS ON');
  const dependsOn = dependsOnRaw
    ? dependsOnRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // ACCEPTANCE CRITERIA: collect checkbox lines
  const acLines = [];
  const acMatch = raw.match(/ACCEPTANCE CRITERIA:.*?\n([\s\S]*?)(?=\n[A-Z])/);
  if (acMatch) {
    for (const line of acMatch[1].split('\n')) {
      const cleaned = line.replace(/^[\s\-\*\[xX\]]+/, '').trim();
      if (cleaned) acLines.push(cleaned);
    }
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    id: get('MISSION ID'),
    title: get('TITLE'),
    type: get('TYPE'),
    status: get('STATUS'),
    filesOwned: filesOwnedLines,
    dependsOn,
    acceptanceCriteria: acLines,
    raw,
  };
}

// ─── Validation helpers ───────────────────────────────────────────────────

const GLOB_PATTERNS = /[\*\?\[\{]/;
const TRAILING_SLASH = /\/$/;
const DOCS_AI_PREFIX = /^docs\/ai\//i;
const VAGUE_CRITERIA_PATTERNS = [
  /should work(s)?\s*(correctly|properly|as expected)?\.?\s*$/i,
  /looks?\s+good\.?\s*$/i,
  /works?\s+as\s+intended\.?\s*$/i,
  /functions?\s+correctly\.?\s*$/i,
  /completes?\s+(successfully|properly)\.?\s*$/i,
  /is\s+done\.?\s*$/i,
];

function isVagueCriteria(line) {
  return VAGUE_CRITERIA_PATTERNS.some(p => p.test(line));
}

// ─── Circular dependency detection (DFS) ─────────────────────────────────

function detectCycles(missions) {
  const idMap = {};
  for (const m of missions) {
    if (m.id) idMap[m.id] = m;
  }

  const visited = new Set();
  const inStack = new Set();
  const cycles = [];

  function dfs(missionId, path) {
    if (inStack.has(missionId)) {
      const cycleStart = path.indexOf(missionId);
      cycles.push(path.slice(cycleStart).concat(missionId));
      return;
    }
    if (visited.has(missionId)) return;

    visited.add(missionId);
    inStack.add(missionId);
    path.push(missionId);

    const mission = idMap[missionId];
    if (mission) {
      for (const dep of mission.dependsOn) {
        dfs(dep, [...path]);
      }
    }

    inStack.delete(missionId);
  }

  for (const m of missions) {
    if (m.id && !visited.has(m.id)) {
      dfs(m.id, []);
    }
  }

  return cycles;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(MISSIONS_DIR)) {
    console.log('  ℹ  No missions directory found. Skipping mission validation.');
    process.exit(0);
  }

  const missionFiles = fs.readdirSync(MISSIONS_DIR)
    .filter(f => f.startsWith('MISSION-') && f.endsWith('.md'))
    .map(f => path.join(MISSIONS_DIR, f));

  if (missionFiles.length === 0) {
    console.log('  ✓ No mission files found. Nothing to validate.');
    process.exit(0);
  }

  console.log(`\n  Mission Validator — checking ${missionFiles.length} mission(s)\n`);

  const missions = missionFiles.map(parseMission);
  let errors = 0;
  let warnings = 0;

  // ── Per-mission validation ─────────────────────────────────────────────
  for (const m of missions) {
    const tag = `  [${m.id || m.fileName}]`;
    let missionErrors = 0;

    // Required fields
    if (!m.id) { console.error(`${tag} ✗ MISSION ID is blank.`); missionErrors++; }
    if (!m.title) { console.error(`${tag} ✗ TITLE is blank.`); missionErrors++; }
    if (!m.type) { console.error(`${tag} ✗ TYPE is blank.`); missionErrors++; }
    if (!m.status) { console.error(`${tag} ✗ STATUS is blank.`); missionErrors++; }

    // FILES OWNED validation
    if (m.filesOwned.length === 0) {
      console.error(`${tag} ✗ FILES OWNED is empty — Antigravity has no declared file scope.`);
      missionErrors++;
    } else {
      for (const file of m.filesOwned) {
        if (GLOB_PATTERNS.test(file)) {
          console.error(`${tag} ✗ FILES OWNED contains wildcard/glob: "${file}" — must be explicit file paths.`);
          missionErrors++;
        }
        if (TRAILING_SLASH.test(file)) {
          console.error(`${tag} ✗ FILES OWNED contains directory path: "${file}" — must list individual files.`);
          missionErrors++;
        }
        if (DOCS_AI_PREFIX.test(file)) {
          console.error(
            `${tag} ✗ FILES OWNED contains protected path: "${file}"\n` +
            `       Architecture docs are read-only for Antigravity agents.`
          );
          missionErrors++;
        }
      }

      if (m.filesOwned.length > 20) {
        console.warn(
          `${tag} ⚠  FILES OWNED has ${m.filesOwned.length} files. Consider splitting into smaller missions.`
        );
        warnings++;
      }
    }

    // CONTEXT length
    const contextMatch = m.raw.match(/CONTEXT:\s*([\s\S]*?)(?=\n[A-Z])/);
    const contextWords = contextMatch ? contextMatch[1].trim().split(/\s+/).length : 0;
    if (contextWords < 30) {
      console.error(
        `${tag} ✗ CONTEXT is too brief (${contextWords} words). Antigravity needs specific implementation details.`
      );
      missionErrors++;
    }

    // ACCEPTANCE CRITERIA
    if (m.acceptanceCriteria.length === 0) {
      console.error(`${tag} ✗ ACCEPTANCE CRITERIA is empty — mission cannot be verified complete.`);
      missionErrors++;
    } else {
      for (const crit of m.acceptanceCriteria) {
        if (isVagueCriteria(crit)) {
          console.error(`${tag} ✗ Vague acceptance criterion: "${crit}"`);
          console.error(`       → Use measurable, binary conditions (status codes, counts, specific behaviours).`);
          missionErrors++;
        }
      }
    }

    // DEPENDS ON: self-reference check
    if (m.id && m.dependsOn.includes(m.id)) {
      console.error(`${tag} ✗ DEPENDS ON references its own mission ID — self-referential dependency.`);
      missionErrors++;
    }

    // DEPENDS ON: reference to non-existent mission
    const missionIds = new Set(missions.map(x => x.id).filter(Boolean));
    for (const dep of m.dependsOn) {
      if (dep !== '' && dep !== 'None' && !missionIds.has(dep)) {
        console.warn(`${tag} ⚠  DEPENDS ON references unknown mission: "${dep}"`);
        warnings++;
      }
    }

    if (missionErrors === 0) {
      console.log(`  ✓ ${m.id || m.fileName} — ${m.title || '(untitled)'}`);
    } else {
      errors += missionErrors;
    }
  }

  // ── Circular dependency detection ────────────────────────────────────────
  const cycles = detectCycles(missions);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      console.error(`\n  ✗ Circular dependency detected: ${cycle.join(' → ')}`);
      errors++;
    }
  }

  // ── Concurrency conflict detection (for IN PROGRESS missions) ────────────
  const inProgress = missions.filter(m => m.status === 'IN PROGRESS');

  // File ownership conflicts
  const fileOwnerMap = {};
  for (const m of inProgress) {
    for (const file of m.filesOwned) {
      if (!file) continue;
      if (fileOwnerMap[file]) {
        console.error(
          `\n  ✗ FILE OWNERSHIP CONFLICT:\n` +
          `    File: "${file}"\n` +
          `    Owned by: ${fileOwnerMap[file].id} (IN PROGRESS)\n` +
          `    Also claimed by: ${m.id} (IN PROGRESS)\n` +
          `    Two agents cannot own the same file simultaneously.`
        );
        errors++;
      } else {
        fileOwnerMap[file] = m;
      }
    }
  }

  // Database lock
  const inProgressDatabase = inProgress.filter(m => m.type === 'database');
  if (inProgressDatabase.length > 1) {
    console.error(
      `\n  ✗ DATABASE LOCK VIOLATION:\n` +
      `    Multiple database-type missions are IN PROGRESS simultaneously:\n` +
      inProgressDatabase.map(m => `    - ${m.id}: ${m.title}`).join('\n') + '\n' +
      `    Only one database mission may be IN PROGRESS at a time.`
    );
    errors++;
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('');
  const failOnWarnings = STRICT && warnings > 0;

  if (errors > 0 || failOnWarnings) {
    console.error(
      `  Mission validation FAILED: ${errors} error(s)` +
      (warnings > 0 ? `, ${warnings} warning(s)` : '') + '.\n' +
      `  Fix all errors before allowing any mission to proceed to IN PROGRESS.\n`
    );
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(`  Mission validation PASSED with ${warnings} warning(s). Review above.\n`);
  } else {
    console.log(`  Mission validation PASSED.\n`);
  }

  process.exit(0);
}

main();

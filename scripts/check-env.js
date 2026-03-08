#!/usr/bin/env node
/**
 * check-env.js
 * Rudie Orchestrator Platform — Preflight Environment Variable Check
 *
 * Verifies that all required environment variables are present and non-empty
 * before deployment. Prevents deployment failures caused by missing config.
 *
 * Configuration:
 *   Create docs/ai/env-requirements.json to declare required variables.
 *   If that file doesn't exist, this script falls back to reading
 *   .env.example for variable names.
 *
 * Format of docs/ai/env-requirements.json:
 * {
 *   "required": [
 *     { "key": "DATABASE_URL", "description": "PostgreSQL connection string" },
 *     { "key": "JWT_SECRET", "description": "Secret for signing JWT tokens", "minLength": 32 }
 *   ],
 *   "optional": [
 *     { "key": "SENTRY_DSN", "description": "Error tracking DSN" }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

const ENV_REQUIREMENTS_FILE = path.join(process.cwd(), 'docs', 'ai', 'env-requirements.json');
const ENV_EXAMPLE_FILE = path.join(process.cwd(), '.env.example');
const ENV_FILE = path.join(process.cwd(), '.env');

// ─── Load requirements ─────────────────────────────────────────────────────

function loadRequirements() {
  // Prefer structured requirements file
  if (fs.existsSync(ENV_REQUIREMENTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ENV_REQUIREMENTS_FILE, 'utf8'));
    } catch (e) {
      console.error(`  ✗ Could not parse ${ENV_REQUIREMENTS_FILE}: ${e.message}`);
      process.exit(1);
    }
  }

  // Fall back to .env.example
  if (fs.existsSync(ENV_EXAMPLE_FILE)) {
    console.log('  ℹ  No env-requirements.json found. Using .env.example as fallback.');
    const lines = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf8').split('\n');
    const required = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0].trim();
        if (key) required.push({ key, description: 'From .env.example' });
      }
    }
    return { required, optional: [] };
  }

  console.log(
    '  ℹ  No env-requirements.json or .env.example found.\n' +
    '     Create docs/ai/env-requirements.json to enable environment checks.\n' +
    '     Skipping environment variable validation.'
  );
  process.exit(0);
}

// ─── Load current environment ──────────────────────────────────────────────

function loadEnv() {
  // Merge process.env with .env file if it exists
  const env = { ...process.env };

  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in env)) {
        env[key] = value;
      }
    }
  }

  return env;
}

// ─── Checks ────────────────────────────────────────────────────────────────

const INSECURE_PLACEHOLDER_PATTERNS = [
  /^your[-_]?.*[-_]?here$/i,
  /^changeme$/i,
  /^replace[-_]?me$/i,
  /^todo$/i,
  /^fixme$/i,
  /^xxx+$/i,
  /^placeholder$/i,
  /^example$/i,
  /^default$/i,
  /^test$/i,
  /^fake$/i,
  /^dummy$/i,
  /^1234/,
  /^password$/i,
  /^secret$/i,
];

function looksLikePlaceholder(value) {
  return INSECURE_PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const requirements = loadRequirements();
  const env = loadEnv();

  let errors = 0;
  let warnings = 0;

  // Check required variables
  for (const req of requirements.required || []) {
    const value = env[req.key];

    if (!value || value.trim() === '') {
      console.error(`  ✗ MISSING required env var: ${req.key}`);
      if (req.description) console.error(`    → ${req.description}`);
      errors++;
      continue;
    }

    if (looksLikePlaceholder(value)) {
      console.error(`  ✗ PLACEHOLDER detected for required env var: ${req.key}`);
      console.error(`    → Value looks like a placeholder: "${value}"`);
      if (req.description) console.error(`    → ${req.description}`);
      errors++;
      continue;
    }

    if (req.minLength && value.length < req.minLength) {
      console.error(
        `  ✗ INSECURE value for ${req.key}: length ${value.length} is less than required minimum ${req.minLength}`
      );
      errors++;
      continue;
    }

    // Validate DATABASE_URL format
    if (req.key === 'DATABASE_URL' && !value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
      console.error(`  ✗ DATABASE_URL does not look like a valid PostgreSQL URL`);
      errors++;
      continue;
    }
  }

  // Check optional variables (warn if missing but don't fail)
  for (const opt of requirements.optional || []) {
    const value = env[opt.key];
    if (!value || value.trim() === '') {
      console.log(`  ⚠  Optional env var not set: ${opt.key}`);
      if (opt.description) console.log(`     → ${opt.description}`);
      warnings++;
    } else if (looksLikePlaceholder(value)) {
      console.log(`  ⚠  Optional env var looks like a placeholder: ${opt.key}`);
      warnings++;
    }
  }

  // Summary
  if (errors > 0) {
    console.error(
      `\n  Environment check FAILED: ${errors} required variable(s) missing or invalid.\n` +
      `  Set all required environment variables before deploying.\n`
    );
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(`  ✓ Environment variables valid (${warnings} optional variable(s) not set).`);
  } else {
    console.log('  ✓ All environment variables present and valid.');
  }

  process.exit(0);
}

main();

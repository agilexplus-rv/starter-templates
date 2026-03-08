#!/usr/bin/env bash
# =============================================================================
# preflight.sh
# Rudie Orchestrator Platform — Deployment Preflight Check
#
# Run this script before every deployment:
#   ./ai/checks/preflight.sh
#
# All checks must pass. The script exits with code 1 on any failure.
# Do not deploy if this script fails.
# =============================================================================

set -euo pipefail

ERRORS=0
WARNINGS=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colours (gracefully degrade if terminal doesn't support them)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Rudie Orchestrator — Preflight v5${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

pass() {
  echo -e "  ${GREEN}✓ PASSED${NC}  $1"
}

fail() {
  echo -e "  ${RED}✗ FAILED${NC}  $1"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "  ${YELLOW}⚠  WARN${NC}   $1"
  WARNINGS=$((WARNINGS + 1))
}

section() {
  echo ""
  echo -e "  ${BLUE}▶ $1${NC}"
}

run_check() {
  local label="$1"
  local cmd="$2"
  local optional="${3:-false}"

  if eval "$cmd" > /tmp/preflight_output 2>&1; then
    pass "$label"
  else
    if [ "$optional" = "true" ]; then
      warn "$label (optional — check skipped but noted)"
      cat /tmp/preflight_output | sed 's/^/    /'
    else
      fail "$label"
      cat /tmp/preflight_output | sed 's/^/    /'
    fi
  fi
}

# ─── Start ─────────────────────────────────────────────────────────────────

header
cd "$PROJECT_ROOT"

# ─── 1. TypeScript type check ───────────────────────────────────────────────

section "TypeScript"
if [ -f tsconfig.json ]; then
  run_check "TypeScript type check (tsc --noEmit)" "npx tsc --noEmit"
else
  warn "No tsconfig.json found — skipping TypeScript check"
fi

# ─── 2. Linting ─────────────────────────────────────────────────────────────

section "Lint"
if [ -f package.json ] && node -e "require('./package.json').scripts.lint" 2>/dev/null | grep -q '.'; then
  run_check "ESLint" "npm run lint -- --max-warnings=0"
else
  warn "No lint script found in package.json — skipping lint check"
fi

# ─── 3. Build ───────────────────────────────────────────────────────────────

section "Build"
if [ -f package.json ]; then
  run_check "Application build (npm run build)" "npm run build"
else
  warn "No package.json found — skipping build check"
fi

# ─── 4. Tests ───────────────────────────────────────────────────────────────

section "Tests"
if [ -f package.json ] && node -e "require('./package.json').scripts.test" 2>/dev/null | grep -q '.'; then
  run_check "Test suite" "npm run test -- --passWithNoTests --forceExit"
else
  warn "No test script found in package.json — skipping test check"
fi

# ─── 5. Prisma schema validation ────────────────────────────────────────────

section "Database"
if [ -f prisma/schema.prisma ]; then
  run_check "Prisma schema validation" "npx prisma validate"
else
  warn "No prisma/schema.prisma found — skipping schema validation"
fi

# ─── 6. Migration destructiveness check ─────────────────────────────────────

if [ -d prisma/migrations ] && [ -f scripts/check-migrations.js ]; then
  run_check "Migration safety check" "node scripts/check-migrations.js"
elif [ -d prisma/migrations ]; then
  warn "prisma/migrations exists but scripts/check-migrations.js not found — skipping migration safety check (UNSAFE)"
fi

# ─── 7. Secrets scan ─────────────────────────────────────────────────────────

section "Security"

# Block common high-confidence secret patterns
SECRET_PATTERNS=(
  "sk_live_[a-zA-Z0-9]+"          # Stripe live key
  "sk_test_[a-zA-Z0-9]+"          # Stripe test key
  "AKIA[A-Z0-9]{16}"              # AWS access key
  "AIza[0-9A-Za-z\\-_]{35}"       # Google API key
  "ghp_[a-zA-Z0-9]{36}"           # GitHub personal access token
  "ghs_[a-zA-Z0-9]{36}"           # GitHub Actions token
  "-----BEGIN RSA PRIVATE KEY-----"
  "-----BEGIN EC PRIVATE KEY-----"
  "-----BEGIN OPENSSH PRIVATE KEY-----"
)

FOUND_SECRETS=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -rE "$pattern" \
      --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
      --include="*.json" --include="*.yaml" --include="*.yml" \
      --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next \
      --exclude-dir=dist --exclude-dir=build \
      . 2>/dev/null | grep -v ".env.example" | grep -q .; then
    echo -e "    ${RED}Potential secret found matching pattern: $pattern${NC}"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
  fi
done

if [ "$FOUND_SECRETS" -gt 0 ]; then
  fail "Secrets scan ($FOUND_SECRETS pattern(s) matched)"
else
  pass "Secrets scan"
fi

# Check .env is gitignored
if [ -f .env ]; then
  if [ -f .gitignore ] && grep -q "^\.env$\|^\.env\b" .gitignore; then
    pass ".env is in .gitignore"
  else
    fail ".env file exists but is not in .gitignore — secrets may be committed"
  fi
fi

# ─── 8. Environment variable check ───────────────────────────────────────────

section "Environment"
if [ -f scripts/check-env.js ]; then
  run_check "Environment variable completeness" "node scripts/check-env.js"
else
  warn "scripts/check-env.js not found — skipping environment variable check"
  echo -e "    Create docs/ai/env-requirements.json and scripts/check-env.js to enable this check."
fi

# ─── 9. Docker build + image size ────────────────────────────────────────────

section "Docker"
if [ -f Dockerfile ]; then
  IMAGE_TAG="rudie-preflight-$(date +%s)"
  if docker build . -t "$IMAGE_TAG" --quiet > /tmp/docker_output 2>&1; then
    pass "Docker build"

    # Check image size (warn if >1GB, fail if >3GB)
    IMAGE_SIZE_BYTES=$(docker image inspect "$IMAGE_TAG" --format='{{.Size}}' 2>/dev/null || echo 0)
    IMAGE_SIZE_MB=$(( IMAGE_SIZE_BYTES / 1024 / 1024 ))
    if [ "$IMAGE_SIZE_MB" -gt 3000 ]; then
      fail "Docker image size: ${IMAGE_SIZE_MB}MB exceeds 3GB limit — optimise your Dockerfile"
    elif [ "$IMAGE_SIZE_MB" -gt 1000 ]; then
      warn "Docker image size: ${IMAGE_SIZE_MB}MB is large — consider multi-stage build optimisation"
    else
      pass "Docker image size: ${IMAGE_SIZE_MB}MB"
    fi

    docker rmi "$IMAGE_TAG" --force > /dev/null 2>&1 || true
  else
    fail "Docker build"
    cat /tmp/docker_output | tail -20 | sed 's/^/    /'
  fi
else
  warn "No Dockerfile found — skipping Docker build check"
fi

# ─── 10. Lint bypass detection ────────────────────────────────────────────────

section "Integrity"
if [ -f package.json ]; then
  if grep -E '"(lint|test|build)"\s*:\s*"[^"]*\|\|\s*true' package.json > /dev/null 2>&1; then
    fail "package.json contains '|| true' bypass in a lint/test/build script — remove it"
  else
    pass "No script bypass patterns detected"
  fi
fi

# ─── 11. Mission validation ───────────────────────────────────────────────────

if [ -d docs/ai/missions ] && [ -f scripts/check-missions.js ]; then
  run_check "Mission schema validation" "node scripts/check-missions.js"
fi

# ─── 12. Compliance artefacts (regulatory-heavy projects) ────────────────────

if [ -f docs/ai/profiles/regulatory-heavy.md ] && [ -f scripts/check-compliance-artefacts.js ]; then
  run_check "Compliance artefacts" "node scripts/check-compliance-artefacts.js"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  PREFLIGHT PASSED${NC}"
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "  ${WARNINGS} warning(s) noted — review above"
  fi
  echo -e "  Safe to deploy to staging."
else
  echo -e "${RED}  PREFLIGHT FAILED — ${ERRORS} check(s) failed${NC}"
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "  ${WARNINGS} warning(s) also noted"
  fi
  echo -e ""
  echo -e "  ${RED}Do not deploy until all checks pass.${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  exit 1
fi

exit 0

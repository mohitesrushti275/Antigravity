#!/bin/bash

# ═══════════════════════════════════════════════════
# CI/CD Configuration Validator
# Validates GitHub Actions workflows and secrets
# ═══════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CI/CD Configuration Validator         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════════════════
# Check if required tools are installed
# ═══════════════════════════════════════════════════

echo -e "${BLUE}━━━ Checking Required Tools ━━━${NC}"
echo ""

check_tool() {
  if command -v $1 &> /dev/null; then
    echo -e "${GREEN}✅ $1 is installed${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ $1 is not installed${NC}"
    ((FAIL++))
  fi
}

check_tool "gh"
check_tool "git"
check_tool "node"
check_tool "pnpm"

# Optional tools
if command -v actionlint &> /dev/null; then
  echo -e "${GREEN}✅ actionlint is installed${NC}"
  ((PASS++))
else
  echo -e "${YELLOW}⚠️  actionlint is not installed (optional)${NC}"
  ((WARN++))
fi

if command -v act &> /dev/null; then
  echo -e "${GREEN}✅ act is installed${NC}"
  ((PASS++))
else
  echo -e "${YELLOW}⚠️  act is not installed (optional)${NC}"
  ((WARN++))
fi

echo ""

# ═══════════════════════════════════════════════════
# Validate workflow files
# ═══════════════════════════════════════════════════

echo -e "${BLUE}━━━ Validating Workflow Files ━━━${NC}"
echo ""

WORKFLOW_DIR=".github/workflows"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo -e "${RED}❌ Workflow directory not found${NC}"
  ((FAIL++))
  exit 1
fi

# Check required workflows exist
REQUIRED_WORKFLOWS=("deploy.yml" "pr-check.yml" "security.yml")

for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
  if [ -f "$WORKFLOW_DIR/$workflow" ]; then
    echo -e "${GREEN}✅ $workflow exists${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ $workflow is missing${NC}"
    ((FAIL++))
  fi
done

# Validate workflow syntax with actionlint
if command -v actionlint &> /dev/null; then
  echo ""
  echo "Running actionlint..."
  if actionlint $WORKFLOW_DIR/*.yml; then
    echo -e "${GREEN}✅ All workflows have valid syntax${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ Workflow syntax errors found${NC}"
    ((FAIL++))
  fi
fi

echo ""

# ═══════════════════════════════════════════════════
# Check GitHub Secrets (requires gh CLI)
# ═══════════════════════════════════════════════════

if command -v gh &> /dev/null; then
  echo -e "${BLUE}━━━ Checking GitHub Secrets ━━━${NC}"
  echo ""

  # Check if authenticated
  if gh auth status &> /dev/null; then
    REQUIRED_SECRETS=(
      "VERCEL_TOKEN"
      "VERCEL_ORG_ID"
      "VERCEL_PROJECT_ID"
      "PRODUCTION_URL"
      "SUPABASE_ACCESS_TOKEN"
      "SUPABASE_DB_PASSWORD"
      "SUPABASE_PROJECT_ID"
      "NEXT_PUBLIC_SUPABASE_URL"
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
      "NEXT_PUBLIC_APP_URL"
    )

    OPTIONAL_SECRETS=(
      "TURBO_TOKEN"
      "TURBO_TEAM"
      "SENTRY_AUTH_TOKEN"
      "SENTRY_ORG"
      "SENTRY_PROJECT"
      "CODECOV_TOKEN"
    )

    # Get list of secrets
    SECRETS=$(gh secret list --json name -q '.[].name' 2>/dev/null || echo "")

    # Check required secrets
    for secret in "${REQUIRED_SECRETS[@]}"; do
      if echo "$SECRETS" | grep -q "^$secret$"; then
        echo -e "${GREEN}✅ $secret is configured${NC}"
        ((PASS++))
      else
        echo -e "${RED}❌ $secret is missing${NC}"
        ((FAIL++))
      fi
    done

    # Check optional secrets
    for secret in "${OPTIONAL_SECRETS[@]}"; do
      if echo "$SECRETS" | grep -q "^$secret$"; then
        echo -e "${GREEN}✅ $secret is configured${NC}"
        ((PASS++))
      else
        echo -e "${YELLOW}⚠️  $secret is missing (optional)${NC}"
        ((WARN++))
      fi
    done
  else
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo "Run 'gh auth login' to check secrets"
    ((WARN++))
  fi

  echo ""
fi

# ═══════════════════════════════════════════════════
# Check branch protection rules
# ═══════════════════════════════════════════════════

if command -v gh &> /dev/null && gh auth status &> /dev/null; then
  echo -e "${BLUE}━━━ Checking Branch Protection ━━━${NC}"
  echo ""

  BRANCH_PROTECTION=$(gh api repos/:owner/:repo/branches/main/protection 2>/dev/null || echo "")

  if [ -n "$BRANCH_PROTECTION" ]; then
    echo -e "${GREEN}✅ Branch protection is enabled for main${NC}"
    ((PASS++))

    # Check specific rules
    if echo "$BRANCH_PROTECTION" | grep -q "required_pull_request_reviews"; then
      echo -e "${GREEN}✅ PR reviews are required${NC}"
      ((PASS++))
    else
      echo -e "${YELLOW}⚠️  PR reviews are not required${NC}"
      ((WARN++))
    fi

    if echo "$BRANCH_PROTECTION" | grep -q "required_status_checks"; then
      echo -e "${GREEN}✅ Status checks are required${NC}"
      ((PASS++))
    else
      echo -e "${YELLOW}⚠️  Status checks are not required${NC}"
      ((WARN++))
    fi
  else
    echo -e "${YELLOW}⚠️  Branch protection not configured${NC}"
    ((WARN++))
  fi

  echo ""
fi

# ═══════════════════════════════════════════════════
# Check environment configuration
# ═══════════════════════════════════════════════════

echo -e "${BLUE}━━━ Checking Environment Configuration ━━━${NC}"
echo ""

if [ -f "apps/web/.env.example" ]; then
  echo -e "${GREEN}✅ .env.example exists${NC}"
  ((PASS++))
else
  echo -e "${RED}❌ .env.example is missing${NC}"
  ((FAIL++))
fi

if [ -f ".github/dependabot.yml" ]; then
  echo -e "${GREEN}✅ Dependabot is configured${NC}"
  ((PASS++))
else
  echo -e "${YELLOW}⚠️  Dependabot is not configured${NC}"
  ((WARN++))
fi

echo ""

# ═══════════════════════════════════════════════════
# Check documentation
# ═══════════════════════════════════════════════════

echo -e "${BLUE}━━━ Checking Documentation ━━━${NC}"
echo ""

DOCS=(
  "docs/CICD_SETUP.md"
  "docs/AWS_SETUP.md"
  "docs/QUICK_START.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo -e "${GREEN}✅ $doc exists${NC}"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠️  $doc is missing${NC}"
    ((WARN++))
  fi
done

echo ""

# ═══════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════

echo -e "${BLUE}━━━ Validation Summary ━━━${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARN${NC}"
echo -e "${RED}❌ Failed: $FAIL${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}⚠️  Some critical checks failed. Please fix the issues above.${NC}"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}⚠️  All critical checks passed, but some optional items are missing.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ All checks passed! Your CI/CD is properly configured.${NC}"
  exit 0
fi

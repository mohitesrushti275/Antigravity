# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and deployment with industry-standard practices including:

- ✅ Automated testing and quality checks
- 🔒 Security scanning and vulnerability detection
- 📦 Build optimization and bundle analysis
- 🚀 Automated deployment to Vercel
- 📊 Performance monitoring
- 🔄 Database migrations
- 🎯 Preview deployments for PRs

## Workflows

### 1. Main CI/CD Pipeline (`deploy.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Jobs:**

#### Job 1: Code Quality & Security
- TypeScript type checking
- ESLint linting
- Unit tests with coverage
- Security audit (npm audit)
- Secret scanning (TruffleHog)
- Environment validation

**Critical Checks:** TypeScript and Tests must pass to proceed.

#### Job 2: Build & Analyze
- Build application for production
- Analyze bundle size
- Upload build artifacts
- Generate build reports

#### Job 3: Database Migration
- Runs only on `main` branch pushes
- Creates database backup
- Runs Supabase migrations with dry-run first
- Verifies migration success

#### Job 4: Deploy to Vercel
- Deploys to production
- Waits for deployment to be ready
- Runs health checks with retries
- Executes smoke tests
- Automatic rollback on failure

#### Job 5: Post-Deployment Monitoring
- Notifies Sentry of deployment
- Runs performance checks
- Generates final deployment summary

### 2. Pull Request Checks (`pr-check.yml`)

**Triggers:**
- PR opened, synchronized, or reopened

**Features:**
- Full quality checks
- Test coverage reporting
- Bundle size comparison
- Preview deployment to Vercel
- Automated PR comments with results

### 3. Security Scanning (`security.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests
- Daily scheduled scan (2 AM UTC)
- Manual workflow dispatch

**Scans:**

#### Dependency Vulnerability Scan
- npm audit for known vulnerabilities
- Blocks on critical vulnerabilities
- Generates audit reports

#### CodeQL Analysis
- Static code analysis for security issues
- Scans JavaScript and TypeScript
- Security-extended queries

#### Secret Scanning
- TruffleHog for verified secrets
- GitLeaks for potential leaks
- Scans entire git history

#### SAST (Static Application Security Testing)
- Semgrep security rules
- OWASP Top 10 checks
- JavaScript/TypeScript specific rules

#### License Compliance
- Checks all dependency licenses
- Ensures only approved licenses
- Generates license summary

## Required GitHub Secrets

### Vercel Deployment
```
VERCEL_TOKEN              # Vercel API token
VERCEL_ORG_ID            # Vercel organization ID
VERCEL_PROJECT_ID        # Vercel project ID
PRODUCTION_URL           # Production URL for health checks
```

### Supabase
```
SUPABASE_ACCESS_TOKEN    # Supabase API token
SUPABASE_DB_PASSWORD     # Database password
SUPABASE_PROJECT_ID      # Project ID
```

### Application Environment
```
NEXT_PUBLIC_SUPABASE_URL           # Public Supabase URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Clerk public key
NEXT_PUBLIC_APP_URL                # Application URL
```

### Optional Services
```
TURBO_TOKEN              # Turborepo remote cache token
TURBO_TEAM               # Turborepo team name
SENTRY_AUTH_TOKEN        # Sentry deployment tracking
SENTRY_ORG               # Sentry organization
SENTRY_PROJECT           # Sentry project name
CODECOV_TOKEN            # Code coverage reporting
```

## Setting Up Secrets

### 1. Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Get project details
vercel project ls
```

Add to GitHub Secrets:
- Go to repository Settings → Secrets and variables → Actions
- Add each secret from `.vercel/project.json`

### 2. Supabase Setup

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Get project details
supabase projects list
```

Generate access token:
- Go to Supabase Dashboard → Settings → API
- Create new access token
- Add to GitHub Secrets

### 3. Sentry Setup (Optional)

```bash
# Get auth token
# Go to Sentry → Settings → Auth Tokens
# Create new token with releases:write permission
```

## Workflow Configuration

### Environment Protection Rules

Set up environment protection in GitHub:

1. Go to Settings → Environments
2. Create `production` environment
3. Add protection rules:
   - Required reviewers (1-2 people)
   - Wait timer (optional, e.g., 5 minutes)
   - Deployment branches: `main` only

### Branch Protection Rules

Recommended settings for `main` branch:

```yaml
- Require pull request reviews (1 approval)
- Require status checks to pass:
  - Code Quality & Security
  - Build & Analyze
  - PR Quality Checks
- Require branches to be up to date
- Require conversation resolution
- Do not allow bypassing
```

## Local Testing

### Test Workflows Locally

Use [act](https://github.com/nektos/act) to test workflows locally:

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow
act -j quality  # Run quality job
act -j build    # Run build job
act pull_request  # Simulate PR
```

### Validate Workflow Syntax

```bash
# Install actionlint
brew install actionlint  # macOS

# Validate workflows
actionlint .github/workflows/*.yml
```

## Monitoring & Debugging

### View Workflow Runs

1. Go to repository → Actions tab
2. Select workflow run
3. View job logs and artifacts

### Debug Failed Runs

Enable debug logging:

```bash
# Add these secrets to repository
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

### Download Artifacts

```bash
# Using GitHub CLI
gh run download <run-id>

# Or download from Actions UI
# Actions → Workflow Run → Artifacts section
```

## Performance Optimization

### Cache Strategy

The pipeline uses multiple caching layers:

1. **pnpm cache**: Node modules
2. **Turbo cache**: Build outputs
3. **Build artifacts**: Reused across jobs

### Parallel Execution

Jobs run in parallel when possible:
```
quality ─┬─→ build ─→ migrate ─→ deploy ─→ monitor
         └─→ (other checks)
```

### Timeout Configuration

Each job has appropriate timeouts:
- Quality checks: 15 minutes
- Build: 20 minutes
- Migration: 10 minutes
- Deploy: 15 minutes
- Monitoring: 5 minutes

## Cost Optimization

### GitHub Actions Minutes

Free tier: 2,000 minutes/month for private repos

Estimated usage per run:
- Quality: ~5 minutes
- Build: ~8 minutes
- Deploy: ~5 minutes
- Security: ~10 minutes

**Total per deployment**: ~18 minutes
**Estimated monthly**: ~540 minutes (30 deployments)

### Optimization Tips

1. Use caching effectively
2. Run expensive jobs only on main branch
3. Use `concurrency` to cancel outdated runs
4. Schedule security scans during off-hours
5. Use self-hosted runners for high-volume projects

## Troubleshooting

### Common Issues

#### "Resource not accessible by integration"
- Check workflow permissions
- Ensure `GITHUB_TOKEN` has required scopes

#### "Vercel deployment failed"
- Verify Vercel secrets are correct
- Check Vercel project settings
- Ensure build command is correct

#### "Supabase migration failed"
- Check database credentials
- Verify migration files are valid
- Review migration logs

#### "Health check timeout"
- Increase retry count
- Check application logs
- Verify health endpoint exists

### Getting Help

1. Check workflow logs
2. Review GitHub Actions documentation
3. Check service status pages:
   - [GitHub Status](https://www.githubstatus.com/)
   - [Vercel Status](https://www.vercel-status.com/)
   - [Supabase Status](https://status.supabase.com/)

## Best Practices

### Commit Messages

Use conventional commits for better changelog:
```
feat: add new feature
fix: bug fix
docs: documentation update
chore: maintenance task
test: add tests
ci: CI/CD changes
```

### PR Guidelines

1. Keep PRs small and focused
2. Write descriptive titles
3. Include tests for new features
4. Update documentation
5. Wait for all checks to pass
6. Get at least one approval

### Security

1. Never commit secrets
2. Use GitHub Secrets for sensitive data
3. Rotate secrets regularly
4. Review security scan results
5. Keep dependencies updated
6. Use Dependabot for automated updates

## Maintenance

### Regular Tasks

- [ ] Review and update dependencies monthly
- [ ] Rotate API keys quarterly
- [ ] Review security scan results weekly
- [ ] Monitor workflow performance
- [ ] Update workflow actions to latest versions
- [ ] Review and optimize cache strategy

### Updating Workflows

1. Create feature branch
2. Update workflow files
3. Test with `act` locally
4. Create PR with changes
5. Monitor first run carefully
6. Document changes in this file

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Turborepo Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

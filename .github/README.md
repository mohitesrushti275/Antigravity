# GitHub Actions CI/CD

This directory contains the CI/CD workflows for the 21st.dev project.

## 📋 Workflows

### 1. Main CI/CD Pipeline (`deploy.yml`)
**Purpose**: Complete deployment pipeline from code quality to production

**Runs on**:
- Push to `main` or `develop`
- Pull requests
- Manual trigger

**Jobs**:
1. **Quality** - TypeScript, ESLint, Tests, Security
2. **Build** - Production build and bundle analysis
3. **Migrate** - Database migrations (production only)
4. **Deploy** - Vercel deployment with health checks
5. **Monitor** - Post-deployment monitoring

### 2. Pull Request Checks (`pr-check.yml`)
**Purpose**: Validate PRs before merge

**Runs on**:
- PR opened, synchronized, reopened

**Features**:
- Full quality checks
- Test coverage reporting
- Preview deployment
- Automated PR comments

### 3. Security Scanning (`security.yml`)
**Purpose**: Comprehensive security analysis

**Runs on**:
- Push to main/develop
- Pull requests
- Daily at 2 AM UTC
- Manual trigger

**Scans**:
- Dependency vulnerabilities
- CodeQL analysis
- Secret detection
- SAST (Semgrep)
- License compliance

## 🔐 Required Secrets

### Deployment
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Organization ID
- `VERCEL_PROJECT_ID` - Project ID
- `PRODUCTION_URL` - Production URL

### Database
- `SUPABASE_ACCESS_TOKEN` - API token
- `SUPABASE_DB_PASSWORD` - Database password
- `SUPABASE_PROJECT_ID` - Project ID

### Application
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

### Optional
- `TURBO_TOKEN` - Remote caching
- `SENTRY_AUTH_TOKEN` - Error tracking
- `CODECOV_TOKEN` - Coverage reporting

## 🚀 Quick Start

### 1. Set Up Secrets

```bash
# Using GitHub CLI
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
# ... add all required secrets
```

### 2. Configure Branch Protection

```bash
# Enable branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_status_checks[strict]=true
```

### 3. Validate Setup

```bash
# Run validation script
pnpm validate-cicd
```

## 📊 Workflow Status

Check workflow status:
- Go to repository → Actions tab
- View recent runs and their status
- Download artifacts if needed

## 🔧 Local Testing

### Test with act

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflows locally
act -j quality      # Run quality checks
act pull_request    # Simulate PR
```

### Validate Syntax

```bash
# Install actionlint
brew install actionlint

# Validate all workflows
actionlint .github/workflows/*.yml
```

## 📈 Performance

### Typical Run Times
- Quality checks: ~5 minutes
- Build: ~8 minutes
- Deploy: ~5 minutes
- Security scan: ~10 minutes

### Optimization
- Caching enabled for pnpm and Turbo
- Parallel job execution
- Artifact reuse across jobs
- Concurrency control to cancel outdated runs

## 🐛 Troubleshooting

### Common Issues

**"Resource not accessible"**
- Check workflow permissions in Settings → Actions

**"Vercel deployment failed"**
- Verify secrets are correct
- Check Vercel project settings

**"Health check timeout"**
- Increase retry count in workflow
- Check application logs

### Debug Mode

Enable debug logging:
```bash
gh secret set ACTIONS_RUNNER_DEBUG --body "true"
gh secret set ACTIONS_STEP_DEBUG --body "true"
```

## 📚 Documentation

- [Complete CI/CD Setup Guide](../docs/CICD_SETUP.md)
- [AWS/S3 Setup](../docs/AWS_SETUP.md)
- [Quick Start Guide](../docs/QUICK_START.md)

## 🔄 Maintenance

### Regular Tasks
- [ ] Review security scan results weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review workflow performance
- [ ] Update action versions

### Updating Workflows

1. Create feature branch
2. Modify workflow files
3. Test locally with `act`
4. Create PR
5. Monitor first run
6. Document changes

## 📞 Support

- Check [GitHub Actions docs](https://docs.github.com/en/actions)
- Review workflow logs
- Check service status pages
- Open issue for help

## 🎯 Best Practices

✅ **DO**
- Keep workflows simple and focused
- Use caching effectively
- Set appropriate timeouts
- Add descriptive names
- Document changes
- Test locally first

❌ **DON'T**
- Commit secrets to code
- Skip security scans
- Ignore failed checks
- Deploy without tests
- Use outdated actions
- Bypass branch protection

---

For detailed information, see [CICD_SETUP.md](../docs/CICD_SETUP.md)

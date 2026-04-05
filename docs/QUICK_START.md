# Quick Start Guide

Get your 21st.dev instance up and running in minutes.

## Prerequisites

- Node.js 18+ and pnpm
- AWS account (or Cloudflare account for R2)
- Supabase account
- Clerk account

## Step 1: Clone and Install

```bash
git clone <your-repo>
cd 21st-dev
pnpm install
```

## Step 2: Set Up Environment Variables

```bash
# Copy the example env file
cp apps/web/.env.example apps/web/.env.local

# Edit the file with your values
nano apps/web/.env.local
```

## Step 3: Configure Services

### A. Supabase (Database)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy these values to your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### B. Clerk (Authentication)

1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Go to API Keys
4. Copy these values to your `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### C. AWS S3 (File Storage)

Choose one option:

#### Option 1: AWS S3 (Traditional)

1. Follow the detailed guide: [AWS_SETUP.md](./AWS_SETUP.md)
2. Create S3 bucket
3. Create IAM user with S3 permissions
4. Add credentials to `.env.local`

#### Option 2: Cloudflare R2 (Recommended - No Egress Fees)

1. Go to Cloudflare Dashboard → R2
2. Create a bucket: `21st-dev-files`
3. Generate API token with Read & Write permissions
4. Add to `.env.local`:
   ```bash
   AWS_REGION=auto
   AWS_ACCESS_KEY_ID=your-r2-access-key
   AWS_SECRET_ACCESS_KEY=your-r2-secret-key
   AWS_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
   S3_BUCKET_NAME=21st-dev-files
   NEXT_PUBLIC_CDN_URL=https://your-bucket.your-account.r2.dev
   ```

## Step 4: Validate Configuration

```bash
# Run the validation script
pnpm validate-env
```

This will check:
- ✅ All required environment variables
- ✅ AWS/S3 connection and permissions
- ✅ Supabase database connection
- ⚠️  Optional services (AI, Redis, Email, etc.)

## Step 5: Set Up Database

```bash
# Run Supabase migrations (if you have them)
# Or manually create tables using Supabase dashboard
```

## Step 6: Start Development Server

```bash
pnpm dev
```

Your app should now be running at:
- Web: http://localhost:3000

## Step 7: Test File Upload

1. Sign up for an account
2. Try uploading a component
3. Check your S3 bucket to verify files are being stored

## Common Issues

### "AWS credentials not configured"
- Make sure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Check for typos or extra spaces in `.env.local`

### "Bucket not found"
- Verify `S3_BUCKET_NAME` matches your actual bucket name
- Check the bucket exists in the correct region

### "Access Denied" on S3
- Review IAM policy permissions
- Ensure the policy includes your bucket ARN
- Check the access key belongs to the correct IAM user

### "Supabase connection failed"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)
- Ensure your IP isn't blocked in Supabase settings

### "Clerk authentication not working"
- Verify both publishable and secret keys are set
- Check keys are from the same Clerk application
- Ensure domain is added to Clerk allowed origins

## Optional Services

### AI Component Generation

Add Anthropic API key:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Redis Caching (Upstash)

1. Create Redis database at [upstash.com](https://upstash.com)
2. Add credentials:
   ```bash
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

### Email Notifications (Resend)

1. Get API key from [resend.com](https://resend.com)
2. Add credentials:
   ```bash
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### Error Tracking (Sentry)

1. Create project at [sentry.io](https://sentry.io)
2. Add DSN:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   ```

## Production Deployment

### Environment Variables

Make sure to set all required variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- AWS: Systems Manager → Parameter Store

### Security Checklist

- [ ] Rotate all API keys from development
- [ ] Use separate S3 buckets for prod/staging
- [ ] Enable S3 bucket versioning
- [ ] Set up CloudFront/CDN for S3
- [ ] Configure CORS properly
- [ ] Enable Clerk production mode
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Enable HTTPS only
- [ ] Set secure cookie settings

## Next Steps

1. Customize the UI and branding
2. Set up CI/CD pipeline
3. Configure monitoring and logging
4. Add custom domain
5. Set up automated backups
6. Implement rate limiting
7. Add analytics

## Getting Help

- Documentation: [docs/](./docs/)
- AWS Setup: [AWS_SETUP.md](./AWS_SETUP.md)
- Issues: GitHub Issues
- Community: Discord/Slack

## Useful Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm lint             # Run linter
pnpm typecheck        # Check TypeScript
pnpm validate-env     # Validate environment

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode

# Cleanup
pnpm clean            # Clean build artifacts
```

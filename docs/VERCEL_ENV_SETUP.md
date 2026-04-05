# Vercel Environment Variables Setup

## 🚨 Critical: Required Environment Variables

Your Vercel deployment is failing because environment variables are not configured. Follow this guide to set them up.

## Quick Setup Steps

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **Antigravity**
3. Go to **Settings** → **Environment Variables**
4. Add all variables listed below
5. Redeploy your project

## Required Environment Variables

### 1. Supabase (REQUIRED - Build will fail without these)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://htanafkmeruvqqdzwcav.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW5hZmttZXJ1dnFxZHp3Y2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODExNDEsImV4cCI6MjA5MDg1NzE0MX0.Zgyzsoq1I0XnJE8QuLXqPjfSs2IXF7PWK05oPQwzwh0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW5hZmttZXJ1dnFxZHp3Y2F2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4MTE0MSwiZXhwIjoyMDkwODU3MTQxfQ.-TxO_ouCtDF_9fVKih31d1cvrQEK-FETgRSpsaDVWNg
```

### 2. Clerk Authentication (REQUIRED)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Z3Jvd2luZy1idXJyby0xNi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_y7N1FnUMnbZ4Exb1IZsElWtcBisrp02rJB24mua5K8
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/components
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/components
```

### 3. AWS S3 Storage (REQUIRED)

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=21st-dev-files
NEXT_PUBLIC_CDN_URL=
```

### 4. Upstash Redis (REQUIRED for rate limiting)

```bash
UPSTASH_REDIS_REST_URL=https://lenient-wildcat-75610.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAASdaAAIncDJjZjI4NDQxN2VlYjg0NDBkOGY5NTRkNDdkYTdhMjczM3AyNzU2MTA
```

### 5. Application Settings (REQUIRED)

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=
```

⚠️ **Important**: Replace `https://your-app.vercel.app` with your actual Vercel deployment URL

### 6. Sentry (Optional - for error monitoring)

```bash
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=nextjs-0k
SENTRY_PROJECT=21st-web
SENTRY_AUTH_TOKEN=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
```

### 7. Email (Optional - for notifications)

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@21st.dev
```

### 8. AI Services (Optional - for Magic Chat)

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

## Step-by-Step Instructions

### Method 1: Using Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Navigate to Environment Variables**
   - Click **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add Each Variable**
   - Click **Add New**
   - Enter **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter **Value** (copy from above)
   - Select environments:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Click **Save**

4. **Repeat for All Variables**
   - Add all required variables from the lists above
   - Make sure to check all three environments for each

5. **Redeploy**
   - Go to **Deployments** tab
   - Click the three dots (...) on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger deployment

### Method 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... repeat for all variables

# Or pull from .env file
vercel env pull .env.production
```

### Method 3: Bulk Import (Fastest)

1. Create a file `vercel-env.txt` with this format:

```
NEXT_PUBLIC_SUPABASE_URL=https://htanafkmeruvqqdzwcav.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ... all other variables
```

2. Go to Vercel Dashboard → Settings → Environment Variables
3. Look for "Bulk Import" or paste them one by one

## Verify Setup

After adding all variables and redeploying:

1. **Check Build Logs**
   - Go to Deployments tab
   - Click on the latest deployment
   - Check if build succeeds

2. **Test the App**
   - Visit your deployment URL
   - Try signing in
   - Check if admin panel works

## Common Issues

### Build Still Failing?

**Issue**: `supabaseKey is required`
- **Solution**: Make sure `SUPABASE_SERVICE_ROLE_KEY` is added to **all environments**

**Issue**: `Clerk is not configured`
- **Solution**: Add all `CLERK_*` variables

**Issue**: `AWS credentials not found`
- **Solution**: Add all `AWS_*` variables

### Environment Not Applied?

- Make sure you selected **all three environments** (Production, Preview, Development)
- Redeploy after adding variables
- Clear Vercel cache: Settings → General → Clear Cache

## Security Notes

⚠️ **Never commit these values to Git!**
- They're already in `.env` (which is in `.gitignore`)
- Only add them to Vercel Dashboard
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (it bypasses RLS)
- Keep `CLERK_SECRET_KEY` secret
- Keep `AWS_SECRET_ACCESS_KEY` secret

## Quick Copy-Paste List

For quick setup, here are all REQUIRED variables in one block:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://htanafkmeruvqqdzwcav.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW5hZmttZXJ1dnFxZHp3Y2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODExNDEsImV4cCI6MjA5MDg1NzE0MX0.Zgyzsoq1I0XnJE8QuLXqPjfSs2IXF7PWK05oPQwzwh0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW5hZmttZXJ1dnFxZHp3Y2F2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4MTE0MSwiZXhwIjoyMDkwODU3MTQxfQ.-TxO_ouCtDF_9fVKih31d1cvrQEK-FETgRSpsaDVWNg

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Z3Jvd2luZy1idXJyby0xNi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_y7N1FnUMnbZ4Exb1IZsElWtcBisrp02rJB24mua5K8
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/components
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/components

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=21st-dev-files
NEXT_PUBLIC_CDN_URL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://lenient-wildcat-75610.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAASdaAAIncDJjZjI4NDQxN2VlYjg0NDBkOGY5NTRkNDdkYTdhMjczM3AyNzU2MTA

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=nextjs-0k
SENTRY_PROJECT=21st-web
SENTRY_AUTH_TOKEN=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

# Email (Optional)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@21st.dev

# AI (Optional)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

## Need Help?

If you're still having issues:
1. Check Vercel deployment logs for specific errors
2. Verify all required variables are set
3. Make sure variables are applied to all environments
4. Try redeploying after adding variables

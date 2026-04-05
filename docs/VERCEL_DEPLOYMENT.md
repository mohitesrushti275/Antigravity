# Vercel Deployment Guide

## Monorepo Configuration

This is a Turborepo monorepo with the Next.js app located in `apps/web`. Follow these steps to deploy to Vercel.

## Step 1: Project Setup in Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository: `mohitesrushti275/Antigravity`

## Step 2: Configure Build Settings (CRITICAL)

In the project configuration screen, set the following **EXACTLY**:

### Framework Preset
- Select: **Next.js**

### Root Directory
- Click **Edit**
- Set to: `apps/web`
- ✅ **MUST CHECK**: "Include source files outside of the Root Directory in the Build Step"
- Click **Save**

### Build & Development Settings
**IMPORTANT**: Leave these as default (don't override) OR set exactly as follows:

**Build Command:**
Leave empty (Vercel will auto-detect) OR use:
```bash
cd ../.. && turbo run build --filter=@21st/web && cd apps/web
```
(The final `cd apps/web` ensures Vercel looks for output in the right place)

**Output Directory:**
Leave as `.next` (default for Next.js)

**Install Command:**
Leave empty (Vercel will auto-detect pnpm) OR use:
```bash
pnpm install
```

**Development Command:**
Leave as default

### Node.js Version
- Set to: **20.x**

## Step 3: Environment Variables

Add all required environment variables as documented in `VERCEL_ENV_SETUP.md`.

Go to **Settings** → **Environment Variables** and add:

### Critical Variables (Build will fail without these)
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

**Important**: For each variable, select all three environments:
- ✅ Production
- ✅ Preview  
- ✅ Development

See `VERCEL_ENV_SETUP.md` for complete list and values.

## Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete (may take 2-3 minutes)
3. Once deployed, note your Vercel URL (e.g., `https://your-app.vercel.app`)
4. Go back to **Settings** → **Environment Variables**
5. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
6. Go to **Deployments** → Click **Redeploy** to apply the updated URL

## Troubleshooting

### Error: "No Output Directory named 'public' found"

This error occurs when Vercel doesn't recognize the monorepo structure.

**Solution:**
1. Go to **Settings** → **General**
2. Scroll to **Root Directory**
3. Click **Edit**
4. Set to: `apps/web`
5. ✅ **CRITICAL**: Check "Include source files outside of the Root Directory in the Build Step"
6. Click **Save**
7. Go to **Settings** → **Build & Development Settings**
8. Click **Override** on Build Command
9. Set Build Command to: `cd ../.. && turbo run build --filter=@21st/web && cd apps/web`
10. Leave Output Directory as: `.next`
11. Leave Install Command empty (or set to `pnpm install`)
12. Click **Save**
13. Go to **Deployments** → **Redeploy**

**Why the `&& cd apps/web` at the end?**
After building from the root, we need to return to `apps/web` so Vercel can find the `.next` output directory.

### Error: "supabaseKey is required"

**Solution**: This has been fixed with lazy initialization. Make sure all environment variables are set in Vercel.

1. Go to **Settings** → **Environment Variables**
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Make sure it's enabled for all environments (Production, Preview, Development)
4. Redeploy

### Error: "Failed to collect page data"

**Solution**: This has been fixed by adding `export const dynamic = 'force-dynamic'` to dynamic pages.

### Build Timeout

If the build times out:
1. Check if all dependencies are properly cached
2. Verify `pnpm-lock.yaml` is committed to git
3. Consider upgrading to Vercel Pro for longer build times (10 minutes vs 5 minutes)

### Build Command Not Found

If you see "turbo: command not found":

**Solution**: Use this build command instead:
```bash
cd ../.. && pnpm run build --filter=@21st/web
```

## Vercel Configuration Files

### Root `vercel.json`
Contains cron job configuration (requires Vercel Pro tier).

### No `apps/web/vercel.json`
We intentionally don't use a `vercel.json` in `apps/web` because Vercel dashboard settings are more reliable for monorepos.

## Cron Jobs

Cron jobs are configured in the root `vercel.json` but require **Vercel Pro tier** ($20/month).

For free tier, use the GitHub Actions workflow in `.github/workflows/cron-jobs.yml` as documented in `VERCEL_CRON_SETUP.md`.

## Deployment Checklist

Before deploying, verify:

- [ ] Root Directory set to `apps/web`
- [ ] "Include source files outside Root Directory" enabled
- [ ] Build Command: `cd ../.. && pnpm turbo run build --filter=@21st/web`
- [ ] Output Directory: `.next`
- [ ] Install Command: `pnpm install`
- [ ] All environment variables added (see VERCEL_ENV_SETUP.md)
- [ ] All env vars enabled for Production, Preview, and Development
- [ ] `NEXT_PUBLIC_APP_URL` set to actual Vercel URL (update after first deploy)
- [ ] Build succeeds locally with `pnpm run build`
- [ ] All tests pass with `pnpm run test`
- [ ] Lint passes with `pnpm run lint`

## Post-Deployment Verification

After successful deployment:

1. ✅ Test the application at your Vercel URL
2. ✅ Verify authentication works (Clerk sign-in/sign-up)
3. ✅ Test file uploads (AWS S3)
4. ✅ Check admin panel access (requires admin role in Clerk)
5. ✅ Verify API endpoints work
6. ✅ Test database connections (Supabase)
7. ✅ Check that images load properly
8. ✅ Test search functionality
9. ✅ Verify rate limiting works (Upstash Redis)

## Continuous Deployment

Once configured, Vercel will automatically deploy:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## Screenshot: Correct Settings

Your Vercel settings should look like this:

**Root Directory:**
```
apps/web ✓ Include source files outside of the Root Directory in the Build Step
```

**Build & Development Settings:**
```
Build Command:        cd ../.. && turbo run build --filter=@21st/web && cd apps/web
Output Directory:     .next
Install Command:      (leave empty or: pnpm install)
Development Command:  (leave as default)
```

The key is the `&& cd apps/web` at the end - this ensures Vercel looks for the `.next` output in the correct location.

## Need Help?

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Turborepo with Vercel](https://turbo.build/repo/docs/handbook/deploying-with-docker)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Alternative: Deploy via Vercel CLI

If dashboard configuration doesn't work, you can deploy via CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (run from repository root)
vercel link

# Set root directory
vercel --cwd apps/web

# Deploy
vercel --prod
```


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

This happens when Root Directory is set. 

**Solution:**
1. Go to **Settings** → **General**
2. Find **Root Directory**
3. Click **Edit** and **CLEAR IT** (leave empty)
4. Click **Save**
5. Make sure `vercel.json` exists at repository root with correct config
6. Redeploy

### Error: 404 NOT_FOUND after deployment

This happens when Vercel can't find the built app.

**Solution:**
1. Verify `vercel.json` at repository root has:
   - `"outputDirectory": "apps/web/.next"`
   - `"buildCommand": "turbo run build --filter=@21st/web"`
2. Go to **Settings** → **General** → **Root Directory** → Make sure it's **EMPTY**
3. Go to **Settings** → **Build & Development Settings** → Make sure nothing is overridden (all empty)
4. Redeploy

**Solution**: This has been fixed with lazy initialization. Make sure all environment variables are set in Vercel.

1. Go to **Settings** → **Environment Variables**
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Make sure it's enabled for all environments (Production, Preview, Development)
4. Redeploy

### Error: "supabaseKey is required"

**Solution**: This has been fixed by adding `export const dynamic = 'force-dynamic'` to dynamic pages.

### Error: "Failed to collect page data"

If the build times out:
1. Check if all dependencies are properly cached
2. Verify `pnpm-lock.yaml` is committed to git
3. Consider upgrading to Vercel Pro for longer build times (10 minutes vs 5 minutes)

### Build Timeout

If you see "turbo: command not found":

**Solution**: Use this build command instead:
```bash
cd ../.. && pnpm run build --filter=@21st/web
```

## Vercel Configuration

All configuration is in the root `vercel.json`:
- Build command: Uses Turbo to build the web app and its dependencies
- Output directory: Points to `apps/web/.next`
- Install command: Uses pnpm
- Cron jobs: Configured (requires Vercel Pro tier)

**DO NOT** set Root Directory in Vercel dashboard - it breaks monorepo builds.

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
(empty - not set)
```

**Build & Development Settings:**
```
Build Command:        (empty - uses vercel.json)
Output Directory:     (empty - uses vercel.json)
Install Command:      (empty - uses vercel.json)
Development Command:  (empty - uses default)
```

All configuration comes from `vercel.json` at the repository root.

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


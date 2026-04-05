# Vercel Deployment Guide

## Monorepo Configuration

This is a Turborepo monorepo with the Next.js app located in `apps/web`. Follow these steps to deploy to Vercel.

## Step 1: Project Setup in Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository: `mohitesrushti275/Antigravity`

## Step 2: Configure Build Settings

In the project configuration screen, set the following:

### Framework Preset
- Select: **Next.js**

### Root Directory
- Set to: `apps/web`
- ✅ Check "Include source files outside of the Root Directory in the Build Step"

### Build Command
Leave empty or use:
```bash
cd ../.. && pnpm run build --filter=@21st/web
```

### Output Directory
Leave as default (`.next`)

### Install Command
```bash
pnpm install
```

### Node Version
- Set to: **20.x** (or latest LTS)

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

See `VERCEL_ENV_SETUP.md` for complete list and values.

## Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Once deployed, update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
4. Redeploy to apply the updated URL

## Troubleshooting

### Error: "No Output Directory named 'public' found"

**Solution**: Make sure you set the **Root Directory** to `apps/web` in Vercel project settings.

1. Go to **Settings** → **General**
2. Find **Root Directory**
3. Set to: `apps/web`
4. ✅ Enable "Include source files outside of the Root Directory in the Build Step"
5. Save and redeploy

### Error: "supabaseKey is required"

**Solution**: This has been fixed with lazy initialization. Make sure all environment variables are set in Vercel.

### Error: "Failed to collect page data"

**Solution**: This has been fixed by adding `export const dynamic = 'force-dynamic'` to dynamic pages.

### Build Timeout

If the build times out:
1. Check if all dependencies are properly cached
2. Verify pnpm lockfile is committed
3. Consider upgrading to Vercel Pro for longer build times

## Vercel Configuration Files

### Root `vercel.json`
Contains cron job configuration (requires Vercel Pro tier).

### `apps/web/vercel.json`
Contains build configuration for the Next.js app.

## Cron Jobs

Cron jobs are configured in the root `vercel.json` but require **Vercel Pro tier** ($20/month).

For free tier, use the GitHub Actions workflow in `.github/workflows/cron-jobs.yml` as documented in `VERCEL_CRON_SETUP.md`.

## Deployment Checklist

- [ ] Root Directory set to `apps/web`
- [ ] "Include source files outside Root Directory" enabled
- [ ] All environment variables added
- [ ] `NEXT_PUBLIC_APP_URL` set to actual Vercel URL
- [ ] Build succeeds locally with `pnpm run build`
- [ ] All tests pass with `pnpm run test`
- [ ] Lint passes with `pnpm run lint`

## Post-Deployment

After successful deployment:

1. Test the application at your Vercel URL
2. Verify authentication works (Clerk)
3. Test file uploads (AWS S3)
4. Check admin panel access
5. Verify API endpoints work
6. Test database connections (Supabase)

## Continuous Deployment

Once configured, Vercel will automatically deploy:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## Need Help?

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Turborepo with Vercel](https://turbo.build/repo/docs/handbook/deploying-with-docker)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

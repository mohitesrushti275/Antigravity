# Cron Jobs Quick Start Guide

## 🚨 Critical Information

**Vercel Cron Jobs require Pro tier ($20/month)**

If you're on the **Free tier**, follow the GitHub Actions setup below.

## Your Cron Secret

```
6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=
```

⚠️ Keep this secret! It's used to authenticate cron job requests.

## Setup for Vercel Free Tier (Using GitHub Actions)

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

**Secret 1:**
- Name: `APP_URL`
- Value: `https://your-app.vercel.app` (your Vercel deployment URL)

**Secret 2:**
- Name: `CRON_SECRET`
- Value: `6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=`

### Step 2: Enable GitHub Actions

The workflow file is already created at `.github/workflows/cron-jobs.yml`

It will automatically run daily at 2 AM UTC.

### Step 3: Test Manually

1. Go to your GitHub repo → **Actions** tab
2. Click **Scheduled Cron Jobs** workflow
3. Click **Run workflow** → **Run workflow**
4. Check the logs to verify it works

## Setup for Vercel Pro Tier

### Step 1: Add Environment Variable to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `CRON_SECRET`
   - **Value**: `6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=`
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

### Step 2: Redeploy

Cron jobs are already configured in `vercel.json`. Just redeploy:

```bash
git push origin main
```

Vercel will automatically set up the cron jobs.

## Verify Cron Jobs are Working

### For GitHub Actions:
- Go to **Actions** tab in your GitHub repo
- Check the workflow runs
- Green checkmark = success ✅

### For Vercel Cron:
- Go to Vercel Dashboard → Your Project → **Cron Jobs** tab
- You'll see execution history

## Test Locally

```bash
# Make sure your .env has CRON_SECRET set
# Then test each endpoint:

curl -X GET "http://localhost:3000/api/cron/recompute-counts" \
  -H "Authorization: Bearer 6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg="
```

## What Each Cron Job Does

| Job | Schedule | Purpose |
|-----|----------|---------|
| **recompute-counts** | Daily 2 AM | Syncs download/like counts |
| **purge-deleted-files** | Daily 3 AM | Removes old S3 files |
| **update-embeddings** | Daily 4 AM | Updates vector search |
| **reset-monthly-counts** | 1st of month | Resets API usage |

## Troubleshooting

### "Unauthorized" Error
- Check that `CRON_SECRET` matches in both:
  - Your `.env` file (local)
  - Vercel environment variables (production)
  - GitHub secrets (if using Actions)

### Cron Jobs Not Running on Vercel
- Verify you're on **Pro tier** or higher
- Check Vercel Dashboard → Cron Jobs tab for errors

### GitHub Actions Not Running
- Check that secrets `APP_URL` and `CRON_SECRET` are set
- Verify the workflow file exists in `.github/workflows/`
- Check Actions tab for error logs

## Need Help?

See full documentation: [VERCEL_CRON_SETUP.md](./VERCEL_CRON_SETUP.md)

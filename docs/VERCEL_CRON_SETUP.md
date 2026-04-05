# Vercel Cron Jobs Setup

## ⚠️ Important: Vercel Free Tier Limitations

**Cron Jobs are NOT available on Vercel's Free (Hobby) tier.**

### Vercel Pricing Tiers for Cron Jobs:

| Tier | Cron Jobs Available | Price |
|------|-------------------|-------|
| **Hobby (Free)** | ❌ No | $0/month |
| **Pro** | ✅ Yes | $20/month |
| **Enterprise** | ✅ Yes | Custom pricing |

### What This Means:
- If you're on the **Free tier**, cron jobs defined in `vercel.json` will be **ignored**
- The cron endpoints will still be accessible via direct HTTP requests
- You'll need to upgrade to **Pro tier** ($20/month) to enable automatic cron execution
x
## Alternative Solutions for Free Tier

If you want to keep using the free tier, you can use external cron services:

### 1. **GitHub Actions** (Free)
Create `.github/workflows/cron.yml`:

```yaml
name: Cron Jobs
on:
  schedule:
    # Recompute counts - Daily at 2 AM UTC
    - cron: '0 2 * * *'
    # Purge deleted files - Daily at 3 AM UTC
    - cron: '0 3 * * *'
    # Reset monthly counts - 1st of month at midnight UTC
    - cron: '0 0 1 * *'
    # Update embeddings - Daily at 4 AM UTC
    - cron: '0 4 * * *'

jobs:
  trigger-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cron Endpoints
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/recompute-counts" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
          
          curl -X GET "${{ secrets.APP_URL }}/api/cron/purge-deleted-files" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
          
          # Add other cron jobs as needed
```

**Setup:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add secrets:
   - `APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - `CRON_SECRET`: `6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=`

### 2. **Cron-job.org** (Free)
- Visit https://cron-job.org
- Create free account
- Add jobs for each endpoint:
  - URL: `https://your-app.vercel.app/api/cron/recompute-counts`
  - Add header: `Authorization: Bearer 6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=`
  - Set schedule

### 3. **EasyCron** (Free tier: 1 job)
- Visit https://www.easycron.com
- Free tier allows 1 cron job
- Good for the most critical job (e.g., recompute-counts)

### 4. **Upstash QStash** (Free tier: 500 requests/day)
Since you're already using Upstash Redis, you can use QStash:

```typescript
// Example: Schedule with QStash
import { Client } from "@upstash/qstash";

const client = new Client({ token: process.env.QSTASH_TOKEN });

await client.publishJSON({
  url: "https://your-app.vercel.app/api/cron/recompute-counts",
  headers: {
    "Authorization": `Bearer ${process.env.CRON_SECRET}`
  },
  // Run daily at 2 AM
  cron: "0 2 * * *"
});
```

## Current Cron Jobs Configuration

Your app has 4 cron jobs defined in `vercel.json`:

### 1. Recompute Counts
- **Path**: `/api/cron/recompute-counts`
- **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
- **Purpose**: Sync download_count and like_count from actual data

### 2. Purge Deleted Files
- **Path**: `/api/cron/purge-deleted-files`
- **Schedule**: `0 3 * * *` (Daily at 3 AM UTC)
- **Purpose**: Remove S3 files for components deleted > 30 days ago

### 3. Reset Monthly Counts
- **Path**: `/api/cron/reset-monthly-counts`
- **Schedule**: `0 0 1 * *` (1st of each month at midnight UTC)
- **Purpose**: Reset API key monthly usage counters

### 4. Update Embeddings
- **Path**: `/api/cron/update-embeddings`
- **Schedule**: `0 4 * * *` (Daily at 4 AM UTC)
- **Purpose**: Backfill null embeddings for vector search

## Security

All cron endpoints are protected with a secret token:

```typescript
const authHeader = req.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Your Cron Secret**: `6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=`

⚠️ **Important**: Add this to your Vercel environment variables:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `CRON_SECRET` = `6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg=`
3. Apply to: Production, Preview, Development

## Testing Cron Jobs Locally

You can test cron endpoints locally:

```bash
# Test recompute counts
curl -X GET "http://localhost:3000/api/cron/recompute-counts" \
  -H "Authorization: Bearer 6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg="

# Test purge deleted files
curl -X GET "http://localhost:3000/api/cron/purge-deleted-files" \
  -H "Authorization: Bearer 6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg="

# Test reset monthly counts
curl -X GET "http://localhost:3000/api/cron/reset-monthly-counts" \
  -H "Authorization: Bearer 6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg="

# Test update embeddings
curl -X GET "http://localhost:3000/api/cron/update-embeddings" \
  -H "Authorization: Bearer 6gSePY7hR9VWY8hlvxtQ1QpqMAHvR5f4nIx545O8OVg="
```

## Recommendation

**For Production on Free Tier**: Use **GitHub Actions** (free and reliable)
- No additional cost
- Runs on GitHub's infrastructure
- Easy to set up and maintain
- Can monitor execution in GitHub Actions tab

**For Production on Pro Tier**: Use **Vercel Cron Jobs** (already configured)
- Native integration
- Automatic execution
- Monitoring in Vercel dashboard
- No external dependencies

## Next Steps

1. ✅ Cron secret generated and added to `.env`
2. ⚠️ Add `CRON_SECRET` to Vercel environment variables
3. ⚠️ Choose cron solution based on your Vercel tier:
   - **Free tier**: Set up GitHub Actions (recommended)
   - **Pro tier**: Cron jobs will work automatically

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Pricing](https://vercel.com/pricing)
- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

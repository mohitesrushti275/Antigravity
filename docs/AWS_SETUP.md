# AWS S3 and IAM Setup Guide

This guide will help you set up AWS S3 bucket and IAM permissions for the 21st.dev application.

## Overview

The application uses AWS S3 for storing:
- Component source code files
- Demo files
- CSS files
- Configuration files
- Preview images
- Video files

## Step 1: Create S3 Bucket

1. Go to AWS Console → S3
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `21st-dev-files` (or your preferred name)
   - **Region**: `us-east-1` (or your preferred region)
   - **Block Public Access**: Keep all enabled (we'll use presigned URLs)
   - **Bucket Versioning**: Optional (recommended for production)
   - **Encryption**: Enable SSE-S3 (recommended)

4. Click "Create bucket"

## Step 2: Configure CORS (Required for Direct Uploads)

1. Go to your bucket → Permissions → CORS
2. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Step 3: Create IAM User

1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. User name: `21st-dev-s3-user`
4. Select "Programmatic access"
5. Click "Next"

## Step 4: Create IAM Policy

1. In the permissions step, click "Attach policies directly"
2. Click "Create policy"
3. Choose JSON tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::21st-dev-files",
        "arn:aws:s3:::21st-dev-files/*"
      ]
    },
    {
      "Sid": "S3PresignedURLs",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::21st-dev-files/*"
    }
  ]
}
```

4. Click "Next"
5. Policy name: `21st-dev-s3-policy`
6. Click "Create policy"

## Step 5: Attach Policy to User

1. Go back to user creation
2. Refresh policies and search for `21st-dev-s3-policy`
3. Select the policy
4. Click "Next" → "Create user"

## Step 6: Generate Access Keys

1. Click on the created user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Choose "Application running outside AWS"
5. Click "Next" → "Create access key"
6. **IMPORTANT**: Copy both:
   - Access key ID
   - Secret access key
   - You won't be able to see the secret again!

## Step 7: Update Environment Variables

Update your `apps/web/.env` file:

```bash
# ── AWS S3 ──
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=21st-dev-files
NEXT_PUBLIC_CDN_URL=https://your-bucket.s3.amazonaws.com
```

## Step 8: (Optional) Set Up CloudFront CDN

For better performance and custom domain:

1. Go to AWS Console → CloudFront
2. Click "Create distribution"
3. Configure:
   - **Origin domain**: Select your S3 bucket
   - **Origin access**: Origin access control (recommended)
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache policy**: CachingOptimized
   - **Origin request policy**: CORS-S3Origin

4. Click "Create distribution"
5. Wait for deployment (5-15 minutes)
6. Update your `.env`:

```bash
NEXT_PUBLIC_CDN_URL=https://d1234567890.cloudfront.net
```

## Alternative: Cloudflare R2 Setup

If you prefer Cloudflare R2 (S3-compatible, no egress fees):

### Step 1: Create R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Bucket name: `21st-dev-files`
4. Click "Create bucket"

### Step 2: Generate API Token

1. Go to R2 → Manage R2 API Tokens
2. Click "Create API token"
3. Token name: `21st-dev-token`
4. Permissions: Object Read & Write
5. Click "Create API token"
6. Copy:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL

### Step 3: Update Environment Variables

```bash
# ── Cloudflare R2 ──
AWS_REGION=auto
AWS_ACCESS_KEY_ID=your-r2-access-key-id
AWS_SECRET_ACCESS_KEY=your-r2-secret-access-key
S3_BUCKET_NAME=21st-dev-files
# Use R2 endpoint instead of AWS
AWS_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
NEXT_PUBLIC_CDN_URL=https://your-bucket.your-account.r2.dev
```

### Step 4: Update S3 Client for R2

Update `apps/web/src/lib/s3/client.ts`:

```typescript
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL, // Add this for R2
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

## Security Best Practices

1. **Never commit credentials**: Keep `.env` in `.gitignore`
2. **Use separate buckets**: Different buckets for dev/staging/production
3. **Enable versioning**: Helps recover from accidental deletions
4. **Set up lifecycle policies**: Auto-delete old files if needed
5. **Monitor costs**: Set up billing alerts
6. **Rotate keys regularly**: Change access keys every 90 days
7. **Use least privilege**: Only grant necessary permissions

## Testing Your Setup

Run this test to verify your S3 configuration:

```bash
# In your project root
node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
s3.send(new ListBucketsCommand({}))
  .then(() => console.log('✅ S3 connection successful!'))
  .catch(err => console.error('❌ S3 connection failed:', err.message));
"
```

## Troubleshooting

### Error: "Access Denied"
- Check IAM policy has correct bucket ARN
- Verify access keys are correct
- Ensure bucket name matches in policy and .env

### Error: "CORS policy"
- Add your domain to CORS AllowedOrigins
- Check CORS configuration in S3 bucket

### Error: "Bucket not found"
- Verify bucket name in .env matches actual bucket
- Check region is correct

### Error: "SignatureDoesNotMatch"
- Verify AWS_SECRET_ACCESS_KEY is correct
- Check for extra spaces in .env file
- Ensure keys haven't been rotated

## Cost Estimation

Typical monthly costs for small-medium app:
- **S3 Storage**: $0.023/GB (~$2.30 for 100GB)
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer out**: $0.09/GB (first 10TB)

**CloudFront** (optional):
- **Data transfer**: $0.085/GB (first 10TB)
- **Requests**: $0.0075 per 10,000 HTTPS requests

**Cloudflare R2** (alternative):
- **Storage**: $0.015/GB
- **Class A operations**: $4.50 per million
- **Class B operations**: $0.36 per million
- **Data transfer**: FREE (no egress fees!)

## Next Steps

1. Set up monitoring with CloudWatch
2. Configure S3 lifecycle policies
3. Set up automated backups
4. Implement file scanning for security
5. Add rate limiting for uploads

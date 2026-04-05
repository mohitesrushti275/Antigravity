# Admin Portal Access Guide

## Overview

The admin portal is located at `/admin` and provides access to:
- 📊 Dashboard - Overview statistics
- 📦 Components - Manage all components
- 🎨 Design Entries - Manage design showcase
- 📋 Review Queue - Approve/reject submissions
- 📈 Analytics - Detailed analytics
- 👥 Users - User management
- 📜 Audit Log - System audit trail

## Access Requirements

To access the admin portal, you need:
1. ✅ A registered Clerk account
2. ✅ Admin role assigned in Clerk

## How to Access Admin Portal

### Step 1: Sign Up / Sign In

1. Go to your application: `http://localhost:3000`
2. Click "Sign In" or "Sign Up"
3. Complete the authentication process

### Step 2: Grant Admin Access

The admin check looks for `role: "admin"` in Clerk's `publicMetadata`. You need to set this in Clerk Dashboard.

#### Option A: Using Clerk Dashboard (Recommended)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Users** section
4. Find your user account
5. Click on the user
6. Scroll to **Public metadata** section
7. Click **Edit**
8. Add this JSON:
   ```json
   {
     "role": "admin"
   }
   ```
9. Click **Save**

#### Option B: Using Clerk API

```bash
# Set admin role via API
curl -X PATCH "https://api.clerk.com/v1/users/{user_id}/metadata" \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "public_metadata": {
      "role": "admin"
    }
  }'
```

#### Option C: Programmatically (For Development)

Create a script to set admin role:

```typescript
// scripts/make-admin.ts
import { clerkClient } from '@clerk/nextjs/server';

async function makeAdmin(userId: string) {
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: 'admin'
    }
  });
  console.log(`✅ User ${userId} is now an admin`);
}

// Get your user ID from Clerk Dashboard
makeAdmin('user_xxxxxxxxxxxxx');
```

### Step 3: Access Admin Portal

1. **Refresh your browser** (important - metadata needs to reload)
2. Navigate to: `http://localhost:3000/admin`
3. You should see the admin dashboard

## Troubleshooting

### Issue: Redirected to Homepage

**Cause**: User doesn't have admin role

**Solution**:
1. Check Clerk Dashboard → Users → Your User → Public Metadata
2. Verify it contains: `{ "role": "admin" }`
3. Sign out and sign back in
4. Clear browser cache if needed

### Issue: "Loading..." Forever

**Cause**: Clerk not loading properly

**Solution**:
1. Check browser console for errors
2. Verify Clerk keys in `.env`:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
3. Restart dev server: `pnpm dev`

### Issue: 404 Not Found

**Cause**: Admin routes not built

**Solution**:
1. Verify files exist in `apps/web/src/app/admin/`
2. Restart dev server
3. Check for build errors

## Admin Portal Features

### 1. Dashboard (`/admin`)
- Total users, components, downloads
- Recent activity
- Top components

### 2. Components (`/admin/components`)
- View all components
- Create/edit/delete components
- Upload files
- Change status (draft/review/posted/featured)
- Manage categories

### 3. Design Entries (`/admin/entries`)
- Manage design showcase categories
- Add/edit/delete design entries
- Upload preview images
- Organize by category

### 4. Review Queue (`/admin/queue`)
- Components pending review
- Approve or reject submissions
- Send feedback to users

### 5. Analytics (`/admin/analytics`)
- Detailed statistics
- User growth
- Component performance
- Download trends

### 6. Users (`/admin/users`)
- View all users
- Search users
- Change user roles
- Ban/unban users

### 7. Audit Log (`/admin/audit`)
- System activity log
- User actions
- Admin actions
- Security events

## Security Notes

### Role-Based Access Control

The admin layout checks:
```typescript
const role = user?.publicMetadata?.role;
if (!user || role !== "admin") {
  redirect("/");
}
```

### API Protection

All admin API routes should verify admin role:
```typescript
// Example: apps/web/src/app/api/admin/*/route.ts
const { userId } = await auth();
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('clerk_id', userId)
  .single();

if (user?.role !== 'admin') {
  return errors.forbidden();
}
```

### Database Role Sync

Make sure to sync Clerk role with database:

1. **Create webhook** in Clerk Dashboard
2. **Endpoint**: `https://yourdomain.com/api/webhooks/clerk`
3. **Events**: `user.created`, `user.updated`
4. **Handler** should update database role

## Quick Setup Script

Create `scripts/setup-admin.sh`:

```bash
#!/bin/bash

echo "🔧 Admin Setup Script"
echo ""

# Get user ID from Clerk
echo "1. Go to Clerk Dashboard → Users"
echo "2. Find your user and copy the User ID"
echo ""
read -p "Enter your Clerk User ID: " USER_ID

# Get Clerk Secret Key
read -p "Enter your Clerk Secret Key: " CLERK_SECRET

# Set admin role
echo ""
echo "Setting admin role..."

curl -X PATCH "https://api.clerk.com/v1/users/${USER_ID}/metadata" \
  -H "Authorization: Bearer ${CLERK_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "public_metadata": {
      "role": "admin"
    }
  }'

echo ""
echo "✅ Done! Sign out and sign back in to access /admin"
```

## Development Tips

### Testing Admin Features

1. **Create test admin account**:
   ```bash
   # Use a separate email for testing
   # Set role to "admin" in Clerk
   ```

2. **Test role switching**:
   ```typescript
   // Temporarily change role in Clerk Dashboard
   // Test both admin and regular user views
   ```

3. **Check API protection**:
   ```bash
   # Try accessing admin API without auth
   curl http://localhost:3000/api/admin/users
   # Should return 401 Unauthorized
   ```

### Local Development

For local development, you can bypass admin check temporarily:

```typescript
// apps/web/src/app/admin/layout.tsx
// ⚠️ ONLY FOR LOCAL DEVELOPMENT - REMOVE BEFORE PRODUCTION

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Bypass for development
  if (process.env.NODE_ENV === 'development') {
    return <div className="flex min-h-screen">{children}</div>;
  }
  
  // Normal admin check...
}
```

**⚠️ WARNING**: Remove this bypass before deploying to production!

## Production Setup

### 1. Set First Admin

Before launch, set at least one admin:
```bash
# Via Clerk Dashboard
# Set role: "admin" for your account
```

### 2. Admin Invitation Flow

Create an admin invitation system:
```typescript
// apps/web/src/app/api/admin/invite/route.ts
export async function POST(req: Request) {
  // Verify current user is admin
  // Generate invitation token
  // Send email with invitation link
  // Link sets role to "admin" on signup
}
```

### 3. Monitor Admin Actions

Enable audit logging for all admin actions:
```typescript
await writeAuditLog({
  userId: admin.id,
  action: 'admin.action',
  resourceType: 'resource',
  resourceId: id,
  metadata: { details }
});
```

## FAQ

**Q: Can I have multiple admins?**
A: Yes, set `role: "admin"` for multiple users in Clerk.

**Q: How do I remove admin access?**
A: Change `role` to `"user"` in Clerk Dashboard.

**Q: Is there a super admin role?**
A: Not by default. You can add custom roles like `"superadmin"` if needed.

**Q: Can admins see other admins?**
A: Yes, in the Users page. Consider adding role filtering.

**Q: How to audit admin actions?**
A: Check `/admin/audit` for all logged actions.

## Next Steps

1. ✅ Set up your admin account
2. ✅ Access `/admin` portal
3. ✅ Explore admin features
4. ✅ Configure admin settings
5. ✅ Set up additional admins (if needed)

## Support

If you have issues accessing the admin portal:
1. Check Clerk Dashboard for role configuration
2. Verify environment variables
3. Check browser console for errors
4. Review server logs
5. Ensure database is properly configured

---

**Security Reminder**: Always protect admin routes and verify roles on both client and server side!

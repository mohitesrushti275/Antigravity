import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { cache, CacheKeys } from '@/lib/cache';
import { sendEmail, componentApprovedEmail, componentRejectedEmail } from '@/lib/email';
import { ReviewSchema } from '@21st/types';
import { requirePermission } from '@/lib/api/adminAuth';
import { Permission } from '@/lib/rbac';

type RouteParams = { params: Promise<{ id: string }> };

// ═══════════════════════════════════════════════════
// Valid state machine transitions
// ═══════════════════════════════════════════════════
const VALID_TRANSITIONS: Record<string, Record<string, string>> = {
  on_review: { approve: 'posted', feature: 'featured', reject: 'rejected' },
  posted:    { feature: 'featured' },
  featured:  { unfeature: 'posted' },
  rejected:  {}, // Author resubmits, not admin action
};

// ═══════════════════════════════════════════════════
// PUT /api/admin/review/[id] — Review component
// ═══════════════════════════════════════════════════
export const PUT = withHandler(async (req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;

  // RBAC: require APPROVE_COMPONENTS permission (moderator+)
  const authResult = await requirePermission(req, Permission.APPROVE_COMPONENTS);
  if (authResult instanceof Response) return authResult;

  const body = await req.json();
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return errors.validationError(parsed.error.flatten());

  const { action, reason } = parsed.data;

  // Get admin user for audit log
  const { data: admin } = await supabaseAdmin
    .from('users').select('id').eq('clerk_id', authResult.userId).single();
  if (!admin) return errors.forbidden();

  // Get current component
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, name, status, user_id, slug, published_at, users ( email, username )')
    .eq('id', id)
    .single();
  if (!component) return errors.notFound();

  // Validate state machine transition
  const transitions = VALID_TRANSITIONS[component.status];
  if (!transitions || !transitions[action]) {
    return errors.validationError({
      message: `Cannot ${action} a component with status "${component.status}"`,
    });
  }

  const newStatus = transitions[action];
  const updateData: Record<string, unknown> = { status: newStatus };

  if (action === 'reject' && reason) updateData.rejection_reason = reason;
  if (['approve', 'feature'].includes(action) && !component.published_at) {
    updateData.published_at = new Date().toISOString();
  }

  await supabaseAdmin.from('components').update(updateData).eq('id', id);

  // Invalidate caches
  await cache.del(
    CacheKeys.component(id),
    CacheKeys.featured(),
    CacheKeys.popular()
  );

  // Send notification email
  const userEmail = (component as Record<string, unknown>).users as { email: string; username: string };
  if (userEmail?.email) {
    if (action === 'approve' || action === 'feature') {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/${userEmail.username}/${component.slug}`;
      const emailContent = componentApprovedEmail(component.name, url);
      await sendEmail({ to: userEmail.email, ...emailContent });
    } else if (action === 'reject' && reason) {
      const emailContent = componentRejectedEmail(component.name, reason);
      await sendEmail({ to: userEmail.email, ...emailContent });
    }
  }

  // Audit log
  await writeAuditLog({
    userId: admin.id,
    action: 'component.reviewed',
    resourceType: 'component',
    resourceId: id,
    metadata: { action, newStatus, reason },
  });

  return success({ id, status: newStatus });
});

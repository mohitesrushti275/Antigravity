import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import { UpdateComponentSchema } from '@21st/types';
import { auth } from '@clerk/nextjs/server';
import { isLegacyAdmin } from '@/lib/api/clerkAdmin';

type RouteParams = { params: Promise<{ id: string }> };

// ═══════════════════════════════════════════════════
// GET /api/components/[id] — Single component detail
// ═══════════════════════════════════════════════════
export const GET = withHandler(async (req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;

  // Check cache first
  const cached = await cache.get(CacheKeys.component(id));
  if (cached) {
    return success(cached);
  }

  const supabaseAdmin = await createServerSupabaseClient();

  const { data: component, error: dbError } = await supabaseAdmin
    .from('components')
    .select(`
      *,
      users!inner ( username, avatar_url, bio ),
      categories ( slug, name, section ),
      component_demos ( id, name, preview_image_key, video_key, display_order ),
      component_tags ( tags ( id, slug, name ) ),
      component_files ( id, file_type, r2_key, filename, size_bytes, content_type )
    `)
    .eq('id', id)
    .single();

  if (dbError || !component) {
    return errors.notFound('Component not found');
  }

  // Check if current user has liked
  let isLiked = false;
  const { userId } = await auth();
  if (userId) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (user) {
      const { data: like } = await supabaseAdmin
        .from('likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('component_id', id)
        .maybeSingle();
      isLiked = !!like;
    }
  }

  const result = { ...component, is_liked: isLiked };

  // Cache for 60 min
  await cache.set(CacheKeys.component(id), result, CacheTTL.COMPONENT);

  return success(result);
});

// ═══════════════════════════════════════════════════
// PUT /api/components/[id] — Update component (owner only)
// ═══════════════════════════════════════════════════
export const PUT = withHandler(async (req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return errors.unauthorized();

  const body = await req.json();
  const parsed = UpdateComponentSchema.safeParse(body);
  if (!parsed.success) {
    return errors.validationError(parsed.error.flatten());
  }

  // Get internal user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();
  if (!user) return errors.unauthorized();

  // Check if user is admin via Clerk (not DB)
  const userIsAdmin = await isLegacyAdmin();

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('components')
    .select('user_id, status')
    .eq('id', id)
    .single();

  if (!existing) return errors.notFound();
  if (existing.user_id !== user.id && !userIsAdmin) {
    return errors.forbidden();
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
    updateData.slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.categoryId !== undefined) updateData.category_id = parsed.data.categoryId;
  if (parsed.data.npmDependencies !== undefined) updateData.npm_dependencies = parsed.data.npmDependencies;
  if (parsed.data.license !== undefined) updateData.license = parsed.data.license;
  if (parsed.data.isPublic !== undefined) updateData.is_public = parsed.data.isPublic;

  // If component was posted/featured and owner edits, move back to review
  if (['posted', 'featured'].includes(existing.status) && !userIsAdmin) {
    updateData.status = 'on_review';
  }

  const { data: updated, error: dbError } = await supabaseAdmin
    .from('components')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (dbError) {
    console.error('Component update error:', dbError);
    return errors.internal();
  }

  // Invalidate cache
  await cache.del(CacheKeys.component(id));

  await writeAuditLog({
    userId: user.id,
    action: 'component.update',
    resourceType: 'component',
    resourceId: id,
    metadata: updateData,
  });

  return success(updated);
});

// ═══════════════════════════════════════════════════
// DELETE /api/components/[id] — Soft delete (owner/admin)
// ═══════════════════════════════════════════════════
export const DELETE = withHandler(async (req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return errors.unauthorized();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();
  if (!user) return errors.unauthorized();

  // Check if user is admin via Clerk (not DB)
  const userIsAdmin = await isLegacyAdmin();

  const { data: existing } = await supabaseAdmin
    .from('components')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) return errors.notFound();
  if (existing.user_id !== user.id && !userIsAdmin) {
    return errors.forbidden();
  }

  // Soft delete
  await supabaseAdmin
    .from('components')
    .update({ status: 'deleted' })
    .eq('id', id);

  await cache.del(CacheKeys.component(id));

  await writeAuditLog({
    userId: user.id,
    action: 'component.delete',
    resourceType: 'component',
    resourceId: id,
  });

  return success({ deleted: true });
});

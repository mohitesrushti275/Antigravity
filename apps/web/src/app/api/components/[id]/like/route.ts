import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { cache, CacheKeys } from '@/lib/cache';
import { auth } from '@clerk/nextjs/server';

type RouteParams = { params: Promise<{ id: string }> };

// ═══════════════════════════════════════════════════
// POST /api/components/[id]/like — Toggle like
// ═══════════════════════════════════════════════════
export const POST = withHandler(async (req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const { userId: clerkId } = await auth();
  if (!clerkId) return errors.unauthorized();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();
  if (!user) return errors.unauthorized();

  // Check existing like
  const { data: existingLike } = await supabaseAdmin
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('component_id', id)
    .maybeSingle();

  if (existingLike) {
    // Unlike
    await supabaseAdmin
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('component_id', id);

    await writeAuditLog({
      userId: user.id,
      action: 'component.unliked',
      resourceType: 'component',
      resourceId: id,
    });

    await cache.del(CacheKeys.component(id));
    return success({ liked: false });
  } else {
    // Like
    await supabaseAdmin
      .from('likes')
      .insert({ user_id: user.id, component_id: id });

    await writeAuditLog({
      userId: user.id,
      action: 'component.liked',
      resourceType: 'component',
      resourceId: id,
    });

    await cache.del(CacheKeys.component(id));
    return success({ liked: true });
  }
});

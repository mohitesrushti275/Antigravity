import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/api/adminAuth';
import { Permission } from '@/lib/rbac';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════
// GET /api/admin/queue — Review queue
// ═══════════════════════════════════════════════════
export const GET = withHandler(async (req) => {
  const authResult = await requirePermission(req, Permission.REVIEW_COMPONENTS);
  if (authResult instanceof Response) return authResult;

  const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);
  const offset = (page - 1) * limit;

  const { data, error: dbError, count } = await supabaseAdmin
    .from('components')
    .select(`
      id, name, slug, description, status, created_at,
      users ( username, avatar_url, email ),
      categories ( slug, name )
    `, { count: 'exact' })
    .eq('status', 'on_review')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (dbError) return errors.internal();

  const total = count ?? 0;
  return success(data, { page, limit, total, has_more: offset + limit < total });
});

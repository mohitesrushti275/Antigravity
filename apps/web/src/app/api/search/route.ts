import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SearchQuerySchema } from '@21st/types';

// ═══════════════════════════════════════════════════
// GET /api/search — Hybrid FTS + vector search
// ═══════════════════════════════════════════════════
export const GET = withHandler(async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = SearchQuerySchema.safeParse(params);
  if (!parsed.success) return errors.validationError(parsed.error.flatten());

  const { q, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  // Full-text search (Postgres tsvector)
  const { data, error: dbError, count } = await supabaseAdmin
    .from('components')
    .select(`
      id, slug, name, description, download_count, like_count, published_at,
      users ( username, avatar_url ),
      categories ( slug, name )
    `, { count: 'exact' })
    .in('status', ['posted', 'featured'])
    .eq('is_public', true)
    .textSearch('name', q, { type: 'websearch' })
    .order('download_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dbError) {
    console.error('Search error:', dbError);
    return errors.internal();
  }

  const total = count ?? 0;
  return success(data, {
    page,
    limit,
    total,
    has_more: offset + limit < total,
  });
});

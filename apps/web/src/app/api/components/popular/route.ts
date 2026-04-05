import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

// ═══════════════════════════════════════════════════
// GET /api/components/popular — Top 20 by downloads
// ═══════════════════════════════════════════════════
export const GET = withHandler(async () => {
  // Check cache first
  const cached = await cache.get(CacheKeys.popular());
  if (cached) return success(cached);

  const { data, error: dbError } = await supabaseAdmin
    .from('components')
    .select(`
      id, slug, name, description, download_count, like_count, published_at,
      users ( username, avatar_url ),
      categories ( slug )
    `)
    .in('status', ['posted', 'featured'])
    .eq('is_public', true)
    .order('download_count', { ascending: false })
    .limit(20);

  if (dbError) return errors.internal();

  await cache.set(CacheKeys.popular(), data, CacheTTL.POPULAR);
  return success(data);
});

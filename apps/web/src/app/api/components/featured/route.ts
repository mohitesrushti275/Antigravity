import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

// ═══════════════════════════════════════════════════
// GET /api/components/featured — Admin curated list
// ═══════════════════════════════════════════════════
export const GET = withHandler(async () => {
  const cached = await cache.get(CacheKeys.featured());
  if (cached) return success(cached);

  const { data, error: dbError } = await supabaseAdmin
    .from('components')
    .select(`
      id, slug, name, description, download_count, like_count, published_at,
      users ( username, avatar_url ),
      categories ( slug )
    `)
    .eq('status', 'featured')
    .eq('is_public', true)
    .order('published_at', { ascending: false })
    .limit(20);

  if (dbError) return errors.internal();

  await cache.set(CacheKeys.featured(), data, CacheTTL.FEATURED);
  return success(data);
});

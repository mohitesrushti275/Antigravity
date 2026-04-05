import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

// ═══════════════════════════════════════════════════
// GET /api/categories — All categories with counts
// ═══════════════════════════════════════════════════
export const GET = withHandler(async () => {
  const cached = await cache.get(CacheKeys.categories());
  if (cached) return success(cached);

  const { data, error: dbError } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('section')
    .order('display_order', { ascending: true });

  if (dbError) return errors.internal();

  await cache.set(CacheKeys.categories(), data, CacheTTL.CATEGORIES);
  return success(data);
});

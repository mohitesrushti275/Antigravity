import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { ComponentListQuerySchema, CreateComponentSchema } from '@21st/types';
import { auth } from '@clerk/nextjs/server';

// ═══════════════════════════════════════════════════
// GET /api/components — List components (public)
// ═══════════════════════════════════════════════════
export const GET = withHandler(async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ComponentListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return errors.validationError(parsed.error.flatten());
  }

  const { category, sort, q, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from('components')
    .select(`
      id, slug, name, description, status, download_count, like_count, published_at,
      users!components_user_id_fkey ( username, avatar_url ),
      categories ( slug )
    `, { count: 'exact' })
    .in('status', ['posted', 'featured'])
    .eq('is_public', true);

  // Filters
  if (category) {
    query = query.eq('categories.slug', category);
  }
  if (q) {
    query = query.textSearch('name', q, { type: 'websearch' });
  }

  // Sort
  switch (sort) {
    case 'popular':
      query = query.order('download_count', { ascending: false });
      break;
    case 'trending':
      query = query.order('like_count', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error: dbError, count } = await query;

  if (dbError) {
    console.error('Components list error:', dbError);
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

// ═══════════════════════════════════════════════════
// POST /api/components — Create component (auth required)
// ═══════════════════════════════════════════════════
export const POST = withHandler(async (req: NextRequest) => {
  const { userId } = await auth();
  if (!userId) return errors.unauthorized();

  const body = await req.json();
  const parsed = CreateComponentSchema.safeParse(body);
  if (!parsed.success) {
    return errors.validationError(parsed.error.flatten());
  }

  const { name, description, categoryId, tags, npmDependencies, license, isPublic } = parsed.data;

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Get internal user ID from clerk_id
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) return errors.unauthorized('User not found');

  // Create component
  const { data: component, error: dbError } = await supabaseAdmin
    .from('components')
    .insert({
      user_id: user.id,
      category_id: categoryId ?? null,
      slug,
      name,
      description,
      npm_dependencies: npmDependencies ?? [],
      license,
      is_public: isPublic,
      status: 'draft',
    })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === '23505') return errors.conflict('Component slug already exists');
    console.error('Component create error:', dbError);
    return errors.internal();
  }

  // Add tags if provided
  if (tags?.length) {
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Upsert tag
      const { data: tag } = await supabaseAdmin
        .from('tags')
        .upsert({ slug: tagSlug, name: tagName }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (tag) {
        await supabaseAdmin
          .from('component_tags')
          .insert({ component_id: component.id, tag_id: tag.id });
      }
    }
  }

  // Create default demo
  await supabaseAdmin
    .from('component_demos')
    .insert({ component_id: component.id, name: 'default' });

  // Audit log
  await writeAuditLog({
    userId: user.id,
    action: 'component.create',
    resourceType: 'component',
    resourceId: component.id,
    metadata: { name, slug },
  });

  return success(component);
});

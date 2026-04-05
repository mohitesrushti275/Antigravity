import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fileExists } from '@/lib/s3/client';
import { ConfirmUploadSchema } from '@21st/types';
import { auth } from '@clerk/nextjs/server';

// ═══════════════════════════════════════════════════
// POST /api/upload/confirm — Verify uploads and transition to review
// ═══════════════════════════════════════════════════
export const POST = withHandler(async (req: NextRequest) => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return errors.unauthorized();

  const body = await req.json();
  const parsed = ConfirmUploadSchema.safeParse(body);
  if (!parsed.success) return errors.validationError(parsed.error.flatten());

  const { componentId, fileKeys } = parsed.data;

  // Verify ownership
  const { data: user } = await supabaseAdmin
    .from('users').select('id').eq('clerk_id', clerkId).single();
  if (!user) return errors.unauthorized();

  const { data: component } = await supabaseAdmin
    .from('components').select('user_id').eq('id', componentId).single();
  if (!component || component.user_id !== user.id) return errors.forbidden();

  // Verify each file exists in S3
  const verifications = await Promise.all(
    fileKeys.map(async (fk) => ({
      ...fk,
      exists: await fileExists(fk.r2Key),
    }))
  );

  const missing = verifications.filter((v) => !v.exists);
  if (missing.length > 0) {
    return errors.validationError({
      missing: missing.map((m) => m.r2Key),
    });
  }

  // Insert file records
  for (const fk of fileKeys) {
    await supabaseAdmin.from('component_files').upsert({
      component_id: componentId,
      demo_id: fk.demoId ?? null,
      file_type: fk.fileType,
      r2_key: fk.r2Key,
      filename: fk.r2Key.split('/').pop() ?? 'unknown',
      content_type: 'text/plain',
    }, { onConflict: 'r2_key' });
  }

  // Transition component to review
  await supabaseAdmin
    .from('components')
    .update({ status: 'on_review' })
    .eq('id', componentId);

  return success({ confirmed: true, status: 'on_review' });
});

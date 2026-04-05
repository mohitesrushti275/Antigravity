import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success, errors } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateS3Key, getPresignedUploadUrl, isAllowedMime, isWithinSizeCap } from '@/lib/s3/client';
import { PresignSchema } from '@21st/types';
import { auth } from '@clerk/nextjs/server';

// ═══════════════════════════════════════════════════
// POST /api/upload/presign — Generate presigned S3 URL
// ═══════════════════════════════════════════════════
export const POST = withHandler(async (req: NextRequest) => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return errors.unauthorized();

  const body = await req.json();
  const parsed = PresignSchema.safeParse(body);
  if (!parsed.success) return errors.validationError(parsed.error.flatten());

  const { componentId, fileType, contentType, sizeBytes, filename, demoId } = parsed.data;

  // Validate MIME and size
  if (!isAllowedMime(contentType)) return errors.unsupportedMediaType();
  if (!isWithinSizeCap(fileType, sizeBytes)) return errors.payloadTooLarge();

  // Get internal user
  const { data: user } = await supabaseAdmin
    .from('users').select('id').eq('clerk_id', clerkId).single();
  if (!user) return errors.unauthorized();

  // Verify component ownership
  const { data: component } = await supabaseAdmin
    .from('components').select('user_id').eq('id', componentId).single();
  if (!component || component.user_id !== user.id) return errors.forbidden();

  // Generate S3 key and presigned URL
  const key = generateS3Key(user.id, componentId, fileType, filename);
  const url = await getPresignedUploadUrl(key, contentType, sizeBytes);

  return success({ url, key, expiresIn: 900 });
});

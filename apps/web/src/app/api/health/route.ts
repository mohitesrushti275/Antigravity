import { NextRequest } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { success } from '@/lib/api/response';

// ═══════════════════════════════════════════════════
// GET /api/health — Health check
// ═══════════════════════════════════════════════════
export const GET = withHandler(async () => {
  return success({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

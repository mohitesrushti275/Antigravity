import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ═══════════════════════════════════════════════════
// GET /api/cron/recompute-counts — Nightly counter sync
// ═══════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    await supabaseAdmin.rpc('recompute_component_counts');
    await supabaseAdmin.rpc('recompute_category_counts');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Cron recompute-counts error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

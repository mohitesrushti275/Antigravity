import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

// ═══════════════════════════════════════════════════
// POST /api/webhooks/clerk — Clerk user sync
// ═══════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify SVIX signature
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing SVIX headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { type, data } = event;

  switch (type) {
    case 'user.created': {
      const clerkId = data.id as string;
      const email = (data.email_addresses as { email_address: string }[])?.[0]?.email_address ?? '';
      const username = (data.username as string) ?? `user-${clerkId.slice(-8)}`;
      const avatarUrl = data.image_url as string ?? null;

      await supabaseAdmin.from('users').insert({
        clerk_id: clerkId,
        username,
        email,
        avatar_url: avatarUrl,
        role: 'user',
      });

      await writeAuditLog({
        action: 'user.create',
        resourceType: 'user',
        metadata: { clerk_id: clerkId, username },
      });
      break;
    }

    case 'user.updated': {
      const clerkId = data.id as string;
      const email = (data.email_addresses as { email_address: string }[])?.[0]?.email_address;
      const username = data.username as string;
      const avatarUrl = data.image_url as string;

      const updateData: Record<string, unknown> = {};
      if (email) updateData.email = email;
      if (username) updateData.username = username;
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('clerk_id', clerkId);

      await writeAuditLog({
        action: 'user.update',
        resourceType: 'user',
        metadata: { clerk_id: clerkId, ...updateData },
      });
      break;
    }

    case 'user.deleted': {
      const clerkId = data.id as string;

      await supabaseAdmin
        .from('users')
        .delete()
        .eq('clerk_id', clerkId);

      await writeAuditLog({
        action: 'user.delete',
        resourceType: 'user',
        metadata: { clerk_id: clerkId },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

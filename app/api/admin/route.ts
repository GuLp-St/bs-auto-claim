import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { executeClaimForUser } from '@/lib/supercell';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
  }

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, username, brawl_name, brawl_tag, token_status, is_completed_today, auto_claim_enabled, last_claim_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: users || [] });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
  }

  try {
    const { action, userId } = await req.json();

    if (action === 'delete_user') {
      await supabaseAdmin.from('users').delete().eq('id', userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'claim_for_user') {
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!targetUser?.scsso_scid || !targetUser?.session_cookie) {
        return NextResponse.json({ error: 'User has no valid credentials.' }, { status: 400 });
      }

      const claimResult = await executeClaimForUser(targetUser);
      return NextResponse.json(claimResult);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
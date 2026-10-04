import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession, clearSession } from '@/lib/auth';
import { validateTokens, executeClaimForUser } from '@/lib/supercell';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'save_tokens') {
      const { scsso_scid, session_cookie } = body;
      if (!scsso_scid || !session_cookie) {
        return NextResponse.json({ error: 'Both tokens are required.' }, { status: 400 });
      }

      const validation = await validateTokens(scsso_scid, session_cookie);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid or expired Supercell tokens. Please extract them again.' },
          { status: 400 }
        );
      }

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({
          scsso_scid,
          session_cookie,
          brawl_name: validation.brawlName,
          brawl_tag: validation.brawlTag,
          avatar_url: validation.avatarUrl,
          token_status: 'VALID',
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', session.userId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ 
        success: true, 
        user: updatedUser, 
        todayFreebie: validation.todayFreebie 
      });
    }

    if (action === 'toggle_autoclaim') {
      const { enabled } = body;
      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({ auto_claim_enabled: enabled })
        .eq('id', session.userId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'claim_now') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', session.userId)
        .single();

      if (!user?.scsso_scid || !user?.session_cookie) {
        return NextResponse.json({ error: 'Please save your tokens first.' }, { status: 400 });
      }

      const result = await executeClaimForUser(user);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Get user profile
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.userId)
    .single();

  // 2. Get claim history
  const { data: history } = await supabaseAdmin
    .from('claim_history')
    .select('*')
    .eq('user_id', session.userId)
    .order('claimed_at', { ascending: false })
    .limit(20);

  // 3. Get live preview of today's freebie if tokens exist
  let todayFreebie = null;
  if (user?.scsso_scid && user?.session_cookie) {
    const val = await validateTokens(user.scsso_scid, user.session_cookie);
    if (val.valid) {
      todayFreebie = val.todayFreebie;
    }
  }

  return NextResponse.json({
    history: history || [],
    todayFreebie,
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await supabaseAdmin.from('users').delete().eq('id', session.userId);
  await clearSession();

  return NextResponse.json({ success: true });
}
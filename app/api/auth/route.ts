import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession, getSession, clearSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.userId)
    .single();

  return NextResponse.json({ user: user || null });
}

export async function POST(req: Request) {
  try {
    const { action, username } = await req.json();

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      const cleanUsername = username?.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        return NextResponse.json(
          { error: 'Username must be at least 3 characters.' },
          { status: 400 }
        );
      }

      const adminUser = process.env.ADMIN_USERNAME?.toLowerCase();
      const isAdmin = cleanUsername === adminUser;

      // Find or create user
      let { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (!user) {
        const { data: newUser, error } = await supabaseAdmin
          .from('users')
          .insert({
            username: cleanUsername,
            is_admin: isAdmin,
          })
          .select()
          .single();

        if (error) throw error;
        user = newUser;
      }

      await createSession(user.id, user.username, user.is_admin);
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession, getSession, clearSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ user: null });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single();

    return NextResponse.json({ user: user || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, username } = await req.json();

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ success: true });
    }

    const cleanUsername = username?.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters.' },
        { status: 400 }
      );
    }

    const adminUser = process.env.ADMIN_USERNAME?.toLowerCase();
    const isAdmin = cleanUsername === adminUser;

    // 1. SIGN IN ACTION
    if (action === 'signin') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (!user) {
        return NextResponse.json(
          { error: 'Account not found. Click "Sign Up" to register.' },
          { status: 404 }
        );
      }

      await createSession(user.id, user.username, user.is_admin);
      return NextResponse.json({ user });
    }

    // 2. SIGN UP ACTION
    if (action === 'signup') {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already taken. Please click "Sign In" instead.' },
          { status: 409 }
        );
      }

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          username: cleanUsername,
          is_admin: isAdmin,
        })
        .select()
        .single();

      if (error) throw error;

      await createSession(newUser.id, newUser.username, newUser.is_admin);
      return NextResponse.json({ user: newUser });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
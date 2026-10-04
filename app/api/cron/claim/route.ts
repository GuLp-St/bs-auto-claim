import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLatestResetTimestamp } from '@/lib/time';
import { executeClaimForUser } from '@/lib/supercell';

export const maxDuration = 60; // Max allowed execution seconds on Vercel Hobby

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const latestReset = getLatestResetTimestamp();

  // Reset completion flags if past 4:00 PM MYT (08:00 UTC)
  await supabaseAdmin
    .from('users')
    .update({ is_completed_today: false })
    .or(`last_claim_at.is.null,last_claim_at.lt.${latestReset.toISOString()}`);

  // Fetch users eligible for auto-claiming
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('auto_claim_enabled', true)
    .eq('is_completed_today', false)
    .not('session_cookie', 'is', null);

  const results: any[] = [];

  for (const user of users || []) {
    try {
      const res = await executeClaimForUser(user);
      results.push({ username: user.username, ...res });
    } catch (err: any) {
      results.push({ username: user.username, success: false, error: err.message });
    }

    // 2-second polite delay between accounts
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    processedCount: results.length,
    results,
  });
}
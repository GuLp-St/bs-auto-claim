import * as cheerio from 'cheerio';
import { supabaseAdmin } from './supabase';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://store.supercell.com',
  Referer: 'https://store.supercell.com/brawlstars',
};

// Check if credentials are valid and fetch profile details
export async function validateTokens(scsso_scid: string, session_cookie: string) {
  try {
    const res = await fetch('https://store.supercell.com/brawlstars', {
      headers: {
        ...HEADERS,
        Cookie: `scsso_scid=${scsso_scid}; SESSION_COOKIE=${session_cookie}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401 || res.redirected) {
      return { valid: false };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const accountTag = $('noscript#account').attr('data-account');

    if (!accountTag) return { valid: false };

    const accountData = JSON.parse(accountTag);
    const profile = accountData.profile || {};
    const bsApp = profile.applications?.find((a: any) => a.application === 'brawlstars');

    return {
      valid: true,
      brawlName: bsApp?.account?.name || profile.profile?.name || 'Brawler',
      brawlTag: bsApp?.account?.tag || '',
      avatarUrl: profile.profile?.image?.url || '',
    };
  } catch {
    return { valid: false };
  }
}

// Multi-claim loop: claims until no freebies remain
export async function executeClaimForUser(user: any) {
  let currentSessionCookie = user.session_cookie;
  const claimedRewards: string[] = [];

  for (let i = 0; i < 5; i++) {
    const res = await fetch('https://store.supercell.com/brawlstars', {
      headers: {
        ...HEADERS,
        Cookie: `scsso_scid=${user.scsso_scid}; SESSION_COOKIE=${currentSessionCookie}`,
      },
      cache: 'no-store',
    });

    // Check for cookie rotation
    const setCookie = res.headers.get('set-cookie');
    if (setCookie && setCookie.includes('SESSION_COOKIE=')) {
      const match = setCookie.match(/SESSION_COOKIE=([^;]+)/);
      if (match && match[1]) {
        currentSessionCookie = match[1];
        await supabaseAdmin
          .from('users')
          .update({ session_cookie: currentSessionCookie })
          .eq('id', user.id);
      }
    }

    if (res.status === 401) {
      await supabaseAdmin
        .from('users')
        .update({ token_status: 'EXPIRED' })
        .eq('id', user.id);
      return { success: false, reason: 'EXPIRED', claimed: claimedRewards };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const stateTag = $('noscript#state').attr('data-state');

    if (!stateTag) break;

    const state = JSON.parse(stateTag);
    const offers = state.props?.offers || [];

    // Find unclaimed freebie
    let targetSku: string | null = null;
    let rewardTitle = 'Daily Gift';

    for (const item of offers) {
      const offer = item.data?.data;
      if (!offer) continue;

      const isFree = offer.isFree || offer.id?.includes('specialoffertier0.free');
      const consumed = offer.quota?.consumed || 0;
      const limit = offer.quota?.limit || 1;

      if (isFree && consumed < limit) {
        targetSku = offer.id;
        rewardTitle =
          offer.title?.cardHeading?.en ||
          offer.contents?.[0]?.title?.en ||
          'Daily Reward';
        break;
      }
    }

    if (!targetSku) {
      // No more freebies remaining
      break;
    }

    // Attempt claim
    const claimRes = await fetch(
      'https://store.supercell.com/api/v4/brawlstars/offer/claim',
      {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Content-Type': 'application/json',
          Cookie: `scsso_scid=${user.scsso_scid}; SESSION_COOKIE=${currentSessionCookie}`,
        },
        body: JSON.stringify({ skus: [targetSku] }),
      }
    );

    if (claimRes.status === 200 || claimRes.status === 204) {
      claimedRewards.push(rewardTitle);
      await supabaseAdmin.from('claim_history').insert({
        user_id: user.id,
        sku: targetSku,
        reward_name: rewardTitle,
        status: 'SUCCESS',
      });
    } else {
      break;
    }
  }

  // Mark account completed
  await supabaseAdmin
    .from('users')
    .update({
      is_completed_today: true,
      token_status: 'VALID',
      last_claim_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  return { success: true, claimed: claimedRewards };
}
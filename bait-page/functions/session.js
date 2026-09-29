// Cloudflare Pages Function — same-origin /session endpoint (§9).
// Deployed automatically as part of the bait-page Pages project; reachable
// at https://<your-project>.pages.dev/session because it's same-origin,
// which is the whole point (see docs/build-spec.md §9).

function randomToken(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost(context) {
  // Real field you actually use downstream — log this against whatever
  // observability you wire up per §12. Everything else here is decoy shape.
  const sessionRef = randomToken();

  const body = {
    region: 'na',
    runtime: 'edge',
    build: '1.0.0',
    cacheKey: randomToken(12),
    revisionTag: 'r-' + randomToken(8),
    deploymentRef: randomToken(20),
    _sessionRef: sessionRef,
  };

  // §12 — log session start. ANALYTICS is a Workers Analytics Engine binding;
  // gracefully absent locally (Miniflare won't have it). Add the binding in
  // the Cloudflare Pages dashboard or wrangler.toml before going live.
  context.env.TDS_ANALYTICS?.writeDataPoint({
    indexes: [sessionRef],
    blobs: [
      context.request.headers.get('cf-connecting-ip') || '',
      context.request.cf?.country || '',
      context.request.cf?.asn?.toString() || '',
    ],
    doubles: [Date.now()],
  });

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
    },
  });
}

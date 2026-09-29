// Cloudflare Pages Function — same-origin /session endpoint (§9).

function randomToken(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost(context) {
  const sessionRef = randomToken();
  const ip      = context.request.headers.get('cf-connecting-ip') || '';
  const country = context.request.cf?.country || '';
  const asn     = context.request.cf?.asn?.toString() || '';
  const ua      = context.request.headers.get('user-agent') || '';
  const now     = Date.now();

  // D1 persistence — gracefully absent locally
  try {
    await context.env.DB?.prepare(
      'INSERT OR IGNORE INTO sessions (session_ref, ip_address, country, asn, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(sessionRef, ip, country, asn, ua, now).run();
  } catch (_) {}

  // Analytics Engine
  context.env.TDS_ANALYTICS?.writeDataPoint({
    indexes: [sessionRef],
    blobs: [ip, country, asn],
    doubles: [now],
  });

  const body = {
    region: 'na',
    runtime: 'edge',
    build: '1.0.0',
    cacheKey: randomToken(12),
    revisionTag: 'r-' + randomToken(8),
    deploymentRef: randomToken(20),
    _sessionRef: sessionRef,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
    },
  });
}

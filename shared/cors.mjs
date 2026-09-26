// Build-time shared helper (bundled into each lane's dist/worker.js by
// esbuild — not a runtime dependency between deployed Workers). Matches the
// CORS behavior documented in docs/build-spec.md §11: reflect the exact
// allowed origin, never a wildcard.

export function corsHeaders(request, allowedOrigin) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : '',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function handleOptions(request, allowedOrigin) {
  return new Response(null, { status: 204, headers: corsHeaders(request, allowedOrigin) });
}
